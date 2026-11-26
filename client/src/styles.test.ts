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

  // B11: the title block and the stale banner sit on the page's pale
  // sky or a solid warning fill, so their focus ring is the dark text colour.
  it('the title block and the stale banner take the dark focus ring', () => {
    // Whitespace collapsed, so Prettier's line breaks don't matter.
    const flat = css.replace(/\s+/g, ' ');
    const rule =
      "[data-part='title-block'] :focus-visible, [data-part='stale-banner'] :focus-visible { outline-color: var(--color-text-dark); }";
    expect(flat).toContain(rule);
    expect(flat.indexOf(rule)).toBeGreaterThan(
      flat.indexOf('.on-dark .on-light :focus-visible'),
    );
  });

  // Tailwind v4's preflight dropped the pointer cursor on buttons.
  it('an enabled button shows the pointer cursor', () => {
    const flat = css.replace(/\s+/g, ' ');
    expect(flat).toContain('button:not(:disabled) { cursor: pointer; }');
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

  it('reduced-motion presses still show feedback, without movement', () => {
    // Final review: Tailwind's preflight removes the phone tap highlight for
    // everyone, so a reduced-motion press needs its own cue: a fade, no scale.
    const start = css.indexOf('@media (prefers-reduced-motion: reduce)');
    expect(start).toBeGreaterThan(-1);
    const block = css.slice(start, css.indexOf('\n  }', start));
    expect(block).toMatch(
      /button:not\(:disabled\):active,\s*\.press:active\s*{[^}]*opacity: 0\.8;/,
    );
    expect(block).not.toContain('scale(');
  });

  it('focus never hides behind the phone nav bar', () => {
    // WCAG 2.4.11: scrolling to a focused control clears the fixed bottom bar.
    expect(css).toMatch(
      /@media \(width < 48rem\)\s*{\s*html\s*{\s*scroll-padding-bottom: calc\(4rem \+ env\(safe-area-inset-bottom, 0px\)\);/,
    );
  });

  it('the 404 page uses only the design tokens and no script', () => {
    const page = readFileSync('public/404.html', 'utf8');
    expect(page).not.toMatch(/<script/i);
    const hexes = page.match(/#[0-9a-f]{6}/gi) ?? [];
    expect(hexes.length).toBeGreaterThan(0);
    for (const hex of hexes)
      expect(css.toLowerCase()).toContain(hex.toLowerCase());
  });

  it('a modal dialog never scrolls the page behind it', () => {
    // modern-web-guidance `dialog`: both rules are needed.
    expect(css).toMatch(/dialog:modal\s*{[^}]*overscroll-behavior: contain;/);
    expect(css).toMatch(
      /dialog::backdrop\s*{[^}]*overflow: hidden;[^}]*overscroll-behavior: contain;/,
    );
  });

  it('phones have no tap delay', () => {
    // The tap highlight itself is Tailwind preflight's, not ours.
    expect(css).not.toContain('-webkit-tap-highlight-color');
    expect(css).toMatch(
      /a,\s*button,\s*summary,\s*input,\s*select,\s*label\s*{[^}]*touch-action: manipulation;/,
    );
  });

  it("button labels can't be selected by a long press", () => {
    expect(css).toMatch(/\bbutton\s*{[^}]*user-select: none;/);
    expect(css).not.toMatch(/body\s*{[^}]*user-select: none/);
  });
});
