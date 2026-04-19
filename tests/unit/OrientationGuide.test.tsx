import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { OrientationGuide } from '../../src/components/OrientationGuide';

describe('OrientationGuide', () => {
  it('renders when visible prop is true', () => {
    const { getByText } = render(<OrientationGuide visible={true} />);
    expect(getByText(/Handle on Right/i)).toBeInTheDocument();
  });

  it('does not render when visible prop is false', () => {
    const { queryByText } = render(<OrientationGuide visible={false} />);
    expect(queryByText(/Handle on Right/i)).not.toBeInTheDocument();
  });

  it('has correct CSS class for styling', () => {
    const { container } = render(<OrientationGuide visible={true} />);
    const guide = container.querySelector('.orientation-guide');
    expect(guide).toBeInTheDocument();
  });

  it('contains directional arrow in text', () => {
    const { getByText } = render(<OrientationGuide visible={true} />);
    expect(getByText(/→/)).toBeInTheDocument();
  });
});
