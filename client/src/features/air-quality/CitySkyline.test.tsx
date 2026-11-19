/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { HazeLevel } from './haze.ts';
import type { Scene } from './scene.ts';
import { CitySkyline } from './CitySkyline.tsx';

afterEach(cleanup);

// The theme's motion tokens as text (Vitest stubs CSS imports). The path is
// relative to client/, Vitest's root.
const css = readFileSync('src/index.css', 'utf8');

function scene(fields: Partial<Scene> = {}): Scene {
  return {
    haze: 2,
    clouds: 0,
    rain: false,
    heat: false,
    fog: false,
    smog: false,
    ...fields,
  };
}

function draw(fields: Partial<Scene> = {}) {
  return render(<CitySkyline scene={scene(fields)} />).container;
}

function opacityOf(container: HTMLElement, part: string) {
  return Number(
    container.querySelector(`[data-part="${part}"]`)?.getAttribute('opacity') ??
      0,
  );
}

describe('CitySkyline', () => {
  it('is decorative and carries its level', () => {
    const container = draw({ haze: 3 });
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
    expect(svg?.getAttribute('data-haze-level')).toBe('3');
    expect(container.querySelector('text')).toBeNull();
  });

  it('has no sun when there is no data', () => {
    expect(draw({ haze: 0 }).querySelector('[data-part="sun"]')).toBeNull();
  });

  it('shows a sun when there is data', () => {
    expect(draw({ haze: 1 }).querySelector('[data-part="sun"]')).not.toBeNull();
  });

  // Final review I4 (Phase A): "no data" must not look like heavy smog.
  it('no data draws no haze', () => {
    const container = draw({ haze: 0 });
    expect(opacityOf(container, 'haze-front')).toBe(0);
    expect(opacityOf(container, 'haze-mid')).toBe(0);
  });

  it('gets hazier as the level rises', () => {
    const opacities = ([1, 2, 3, 4, 5] as HazeLevel[]).map((haze) =>
      opacityOf(draw({ haze }), 'haze-front'),
    );
    for (let i = 1; i < opacities.length; i++) {
      expect(opacities[i]!).toBeGreaterThan(opacities[i - 1]!);
    }
    expect(opacities[0]!).toBeGreaterThan(0);
  });

  it('draws clouds by count', () => {
    expect(
      draw({ clouds: 2 }).querySelectorAll('[data-part="cloud"]'),
    ).toHaveLength(2);
    expect(draw().querySelectorAll('[data-part="cloud"]')).toHaveLength(0);
  });

  it('rain hides the sun and draws streaks', () => {
    const container = draw({ rain: true });
    expect(container.querySelector('[data-part="sun"]')).toBeNull();
    expect(container.querySelectorAll('[data-part="rain"]')).toHaveLength(1);
  });

  it('heat draws a shimmer and a larger sun', () => {
    const radius = (container: HTMLElement) =>
      Number(
        container.querySelector('[data-part="sun"]')?.getAttribute('r') ?? 0,
      );
    const hot = draw({ heat: true });
    expect(radius(hot)).toBeGreaterThan(radius(draw()));
    expect(hot.querySelectorAll('[data-part="shimmer"]')).toHaveLength(1);
  });

  it('fog and smog draw their own bands', () => {
    expect(
      draw({ fog: true }).querySelector('[data-part="fog"]'),
    ).not.toBeNull();
    expect(draw().querySelector('[data-part="fog"]')).toBeNull();
    expect(
      draw({ haze: 5, smog: true }).querySelector('[data-part="smog"]'),
    ).not.toBeNull();
    expect(draw().querySelector('[data-part="smog"]')).toBeNull();
  });

  it('animations only run when motion is welcome', () => {
    const container = draw({ rain: true });
    const animated = [...container.querySelectorAll('[class*="animate-"]')];
    expect(animated.length).toBeGreaterThan(0);
    for (const element of animated) {
      expect(element.getAttribute('class')).toMatch(/motion-safe:animate-/);
      expect(element.getAttribute('class')).not.toMatch(/(^|\s)animate-/);
    }
  });

  // Review A2 #4: decorative motion stops within 5 seconds (WCAG 2.2.2).
  it('the rain stops within five seconds', () => {
    const value = /--animate-rain:\s*([^;]+);/.exec(css)?.[1] ?? '';
    const tokens = value.split(/\s+/);
    expect(tokens).not.toContain('infinite');
    const seconds = Number.parseFloat(tokens.find((t) => /^[\d.]+s$/.test(t))!);
    const runs = Number(tokens.find((t) => /^\d+$/.test(t)) ?? 1);
    expect(seconds * runs).toBeLessThanOrEqual(5);
  });

  // Review A2 #5: a flat band wider than the view looks the same at every
  // offset, so moving it costs frames and shows nothing.
  it('the heat band stays still', () => {
    const shimmer = draw({ heat: true }).querySelector('[data-part="shimmer"]');
    expect(shimmer?.getAttribute('class')).not.toMatch(/animate-/);
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
