import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { OrientationGuide } from './OrientationGuide.tsx';

describe('OrientationGuide', () => {
  const orientationTextMatcher = /frontside with handle on the right/i;

  it('renders when visible prop is true', () => {
    const { getByText } = render(<OrientationGuide visible={true} />);
    expect(getByText(orientationTextMatcher)).toBeInTheDocument();
  });

  it('does not render when visible prop is false', () => {
    const { queryByText } = render(<OrientationGuide visible={false} />);
    expect(queryByText(orientationTextMatcher)).not.toBeInTheDocument();
  });

  it('renders with correct CSS class', () => {
    const { container } = render(<OrientationGuide visible={true} />);
    const guide = container.querySelector('.orientation-guide');
    expect(guide).toBeInTheDocument();
  });

  it('includes directional arrow in text', () => {
    const { getByText } = render(<OrientationGuide visible={true} />);
    const text = getByText(orientationTextMatcher);
    expect(text.textContent).toContain('→');
  });
});
