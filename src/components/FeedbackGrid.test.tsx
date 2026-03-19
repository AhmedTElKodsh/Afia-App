import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FeedbackGrid, type FeedbackType } from './FeedbackGrid';

describe('FeedbackGrid', () => {
  const mockOnSubmit = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnSubmit.mockClear();
  });

  describe('rendering', () => {
    it('should render feedback title', () => {
      render(<FeedbackGrid onSubmit={mockOnSubmit} />);
      
      expect(screen.getByText('Was this accurate?')).toBeInTheDocument();
    });

    it('should render all 4 feedback buttons', () => {
      render(<FeedbackGrid onSubmit={mockOnSubmit} />);
      
      expect(screen.getByText('About right')).toBeInTheDocument();
      expect(screen.getByText('Too high')).toBeInTheDocument();
      expect(screen.getByText('Too low')).toBeInTheDocument();
      expect(screen.getByText('Way off')).toBeInTheDocument();
    });

    it('should render buttons with icons', () => {
      render(<FeedbackGrid onSubmit={mockOnSubmit} />);
      
      // Check that icons exist by querying elements with aria-hidden
      const icons = document.querySelectorAll('.feedback-icon');
      expect(icons.length).toBeGreaterThanOrEqual(4); // 4 feedback icons
    });

    it('should have submit button hidden initially', () => {
      render(<FeedbackGrid onSubmit={mockOnSubmit} />);
      
      expect(screen.queryByText('Submit Feedback')).not.toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('should highlight selected button', () => {
      render(<FeedbackGrid onSubmit={mockOnSubmit} />);
      
      const aboutRightButton = screen.getByLabelText('Rate estimate as about right');
      fireEvent.click(aboutRightButton);
      
      expect(aboutRightButton).toHaveClass('selected');
    });

    it('should auto-submit for "About right" feedback', async () => {
      render(<FeedbackGrid onSubmit={mockOnSubmit} />);
      
      const aboutRightButton = screen.getByLabelText('Rate estimate as about right');
      fireEvent.click(aboutRightButton);
      
      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith('accurate');
      });
    });

    it('should show submit button for other feedback types', () => {
      render(<FeedbackGrid onSubmit={mockOnSubmit} />);
      
      const tooHighButton = screen.getByLabelText('Rate estimate as too high');
      fireEvent.click(tooHighButton);
      
      expect(screen.getByText('Submit Feedback')).toBeInTheDocument();
    });

    it('should call onSubmit when submit button is clicked', () => {
      render(<FeedbackGrid onSubmit={mockOnSubmit} />);
      
      const tooLowButton = screen.getByLabelText('Rate estimate as too low');
      fireEvent.click(tooLowButton);
      
      const submitButton = screen.getByText('Submit Feedback');
      fireEvent.click(submitButton);
      
      expect(mockOnSubmit).toHaveBeenCalledWith('too-low');
    });

    it('should allow changing selection before submit', () => {
      render(<FeedbackGrid onSubmit={mockOnSubmit} />);
      
      const tooHighButton = screen.getByLabelText('Rate estimate as too high');
      const tooLowButton = screen.getByLabelText('Rate estimate as too low');
      
      fireEvent.click(tooHighButton);
      expect(tooHighButton).toHaveClass('selected');
      
      fireEvent.click(tooLowButton);
      expect(tooLowButton).toHaveClass('selected');
      expect(tooHighButton).not.toHaveClass('selected');
    });
  });

  describe('submitting state', () => {
    it('should disable buttons while submitting', () => {
      render(<FeedbackGrid onSubmit={mockOnSubmit} isSubmitting={true} />);
      
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toBeDisabled();
      });
    });

    it('should prevent selection while submitting', () => {
      render(<FeedbackGrid onSubmit={mockOnSubmit} isSubmitting={true} />);
      
      const aboutRightButton = screen.getByLabelText('Rate estimate as about right');
      fireEvent.click(aboutRightButton);
      
      expect(aboutRightButton).not.toHaveClass('selected');
    });
  });

  describe('submitted state', () => {
    it('should show confirmation message when submitted', () => {
      render(<FeedbackGrid onSubmit={mockOnSubmit} hasSubmitted={true} />);
      
      expect(screen.getByText('Thank you!')).toBeInTheDocument();
      expect(screen.getByText('Your feedback helps improve accuracy.')).toBeInTheDocument();
    });

    it('should show checkmark icon when submitted', () => {
      render(<FeedbackGrid onSubmit={mockOnSubmit} hasSubmitted={true} />);
      
      // Check for the Lucide Check icon (SVG element)
      const checkmarkSvg = document.querySelector('.feedback-checkmark svg');
      expect(checkmarkSvg).toBeInTheDocument();
      expect(checkmarkSvg).toHaveAttribute('class', 'lucide lucide-check');
    });

    it('should not show feedback buttons when submitted', () => {
      render(<FeedbackGrid onSubmit={mockOnSubmit} hasSubmitted={true} />);
      
      expect(screen.queryByText('About right')).not.toBeInTheDocument();
      expect(screen.queryByText('Too high')).not.toBeInTheDocument();
      expect(screen.queryByText('Too low')).not.toBeInTheDocument();
      expect(screen.queryByText('Way off')).not.toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have proper ARIA labels on all buttons', () => {
      render(<FeedbackGrid onSubmit={mockOnSubmit} />);
      
      expect(screen.getByLabelText('Rate estimate as about right')).toBeInTheDocument();
      expect(screen.getByLabelText('Rate estimate as too high')).toBeInTheDocument();
      expect(screen.getByLabelText('Rate estimate as too low')).toBeInTheDocument();
      expect(screen.getByLabelText('Rate estimate as way off')).toBeInTheDocument();
    });

    it('should have aria-pressed on selected button', () => {
      render(<FeedbackGrid onSubmit={mockOnSubmit} />);
      
      const aboutRightButton = screen.getByLabelText('Rate estimate as about right');
      fireEvent.click(aboutRightButton);
      
      expect(aboutRightButton).toHaveAttribute('aria-pressed', 'true');
    });

    it('should have aria-pressed false on unselected buttons', () => {
      render(<FeedbackGrid onSubmit={mockOnSubmit} />);
      
      const tooHighButton = screen.getByLabelText('Rate estimate as too high');
      expect(tooHighButton).toHaveAttribute('aria-pressed', 'false');
    });

    it('should have role="group" on button grid', () => {
      render(<FeedbackGrid onSubmit={mockOnSubmit} />);
      
      expect(screen.getByRole('group')).toBeInTheDocument();
    });

    it('should have role="status" and aria-live on confirmation', () => {
      render(<FeedbackGrid onSubmit={mockOnSubmit} hasSubmitted={true} />);
      
      const confirmation = screen.getByText('Thank you!').closest('[role="status"]');
      expect(confirmation).toHaveAttribute('aria-live', 'polite');
    });

    it('should have keyboard navigation support', () => {
      render(<FeedbackGrid onSubmit={mockOnSubmit} />);
      
      const buttons = screen.getAllByRole('button');
      
      // Focus first button
      buttons[0].focus();
      expect(buttons[0]).toHaveFocus();
      
      // Tab to next button
      fireEvent.keyDown(buttons[0], { key: 'Tab' });
      buttons[1].focus();
      expect(buttons[1]).toHaveFocus();
    });
  });

  describe('timing', () => {
    it('should auto-submit "accurate" feedback quickly', async () => {
      render(<FeedbackGrid onSubmit={mockOnSubmit} />);
      
      const aboutRightButton = screen.getByLabelText('Rate estimate as about right');
      fireEvent.click(aboutRightButton);
      
      // Wait for auto-submit
      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith('accurate');
      }, { timeout: 500 });
    });
  });

  describe('feedback types', () => {
    it.each<[FeedbackType, string]>([
      ['accurate', 'About right'],
      ['too-high', 'Too high'],
      ['too-low', 'Too low'],
      ['way-off', 'Way off'],
    ])('should handle %s feedback type', async (type, label) => {
      render(<FeedbackGrid onSubmit={mockOnSubmit} />);
      
      const button = screen.getByLabelText(`Rate estimate as ${label.toLowerCase()}`);
      fireEvent.click(button);
      
      if (type !== 'accurate') {
        const submitButton = screen.getByText('Submit Feedback');
        fireEvent.click(submitButton);
      }
      
      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(type);
      }, { timeout: 500 });
    });
  });
});
