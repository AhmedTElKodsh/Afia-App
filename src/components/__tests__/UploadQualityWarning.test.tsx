/**
 * Upload Quality Warning Component Tests
 * Story 7.8 - Service Worker Smart Upload Filtering
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { UploadQualityWarning } from '../UploadQualityWarning';

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue?: string) => defaultValue || key,
  }),
}));

describe('UploadQualityWarning', () => {
  const mockOnRetake = vi.fn();
  const mockOnContinue = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render dialog with title and message', () => {
    const reasons = ['Photo appears blurry'];

    render(
      <UploadQualityWarning
        reasons={reasons}
        onRetake={mockOnRetake}
        onContinue={mockOnContinue}
      />
    );

    expect(screen.getByText('Photo Quality Warning')).toBeInTheDocument();
    expect(screen.getByText('This photo may not give a good result:')).toBeInTheDocument();
  });

  it('should render all quality warning reasons', () => {
    const reasons = [
      'Photo appears blurry — hold the camera steady',
      'Photo is too dark — try better lighting',
      'Bottle not clearly visible — center the bottle in frame',
    ];

    render(
      <UploadQualityWarning
        reasons={reasons}
        onRetake={mockOnRetake}
        onContinue={mockOnContinue}
      />
    );

    reasons.forEach(reason => {
      expect(screen.getByText(reason)).toBeInTheDocument();
    });
  });

  it('should render single reason', () => {
    const reasons = ['Photo is overexposed — avoid direct light'];

    render(
      <UploadQualityWarning
        reasons={reasons}
        onRetake={mockOnRetake}
        onContinue={mockOnContinue}
      />
    );

    expect(screen.getByText(reasons[0])).toBeInTheDocument();
  });

  it('should render Retake Photo button', () => {
    const reasons = ['Photo appears blurry'];

    render(
      <UploadQualityWarning
        reasons={reasons}
        onRetake={mockOnRetake}
        onContinue={mockOnContinue}
      />
    );

    const retakeButton = screen.getByText('Retake Photo');
    expect(retakeButton).toBeInTheDocument();
    expect(retakeButton).toHaveClass('btn-primary');
  });

  it('should render Continue Anyway button', () => {
    const reasons = ['Photo appears blurry'];

    render(
      <UploadQualityWarning
        reasons={reasons}
        onRetake={mockOnRetake}
        onContinue={mockOnContinue}
      />
    );

    const continueButton = screen.getByText('Continue Anyway');
    expect(continueButton).toBeInTheDocument();
    expect(continueButton).toHaveClass('btn-secondary');
  });

  it('should call onRetake when Retake Photo button is clicked', () => {
    const reasons = ['Photo appears blurry'];

    render(
      <UploadQualityWarning
        reasons={reasons}
        onRetake={mockOnRetake}
        onContinue={mockOnContinue}
      />
    );

    const retakeButton = screen.getByText('Retake Photo');
    fireEvent.click(retakeButton);

    expect(mockOnRetake).toHaveBeenCalledTimes(1);
    expect(mockOnContinue).not.toHaveBeenCalled();
  });

  it('should call onContinue when Continue Anyway button is clicked', () => {
    const reasons = ['Photo appears blurry'];

    render(
      <UploadQualityWarning
        reasons={reasons}
        onRetake={mockOnRetake}
        onContinue={mockOnContinue}
      />
    );

    const continueButton = screen.getByText('Continue Anyway');
    fireEvent.click(continueButton);

    expect(mockOnContinue).toHaveBeenCalledTimes(1);
    expect(mockOnRetake).not.toHaveBeenCalled();
  });

  it('should have proper ARIA attributes for accessibility', () => {
    const reasons = ['Photo appears blurry'];

    render(
      <UploadQualityWarning
        reasons={reasons}
        onRetake={mockOnRetake}
        onContinue={mockOnContinue}
      />
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'quality-warning-title');
  });

  it('should have warning icon', () => {
    const reasons = ['Photo appears blurry'];

    const { container } = render(
      <UploadQualityWarning
        reasons={reasons}
        onRetake={mockOnRetake}
        onContinue={mockOnContinue}
      />
    );

    const icon = container.querySelector('.quality-warning-icon');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveAttribute('aria-hidden', 'true');
  });

  it('should auto-focus Retake Photo button', () => {
    const reasons = ['Photo appears blurry'];

    render(
      <UploadQualityWarning
        reasons={reasons}
        onRetake={mockOnRetake}
        onContinue={mockOnContinue}
      />
    );

    const retakeButton = screen.getByText('Retake Photo');
    expect(retakeButton).toHaveAttribute('autoFocus');
  });

  it('should render empty reasons list gracefully', () => {
    const reasons: string[] = [];

    render(
      <UploadQualityWarning
        reasons={reasons}
        onRetake={mockOnRetake}
        onContinue={mockOnContinue}
      />
    );

    expect(screen.getByText('Photo Quality Warning')).toBeInTheDocument();
    expect(screen.getByText('Retake Photo')).toBeInTheDocument();
    expect(screen.getByText('Continue Anyway')).toBeInTheDocument();
  });

  it('should apply correct CSS classes', () => {
    const reasons = ['Photo appears blurry'];

    const { container } = render(
      <UploadQualityWarning
        reasons={reasons}
        onRetake={mockOnRetake}
        onContinue={mockOnContinue}
      />
    );

    expect(container.querySelector('.quality-warning-overlay')).toBeInTheDocument();
    expect(container.querySelector('.quality-warning-dialog')).toBeInTheDocument();
    expect(container.querySelector('.quality-warning-title')).toBeInTheDocument();
    expect(container.querySelector('.quality-warning-message')).toBeInTheDocument();
    expect(container.querySelector('.quality-warning-reasons')).toBeInTheDocument();
    expect(container.querySelector('.quality-warning-actions')).toBeInTheDocument();
  });
});
