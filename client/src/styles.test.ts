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
    // A fallback font is scaled to Inter's x-height, so the swap barely moves text.
    expect(css).toMatch(/body\s*{[^}]*font-size-adjust: from-font;/);
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
});
