import { describe, expect, it } from 'vitest';
import { SKYLINE } from './skylineGeometry.ts';

// The extent of a path built from M x y, h, v, H, V and z commands only.
function bounds(d: string) {
  const box = {
    minX: Infinity,
    maxX: -Infinity,
    minY: Infinity,
    maxY: -Infinity,
  };
  let x = 0;
  let y = 0;
  const mark = () => {
    box.minX = Math.min(box.minX, x);
    box.maxX = Math.max(box.maxX, x);
    box.minY = Math.min(box.minY, y);
    box.maxY = Math.max(box.maxY, y);
  };
  for (const [, command, args] of d.matchAll(/([MhvHVz])([^MhvHVz]*)/g)) {
    const n = (args ?? '')
      .trim()
      .split(/[\s,]+/)
      .filter(Boolean)
      .map(Number);
    if (command === 'M') [x, y] = [n[0]!, n[1]!];
    else if (command === 'h') x += n[0]!;
    else if (command === 'v') y += n[0]!;
    else if (command === 'H') x = n[0]!;
    else if (command === 'V') y = n[0]!;
    if (command !== 'z') mark();
  }
  return box;
}

// Cityscape brief-finish design §5.1: variant B, inside the band's limits
// (wide screens crop the band's top).
describe('SKYLINE', () => {
  it('stays inside the band limits', () => {
    const top = (ds: string[]) => Math.min(...ds.map((d) => bounds(d).minY));
    expect(top([SKYLINE.far])).toBeGreaterThanOrEqual(65);
    expect(top(SKYLINE.mid)).toBeGreaterThanOrEqual(80);
    expect(top([...SKYLINE.near, ...SKYLINE.tanks])).toBeGreaterThanOrEqual(
      105,
    );
    for (const d of Object.values(SKYLINE).flat()) {
      const b = bounds(d);
      expect(b.minX).toBeGreaterThanOrEqual(-10);
      expect(b.maxX).toBeLessThanOrEqual(810);
      expect(b.maxY).toBeLessThanOrEqual(160);
    }
  });

  it('the far row covers the width with no gap', () => {
    expect(SKYLINE.far.startsWith('M-10 160')).toBe(true);
    expect(SKYLINE.far.endsWith('H810V160z')).toBe(true);
    expect(SKYLINE.far.match(/V160/g)).toHaveLength(1);
    // An x span no block covers has no roof: the builder writes VInfinity.
    expect(SKYLINE.far).not.toContain('Infinity');
  });

  it('variant B: 20 middle and 15 near buildings, 10 tanks on 9', () => {
    expect(SKYLINE.mid).toHaveLength(20);
    expect(SKYLINE.near).toHaveLength(15);
    expect(SKYLINE.tanks).toHaveLength(9);
    // A tank is four subpaths: drum, platform, two legs.
    expect(SKYLINE.tanks.join('').match(/M/g)).toHaveLength(40);
  });
});
