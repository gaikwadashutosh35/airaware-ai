import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../services/api.ts';
import { expectNoAxeViolations } from '../test/axe.ts';
import { ErrorBoundary, ErrorState, Loading } from './States.tsx';

afterEach(cleanup);

describe('Loading', () => {
  it('the plan skeleton has no scene band', () => {
    const { container } = render(<Loading label="Building your plan" />);
    expect(container.querySelector('[data-part="skeleton-band"]')).toBeNull();
  });

  it('the skeleton is hidden except its label', async () => {
    const { container } = render(<Loading label="Loading forecast" />);
    const busy = container.querySelector('[aria-busy="true"]');
    expect(busy).not.toBeNull();
    expect(container.textContent).toBe('Loading forecast');
    await expectNoAxeViolations(container);
  });

  // Backdrop design §5.4: the app backdrop draws the silhouette now.
  it('loading has no scene band', () => {
    const { container } = render(<Loading label="Loading forecast" />);
    expect(container.querySelector('[data-part="skeleton-band"]')).toBeNull();
    expect(container.querySelector('svg')).toBeNull();
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

describe('ErrorBoundary', () => {
  it('shows a way back instead of a blank page when a child throws', async () => {
    // React reports the caught error itself; keep the test output quiet.
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => {});
    function Broken(): never {
      throw new Error('render failed');
    }
    const { container } = render(
      <ErrorBoundary>
        <Broken />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('alert').textContent).toContain(
      'Something went wrong. Reload the page.',
    );
    expect(screen.getByRole('button', { name: 'Reload page' })).toBeDefined();
    await expectNoAxeViolations(container);
    quiet.mockRestore();
  });
});
