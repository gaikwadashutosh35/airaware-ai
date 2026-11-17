import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import App from './App.tsx';
import { expectNoAxeViolations } from './test/axe.ts';

describe('App', () => {
  afterEach(() => {
    cleanup();
    window.history.pushState({}, '', '/');
  });

  it('shows the landing page at /', async () => {
    const { container } = render(<App />);

    expect(screen.getAllByRole('main')).toHaveLength(1);
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'The air around you matters.',
      }),
    ).toBeDefined();
    await expectNoAxeViolations(container);
  });

  it('shows the dashboard at /app', async () => {
    window.history.pushState({}, '', '/app');

    const { container } = render(<App />);

    expect(screen.getAllByRole('main')).toHaveLength(1);
    expect(
      screen.getByRole('heading', { level: 1, name: 'Air quality near you' }),
    ).toBeDefined();
    await expectNoAxeViolations(container);
  });
});
