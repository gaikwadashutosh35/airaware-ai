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

  it('shows the privacy page at /privacy', async () => {
    window.history.pushState({}, '', '/privacy');

    const { container } = render(<App />);

    expect(screen.getAllByRole('main')).toHaveLength(1);
    expect(
      screen.getByRole('heading', { level: 1, name: 'Privacy' }),
    ).toBeDefined();
    expect(
      screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent),
    ).toEqual([
      'What stays in your browser',
      'What Open-Meteo receives',
      'What the AI writers receive',
      'What Supabase stores',
      'How to delete',
      'No analytics',
    ]);
    // Final review I1 (Claude backup): every recipient is named.
    expect(container.textContent).toContain(
      "Anthropic's Claude, only when Gemini gives no usable answer",
    );
    expect(
      screen.getByRole('link', { name: 'Privacy' }).getAttribute('href'),
    ).toBe('/privacy');
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
