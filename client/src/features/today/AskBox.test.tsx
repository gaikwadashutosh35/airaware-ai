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
  it('the ask box sends its question in memory, not the address', () => {
    const onAsk = vi.fn();
    render(<AskBox onAsk={onAsk} />);

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

  it('sends nothing when the box is empty', () => {
    const onAsk = vi.fn();
    render(<AskBox onAsk={onAsk} />);

    fireEvent.change(input(), { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    expect(onAsk).not.toHaveBeenCalled();
    expect(window.location.pathname).toBe('/app');
  });

  it('starter questions fill the ask box', () => {
    const onAsk = vi.fn();
    render(<AskBox onAsk={onAsk} />);

    for (const question of STARTERS) {
      fireEvent.click(screen.getByRole('button', { name: question }));
      expect(input().value).toBe(question);
      expect(document.activeElement).toBe(input());
    }
    expect(onAsk).not.toHaveBeenCalled();
  });

  it('keeps questions short and says send on the keyboard', async () => {
    const { container } = render(<AskBox onAsk={vi.fn()} />);

    expect(
      screen.getByRole('heading', { level: 2, name: 'Ask AirAware anything' }),
    ).toBeDefined();
    expect(input().maxLength).toBe(200);
    expect(input().getAttribute('enterkeyhint')).toBe('send');
    await expectNoAxeViolations(container);
  });
});
