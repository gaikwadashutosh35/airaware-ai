import type { Scene } from './scene.ts';

// Per level 0 (no data: flat and faint, no haze, so it never reads as
// smog) ... 5. Opacity only: no blur filter, no gradient. The only motion
// (rain, for under 5 s) is transform-only and `motion-safe:`.
const SKY_TINT = [0, 0, 0.08, 0.16, 0.24, 0.32];
const SUN = [0, 0.9, 0.7, 0.45, 0.25, 0.12];
const HAZE_MID = [0, 0.15, 0.3, 0.45, 0.6, 0.75];
const HAZE_FRONT = [0, 0.1, 0.22, 0.36, 0.5, 0.64];

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

// Upper-sky clouds, filled in this order as cover rises. The first two sit
// in the middle third, which a phone's crop (about x 225-575) still shows.
const CLOUDS: Array<[number, number]> = [
  [300, 30],
  [480, 22],
  [180, 36],
];

// Slanted streaks on a 24 x 32 grid, one row taller than the band so the
// loop (one row down, half a column left) never shows a gap.
const RAIN = Array.from({ length: 34 * 7 }, (_, i) => [
  (i % 34) * 24 + (Math.floor(i / 34) % 2) * 12,
  Math.floor(i / 34) * 32 - 32,
]);

// A decorative city skyline. Haze and smog follow the 24-hour air check;
// clouds, rain, heat and fog follow this hour's weather forecast. The
// readout's words carry the meaning; this picture is hidden from assistive
// technology.
export function CitySkyline({ scene }: { scene: Scene }) {
  const level = scene.haze;
  return (
    <svg
      aria-hidden="true"
      data-haze-level={level}
      viewBox="0 0 800 160"
      preserveAspectRatio="xMidYMax slice"
      className="block h-32 w-full sm:h-44"
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
      {level > 0 && !scene.rain && (
        <circle
          data-part="sun"
          cx="560"
          cy="56"
          r={scene.heat ? 24 : 18}
          className="fill-warning"
          opacity={scene.heat ? Math.min(1, SUN[level]! + 0.1) : SUN[level]}
        />
      )}
      {CLOUDS.slice(0, scene.clouds).map(([cx, cy]) => (
        <g key={cx} data-part="cloud" className="fill-rule" opacity="0.9">
          <ellipse cx={cx} cy={cy} rx="34" ry="10" />
          <ellipse cx={cx - 14} cy={cy - 6} rx="16" ry="10" />
          <ellipse cx={cx + 12} cy={cy - 8} rx="18" ry="12" />
        </g>
      ))}
      <g className="fill-text-dark-muted" opacity={level === 0 ? 0.3 : 0.55}>
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
      <g className="fill-text-dark" opacity={level === 0 ? 0.35 : 0.85}>
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
      {scene.smog && (
        <rect
          data-part="smog"
          y="112"
          width="800"
          height="48"
          className="fill-text-dark-muted"
          opacity="0.35"
        />
      )}
      {scene.fog && (
        <rect
          data-part="fog"
          y="96"
          width="800"
          height="64"
          className="fill-surface-light"
          opacity="0.6"
        />
      )}
      {scene.rain && (
        <g
          data-part="rain"
          className="stroke-text-dark-muted motion-safe:animate-rain"
          opacity="0.5"
          strokeWidth="1.5"
        >
          {RAIN.map(([x, y]) => (
            <line key={`${x},${y}`} x1={x} y1={y} x2={x! - 4} y2={y! + 10} />
          ))}
        </g>
      )}
      {scene.heat && (
        <rect
          data-part="shimmer"
          x="-8"
          y="142"
          width="816"
          height="18"
          className="fill-warning"
          opacity="0.14"
        />
      )}
    </svg>
  );
}
