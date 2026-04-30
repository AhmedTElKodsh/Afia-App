import { useState, useCallback, useRef, useEffect } from "react";
import * as ort from "onnxruntime-web";
import type { AnalysisResult } from "../state/appState";
import { analyzeBottle, reportScanError, logLocalScan } from "../api/apiClient";
import { getCachedModel, setCachedModel } from "../utils/modelCache";

interface LocalModelStatus {
  version: string;
  loaded: boolean;
  error?: string;
}

// Issue 6: Support whitelist for local inference
const LOCAL_MODEL_CONFIG = {
  version: "0.1.2",
  supportedSkus: ["afia-corn-1.5l", "afia-corn-2.5l"],
  modelPath: "/models/afia_model.onnx?v=1",
  confidenceThreshold: 0.90, // 90% confidence for brand verification
  imageSize: 224,
  normalization: {
    mean: [0.485, 0.456, 0.406],
    std: [0.229, 0.224, 0.225]
  }
};

/**
 * Stage 2: Local-Primary Analysis Hook
 * Handles the browser-based inference loop with LLM fallback.
 */
export function useLocalAnalysis() {
  const [status, setStatus] = useState<LocalModelStatus>({
    version: LOCAL_MODEL_CONFIG.version,
    loaded: false
  });
  const [isModelLoading, setIsModelLoading] = useState(false);
  const loadingLockRef = useRef(false);
  const sessionRef = useRef<ort.InferenceSession | null>(null);
  
  // Patch: Cleanup session on unmount
  useEffect(() => {
    return () => {
      const session = sessionRef.current;
      if (session) {
        // ort-web v1.19.0+ uses .release() or is automatically GCed, 
        // but explicit release is safer for WASM memory.
        try {
          if ('release' in session && typeof (session as { release?: unknown }).release === 'function') {
            const releaseRes = (session as { release: () => void | Promise<void> }).release();
            if (releaseRes instanceof Promise) {
              releaseRes.catch((e: unknown) => console.warn("[LocalModel] Async release failed:", e));
            }
          }
        } catch (e: unknown) {
          console.warn("[LocalModel] Release failed:", e);
        }
        sessionRef.current = null;
      }
    };
  }, []);

  // Issue 4: Reuse canvas instance
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  /**
   * Load the ONNX model with retry logic
   */
  const loadModel = useCallback(async (retries = 3) => {
    try {
      if (sessionRef.current || loadingLockRef.current) return;
      
      loadingLockRef.current = true;
      setIsModelLoading(true);
      let attempt = 0;
      while (attempt < retries) {
        try {
          // Try IndexedDB first
          let buffer = await getCachedModel(LOCAL_MODEL_CONFIG.modelPath, LOCAL_MODEL_CONFIG.version);
          
          if (buffer) {
            console.log("[LocalModel] Loaded model from IndexedDB cache");
          } else {
            console.log("[LocalModel] Model cache miss, fetching from network...");
            const response = await fetch(LOCAL_MODEL_CONFIG.modelPath);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            buffer = await response.arrayBuffer();
            
            // Save to cache (don't await to avoid blocking)
            setCachedModel(LOCAL_MODEL_CONFIG.modelPath, LOCAL_MODEL_CONFIG.version, buffer)
              .catch(err => console.warn("[LocalModel] Cache save failed:", err));
          }

          // H1 FIX: Release existing session before creating new one to prevent memory leak
          if (sessionRef.current) {
            try {
              if ('release' in sessionRef.current && typeof (sessionRef.current as { release?: unknown }).release === 'function') {
                const releaseRes = (sessionRef.current as { release: () => void | Promise<void> }).release();
                if (releaseRes instanceof Promise) {
                  await releaseRes.catch((e: unknown) => console.warn("[LocalModel] Release failed:", e));
                }
              }
            } catch (e: unknown) {
              console.warn("[LocalModel] Release failed:", e);
            }
            sessionRef.current = null;
          }

          const session = await ort.InferenceSession.create(new Uint8Array(buffer), {
            executionProviders: ["wasm"],
            graphOptimizationLevel: "all",
            executionMode: "sequential",
          });
          
          sessionRef.current = session;
          setStatus(prev => ({ ...prev, loaded: true, error: undefined }));
          console.log("[LocalModel] Loaded model successfully on attempt", attempt + 1);
          break;
        } catch (err) {
          attempt++;
          const errorMsg = err instanceof Error ? err.message : String(err);
          console.warn(`[LocalModel] Load attempt ${attempt} failed:`, errorMsg);
          if (attempt >= retries) {
            setStatus(prev => ({ ...prev, error: `Failed to load model after ${retries} attempts: ${errorMsg}` }));
          } else {
            // Exponential backoff
            await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 500));
          }
        }
      }
    } catch (outerError) {
      console.error("[LocalModel] loadModel critical failure:", outerError);
      setStatus(prev => ({ ...prev, error: `Critical failure: ${outerError instanceof Error ? outerError.message : String(outerError)}` }));
    } finally {
      setIsModelLoading(false);
      loadingLockRef.current = false;
    }
  }, []);

  /**
   * Preprocess image for MobileNetV3 (224x224, normalized)
   */
  const preprocess = async (imageSrc: string): Promise<ort.Tensor> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = async () => {
        // H2 FIX: Check if component unmounted during async operation
        if (!canvasRef.current || !sessionRef.current) {
          img.onload = null;
          img.onerror = null;
          return reject(new Error("Component unmounted during preprocessing"));
        }

        const size = LOCAL_MODEL_CONFIG.imageSize;
        if (!canvasRef.current) {
          canvasRef.current = document.createElement("canvas");
        }
        const canvas = canvasRef.current;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d", { alpha: false, desynchronized: true });
        if (!ctx) {
          img.onload = null;
          img.onerror = null;
          return reject(new Error("Canvas context missing"));
        }

        ctx.drawImage(img, 0, 0, size, size);
        
        const imageData = ctx.getImageData(0, 0, size, size).data;
        const floatData = new Float32Array(3 * size * size);
        
        const pixelCount = size * size;
        const { mean, std } = LOCAL_MODEL_CONFIG.normalization;

        // Optimized constants for ImageNet normalization
        const rMean = mean[0], gMean = mean[1], bMean = mean[2];
        const rInvStd = 1.0 / std[0], gInvStd = 1.0 / std[1], bInvStd = 1.0 / std[2];
        const inv255 = 1.0 / 255.0;

        // Optimized loop: cache offsets and constants
        for (let i = 0; i < pixelCount; i++) {
          const idx = i << 2; // i * 4
          // NCHW format with ImageNet normalization
          floatData[i] = (imageData[idx] * inv255 - rMean) * rInvStd; // R
          floatData[pixelCount + i] = (imageData[idx + 1] * inv255 - gMean) * gInvStd; // G
          floatData[2 * pixelCount + i] = (imageData[idx + 2] * inv255 - bMean) * bInvStd; // B
        }

        resolve(new ort.Tensor("float32", floatData, [1, 3, size, size]));
      };
      img.onerror = reject;
      img.src = imageSrc;
    });
  };

  /**
   * Run Analysis with local CNN and LLM fallback
   */
  const runAnalysis = useCallback(async (
    image: string, 
    sku: string,
    totalVolumeMl: number
  ): Promise<AnalysisResult> => {
    try {
      const startTime = Date.now();
      
      // Consensus: Allow generic pass for all Afia SKUs
      const isSupported = sku.startsWith("afia-") || LOCAL_MODEL_CONFIG.supportedSkus.includes(sku);

      // --- 1. LOCAL INFERENCE ---
      if (sessionRef.current && isSupported) {
        try {
          console.log("[LocalModel] Running inference for SKU:", sku);
          const inputTensor = await preprocess(image);
          
          // Component might have unmounted during preprocess
          if (!sessionRef.current) {
            return {
              scanId: "aborted",
              fillPercentage: 0,
              remainingMl: 0,
              confidence: "low",
              aiProvider: "local-cnn",
              latencyMs: 0
            };
          }

          const outputMap = await sessionRef.current.run({ input: inputTensor });
          
          // Handle dual-head output
          const isAfiaProb = (outputMap.output.data as Float32Array)[0];
          const fillProb = (outputMap.output_1.data as Float32Array)[0];
          
          console.log(`[LocalModel] Results -> IsAfia: ${isAfiaProb.toFixed(4)}, Fill: ${(fillProb * 100).toFixed(2)}%`);

          // Verification Gate: 90% confidence threshold (configured)
          if (isAfiaProb < LOCAL_MODEL_CONFIG.confidenceThreshold) {
            console.warn("[LocalModel] Brand verification failed (confidence low), falling back to LLM");
            reportScanError(sku, `LowConfidenceGate: ${isAfiaProb.toFixed(4)}`, navigator.userAgent);
          } else {
            const fillPercentage = fillProb * 100;
            const latencyMs = Date.now() - startTime;

            let scanId = `local-${Date.now()}`;
            try {
              const logRes = await logLocalScan(sku, image, {
                percentage: Math.round(fillPercentage),
                confidence: "high"
              }, latencyMs);
              scanId = logRes.scanId;
            } catch (err) {
              console.error("[LocalModel] Logging failed:", err);
            }

            return {
              scanId,
              fillPercentage: Math.round(fillPercentage),
              remainingMl: Math.round((fillPercentage / 100) * totalVolumeMl),
              confidence: "high",
              aiProvider: "local-cnn",
              latencyMs
            };
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          reportScanError(sku, `LocalInferenceError: ${msg}`, navigator.userAgent);
          console.warn("[LocalModel] Inference failed, falling back to LLM:", err);
        }
      }

      // --- 2. FALLBACK TO LLM API ---
      try {
        const llmResult = await analyzeBottle(sku, image);
        return {
          ...llmResult,
          aiProvider: llmResult.aiProvider
        };
      } catch (err) {
        console.error("[LocalModel] LLM analysis failed:", err);
        throw err;
      }
    } catch (outerError) {
      console.error("[LocalModel] runAnalysis critical failure:", outerError);
      throw outerError; // Re-throw to be handled by caller (UI)
    }
  }, []);

  return {
    runAnalysis,
    loadModel,
    isModelLoading,
    isModelReady: status.loaded,
    modelError: status.error
  };
}
