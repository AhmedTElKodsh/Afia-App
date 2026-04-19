import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { OrientationGuide } from './OrientationGuide';

describe('OrientationGuide', () => {
  it('renders when visible prop is true', () => {
    const { getByText } = render(<OrientationGuide visible={true} />);
    expect(getByText(/Handle on Right/i)).toBeInTheDocument();
  });

  it('does not render when visible prop is false', () => {
    const { queryByText } = render(<OrientationGuide visible={false} />);
    expect(queryByText(/Handle on Right/i)).not.toBeInTheDocument();
  });

  it('renders with correct CSS class', () => {
    const { container } = render(<OrientationGuide visible={true} />);
    const guide = container.querySelector('.orientation-guide');
    expect(guide).toBeInTheDocument();
  });

  it('includes directional arrow in text', () => {
    const { getByText } = render(<OrientationGuide visible={true} />);
    const text = getByText(/Handle on Right/i);
    expect(text.textContent).toContain('→');
  });
});
