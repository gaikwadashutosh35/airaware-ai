import type { HazeLevel } from './haze.ts';

// Per level 0 (no data) ... 5. Opacity only: no blur filter, no gradient,
// no animation, so it costs nothing to paint and needs no reduced-motion
// handling.
const SKY_TINT = [0, 0, 0.08, 0.16, 0.24, 0.32];
const SUN = [0, 0.9, 0.7, 0.45, 0.25, 0.12];
const HAZE_MID = [0.6, 0.15, 0.3, 0.45, 0.6, 0.75];
const HAZE_FRONT = [0.55, 0.1, 0.22, 0.36, 0.5, 0.64];

// [x, width, height] on a 160-high ground line.
const FAR: Array<[number, number, number]> = [
  [0, 28, 60],
  [30, 22, 85],
  [55, 35, 50],
  [95, 18, 95],
  [115, 40, 65],
  [215, 26, 75],
  [245, 34, 55],
  [285, 20, 90],
  [310, 38, 62],
  [352, 24, 80],
  [378, 22, 58],
];
const NEAR: Array<[number, number, number]> = [
  [-5, 40, 38],
  [38, 30, 52],
  [72, 46, 30],
  [122, 24, 46],
  [200, 36, 34],
  [240, 28, 50],
  [272, 44, 28],
  [320, 26, 44],
  [350, 52, 32],
];

// The same rows again on the right half, with heights rotated so the two
// halves don't repeat exactly. Wide enough that `slice` keeps the sun in
// view from a 320 px phone to a wide card.
const shifted = (row: Array<[number, number, number]>, by: number) =>
  row.map(([x, w], i): [number, number, number] => [
    x + 400,
    w,
    row[(i + by) % row.length]![2],
  ]);
const FAR_ALL = [...FAR, ...shifted(FAR, 4)];
const NEAR_ALL = [...NEAR, ...shifted(NEAR, 3)];

// A decorative city skyline whose haze follows the 24-hour air check. The
// readout's words carry the meaning; this picture is hidden from assistive
// technology.
export function CitySkyline({ level }: { level: HazeLevel }) {
  return (
    <svg
      aria-hidden="true"
      data-haze-level={level}
      viewBox="0 0 800 160"
      preserveAspectRatio="xMidYMax slice"
      className="block h-24 w-full sm:h-32"
    >
      <rect
        width="800"
        height="160"
        className={level === 0 ? 'fill-rule' : 'fill-surface-light'}
      />
      <rect
        width="800"
        height="160"
        className="fill-text-dark-muted"
        opacity={SKY_TINT[level]}
      />
      {level > 0 && (
        <circle
          data-part="sun"
          cx="560"
          cy="56"
          r="18"
          className="fill-warning"
          opacity={SUN[level]}
        />
      )}
      <g className="fill-text-dark-muted" opacity="0.55">
        {FAR_ALL.map(([x, w, h]) => (
          <rect key={x} x={x} y={160 - h} width={w} height={h} />
        ))}
        {/* A domed hall. */}
        <rect x="160" y="120" width="50" height="40" />
        <path d="M163 120 A22 22 0 0 1 207 120 Z" />
      </g>
      <rect
        data-part="haze-mid"
        width="800"
        height="160"
        className="fill-rule"
        opacity={HAZE_MID[level]}
      />
      <g className="fill-text-dark" opacity="0.85">
        {NEAR_ALL.map(([x, w, h]) => (
          <rect key={x} x={x} y={160 - h} width={w} height={h} />
        ))}
        {/* A memorial arch. */}
        <path d="M150 160 V102 H194 V160 H182 V128 A10 10 0 0 0 162 128 V160 Z" />
      </g>
      <rect
        data-part="haze-front"
        width="800"
        height="160"
        className="fill-rule"
        opacity={HAZE_FRONT[level]}
      />
    </svg>
  );
}
