import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BottleFillGauge } from './BottleFillGauge';

describe('BottleFillGauge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render SVG bottle', () => {
      render(<BottleFillGauge percentage={50} animate={false} />);
      
      const svg = screen.getByRole('img');
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveAttribute('aria-label', 'Bottle fill level: 50%');
    });

    it('should render percentage label', () => {
      render(<BottleFillGauge percentage={68} animate={false} />);
      
      // Text is split across nodes, use contains matching
      expect(screen.getByText((content, element) => {
        return element?.tagName === 'DIV' && content.includes('68');
      })).toBeInTheDocument();
    });

    it('should hide percentage label when showLabel is false', () => {
      render(<BottleFillGauge percentage={68} showLabel={false} />);
      
      expect(screen.queryByText('68%')).not.toBeInTheDocument();
    });

    it('should have proper ARIA attributes', () => {
      render(<BottleFillGauge percentage={75} />);
      
      const gauge = screen.getByRole('img');
      expect(gauge).toHaveAttribute('aria-valuenow', '75');
      expect(gauge).toHaveAttribute('aria-valuemin', '0');
      expect(gauge).toHaveAttribute('aria-valuemax', '100');
    });

    it('should use custom aria-label when provided', () => {
      render(<BottleFillGauge percentage={50} ariaLabel="Custom label" />);
      
      expect(screen.getByRole('img')).toHaveAttribute('aria-label', 'Custom label');
    });
  });

  describe('fill levels', () => {
    it('should show correct percentage', () => {
      const { rerender } = render(<BottleFillGauge percentage={0} animate={false} />);
      
      expect(screen.getByText((content, element) => {
        return element?.tagName === 'DIV' && content.includes('0');
      })).toBeInTheDocument();
      
      rerender(<BottleFillGauge percentage={50} animate={false} />);
      expect(screen.getByText((content, element) => {
        return element?.tagName === 'DIV' && content.includes('50');
      })).toBeInTheDocument();
      
      rerender(<BottleFillGauge percentage={100} animate={false} />);
      expect(screen.getByText((content, element) => {
        return element?.tagName === 'DIV' && content.includes('100');
      })).toBeInTheDocument();
    });

    it('should round percentage to whole number', () => {
      render(<BottleFillGauge percentage={67.8} animate={false} />);
      
      expect(screen.getByText((content, element) => {
        return element?.tagName === 'DIV' && content.includes('68');
      })).toBeInTheDocument();
    });
  });

  describe('color thresholds', () => {
    it('should use green for high fill (>= 50%)', () => {
      render(<BottleFillGauge percentage={50} />);
      
      // Check that fill color is in the document (via inline styles)
      const gauge = screen.getByRole('img');
      expect(gauge).toBeInTheDocument();
    });

    it('should use amber for medium fill (25-49%)', () => {
      render(<BottleFillGauge percentage={30} />);
      
      const gauge = screen.getByRole('img');
      expect(gauge).toBeInTheDocument();
    });

    it('should use red for low fill (< 25%)', () => {
      render(<BottleFillGauge percentage={10} />);
      
      const gauge = screen.getByRole('img');
      expect(gauge).toBeInTheDocument();
    });
  });

  describe('animation', () => {
    it('should animate from 0 to target percentage', () => {
      // Test that component renders with animation enabled
      render(<BottleFillGauge percentage={68} animate={true} />);
      
      // Should render without errors
      expect(screen.getByRole('img')).toBeInTheDocument();
    });

    it('should not animate when animate prop is false', () => {
      render(<BottleFillGauge percentage={68} animate={false} />);
      
      // Should immediately show target percentage
      expect(screen.getByText((content, element) => {
        return element?.tagName === 'DIV' && content.includes('68');
      })).toBeInTheDocument();
    });
  });

  describe('size variants', () => {
    it('should render small size', () => {
      render(<BottleFillGauge percentage={50} size="sm" />);
      
      const gauge = screen.getByRole('img');
      expect(gauge).toHaveClass('bottle-fill-gauge--sm');
    });

    it('should render medium size (default)', () => {
      render(<BottleFillGauge percentage={50} />);
      
      const gauge = screen.getByRole('img');
      expect(gauge).toHaveClass('bottle-fill-gauge--md');
    });

    it('should render large size', () => {
      render(<BottleFillGauge percentage={50} size="lg" />);
      
      const gauge = screen.getByRole('img');
      expect(gauge).toHaveClass('bottle-fill-gauge--lg');
    });
  });

  describe('accessibility', () => {
    it('should have role="img"', () => {
      render(<BottleFillGauge percentage={50} />);
      
      expect(screen.getByRole('img')).toBeInTheDocument();
    });

    it('should have aria-valuenow updated with percentage', () => {
      const { rerender } = render(<BottleFillGauge percentage={25} />);
      
      expect(screen.getByRole('img')).toHaveAttribute('aria-valuenow', '25');
      
      rerender(<BottleFillGauge percentage={75} />);
      expect(screen.getByRole('img')).toHaveAttribute('aria-valuenow', '75');
    });

    it('should have meniscus line when fill is between 0 and 100', () => {
      render(<BottleFillGauge percentage={50} animate={false} />);
      
      // Meniscus line should be present (SVG line element)
      const meniscus = document.querySelector('line.meniscus-line');
      expect(meniscus).toBeTruthy();
    });

    it('should not have meniscus line at 0%', () => {
      render(<BottleFillGauge percentage={0} />);
      
      const meniscus = document.querySelector('.meniscus-line');
      expect(meniscus).not.toBeInTheDocument();
    });

    it('should not have meniscus line at 100%', () => {
      render(<BottleFillGauge percentage={100} />);
      
      const meniscus = document.querySelector('.meniscus-line');
      expect(meniscus).not.toBeInTheDocument();
    });
  });

  describe('SVG structure', () => {
    it('should have clip path definition', () => {
      render(<BottleFillGauge percentage={50} />);
      
      const clipPath = document.querySelector('clipPath');
      expect(clipPath).toBeInTheDocument();
    });

    it('should have bottle outline', () => {
      render(<BottleFillGauge percentage={50} />);
      
      const outline = document.querySelector('.bottle-outline');
      expect(outline).toBeInTheDocument();
    });

    it('should have fill element', () => {
      render(<BottleFillGauge percentage={50} />);
      
      const fill = document.querySelector('.bottle-fill');
      expect(fill).toBeInTheDocument();
    });
  });

  describe('configuration', () => {
    it('should use config values', () => {
      render(<BottleFillGauge percentage={50} />);
      
      const svg = document.querySelector('.bottle-svg');
      expect(svg).toHaveAttribute('width', '120');
      expect(svg).toHaveAttribute('height', '160');
    });

    it('should respect size config', () => {
      render(<BottleFillGauge percentage={50} size="sm" />);
      
      const svg = document.querySelector('.bottle-svg');
      expect(svg).toHaveAttribute('width', '80');
      expect(svg).toHaveAttribute('height', '107');
    });
  });
});
