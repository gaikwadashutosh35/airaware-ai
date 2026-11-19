import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { CitySkyline } from './CitySkyline.tsx';

afterEach(cleanup);

function frontHaze(level: 0 | 1 | 2 | 3 | 4 | 5) {
  const { container } = render(<CitySkyline level={level} />);
  const haze = container.querySelector('[data-part="haze-front"]');
  return Number(haze?.getAttribute('opacity') ?? 0);
}

describe('CitySkyline', () => {
  it('is decorative and carries its level', () => {
    const { container } = render(<CitySkyline level={3} />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
    expect(svg?.getAttribute('data-haze-level')).toBe('3');
    expect(container.querySelector('text')).toBeNull();
  });

  it('has no sun when there is no data', () => {
    const { container } = render(<CitySkyline level={0} />);
    expect(container.querySelector('[data-part="sun"]')).toBeNull();
  });

  it('shows a sun when there is data', () => {
    const { container } = render(<CitySkyline level={1} />);
    expect(container.querySelector('[data-part="sun"]')).not.toBeNull();
  });

  it('gets hazier as the level rises', () => {
    const opacities = ([1, 2, 3, 4, 5] as const).map(frontHaze);
    for (let i = 1; i < opacities.length; i++) {
      expect(opacities[i]!).toBeGreaterThan(opacities[i - 1]!);
    }
    expect(opacities[0]!).toBeGreaterThan(0);
  });
});
