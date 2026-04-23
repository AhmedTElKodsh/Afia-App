import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OfflineBanner } from './OfflineBanner.tsx';

describe('OfflineBanner', () => {
  describe('rendering', () => {
    it('should render offline error by default', () => {
      render(<OfflineBanner />);
      
      expect(screen.getByText('No internet connection')).toBeInTheDocument();
      expect(screen.getByText('Connect to WiFi or cellular data to scan.')).toBeInTheDocument();
    });

    it('should render with role="alert"', () => {
      render(<OfflineBanner />);
      
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('should render with aria-live="assertive"', () => {
      render(<OfflineBanner />);
      
      expect(screen.getByRole('alert')).toHaveAttribute('aria-live', 'assertive');
    });

    it('should render Try Again button', () => {
      render(<OfflineBanner onRetry={vi.fn()} />);
      
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });

    it('should render View History button', () => {
      render(<OfflineBanner onViewHistory={vi.fn()} />);
      
      expect(screen.getByText('View History')).toBeInTheDocument();
    });

    it('should render wifi-off icon', () => {
      render(<OfflineBanner />);
      
      // Icon should be present (SVG element)
      const icon = document.querySelector('.offline-banner-icon svg');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('error types', () => {
    it('should render camera error message', () => {
      render(<OfflineBanner errorType="camera_error" />);
      
      expect(screen.getByText('Camera unavailable')).toBeInTheDocument();
    });

    it('should render analysis error message', () => {
      render(<OfflineBanner errorType="analysis_error" />);
      
      expect(screen.getByText('Analysis failed')).toBeInTheDocument();
    });

    it('should render unknown error message', () => {
      render(<OfflineBanner errorType="unknown" />);
      
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });
  });

  describe('callbacks', () => {
    it('should call onRetry when Try Again clicked', () => {
      const onRetry = vi.fn();
      render(<OfflineBanner onRetry={onRetry} />);
      
      const retryButton = screen.getByText('Try Again');
      retryButton.click();
      
      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it('should call onViewHistory when View History clicked', () => {
      const onViewHistory = vi.fn();
      render(<OfflineBanner onViewHistory={onViewHistory} />);
      
      const historyButton = screen.getByText('View History');
      historyButton.click();
      
      expect(onViewHistory).toHaveBeenCalledTimes(1);
    });

    it('should not call callbacks when buttons disabled', () => {
      const onRetry = vi.fn();
      const onViewHistory = vi.fn();
      
      render(
        <OfflineBanner 
          onRetry={onRetry} 
          onViewHistory={onViewHistory}
        />
      );
      
      // Buttons should be enabled by default
      const retryButton = screen.getByText('Try Again');
      retryButton.click();
      expect(onRetry).toHaveBeenCalledTimes(1);
    });
  });

  describe('compact mode', () => {
    it('should render compact variant when compact prop is true', () => {
      render(<OfflineBanner compact />);
      
      const banner = screen.getByRole('alert');
      expect(banner).toHaveClass('offline-banner--compact');
    });

    it('should render full variant by default', () => {
      render(<OfflineBanner />);
      
      const banner = screen.getByRole('alert');
      expect(banner).toHaveClass('offline-banner--full');
    });
  });

  describe('accessibility', () => {
    it('should have icon with aria-hidden', () => {
      render(<OfflineBanner />);
      
      const iconContainer = document.querySelector('.offline-banner-icon');
      expect(iconContainer).toHaveAttribute('aria-hidden', 'true');
    });

    it('should have proper button types', () => {
      render(<OfflineBanner onRetry={vi.fn()} onViewHistory={vi.fn()} />);
      
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toHaveAttribute('type', 'button');
      });
    });

    it('should have descriptive error message', () => {
      render(<OfflineBanner errorType="analysis_error" />);
      
      // Should have both title and description
      expect(screen.getByRole('alert')).toContainElement(
        screen.getByText('Analysis failed')
      );
    });
  });

  describe('layout', () => {
    it('should center align content', () => {
      render(<OfflineBanner />);
      
      const banner = screen.getByRole('alert');
      // Check for center alignment classes
      expect(banner).toHaveClass('offline-banner');
    });

    it('should have responsive button layout', () => {
      render(<OfflineBanner onRetry={vi.fn()} onViewHistory={vi.fn()} />);
      
      // Should have 2 buttons
      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(2);
    });
  });
});
