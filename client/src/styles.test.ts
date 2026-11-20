/// <reference types="node" />
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Vitest runs from client/, and stubs CSS imports, so read the files.
const css = readFileSync('src/index.css', 'utf8');
// Whitespace collapsed, so Prettier's line breaks inside a tag don't matter.
const html = readFileSync('index.html', 'utf8').replace(/\s+/g, ' ');
const FONT = '/fonts/inter-latin-wght-normal.woff2';

describe('design system base', () => {
  it('Inter loads from our own server, without hiding text', () => {
    const face = css.match(/@font-face\s*{[^}]*}/)?.[0] ?? '';
    expect(face).toContain('font-family: Inter;');
    expect(face).toContain(`src: url('${FONT}') format('woff2');`);
    expect(face).toContain('font-weight: 100 900;');
    expect(face).toContain('font-display: swap;');
    expect(html).toContain(
      `<link rel="preload" href="${FONT}" as="font" type="font/woff2" crossorigin />`,
    );
    const file = readFileSync(`public${FONT}`);
    expect(file.subarray(0, 4).toString('latin1')).toBe('wOF2');
    // Final review: `font-size-adjust: from-font` measured as a no-op in
    // Chromium (Inter's x-height is unknown until it loads), so no claim of it.
    expect(css).not.toContain('font-size-adjust');
  });

  it('the favicon is a real icon', () => {
    expect(html).toContain(
      '<link rel="icon" href="/favicon.svg" type="image/svg+xml" />',
    );
    expect(html).not.toContain('data:,');
    expect(existsSync('public/favicon.svg')).toBe(true);
  });

  it('the elevated surface token exists', () => {
    expect(css).toContain('--color-elevated: #172638;');
  });

  it('presses scale only when motion is welcome', () => {
    const start = css.indexOf('@media (prefers-reduced-motion: no-preference)');
    expect(start).toBeGreaterThan(-1);
    // The block ends at the first line that closes at its own indent.
    const block = css.slice(start, css.indexOf('\n  }', start));
    expect(block).toMatch(
      /button:not\(:disabled\)[^{]*{[^}]*transition: transform 120ms cubic-bezier\(0\.23, 1, 0\.32, 1\)/,
    );
    expect(block).toMatch(
      /button:not\(:disabled\):active[^{]*{[^}]*transform: scale\(0\.97\)/,
    );
    // No press scale anywhere else, so reduced motion and disabled stay still.
    expect(css.split('scale(0.97)').length - 1).toBe(
      block.split('scale(0.97)').length - 1,
    );
  });

  it('phones show no grey tap flash and no tap delay', () => {
    // Final review: the flash goes only where the press scale replaces it, so
    // a reduced-motion tap still gets the browser's own feedback.
    const start = css.indexOf('@media (prefers-reduced-motion: no-preference)');
    const block = css.slice(start, css.indexOf('\n  }', start));
    expect(block).toMatch(
      /html\s*{[^}]*-webkit-tap-highlight-color: transparent;/,
    );
    expect(css.split('-webkit-tap-highlight-color').length - 1).toBe(1);
    expect(css).toMatch(
      /a,\s*button,\s*summary,\s*input,\s*select,\s*label\s*{[^}]*touch-action: manipulation;/,
    );
  });

  it("button labels can't be selected by a long press", () => {
    expect(css).toMatch(/\bbutton\s*{[^}]*user-select: none;/);
    expect(css).not.toMatch(/body\s*{[^}]*user-select: none/);
  });
});
