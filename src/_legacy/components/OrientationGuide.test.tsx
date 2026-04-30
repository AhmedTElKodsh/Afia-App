import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { OrientationGuide } from './OrientationGuide';

describe('OrientationGuide', () => {
  it('renders when visible prop is true', () => {
    const { getByText } = render(<OrientationGuide visible={true} />);
    expect(getByText(/shoot the frontside/i)).toBeInTheDocument();
  });

  it('does not render when visible prop is false', () => {
    const { queryByText } = render(<OrientationGuide visible={false} />);
    expect(queryByText(/shoot the frontside/i)).not.toBeInTheDocument();
  });

  it('renders with correct CSS class', () => {
    const { container } = render(<OrientationGuide visible={true} />);
    const guide = container.querySelector('.orientation-guide');
    expect(guide).toBeInTheDocument();
  });

  it('includes directional arrow in text', () => {
    const { getByText } = render(<OrientationGuide visible={true} />);
    const text = getByText(/shoot the frontside/i);
    expect(text.textContent).toContain('→');
  });
});
