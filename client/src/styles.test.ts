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

  // J22: page cards are 85 % surface-light over an 8 px blur, and solid with
  // no filter when the visitor asks for reduced transparency.
  it('card-surface is see-through with a blur, solid under reduced transparency', () => {
    const flat = css.replace(/\s+/g, ' ');
    const rule = flat.match(/@utility card-surface \{(.*?)\} \}/)?.[1] ?? '';
    expect(rule).toContain(
      'background-color: color-mix( in oklab, var(--color-surface-light) 85%, transparent );',
    );
    expect(rule).toContain('-webkit-backdrop-filter: blur(8px);');
    expect(rule).toContain(' backdrop-filter: blur(8px);');
    expect(rule).toContain(
      '@media (prefers-reduced-transparency: reduce) { background-color: var(--color-surface-light); -webkit-backdrop-filter: none; backdrop-filter: none;',
    );
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

  // J30 D4: inks for text and outlines on the light surface (the plain
  // danger red is about 2.8:1 there).
  it('the primary and danger inks read on surface-light', () => {
    expect(css).toContain('--color-primary-ink: #0b6b62;');
    expect(css).toContain('--color-danger-ink: #a3262e;');
    const hex = (name: string) =>
      css.match(new RegExp(`--color-${name}: (#[0-9a-f]{6});`))?.[1] ?? '';
    const lum = (h: string) => {
      const [r, g, b] = [1, 3, 5].map((i) => {
        const s = parseInt(h.slice(i, i + 2), 16) / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
    };
    const ratio = (a: string, b: string) => {
      const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
      return (hi! + 0.05) / (lo! + 0.05);
    };
    const light = hex('surface-light');
    expect(ratio(hex('primary-ink'), light)).toBeGreaterThanOrEqual(4.5);
    expect(ratio(hex('danger-ink'), light)).toBeGreaterThanOrEqual(4.5);
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

  it('focus clears the pinned Ask box when it is pinned', () => {
    expect(css).toMatch(
      /@media \(min-height: 30\.2rem\) and \(width >= 48rem\)\s*{\s*html:has\(\[data-part='ask-composer'\]\[data-pinned\]\):not\(\s*:has\(\[data-part='ask-composer'\]:focus-within\)\s*\)\s*{\s*scroll-padding-bottom: calc\(14\.5rem \+ env\(safe-area-inset-bottom, 0px\)\);/,
    );
    expect(css).toMatch(
      /@media \(min-height: 30\.2rem\) and \(width < 48rem\)\s*{\s*html:has\(\[data-part='ask-composer'\]\):not\(\s*:has\(\[data-part='ask-composer'\]:focus-within\)\s*\)\s*{\s*scroll-padding-bottom: calc\(18\.5rem \+ env\(safe-area-inset-bottom, 0px\)\);/,
    );
  });

  it('the Ask box shows its flat bottom only while stuck (scroll-state)', () => {
    expect(css).toMatch(
      /\[data-part='ask-composer'\]\s*{\s*container: ask-composer \/ scroll-state;\s*}/,
    );
    expect(css).toMatch(
      /@container ask-composer scroll-state\(stuck: bottom\)\s*{\s*\[data-part='ask-composer-panel'\]\s*{\s*border-bottom-left-radius: 0;\s*border-bottom-right-radius: 0;\s*border-bottom-color: transparent;/,
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
      /a,\s*button,\s*summary,\s*input,\s*textarea,\s*select,\s*label\s*{[^}]*touch-action: manipulation;/,
    );
  });

  it("button labels can't be selected by a long press", () => {
    expect(css).toMatch(/\bbutton\s*{[^}]*user-select: none;/);
    expect(css).not.toMatch(/body\s*{[^}]*user-select: none/);
  });
});
