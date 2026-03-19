/**
 * AdminOnboarding Component
 * 
 * First-time tutorial for new admin users.
 * 4-step tooltip sequence introducing Test Lab features.
 * 
 * Features:
 * - 4-step tutorial sequence
 * - Skip/Complete options
 * - Progress indicator
 * - Persists completion in localStorage
 * - Full i18n support for English and Arabic
 */

import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import "./AdminOnboarding.css";

export interface AdminOnboardingProps {
  /** Called when onboarding is completed */
  onComplete: () => void;
  /** Called when onboarding is skipped */
  onSkip: () => void;
}

export function AdminOnboarding({ onComplete, onSkip }: AdminOnboardingProps) {
  const { t, i18n } = useTranslation();
  const [currentStep, setCurrentStep] = useState(0);
  const [isCompleting, setIsCompleting] = useState(false);

  const currentLang = i18n.language || 'en';
  const isRTL = currentLang === 'ar';

  const totalSteps = 4;
  const progress = ((currentStep + 1) / totalSteps) * 100;

  // Get steps from translations
  const steps = [
    {
      id: 1,
      title: t('admin.onboarding.step1.title'),
      content: t('admin.onboarding.step1.content'),
      icon: t('admin.onboarding.step1.icon'),
    },
    {
      id: 2,
      title: t('admin.onboarding.step2.title'),
      content: t('admin.onboarding.step2.content'),
      icon: t('admin.onboarding.step2.icon'),
    },
    {
      id: 3,
      title: t('admin.onboarding.step3.title'),
      content: t('admin.onboarding.step3.content'),
      icon: t('admin.onboarding.step3.icon'),
    },
    {
      id: 4,
      title: t('admin.onboarding.step4.title'),
      content: t('admin.onboarding.step4.content'),
      icon: t('admin.onboarding.step4.icon'),
    },
  ];

  // Handle next step
  const handleNext = useCallback(() => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      // Complete onboarding
      setIsCompleting(true);
      setTimeout(() => {
        onComplete();
      }, 500);
    }
  }, [currentStep, totalSteps, onComplete]);

  // Handle previous step
  const handlePrevious = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  // Handle skip
  const handleSkip = useCallback(() => {
    onSkip();
  }, [onSkip]);

  const currentStepData = steps[currentStep];

  return (
    <div className="admin-onboarding-overlay" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="admin-onboarding-container">
        {/* Close Button */}
        <button
          className="admin-onboarding-close"
          onClick={handleSkip}
          type="button"
          aria-label={t('common.close')}
        >
          <X size={20} strokeWidth={2} />
        </button>

        {/* Progress Bar */}
        <div className="admin-onboarding-progress">
          <div 
            className="admin-onboarding-progress-bar" 
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Step Indicator */}
        <div className="admin-onboarding-step-indicator">
          {t('admin.onboarding.progress', { current: currentStep + 1, total: totalSteps })}
        </div>

        {/* Content */}
        <div className="admin-onboarding-content">
          <div className="admin-onboarding-icon">
            {currentStepData.icon}
          </div>
          
          <h2 className="admin-onboarding-title">
            {currentStepData.title}
          </h2>
          
          <p className="admin-onboarding-description">
            {currentStepData.content}
          </p>
        </div>

        {/* Navigation */}
        <div className="admin-onboarding-navigation">
          <button
            className={`admin-onboarding-button admin-onboarding-button-secondary ${currentStep === 0 ? "hidden" : ""}`}
            onClick={handlePrevious}
            type="button"
            disabled={currentStep === 0}
          >
            {!isRTL && <ChevronLeft size={20} strokeWidth={2} />}
            <span>{t('admin.onboarding.back')}</span>
            {isRTL && <ChevronRight size={20} strokeWidth={2} />}
          </button>

          {currentStep < totalSteps - 1 ? (
            <button
              className="admin-onboarding-button admin-onboarding-button-primary"
              onClick={handleNext}
              type="button"
            >
              <span>{t('admin.onboarding.next')}</span>
              {!isRTL && <ChevronRight size={20} strokeWidth={2} />}
              {isRTL && <ChevronLeft size={20} strokeWidth={2} />}
            </button>
          ) : (
            <button
              className={`admin-onboarding-button admin-onboarding-button-success ${isCompleting ? "completing" : ""}`}
              onClick={handleNext}
              type="button"
            >
              <span>{t('admin.onboarding.finish')}</span>
              <span className="admin-onboarding-button-icon">🎉</span>
            </button>
          )}

          <button
            className="admin-onboarding-button admin-onboarding-button-skip"
            onClick={handleSkip}
            type="button"
          >
            {t('admin.onboarding.skip')}
          </button>
        </div>

        {/* Step Dots */}
        <div className="admin-onboarding-dots">
          {steps.map((step, index) => (
            <button
              key={step.id}
              className={`admin-onboarding-dot ${index === currentStep ? "active" : ""}`}
              onClick={() => setCurrentStep(index)}
              type="button"
              aria-label={t('common.next') + " " + (index + 1)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}