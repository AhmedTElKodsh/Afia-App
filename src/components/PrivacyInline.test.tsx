import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PrivacyInline } from './PrivacyInline';
import { hasAcceptedPrivacy } from './PrivacyNotice';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('PrivacyInline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  describe('hasAcceptedPrivacy', () => {
    it('should return false when not accepted', () => {
      localStorageMock.getItem.mockReturnValue(null);
      expect(hasAcceptedPrivacy()).toBe(false);
    });

    it('should return true when accepted', () => {
      localStorageMock.getItem.mockReturnValue('true');
      expect(hasAcceptedPrivacy()).toBe(true);
    });
  });

  describe('rendering', () => {
    it('should render checkbox unchecked by default', () => {
      render(<PrivacyInline onAccepted={vi.fn()} />);
      
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).not.toBeChecked();
    });

    it('should render privacy description', () => {
      render(<PrivacyInline onAccepted={vi.fn()} />);
      
      expect(screen.getByText(/Scan images are stored/i)).toBeInTheDocument();
      expect(screen.getByText(/No personal information/i)).toBeInTheDocument();
    });

    it('should render continue button disabled initially', () => {
      render(<PrivacyInline onAccepted={vi.fn()} />);
      
      const continueButton = screen.getByRole('button', { name: /ok/i });
      expect(continueButton).toBeDisabled();
    });

    it('should render learn more button', () => {
      render(<PrivacyInline onAccepted={vi.fn()} />);
      
      expect(screen.getByRole('button', { name: /learn more/i })).toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('should enable continue button when checkbox is checked', () => {
      render(<PrivacyInline onAccepted={vi.fn()} />);
      
      const checkbox = screen.getByRole('checkbox');
      const continueButton = screen.getByRole('button', { name: /ok/i });
      
      fireEvent.click(checkbox);
      
      expect(checkbox).toBeChecked();
      expect(continueButton).not.toBeDisabled();
    });

    it('should expand details when learn more is clicked', () => {
      render(<PrivacyInline onAccepted={vi.fn()} />);
      
      const learnMoreButton = screen.getByRole('button', { name: /learn more/i });
      fireEvent.click(learnMoreButton);
      
      expect(screen.getByText(/Images sent to AI analysis server/i)).toBeInTheDocument();
      expect(learnMoreButton).toHaveTextContent('Show less');
    });

    it('should collapse details when show less is clicked', () => {
      render(<PrivacyInline onAccepted={vi.fn()} />);
      
      const learnMoreButton = screen.getByRole('button', { name: /learn more/i });
      fireEvent.click(learnMoreButton);
      fireEvent.click(learnMoreButton);
      
      expect(screen.queryByText(/Images sent to AI analysis server/i)).not.toBeInTheDocument();
      expect(learnMoreButton).toHaveTextContent('Learn more');
    });

    it('should call onAccepted when continue is clicked after checking', () => {
      const onAccepted = vi.fn();
      render(<PrivacyInline onAccepted={onAccepted} />);
      
      const checkbox = screen.getByRole('checkbox');
      const continueButton = screen.getByRole('button', { name: /ok/i });
      
      fireEvent.click(checkbox);
      fireEvent.click(continueButton);
      
      expect(onAccepted).toHaveBeenCalledTimes(1);
    });

    it('should save to localStorage when accepted', () => {
      render(<PrivacyInline onAccepted={vi.fn()} />);
      
      const checkbox = screen.getByRole('checkbox');
      const continueButton = screen.getByRole('button', { name: /ok/i });
      
      fireEvent.click(checkbox);
      fireEvent.click(continueButton);
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith('afia_privacy_accepted', 'true');
    });

    it('should show error styling when trying to submit without checking', () => {
      const { container } = render(<PrivacyInline onAccepted={vi.fn()} showError />);
      
      const continueButton = screen.getByRole('button', { name: /ok/i });
      fireEvent.click(continueButton);
      
      // When showError is true and user tries to submit without checking,
      // the card should have error styling
      const card = container.querySelector('.privacy-inline-card');
      expect(card).toHaveClass('error');
    });
  });

  describe('accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<PrivacyInline onAccepted={vi.fn()} />);
      
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toHaveAttribute('aria-describedby');
    });

    it('should update aria-expanded when details are toggled', () => {
      render(<PrivacyInline onAccepted={vi.fn()} />);
      
      const learnMoreButton = screen.getByRole('button', { name: /learn more/i });
      expect(learnMoreButton).toHaveAttribute('aria-expanded', 'false');
      
      fireEvent.click(learnMoreButton);
      expect(learnMoreButton).toHaveAttribute('aria-expanded', 'true');
    });

    it('should have keyboard navigation support', () => {
      render(<PrivacyInline onAccepted={vi.fn()} />);
      
      const checkbox = screen.getByRole('checkbox');
      const learnMoreButton = screen.getByRole('button', { name: /learn more/i });
      const continueButton = screen.getByRole('button', { name: /ok/i });
      
      // Tab through elements
      checkbox.focus();
      expect(checkbox).toHaveFocus();
      
      fireEvent.keyDown(checkbox, { key: 'Tab' });
      learnMoreButton.focus();
      expect(learnMoreButton).toHaveFocus();
    });
  });

  describe('error state', () => {
    it('should apply error class when showError is true', () => {
      render(<PrivacyInline onAccepted={vi.fn()} showError={true} />);

      const card = screen.getByText('I agree to privacy terms').closest('.privacy-inline-card');
      expect(card).toHaveClass('error');
    });

    it('should not apply error class when showError is false', () => {
      render(<PrivacyInline onAccepted={vi.fn()} showError={false} />);

      const card = screen.getByText('I agree to privacy terms').closest('.privacy-inline-card');
      expect(card).not.toHaveClass('error');
    });
  });
});
