import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../services/api.ts';
import { expectNoAxeViolations } from '../test/axe.ts';
import { ErrorState, Loading } from './States.tsx';

afterEach(cleanup);

describe('Loading', () => {
  it('the plan skeleton has no scene band', () => {
    const { container } = render(<Loading label="Building your plan" />);
    expect(container.querySelector('[data-part="skeleton-band"]')).toBeNull();
  });

  it('the skeleton is hidden except its label', async () => {
    const { container } = render(<Loading label="Loading forecast" band />);
    const busy = container.querySelector('[aria-busy="true"]');
    expect(busy).not.toBeNull();
    expect(container.textContent).toBe('Loading forecast');
    const band = container.querySelector('[data-part="skeleton-band"]');
    expect(band).not.toBeNull();
    expect(band!.closest('[aria-hidden="true"]')).not.toBeNull();
    await expectNoAxeViolations(container);
  });

  // Cityscape: the forecast band is the skyline's own silhouette, still and
  // neutral, so nothing hints at a result before it loads.
  it('the forecast band is a still skyline silhouette', () => {
    const { container } = render(<Loading label="Loading forecast" band />);
    const band = container.querySelector('[data-part="skeleton-band"]');
    expect(band?.querySelector('svg[data-air="loading"]')).not.toBeNull();
    expect(band!.closest('[aria-hidden="true"]')).not.toBeNull();
    expect(band!.getAttribute('class') ?? '').not.toMatch(/animate-/);
    expect(band!.querySelector('[class*="animate-"]')).toBeNull();
  });

  it('the skeleton pulses only when motion is welcome', () => {
    const { container } = render(<Loading label="Loading forecast" />);
    const pulsing = [...container.querySelectorAll('.animate-pulse')];
    expect(pulsing.length).toBeGreaterThan(0);
    for (const element of pulsing) {
      expect(element.classList.contains('motion-reduce:animate-none')).toBe(
        true,
      );
    }
  });
});

describe('ErrorState', () => {
  const error = new ApiError(
    502,
    'PROVIDER_ERROR',
    'Data provider unavailable.',
  );

  it('the error card keeps its message and retry', async () => {
    const onRetry = vi.fn();
    const { container } = render(
      <ErrorState
        error={error}
        onRetry={onRetry}
        title="We couldn't load the forecast"
      />,
    );
    const alert = screen.getByRole('alert');
    expect(
      screen.getByRole('heading', {
        level: 3,
        name: "We couldn't load the forecast",
      }),
    ).toBeDefined();
    expect(alert.textContent).toContain('Forecast provider unavailable.');
    expect(alert.textContent).not.toMatch(/\b(5\d\d|PROVIDER_ERROR|http)\b/i);
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
    await expectNoAxeViolations(container);
  });

  it('the error card works without a title', () => {
    render(<ErrorState error={error} onRetry={() => {}} />);
    expect(screen.queryByRole('heading')).toBeNull();
    expect(screen.getByText('Forecast provider unavailable.')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeDefined();
  });
});
