import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { expectNoAxeViolations } from '../../test/axe.ts';
import { AskBox } from './AskBox.tsx';

const STARTERS = [
  'Can I go for a morning walk today?',
  'Is it a good idea to open my windows?',
  'How can I improve my indoor air?',
];

const input = () =>
  screen.getByRole('textbox', {
    name: 'Ask about your air, home or day',
  }) as HTMLInputElement;

beforeEach(() => {
  window.history.replaceState(null, '', '/app?place=Pune');
});
afterEach(cleanup);

describe('AskBox', () => {
  it('lays an aria-hidden cycling hint over the empty box, hidden on focus or text', () => {
    const { container } = render(
      <AskBox onAsk={vi.fn()} active started={false} />,
    );
    expect(input().getAttribute('placeholder')).toBeNull();
    expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull();
    fireEvent.focus(input());
    expect(container.querySelector('[aria-hidden="true"]')).toBeNull();
    fireEvent.blur(input());
    expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull();
    fireEvent.change(input(), { target: { value: ' ' } });
    expect(container.querySelector('[aria-hidden="true"]')).toBeNull();
  });

  it('runs no hint timer while Today is hidden, and resumes when shown', () => {
    vi.useFakeTimers();
    try {
      const { container, rerender } = render(
        <AskBox onAsk={vi.fn()} active={false} started={false} />,
      );
      expect(container.querySelector('[aria-hidden="true"]')).toBeNull();
      expect(vi.getTimerCount()).toBe(0);
      vi.advanceTimersByTime(60000);
      expect(container.querySelector('[aria-hidden="true"]')).toBeNull();
      rerender(<AskBox onAsk={vi.fn()} active started={false} />);
      expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull();
      expect(vi.getTimerCount()).toBeGreaterThan(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it('once a question has been asked the hint is the first example, still', () => {
    vi.useFakeTimers();
    try {
      const { container } = render(<AskBox onAsk={vi.fn()} active started />);
      expect(container.querySelector('[aria-hidden="true"]')?.textContent).toBe(
        'Can I go for a morning walk today?',
      );
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it('has no axe violations', async () => {
    const { container } = render(
      <AskBox onAsk={vi.fn()} active started={false} />,
    );
    await expectNoAxeViolations(container);
  });

  it('the ask box sends its question in memory, not the address', () => {
    const onAsk = vi.fn();
    render(<AskBox onAsk={onAsk} active started={false} />);

    fireEvent.change(input(), {
      target: { value: '  Is smoke from the next street a problem?  ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    expect(onAsk).toHaveBeenCalledWith(
      'Is smoke from the next street a problem?',
    );
    expect(window.location.pathname).toBe('/app/ask');
    expect(window.location.search).toBe('?place=Pune');
    expect(window.location.href).not.toMatch(/smoke/i);
  });

  it('moves focus to the page it opens', () => {
    render(
      <main id="main" tabIndex={-1}>
        <AskBox onAsk={vi.fn()} active started={false} />
      </main>,
    );

    fireEvent.change(input(), { target: { value: 'Is today windy?' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    expect(document.activeElement?.id).toBe('main');
  });

  // The browser asks for a question instead of doing nothing.
  it('needs a question', () => {
    render(<AskBox onAsk={vi.fn()} active started={false} />);

    expect(input().required).toBe(true);
  });

  it('sends nothing when the box is empty', () => {
    const onAsk = vi.fn();
    render(<AskBox onAsk={onAsk} active started={false} />);

    fireEvent.change(input(), { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    expect(onAsk).not.toHaveBeenCalled();
    expect(window.location.pathname).toBe('/app');
  });

  it('starter questions fill the ask box', () => {
    const onAsk = vi.fn();
    render(<AskBox onAsk={onAsk} active started={false} />);

    for (const question of STARTERS) {
      fireEvent.click(screen.getByRole('button', { name: question }));
      expect(input().value).toBe(question);
      expect(document.activeElement).toBe(input());
    }
    expect(onAsk).not.toHaveBeenCalled();
  });

  it('starter buttons use the control border', () => {
    render(<AskBox onAsk={vi.fn()} active started={false} />);

    const button = screen.getByRole('button', { name: STARTERS[0]! });
    expect(button.classList.contains('border-text-dark-muted')).toBe(true);
    expect(button.classList.contains('border-rule')).toBe(false);
  });

  it('the input row wraps, so Send can drop below at large text', () => {
    render(<AskBox onAsk={vi.fn()} active started={false} />);

    expect(
      input().parentElement!.parentElement!.classList.contains('flex-wrap'),
    ).toBe(true);
  });

  it('keeps questions short and says send on the keyboard', async () => {
    const { container } = render(
      <AskBox onAsk={vi.fn()} active started={false} />,
    );

    expect(
      screen.getByRole('heading', { level: 2, name: 'Ask AirAware anything' }),
    ).toBeDefined();
    expect(input().maxLength).toBe(200);
    expect(input().getAttribute('enterkeyhint')).toBe('send');
    await expectNoAxeViolations(container);
  });
});
