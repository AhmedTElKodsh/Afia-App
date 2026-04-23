import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ConfidenceBadge } from './ConfidenceBadge.tsx';
import { CONFIDENCE_CONFIG } from '../config/confidence.ts';

describe('ConfidenceBadge', () => {
  describe('rendering', () => {
    it('should render high confidence badge', () => {
      render(<ConfidenceBadge level="high" />);
      
      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByText('High confidence')).toBeInTheDocument();
    });

    it('should render medium confidence badge', () => {
      render(<ConfidenceBadge level="medium" />);
      
      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByText('Medium confidence - verify if possible')).toBeInTheDocument();
    });

    it('should render low confidence badge', () => {
      render(<ConfidenceBadge level="low" />);
      
      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByText('Low confidence - consider retaking')).toBeInTheDocument();
    });

    it('should render custom reason for low confidence', () => {
      render(<ConfidenceBadge level="low" reason="Blurry image" />);
      
      expect(screen.getByText('- Blurry image')).toBeInTheDocument();
    });

    it('should not render reason for high confidence', () => {
      render(<ConfidenceBadge level="high" reason="Should not show" />);
      
      expect(screen.queryByText('- Should not show')).not.toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have role="status"', () => {
      render(<ConfidenceBadge level="high" />);
      
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('should have default aria-label', () => {
      render(<ConfidenceBadge level="high" />);
      
      expect(screen.getByRole('status')).toHaveAttribute(
        'aria-label',
        'High confidence'
      );
    });

    it('should use custom aria-label when provided', () => {
      render(<ConfidenceBadge level="high" ariaLabel="Custom label" />);
      
      expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Custom label');
    });

    it('should have icon with aria-hidden', () => {
      render(<ConfidenceBadge level="high" />);
      
      const icon = document.querySelector('.confidence-icon');
      expect(icon).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('size variants', () => {
    it('should render small size', () => {
      render(<ConfidenceBadge level="high" size="sm" />);
      
      expect(screen.getByRole('status')).toHaveClass('confidence-badge--sm');
    });

    it('should render medium size (default)', () => {
      render(<ConfidenceBadge level="high" />);
      
      expect(screen.getByRole('status')).toHaveClass('confidence-badge--md');
    });
  });

  describe('color coding', () => {
    it('should have green color for high confidence', () => {
      render(<ConfidenceBadge level="high" />);
      
      const badge = screen.getByRole('status');
      expect(badge).toHaveClass('confidence-badge--high');
    });

    it('should have amber color for medium confidence', () => {
      render(<ConfidenceBadge level="medium" />);
      
      const badge = screen.getByRole('status');
      expect(badge).toHaveClass('confidence-badge--medium');
    });

    it('should have red color for low confidence', () => {
      render(<ConfidenceBadge level="low" />);
      
      const badge = screen.getByRole('status');
      expect(badge).toHaveClass('confidence-badge--low');
    });
  });

  describe('icons', () => {
    it('should show check icon for high confidence', () => {
      render(<ConfidenceBadge level="high" />);
      
      // Lucide Check icon should be present
      const icon = document.querySelector('.confidence-icon svg');
      expect(icon).toBeInTheDocument();
    });

    it('should show alert icon for medium confidence', () => {
      render(<ConfidenceBadge level="medium" />);
      
      const icon = document.querySelector('.confidence-icon svg');
      expect(icon).toBeInTheDocument();
    });

    it('should show X icon for low confidence', () => {
      render(<ConfidenceBadge level="low" />);
      
      const icon = document.querySelector('.confidence-icon svg');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('configuration', () => {
    it('should use config messages', () => {
      render(<ConfidenceBadge level="high" />);
      
      expect(screen.getByText(CONFIDENCE_CONFIG.messages.high)).toBeInTheDocument();
    });

    it('should use config colors', () => {
      const { container } = render(<ConfidenceBadge level="high" />);
      
      const badge = container.querySelector('.confidence-badge');
      expect(badge).toHaveStyle('--badge-text: #10b981');
    });
  });

  describe('CSS custom properties', () => {
    it('should set badge background color', () => {
      const { container } = render(<ConfidenceBadge level="high" />);
      
      const badge = container.querySelector('.confidence-badge');
      expect(badge).toHaveStyle('--badge-bg: rgba(16, 185, 129, 0.15)');
    });

    it('should set badge border color', () => {
      const { container } = render(<ConfidenceBadge level="high" />);
      
      const badge = container.querySelector('.confidence-badge');
      expect(badge).toHaveStyle('--badge-border: #10b981');
    });

    it('should set badge text color', () => {
      const { container } = render(<ConfidenceBadge level="high" />);
      
      const badge = container.querySelector('.confidence-badge');
      expect(badge).toHaveStyle('--badge-text: #10b981');
    });
  });
});
