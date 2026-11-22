// The backdrop city: variant B, "Mixed street" (owner's pick, 22 Nov 2026;
// docs/superpowers/specs/2026-11-22-cityscape-brief-finish-design.md §5.1).
// Ported number for number from the comparison sheet
// (docs/superpowers/specs/2026-11-22-cityscape-variants.html). Path data
// only, in the band's 800 x 160 box on the ground line y = 160; the
// component sets every colour. No landmark: the Indian feel comes from
// rooftop tanks, sunshades (chhajjas), balconies and shop-houses.

export interface SkylinePaths {
  // The far row as one outline: the highest roof over each x.
  far: string;
  // One path per building, and its light details (railings, windows, fins).
  mid: string[];
  midDetail: string[];
  // One path per building without its tanks, the tanks of each building
  // that has any, and the facade details shown from 640 px.
  near: string[];
  tanks: string[];
  nearDetail: string[];
}

const G = 160;
const f = (n: number) => +n.toFixed(1);

// A rectangle subpath, clipped to the allowed overhang x -10..810.
function R(x: number, y: number, w: number, h: number): string {
  const a = Math.max(x, -10);
  const b = Math.min(x + w, 810);
  return `M${f(a)} ${f(y)}h${f(b - a)}v${f(h)}h${f(a - b)}z`;
}

// A water tank on a steel stand, standing on roof line t: drum, platform,
// two legs (8.5 tall).
const tank = (cx: number, t: number) =>
  R(cx - 5, t - 8.5, 10, 5.5) +
  R(cx - 6, t - 4.2, 12, 1.4) +
  R(cx - 5, t - 3, 2, 3) +
  R(cx + 3, t - 3, 2, 3);

// FAR: a continuous low range, [x, w, h], plus soft towers [x, w, h, k]
// (k 0 flat, 1 one-sided setback, 2 low roof box).
const LOW: Array<[number, number, number]> = [
  [-10, 28, 40],
  [18, 22, 48],
  [40, 34, 36],
  [74, 26, 44],
  [100, 30, 34],
  [130, 20, 50],
  [150, 36, 38],
  [186, 24, 46],
  [210, 30, 34],
  [240, 22, 42],
  [262, 34, 48],
  [296, 26, 36],
  [322, 30, 44],
  [352, 22, 38],
  [374, 36, 46],
  [410, 24, 34],
  [434, 30, 42],
  [464, 22, 50],
  [486, 34, 36],
  [520, 26, 44],
  [546, 30, 38],
  [576, 22, 48],
  [598, 34, 36],
  [632, 24, 42],
  [656, 30, 34],
  [686, 22, 46],
  [708, 34, 38],
  [742, 26, 44],
  [768, 42, 36],
];
const TOW: Array<[number, number, number, 0 | 1 | 2]> = [
  [6, 20, 66, 0],
  [36, 22, 82, 1],
  [118, 20, 76, 0],
  [134, 26, 62, 2],
  [176, 18, 86, 1],
  [244, 24, 72, 0],
  [262, 16, 84, 2],
  [326, 22, 66, 0],
  [374, 20, 88, 1],
  [392, 14, 74, 0],
  [446, 30, 70, 2],
  [500, 18, 84, 0],
  [520, 24, 66, 1],
  [600, 20, 78, 2],
  [628, 26, 60, 0],
  [700, 16, 82, 1],
  [742, 26, 68, 2],
  [788, 18, 76, 0],
];

// A tower as [x, w, top] blocks.
function tower(
  [x, w, h, k]: [number, number, number, 0 | 1 | 2],
  i: number,
): Array<[number, number, number]> {
  const t = G - h;
  if (k === 1) {
    return [
      [x, w, t + 10],
      [i % 2 ? x + 5 : x, w - 5, t],
    ];
  }
  if (k === 2) {
    return [
      [x, w, t + 3],
      [x + 4, w - 8, t],
    ];
  }
  return [[x, w, t]];
}

function farOutline(): string {
  const blocks = [
    ...LOW.map(([x, w, h]): [number, number, number] => [x, w, G - h]),
    ...TOW.flatMap(tower),
  ];
  const xs = [...new Set(blocks.flatMap(([x, w]) => [x, x + w]))].sort(
    (p, q) => p - q,
  );
  let d = 'M-10 160';
  let last: number | undefined;
  for (let j = 0; j < xs.length - 1; j++) {
    const from = xs[j]!;
    const to = xs[j + 1]!;
    const top = Math.min(
      ...blocks.filter(([x, w]) => x <= from && x + w >= to).map((b) => b[2]),
    );
    if (top !== last) {
      d += (j ? `H${f(from)}` : '') + `V${f(top)}`;
      last = top;
    }
  }
  return `${d}H810V160z`;
}

// MID: F older flats with chhajjas (s: raised half, left or right), S
// society blocks with balconies and a stair/lift core at each offset in c
// (cw wide), O glass offices with vertical fins (k: box = plant room,
// set = setback top). bare: no light details.
type MidKind = 'F' | 'S' | 'O';
interface MidOptions {
  s?: 'l' | 'r';
  c?: number[];
  cw?: number;
  k?: 'box' | 'set';
  bare?: true;
}
const MID: Array<[MidKind, number, number, number, MidOptions]> = [
  ['F', -10, 40, 44, { s: 'r' }],
  ['S', 32, 52, 58, { c: [8] }],
  ['O', 87, 30, 70, { k: 'box' }],
  ['F', 119, 28, 40, { bare: true }],
  ['S', 150, 46, 62, { c: [17] }],
  ['O', 199, 32, 72, { k: 'set' }],
  ['F', 234, 42, 46, { s: 'l' }],
  ['S', 281, 58, 54, { c: [8, 40], cw: 10 }],
  ['O', 345, 24, 64, { bare: true }],
  ['F', 369, 30, 42, {}],
  ['O', 405, 38, 74, { k: 'box' }],
  ['S', 444, 50, 60, { c: [34] }],
  ['F', 494, 38, 48, { s: 'r' }],
  ['O', 540, 28, 66, {}],
  ['S', 570, 50, 56, { c: [4] }],
  ['F', 620, 32, 38, { bare: true }],
  ['O', 658, 34, 70, { k: 'set' }],
  ['S', 694, 54, 58, { c: [21] }],
  ['F', 748, 30, 44, { s: 'l' }],
  ['O', 783, 27, 62, { k: 'box' }],
];

function midRow(): { mid: string[]; midDetail: string[] } {
  const mid: string[] = [];
  const midDetail: string[] = [];
  for (const [type, x, w, h, o] of MID) {
    const t = G - h;
    let d = R(x, t, w, h);
    let m = '';
    if (type === 'S') {
      const cw = o.cw ?? 12;
      for (const c of o.c ?? []) d += R(x + c, t - 8, cw, 8);
      // A projecting balcony slab and one railing run under it, per floor.
      for (let y = t + 6; y < G - 8; y += 8) {
        d += R(x - 2, y, w + 4, 2);
        m += R(x + 2, y + 2, w - 4, 2.2);
      }
    } else if (type === 'O') {
      if (o.k === 'box') d += R(x + 5, t - 4, w - 10, 4);
      if (o.k === 'set') d = R(x, t + 10, w, h - 10) + R(x + 4, t, w - 8, 10);
      for (let fx = x + 4; fx < x + w - 3; fx += 8) {
        const top = o.k === 'set' && fx > x + w - 6 ? t + 13 : t + 3;
        m += R(fx, top, 1.8, G - 4 - top);
      }
    } else {
      const hx = o.s === 'r' ? x + w / 2 : x;
      if (o.s) {
        d +=
          R(hx, t - 8, w / 2, 8) +
          R(o.s === 'r' ? hx : hx - 1.5, t - 5, w / 2 + 1.5, 1.6);
      }
      const n = Math.floor((w - 4) / 10);
      const gap = (w - n * 4) / (n + 1);
      for (let y = t + 3; y < G - 8; y += 10) {
        d += R(x - 1.5, y, w + 3, 1.6);
        for (let i = 0; i < n; i++)
          m += R(x + gap + i * (4 + gap), y + 2.6, 4, 4);
      }
    }
    mid.push(d);
    if (!o.bare) midDetail.push(m);
  }
  return { mid, midDetail };
}

// NEAR: 15 shop-houses and walk-ups, spaced so the middle row shows
// through. [x, w, floors, ground-shop height, upper-floor height, options].
// t tank offsets; m stair-room offset (mt: a tank on it); p raised parapet;
// cp coping; aw awning; cj sunshade ledges. Facade (shown from 640 px): w
// window offsets (ww x wh), b a balcony line per floor, tl one tall stair
// opening, sh rolling shutters (1 or 2). No facade key: a plain front.
interface NearOptions {
  t?: number[];
  m?: number;
  mt?: true;
  p?: true;
  cp?: true;
  aw?: true;
  cj?: true;
  w?: number[];
  ww?: number;
  wh?: number;
  b?: true;
  tl?: number;
  sh?: 1 | 2;
}
const NEAR: Array<[number, number, number, number, number, NearOptions]> = [
  [
    -10,
    40,
    2,
    13,
    11,
    { t: [28], cp: true, aw: true, w: [6, 12.5], ww: 4, wh: 5, sh: 1 },
  ],
  [46, 26, 3, 12, 10, { p: true, aw: true, b: true }],
  [
    96,
    38,
    4,
    12,
    9.5,
    { t: [26], cj: true, aw: true, w: [4, 11, 26], ww: 3.5, wh: 4.5, sh: 2 },
  ],
  [134, 22, 1, 14, 0, { cp: true }],
  [
    190,
    34,
    3,
    13,
    11,
    { m: 4, mt: true, aw: true, tl: 10, w: [24], ww: 5, wh: 5 },
  ],
  [
    240,
    46,
    2,
    13,
    12,
    { p: true, aw: true, w: [5, 10.5, 30.5, 36], ww: 4, wh: 6, sh: 2 },
  ],
  [302, 28, 4, 12, 10.5, { t: [10], b: true }],
  [
    364,
    40,
    3,
    13,
    10,
    { m: 22, mt: true, aw: true, w: [4, 11], ww: 4, wh: 5, tl: 28, sh: 1 },
  ],
  [424, 30, 2, 12, 11, { p: true, aw: true }],
  [
    454,
    36,
    4,
    11,
    9.5,
    { m: 5, t: [28], cj: true, w: [4, 27.5], ww: 4.5, wh: 4.5 },
  ],
  [522, 32, 3, 14, 11, { t: [8, 22], aw: true, b: true, sh: 1 }],
  [
    576,
    44,
    2,
    12,
    10,
    { p: true, t: [8], aw: true, w: [6, 19.5, 33], ww: 5, wh: 5, sh: 2 },
  ],
  [648, 28, 4, 12, 10, { m: 6, cp: true, tl: 12 }],
  [676, 34, 3, 13, 9, { aw: true, w: [4, 9.5], ww: 3.5, wh: 4 }],
  [
    762,
    48,
    3,
    12,
    11,
    { t: [14], cp: true, w: [5, 21, 37], ww: 4, wh: 5.5, sh: 2 },
  ],
];

function nearRow(): { near: string[]; tanks: string[]; nearDetail: string[] } {
  const near: string[] = [];
  const tanks: string[] = [];
  const nearDetail: string[] = [];
  for (const [x, w, n, gh, fh, o] of NEAR) {
    const t = G - gh - fh * (n - 1);
    // The top of upper floor k.
    const up = (k: number) => G - gh - fh * k;
    let d = R(x, t, w, G - t);
    let tk = '';
    let m = '';
    if (o.cp) d += R(x - 1, t, w + 2, 1.6);
    if (o.aw) d += R(x - 2.5, G - gh, w + 5, 1.5);
    if (o.p) d += R(x + w / 4, t - 3, w / 2, 3);
    for (const cx of o.t ?? []) tk += tank(x + cx, t);
    if (o.m !== undefined) {
      d += R(x + o.m, t - 7, 15, 7) + R(x + o.m - 1, t - 7, 17, 1.4);
      if (o.mt) tk += tank(x + o.m + 5, t - 7);
    }
    for (let k = 1; k < n; k++) {
      if (o.cj) d += R(x - 1.5, up(k) + 1, w + 3, 1.3);
      for (const ox of o.w ?? []) {
        m += R(x + ox, up(k) + (fh - o.wh!) / 2 + 0.5, o.ww!, o.wh!);
      }
      if (o.b) m += R(x + 2, up(k) + fh - 3.2, w - 4, 1.4);
    }
    if (o.tl !== undefined) m += R(x + o.tl, t + 2, 3, G - gh - t - 4);
    // Rolling shutters: two slats each, pulled half down.
    const sw = o.sh === 2 ? (w - 8) / 2 : w - 6;
    for (let i = 0; i < (o.sh ?? 0); i++) {
      m +=
        R(x + 3 + i * (sw + 2), G - 7.5, sw, 1.3) +
        R(x + 3 + i * (sw + 2), G - 4.5, sw, 1.3);
    }
    near.push(d);
    if (tk) tanks.push(tk);
    if (m) nearDetail.push(m);
  }
  return { near, tanks, nearDetail };
}

export const SKYLINE: SkylinePaths = {
  far: farOutline(),
  ...midRow(),
  ...nearRow(),
};
