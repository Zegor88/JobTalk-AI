import { render, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import { BottomNav } from './BottomNav';

describe('BottomNav', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders correctly and matches snapshot', () => {
    const { container } = render(<BottomNav />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('contains an inbox button', () => {
    const { getByRole } = render(<BottomNav />);
    const button = getByRole('button', { name: /inbox/i });
    expect(button).toBeDefined();
  });
});
