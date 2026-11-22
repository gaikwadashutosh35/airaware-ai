/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { Scene, SceneAir } from './scene.ts';
import { CitySkyline } from './CitySkyline.tsx';
import { SKYLINE } from './skylineGeometry.ts';

afterEach(cleanup);

// The theme's motion tokens as text (Vitest stubs CSS imports). The path is
// relative to client/, Vitest's root.
const css = readFileSync('src/index.css', 'utf8');

function scene(fields: Partial<Scene> = {}): Scene {
  return {
    air: 'within',
    clouds: 0,
    rain: false,
    heat: false,
    fog: false,
    glow: false,
    ...fields,
  };
}

function draw(fields: Partial<Scene> | null = {}) {
  return render(<CitySkyline scene={fields === null ? null : scene(fields)} />)
    .container;
}

const part = (container: HTMLElement, name: string) =>
  container.querySelector(`[data-part="${name}"]`);
// An SVG part's opacity attribute, or an HTML layer's inline opacity.
const opacityOf = (container: HTMLElement, name: string) => {
  const el = part(container, name);
  return Number(
    el?.getAttribute('opacity') ??
      (el as HTMLElement | null)?.style.opacity ??
      0,
  );
};
// The class of the first stop of the gradient the sky is filled with.
function topStop(container: HTMLElement): string {
  const sky = part(container, 'sky');
  const ref = /url\(#([^)]+)\)/.exec(sky?.getAttribute('fill') ?? '')?.[1];
  const gradient = [...container.querySelectorAll('linearGradient')].find(
    (g) => g.id === ref,
  );
  return gradient?.querySelector('stop')?.getAttribute('class') ?? '';
}

// A token-only duration check, shared by the rain and the drift.
function seconds(token: string) {
  const value = new RegExp(`--animate-${token}:\\s*([^;]+);`).exec(css)?.[1];
  const tokens = (value ?? '').split(/\s+/);
  expect(tokens).not.toContain('infinite');
  const one = Number.parseFloat(tokens.find((t) => /^[\d.]+s$/.test(t))!);
  const runs = Number(tokens.find((t) => /^\d+$/.test(t)) ?? 1);
  return one * runs;
}

describe('CitySkyline', () => {
  it('is decorative and carries its state', () => {
    const container = draw({ air: 'above', clouds: 2 });
    const root = container.firstElementChild;
    expect(root?.getAttribute('aria-hidden')).toBe('true');
    expect(root?.getAttribute('data-air')).toBe('above');
    expect(root?.getAttribute('data-clouds')).toBe('2');
    expect(container.querySelector('text, [tabindex], a')).toBeNull();
  });

  // Phase 9: in Windows High Contrast the words sit on the system
  // background, with no picture behind them.
  it('the backdrop steps aside in forced colours', () => {
    for (const fields of [{ rain: true, clouds: 3 } as const, null]) {
      const root = draw(fields).firstElementChild;
      expect((root?.getAttribute('class') ?? '').split(/\s+/)).toContain(
        'forced-colors:hidden',
      );
    }
  });

  // Backdrop design §5.1: fixed behind the page, never in the way.
  it('a fixed backdrop that takes no clicks', () => {
    for (const fields of [{ rain: true, clouds: 3 } as const, null]) {
      const root = draw(fields).firstElementChild;
      const classes = (root?.getAttribute('class') ?? '').split(/\s+/);
      for (const name of ['fixed', 'inset-0', '-z-10', 'pointer-events-none']) {
        expect(classes).toContain(name);
      }
      expect(
        root?.querySelector('a, button, input, select, textarea, [tabindex]'),
      ).toBeNull();
    }
  });

  it('the city sits above the phone bar and never over a fifth of the screen', () => {
    for (const fields of [{}, null]) {
      const city = draw(fields).querySelector('[data-layer="city"]');
      const classes = (city?.getAttribute('class') ?? '').split(/\s+/);
      for (const name of [
        'h-[min(8rem,20vh)]',
        'sm:h-[min(11rem,20vh)]',
        'bottom-[calc(3.5rem+env(safe-area-inset-bottom))]',
        'md:bottom-0',
        // Final review: under 24rem tall a wrapped title can reach the
        // band, so the city hides and the sky alone carries the look.
        '[@media(max-height:24rem)]:hidden',
      ]) {
        expect(classes).toContain(name);
      }
    }
  });

  // No hard top edge over the sky: each fades in from the top of the city
  // box as shown. On screens wider than 5:1 `slice` crops the drawing's top,
  // so a fade drawn in the drawing would start part-way and show an edge.
  it('veils and fog fade in from the visible band top', () => {
    const container = draw({ air: 'above', fog: true });
    const city = container.querySelector('[data-layer="city"]');
    for (const name of ['veil-far', 'veil-mid', 'fog']) {
      const layer = part(container, name);
      expect(layer?.parentElement).toBe(city);
      expect(layer?.getAttribute('class') ?? '').toContain(
        '[mask-image:linear-gradient(transparent,black_60%)]',
      );
    }
  });

  // Cityscape D1: one look per server level, from tokens only.
  it('the sky follows the air state', () => {
    expect(topStop(draw({ air: 'within' }))).toContain(
      'var(--color-secondary)_46%',
    );
    expect(topStop(draw({ air: 'above' }))).toContain(
      'var(--color-secondary)_14%',
    );
    const unknown = topStop(draw({ air: 'unknown' }));
    expect(unknown).toContain('var(--color-rule)');
    expect(unknown).not.toContain('secondary');
    // Overcast mutes the top of the sky (weather, not air).
    expect(topStop(draw({ air: 'within', clouds: 3 }))).toMatch(
      /_45%,var\(--color-rule\)\)\]/,
    );
  });

  it('veils follow the air state only', () => {
    const veils = (air: SceneAir, clouds: Scene['clouds']) => {
      const container = draw({ air, clouds });
      return [
        opacityOf(container, 'veil-far'),
        part(container, 'veil-mid') && opacityOf(container, 'veil-mid'),
      ];
    };
    expect(veils('within', 0)).toEqual([0.05, null]);
    expect(veils('above', 0)).toEqual([0.42, 0.2]);
    expect(veils('unknown', 0)).toEqual([0, null]);
    for (const air of ['within', 'above', 'unknown'] as const) {
      expect(veils(air, 3)).toEqual(veils(air, 0));
    }
  });

  it('the glow follows the scene', () => {
    expect(part(draw({ glow: false }), 'glow')).toBeNull();
    const within = draw({ air: 'within', glow: true });
    const above = draw({ air: 'above', glow: true });
    expect(opacityOf(above, 'glow')).toBeLessThan(opacityOf(within, 'glow'));
    const radius = (container: HTMLElement) =>
      Number(part(container, 'glow')?.getAttribute('r'));
    expect(radius(draw({ glow: true, heat: true }))).toBeGreaterThan(
      radius(within),
    );
  });

  it('clouds by count, with a deck when overcast', () => {
    for (const clouds of [0, 1, 2, 3] as const) {
      const container = draw({ clouds });
      expect(container.querySelectorAll('[data-part="cloud"]')).toHaveLength(
        clouds,
      );
      expect(part(container, 'cloud-deck') !== null).toBe(clouds === 3);
    }
  });

  // Cityscape D2: the clouds settle once, then rest (WCAG 2.2.2).
  it('clouds drift once, within five seconds', () => {
    const clouds = part(draw({ clouds: 1 }), 'clouds');
    expect(clouds?.getAttribute('class')).toMatch(/motion-safe:animate-drift/);
    expect(clouds?.getAttribute('class')).not.toMatch(/(^|\s)animate-/);
    expect(seconds('drift')).toBeLessThanOrEqual(5);
  });

  it('the same buildings in every air state', () => {
    const buildings = (air: SceneAir) => {
      const container = draw({ air });
      return ['far', 'mid', 'near'].map(
        (name) => part(container, name)?.outerHTML,
      );
    };
    const within = buildings('within');
    expect(within.every(Boolean)).toBe(true);
    expect(buildings('above')).toEqual(within);
    expect(buildings('unknown')).toEqual(within);
  });

  it('no smog in any state', () => {
    for (const air of ['within', 'above', 'unknown'] as const) {
      expect(part(draw({ air }), 'smog')).toBeNull();
    }
  });

  it('windows are hidden on phones', () => {
    expect(part(draw(), 'windows')?.getAttribute('class')).toContain(
      'max-sm:hidden',
    );
  });

  // Variant B: 10 tanks on 9 near buildings.
  it('rooftop tanks sit on the near row', () => {
    expect(part(draw(), 'tanks')?.children).toHaveLength(9);
  });

  it('the middle row carries its details at every width', () => {
    const detail = part(draw(), 'mid-detail');
    expect(detail?.children.length).toBeGreaterThan(0);
    expect(detail?.getAttribute('class') ?? '').not.toContain('hidden');
  });

  // Brief §3.2: no landmark. The old arch and dome were the only arcs.
  it('no curved landmark shapes in the city', () => {
    const city = draw().querySelector('[data-layer="city"]')!;
    for (const path of city.querySelectorAll('path')) {
      expect(path.getAttribute('d')).not.toMatch(/[Aa]/);
    }
  });

  it('the silhouette is the same city, with tanks and no details', () => {
    const city = draw(null).querySelector('[data-layer="city"]')!;
    expect(city.querySelectorAll('path')).toHaveLength(
      1 + SKYLINE.near.length + SKYLINE.tanks.length,
    );
    expect(part(draw(null), 'mid-detail')).toBeNull();
  });

  it('loading draws a still, neutral silhouette', () => {
    const container = draw(null);
    expect(container.firstElementChild?.getAttribute('data-air')).toBe(
      'loading',
    );
    for (const name of ['glow', 'cloud', 'veil-far', 'rain', 'windows']) {
      expect(part(container, name)).toBeNull();
    }
    expect(container.querySelector('[class*="animate-"]')).toBeNull();
  });

  it('each skyline uses its own ids', () => {
    const { container } = render(
      <>
        <CitySkyline scene={scene({ glow: true })} />
        <CitySkyline scene={scene({ glow: true })} />
      </>,
    );
    const roots = [...container.children];
    const ids = roots.map((root) =>
      [...root.querySelectorAll('[id]')].map((el) => el.id),
    );
    expect(ids[0]!.length).toBeGreaterThan(0);
    expect(ids[0]!.some((id) => ids[1]!.includes(id))).toBe(false);
    roots.forEach((root, i) => {
      for (const el of root.querySelectorAll('[fill^="url(#"]')) {
        const ref = /url\(#([^)]+)\)/.exec(el.getAttribute('fill')!)![1]!;
        expect(ids[i]).toContain(ref);
      }
    });
  });

  it('animations only run when motion is welcome', () => {
    const container = draw({ rain: true, clouds: 1 });
    const animated = [...container.querySelectorAll('[class*="animate-"]')];
    expect(animated.length).toBeGreaterThan(1);
    for (const element of animated) {
      expect(element.getAttribute('class')).toMatch(/motion-safe:animate-/);
      expect(element.getAttribute('class')).not.toMatch(/(^|\s)animate-/);
    }
  });

  // Final review: the rain moves as one box (its whole layer), which the
  // browser can hand to the GPU, not a shape inside an SVG, which it
  // repaints over the whole screen every frame. The box overhangs the
  // screen by 64 px each side, more than one loop moves it (12 by 32 px).
  it('the rain moves as one box that overhangs the screen', () => {
    const container = draw({ rain: true });
    const layer = container.querySelector('[data-layer="rain"]');
    const classes = (layer?.getAttribute('class') ?? '').split(/\s+/);
    expect(classes).toContain('motion-safe:animate-rain');
    expect(classes).toContain('-inset-16');
    expect(layer?.querySelectorAll('[class*="animate-"]')).toHaveLength(0);
  });

  // Review A2 #4: decorative motion stops within 5 seconds (WCAG 2.2.2).
  it('the rain stops within five seconds', () => {
    expect(seconds('rain')).toBeLessThanOrEqual(5);
  });

  // Review A2 #5: a flat band wider than the view looks the same at every
  // offset, so moving it costs frames and shows nothing.
  it('the heat band stays still', () => {
    expect(
      part(draw({ heat: true }), 'shimmer')?.getAttribute('class'),
    ).not.toMatch(/animate-/);
  });

  it('rain draws streaks, and fog its band', () => {
    expect(part(draw({ rain: true }), 'rain')).not.toBeNull();
    expect(part(draw(), 'rain')).toBeNull();
    expect(part(draw({ fog: true }), 'fog')).not.toBeNull();
    expect(part(draw(), 'fog')).toBeNull();
  });

  // Review A2 minor a, for a tile: one loop of the rain moves each streak
  // onto another streak of the repeating tile, so the pattern never jumps.
  it('the rain tile repeats under its loop', () => {
    const keyframes =
      /@keyframes rain-fall\s*{[\s\S]*?to\s*{\s*transform:\s*([^;]+);/.exec(
        css,
      )?.[1] ?? '';
    const pair = /translate\((-?[\d.]+)px,\s*(-?[\d.]+)px\)/.exec(keyframes);
    const [dx, dy] = [Number(pair?.[1]), Number(pair?.[2])];
    expect([dx, dy]).toEqual([-12, 32]);
    const container = draw({ rain: true });
    const ref = /url\(#([^)]+)\)/.exec(
      part(container, 'rain')?.getAttribute('fill') ?? '',
    )?.[1];
    const tile = [...container.querySelectorAll('pattern')].find(
      (p) => p.id === ref,
    );
    const [w, h] = [
      Number(tile?.getAttribute('width')),
      Number(tile?.getAttribute('height')),
    ];
    expect([w, h]).toEqual([24, 64]);
    const mod = (n: number, m: number) => ((n % m) + m) % m;
    const streaks = [...(tile?.querySelectorAll('line') ?? [])].map((line) => [
      Number(line.getAttribute('x1')),
      Number(line.getAttribute('y1')),
    ]);
    expect(streaks).toHaveLength(2);
    const at = new Set(streaks.map(([x, y]) => `${x},${y}`));
    for (const [x, y] of streaks) {
      expect(at.has(`${mod(x! + dx, w)},${mod(y! + dy, h)}`)).toBe(true);
      // Each streak (to x - 4, y + 10) stays inside the tile, so none is cut.
      expect(x! - 4).toBeGreaterThanOrEqual(0);
      expect(y! + 10).toBeLessThanOrEqual(h);
    }
  });
});
