/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { Scene, SceneAir } from './scene.ts';
import { CitySkyline } from './CitySkyline.tsx';

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
const opacityOf = (container: HTMLElement, name: string) =>
  Number(part(container, name)?.getAttribute('opacity') ?? 0);
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
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
    expect(svg?.getAttribute('data-air')).toBe('above');
    expect(svg?.getAttribute('data-clouds')).toBe('2');
    expect(container.querySelector('text, [tabindex], a')).toBeNull();
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

  // 18 near buildings, a tank on every third.
  it('rooftop tanks sit on the near row', () => {
    expect(part(draw(), 'tanks')?.children).toHaveLength(6);
  });

  it('loading draws a still, neutral silhouette', () => {
    const container = draw(null);
    expect(container.querySelector('svg')?.getAttribute('data-air')).toBe(
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
    const svgs = [...container.querySelectorAll('svg')];
    const ids = svgs.map((svg) =>
      [...svg.querySelectorAll('[id]')].map((el) => el.id),
    );
    expect(ids[0]!.length).toBeGreaterThan(0);
    expect(ids[0]!.some((id) => ids[1]!.includes(id))).toBe(false);
    svgs.forEach((svg, i) => {
      for (const el of svg.querySelectorAll('[fill^="url(#"]')) {
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

  // Review A2 minor a: one loop of the rain lands every visible streak on
  // another streak, so the pattern never jumps sideways.
  it('the rain loop is seamless', () => {
    const keyframes =
      /@keyframes rain-fall\s*{[\s\S]*?to\s*{\s*transform:\s*([^;]+);/.exec(
        css,
      )?.[1] ?? '';
    const pair = /translate\((-?[\d.]+)px,\s*(-?[\d.]+)px\)/.exec(keyframes);
    const onlyY = /translateY\((-?[\d.]+)px\)/.exec(keyframes);
    const [dx, dy] = pair
      ? [Number(pair[1]), Number(pair[2])]
      : [0, Number(onlyY?.[1])];
    const streaks = [
      ...draw({ rain: true }).querySelectorAll('[data-part="rain"] line'),
    ].map((line) => [
      Number(line.getAttribute('x1')),
      Number(line.getAttribute('y1')),
    ]);
    const at = new Set(streaks.map(([x, y]) => `${x},${y}`));
    // A streak runs from (x, y) to (x - 4, y + 10); visible if it crosses the view.
    const visible = ([x, y]: number[]) =>
      x! > 0 && x! - 4 < 800 && y! < 160 && y! + 10 > 0;
    for (const [x, y] of streaks) {
      const moved = [x! + dx, y! + dy];
      if (visible(moved)) expect(at.has(moved.join(','))).toBe(true);
      if (visible([x!, y!])) expect(at.has(`${x! - dx},${y! - dy}`)).toBe(true);
    }
  });
});
