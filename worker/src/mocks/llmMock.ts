import type { LLMResponse } from "../types.ts";

/**
 * Mock LLM responses for local testing
 * Enable with ENABLE_MOCK_LLM=true in .dev.vars
 * 
 * Provides deterministic responses based on SKU for testing without API keys.
 * Supports both Gemini and Groq mock responses.
 * 
 * Standardized to fully match the production LLMResponse structure.
 */

/**
 * Mock Gemini API response with deterministic results based on SKU
 * @param imageBase64 - Base64 encoded image (not used in mock, but kept for API compatibility)
 * @param sku - Product SKU to determine mock response
 * @returns Mock LLM response matching the production LLMResponse format
 */
export function mockGeminiResponse(imageBase64: string, sku: string): LLMResponse {
  // Deterministic responses based on SKU for testing
  const mockResponses: Record<string, LLMResponse> = {
    'afia-corn-1.5l': {
      brand: 'Afia',
      fillPercentage: 75,
      confidence: 'high',
      reasoning: 'Mock: Detected Afia corn oil 1.5L bottle at 75% fill level',
      red_line_y_normalized: 250, // 0-1000 scale: 1000 * (1 - 0.75) = 250
    },
    'afia-corn-oil-1.8l': {
      brand: 'Afia',
      fillPercentage: 75,
      confidence: 'high',
      reasoning: 'Mock: Detected Afia corn oil bottle at 75% fill level',
      red_line_y_normalized: 250,
    },
    'afia-sunflower-oil-1.8l': {
      brand: 'Afia',
      fillPercentage: 50,
      confidence: 'high',
      reasoning: 'Mock: Detected Afia sunflower oil bottle at 50% fill level',
      red_line_y_normalized: 500,
    },
    'afia-vegetable-oil-1.8l': {
      brand: 'Afia',
      fillPercentage: 90,
      confidence: 'high',
      reasoning: 'Mock: Detected Afia vegetable oil bottle at 90% fill level',
      red_line_y_normalized: 100,
    },
    'afia-corn-oil-750ml': {
      brand: 'Afia',
      fillPercentage: 30,
      confidence: 'medium',
      reasoning: 'Mock: Detected Afia corn oil 750ml bottle at 30% fill level',
      red_line_y_normalized: 700,
    },
    'afia-corn-2.5l': {
      brand: 'Afia',
      fillPercentage: 50,
      confidence: 'high',
      reasoning: 'Mock: Detected Afia corn oil 2.5L bottle at 50% fill level',
      red_line_y_normalized: 500,
    },
    'unknown-brand-sku': {
      brand: 'unknown',
      fillPercentage: 40,
      confidence: 'low',
      reasoning: 'Mock: Brand does not appear to be Afia. Contribution requested.',
      red_line_y_normalized: 600,
    },
    'default': {
      brand: 'Afia',
      fillPercentage: 60,
      confidence: 'medium',
      reasoning: 'Mock: Default response for testing',
      red_line_y_normalized: 400,
    }
  };

  const response = mockResponses[sku] || mockResponses['default'];
  
  // Simulation: add image quality issues if image string is very short (represents poor quality in tests)
  if (imageBase64.length < 500) {
    response.imageQualityIssues = ['low_resolution'];
    response.confidence = 'low';
  }

  return response;
}

/**
 * Mock Groq API response (fallback provider)
 */
export function mockGroqResponse(_imageBase64: string, sku: string): LLMResponse {
  return {
    brand: sku.includes('unknown') ? 'unknown' : 'Afia',
    fillPercentage: 65,
    confidence: 'medium',
    reasoning: 'Mock: Groq fallback response for testing',
    red_line_y_normalized: 350,
  };
}

/**
 * Mock OpenRouter API response
 */
export function mockOpenRouterResponse(_imageBase64: string, sku: string): LLMResponse {
  return {
    brand: sku.includes('unknown') ? 'unknown' : 'Afia',
    fillPercentage: 70,
    confidence: 'medium',
    reasoning: 'Mock: OpenRouter fallback response for testing',
    red_line_y_normalized: 300,
  };
}

/**
 * Mock Mistral API response
 */
export function mockMistralResponse(_imageBase64: string, sku: string): LLMResponse {
  return {
    brand: sku.includes('unknown') ? 'unknown' : 'Afia',
    fillPercentage: 55,
    confidence: 'low',
    reasoning: 'Mock: Mistral fallback response for testing',
    red_line_y_normalized: 450,
  };
}
