import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { 
  Upload, 
  X, 
  CheckCircle2, 
  Database,
} from "lucide-react";
import { bottleRegistry } from "../data/bottleRegistry.ts";
import { calculateVolumes } from "../../shared/volumeCalculator.ts";
import { hapticFeedback } from "../utils/haptics.ts";
import { adminUploadImage } from "../api/apiClient.ts";
import "./AdminUpload.css";

const SESSION_KEY = "afia_admin_session";

interface UploadFile {
  file: File;
  preview: string;
  id: string;
  status: "idle" | "uploading" | "success" | "error";
  progress: number;
}

export function AdminUpload() {
  const { t } = useTranslation();
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [selectedSku, setSelectedSku] = useState(bottleRegistry[0].sku);
  const [fillPercentage, setFillPercentage] = useState(50);
  const [isUploading, setIsUploading] = useState(false);

  const bottle = bottleRegistry.find(b => b.sku === selectedSku) || bottleRegistry[0];
  const volumes = calculateVolumes(fillPercentage, bottle.totalVolumeMl, bottle.geometry);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("image/"));
    addFiles(droppedFiles);
  }, []);

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFiles(Array.from(e.target.files));
    }
  };

  const addFiles = (newFiles: File[]) => {
    const fileObjects: UploadFile[] = newFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      id: crypto.randomUUID(),
      status: "idle",
      progress: 0
    }));
    setFiles(prev => [...prev, ...fileObjects]);
    hapticFeedback.selection();
  };

  const removeFile = (id: string) => {
    setFiles(prev => {
      const filtered = prev.filter(f => f.id !== id);
      const removed = prev.find(f => f.id === id);
      if (removed) URL.revokeObjectURL(removed.preview);
      return filtered;
    });
  };

  const handleUploadAll = async () => {
    const token = sessionStorage.getItem(SESSION_KEY);
    if (!token || files.length === 0) return;
    
    setIsUploading(true);
    hapticFeedback.scan();

    for (const fileObj of files) {
      if (fileObj.status === "success") continue;
      
      setFiles(prev => prev.map(f => f.id === fileObj.id ? { ...f, status: "uploading" } : f));
      
      try {
        await adminUploadImage(
          token, 
          fileObj.file, 
          selectedSku, 
          fillPercentage,
          "none" // Could be dynamic based on selected augmentation
        );
        setFiles(prev => prev.map(f => f.id === fileObj.id ? { ...f, status: "success", progress: 100 } : f));
      } catch (err) {
        console.error("Upload failed for", fileObj.file.name, err);
        setFiles(prev => prev.map(f => f.id === fileObj.id ? { ...f, status: "error" } : f));
      }
    }

    setIsUploading(false);
    hapticFeedback.success();
  };

  return (
    <div className="admin-upload-view">
      <div className="upload-header-row">
        <div className="header-text">
          <h3>{t('admin.upload.title', 'Batch Dataset Upload')}</h3>
          <p className="text-secondary">{t('admin.upload.subtitle', 'Upload real or augmented images to seed the local model training set.')}</p>
        </div>
        <button 
          className="btn btn-primary btn-icon-text" 
          onClick={handleUploadAll}
          disabled={files.length === 0 || isUploading}
        >
          <Database size={18} /> 
          {isUploading ? t('common.uploading', 'Uploading...') : t('admin.upload.submitAll', 'Upload Batch to DB')}
        </button>
      </div>

      <div className="upload-grid-layout">
        {/* ── Left: Global Labeling Controls ── */}
        <aside className="upload-controls card">
          <h4>{t('admin.upload.batchLabels', 'Batch Labels')}</h4>
          <p className="text-caption text-tertiary">{t('admin.upload.batchLabelsDesc', 'Applied to all images in this batch')}</p>
          
          <div className="form-group">
            <label>{t('admin.bottles.sku', 'Target Bottle SKU')}</label>
            <select value={selectedSku} onChange={(e) => setSelectedSku(e.target.value)}>
              {bottleRegistry.map(b => (
                <option key={b.sku} value={b.sku}>{b.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <div className="label-row">
              <label>{t('admin.review.correction', 'Ground Truth Level')}</label>
              <span className="value-badge">{fillPercentage}%</span>
            </div>
            <input 
              type="range" 
              min="0" 
              max="100" 
              step="0.5" 
              value={fillPercentage} 
              onChange={(e) => setFillPercentage(parseFloat(e.target.value))}
              className="correction-slider"
            />
            <div className="volume-preview-mini">
              <span>{volumes.remaining.ml} ml</span>
              <span>{volumes.remaining.cups} {t('common.cups')}</span>
            </div>
          </div>

          <div className="form-group">
            <label>{t('admin.upload.augmentation', 'Augmentation Type')}</label>
            <div className="tag-cloud">
              <span className="badge badge-outline">{t('admin.upload.aug.none', 'None / Real')}</span>
              <span className="badge badge-outline">{t('admin.upload.aug.brightness', 'Brightness')}</span>
              <span className="badge badge-outline">{t('admin.upload.aug.tilt', 'Tilt/Rotation')}</span>
              <span className="badge badge-outline">{t('admin.upload.aug.background', 'Synthetic Background')}</span>
            </div>
          </div>
        </aside>

        {/* ── Right: Dropzone & Preview ── */}
        <main className="upload-main-area">
          <div 
            className={`dropzone card ${files.length === 0 ? 'empty' : ''}`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDrop}
          >
            <input 
              type="file" 
              id="file-input" 
              multiple 
              accept="image/*" 
              onChange={onFileSelect} 
              hidden 
            />
            
            {files.length === 0 ? (
              <label htmlFor="file-input" className="dropzone-inner">
                <div className="drop-icon-wrap">
                  <Upload size={32} />
                </div>
                <div className="drop-text">
                  <span className="primary">{t('admin.upload.dropTitle', 'Click or drag images here')}</span>
                  <span className="secondary">{t('admin.upload.dropLimits', 'Supports JPG, PNG up to 5MB')}</span>
                </div>
              </label>
            ) : (
              <div className="preview-grid">
                {files.map(file => (
                  <div key={file.id} className={`preview-item card card-compact status--${file.status}`}>
                    <img src={file.preview} alt="Upload preview" />
                    <button className="remove-btn" onClick={() => removeFile(file.id)}>
                      <X size={14} />
                    </button>
                    {file.status === "uploading" && <div className="upload-progress-bar" />}
                    {file.status === "success" && (
                      <div className="status-overlay">
                        <CheckCircle2 size={24} />
                      </div>
                    )}
                  </div>
                ))}
                <label htmlFor="file-input" className="add-more-card">
                  <Upload size={20} />
                  <span>{t('common.addMore', 'Add More')}</span>
                </label>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
