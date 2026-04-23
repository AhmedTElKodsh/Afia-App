import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { 
  CheckCircle, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Save, 
  ChevronLeft,
  Info,
  Maximize2
} from "lucide-react";
import type { StoredScan } from "../hooks/useScanHistory.ts";
import { bottleRegistry } from "../data/bottleRegistry.ts";
import { calculateVolumes } from "../../shared/volumeCalculator.ts";
import { hapticFeedback } from "../utils/haptics.ts";
import "./ScanReview.css";

interface ScanReviewProps {
  scan: StoredScan;
  onSave: (correction: ScanCorrection) => void;
  onBack: () => void;
}

export interface ScanCorrection {
  scanId: string;
  actualFillPercentage: number;
  errorCategory: "none" | "too_big" | "too_small" | "occlusion" | "lighting";
  notes: string;
  isTrainingEligible: boolean;
}

export function ScanReview({ scan, onSave, onBack }: ScanReviewProps) {
  const { t, i18n } = useTranslation();
  const [correctedPercentage, setCorrectedPercentage] = useState(scan.fillPercentage);
  const [errorCategory, setErrorCategory] = useState<ScanCorrection["errorCategory"]>("none");
  const [notes, setNotes] = useState("");
  const [isEligible, setIsEligible] = useState(true);
  const isRTL = i18n.language === 'ar';

  const bottle = useMemo(() => 
    bottleRegistry.find(b => b.sku === scan.sku) || bottleRegistry[0]
  , [scan.sku]);

  const volumes = useMemo(() => 
    calculateVolumes(correctedPercentage, bottle.totalVolumeMl, bottle.geometry)
  , [correctedPercentage, bottle]);

  const handleSave = () => {
    onSave({
      scanId: scan.id!,
      actualFillPercentage: correctedPercentage,
      errorCategory,
      notes,
      isTrainingEligible: isEligible
    });
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (val !== correctedPercentage) {
      hapticFeedback.selection();
      setCorrectedPercentage(val);
    }
  };

  return (
    <div className="scan-review-detail" dir={isRTL ? 'rtl' : 'ltr'}>
      <header className="review-header">
        <button className="btn btn-link btn-icon-text" onClick={onBack}>
          <ChevronLeft size={18} /> {t('common.back')}
        </button>
        <h3>{t('admin.review.title')}</h3>
        <button className="btn btn-primary btn-icon-text" onClick={handleSave}>
          <Save size={18} /> {t('admin.review.save')}
        </button>
      </header>

      <div className="review-layout">
        {/* ── Left: Image Analysis ── */}
        <div className="review-visual-area card">
          <div className="review-image-container">
            {/* AI Predicted Line (Red) */}
            <div 
              className="prediction-line prediction-line--ai" 
              style={{ top: `${100 - scan.fillPercentage}%` }}
              title={t('admin.review.aiEstimate')}
            >
              <span className="line-label">{t('admin.review.aiPrefix', { defaultValue: 'AI:' })} {scan.fillPercentage}%</span>
            </div>

            {/* Admin Corrected Line (Green) */}
            <div 
              className="prediction-line prediction-line--admin" 
              style={{ top: `${100 - correctedPercentage}%` }}
              title={t('admin.review.groundTruth')}
            >
              <span className="line-label">{t('admin.review.manualPrefix', { defaultValue: 'Manual:' })} {correctedPercentage}%</span>
            </div>

            <img 
              src={scan.imageUrl || "/test-bottle.jpg"} 
              alt={t('camera.preview')} 
              className="review-image" 
            />
            
            <div className="image-overlay-tools">
               <button className="btn-glass-tool" title={t('common.zoom', { defaultValue: 'Zoom' })}><Maximize2 size={16} /></button>
            </div>
          </div>
          
          <div className="visual-legend">
            <div className="legend-item">
              <span className="dot dot--ai"></span>
              <span>{t('admin.review.aiEstimate')}</span>
            </div>
            <div className="legend-item">
              <span className="dot dot--admin"></span>
              <span>{t('admin.review.groundTruth')}</span>
            </div>
          </div>
        </div>

        {/* ── Right: Correction Controls ── */}
        <div className="review-controls-area">
          <section className="control-section card card-compact">
            <h4>{t('admin.review.quickFlag')}</h4>
            <div className="flag-buttons">
              <button 
                className={`flag-btn ${errorCategory === 'none' ? 'active' : ''}`}
                onClick={() => { setErrorCategory('none'); setCorrectedPercentage(scan.fillPercentage); }}
              >
                <CheckCircle size={20} />
                <span>{t('admin.review.accurate')}</span>
              </button>
              <button 
                className={`flag-btn ${errorCategory === 'too_big' ? 'active' : ''}`}
                onClick={() => setErrorCategory('too_big')}
              >
                <ArrowUpCircle size={20} />
                <span>{t('admin.review.tooBig')}</span>
              </button>
              <button 
                className={`flag-btn ${errorCategory === 'too_small' ? 'active' : ''}`}
                onClick={() => setErrorCategory('too_small')}
              >
                <ArrowDownCircle size={20} />
                <span>{t('admin.review.tooSmall')}</span>
              </button>
            </div>
          </section>

          <section className="control-section card card-compact">
            <div className="section-header-row">
              <h4>{t('admin.review.correction')}</h4>
              <span className="value-badge">{correctedPercentage}%</span>
            </div>
            
            <div className="slider-container">
              <input 
                type="range" 
                min="0" 
                max="100" 
                step="0.5" 
                value={correctedPercentage} 
                onChange={handleSliderChange}
                className="correction-slider"
              />
              <div className="slider-ticks">
                <span>0%</span>
                <span>25%</span>
                <span>50%</span>
                <span>75%</span>
                <span>100%</span>
              </div>
            </div>

            <div className="volume-preview-row">
              <div className="preview-stat">
                <span className="label">{t('results.volume')}</span>
                <span className="value">{volumes.remaining.ml} {t('common.ml')}</span>
              </div>
              <div className="preview-stat">
                <span className="label">{t('common.cups')}</span>
                <span className="value">{volumes.remaining.cups}</span>
              </div>
            </div>
          </section>

          <section className="control-section card card-compact">
            <h4>{t('admin.review.metadata')}</h4>
            <div className="form-group">
              <label>{t('admin.review.errorType')}</label>
              <select 
                value={errorCategory} 
                onChange={(e) => setErrorCategory(e.target.value as any)}
              >
                <option value="none">{t('admin.review.errorNone', { defaultValue: 'None (Correct)' })}</option>
                <option value="lighting">{t('results.poorLighting')}</option>
                <option value="occlusion">{t('results.obstruction')}</option>
                <option value="tilt">{t('camera.tilt', { defaultValue: 'Angle / Tilt' })}</option>
                <option value="background">{t('admin.upload.aug.background')}</option>
              </select>
            </div>
            
            <div className="form-group">
              <label>{t('admin.review.notes')}</label>
              <textarea 
                value={notes} 
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t('admin.review.notesPlaceholder', { defaultValue: 'Observed discrepancies...' })}
                rows={3}
              />
            </div>

            <label className="checkbox-wrap">
              <input 
                type="checkbox" 
                checked={isEligible} 
                onChange={(e) => setIsEligible(e.target.checked)} 
              />
              <span>{t('admin.review.trainingEligible')}</span>
              <span title={t('admin.review.trainingEligibleHint', { defaultValue: 'Mark this as a high-quality example for local model training' })}>
                <Info size={14} className="info-icon" />
              </span>
            </label>
          </section>
        </div>
      </div>
    </div>
  );
}
