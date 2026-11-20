import { useId } from 'react';
import type { Scene, SceneAir } from './scene.ts';

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
// Offices and flats between the far and near rows.
const MID: Array<[number, number, number]> = [
  [12, 30, 66],
  [50, 24, 52],
  [86, 32, 74],
  [132, 20, 58],
  [226, 28, 68],
  [262, 22, 56],
  [296, 34, 78],
  [338, 26, 62],
  [374, 22, 50],
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
// halves don't repeat exactly. Wide enough that `slice` keeps the glow in
// view from a 320 px phone to a wide card.
const shifted = (row: Array<[number, number, number]>, by: number) =>
  row.map(([x, w], i): [number, number, number] => [
    x + 400,
    w,
    row[(i + by) % row.length]![2],
  ]);
const FAR_ALL = [...FAR, ...shifted(FAR, 4)];
const MID_ALL = [...MID, ...shifted(MID, 5)];
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

// Token colours as whole class strings, so Tailwind emits them. The sky's
// top mutes towards `rule` under an overcast deck (weather, not air).
const SKY: Record<SceneAir, { top: string; overcast: string; bottom: string }> =
  {
    within: {
      top: '[stop-color:color-mix(in_oklab,var(--color-secondary)_46%,var(--color-surface-light))]',
      overcast:
        '[stop-color:color-mix(in_oklab,color-mix(in_oklab,var(--color-secondary)_46%,var(--color-surface-light))_45%,var(--color-rule))]',
      bottom: '[stop-color:var(--color-surface-light)]',
    },
    above: {
      top: '[stop-color:color-mix(in_oklab,var(--color-secondary)_14%,var(--color-rule))]',
      overcast:
        '[stop-color:color-mix(in_oklab,color-mix(in_oklab,var(--color-secondary)_14%,var(--color-rule))_45%,var(--color-rule))]',
      bottom:
        '[stop-color:color-mix(in_oklab,var(--color-rule)_45%,var(--color-surface-light))]',
    },
    unknown: {
      top: '[stop-color:var(--color-rule)]',
      overcast: '[stop-color:var(--color-rule)]',
      bottom: '[stop-color:var(--color-surface-light)]',
    },
  };
const GLOW: Record<SceneAir, number> = { within: 0.6, above: 0.22, unknown: 0 };
const VEIL_FAR: Record<SceneAir, number> = {
  within: 0.05,
  above: 0.42,
  unknown: 0,
};
const VEIL: Record<SceneAir, string> = {
  within: 'fill-rule',
  above:
    '[fill:color-mix(in_oklab,var(--color-rule)_88%,var(--color-secondary))]',
  unknown: 'fill-rule',
};

const rects = (row: Array<[number, number, number]>) =>
  row.map(([x, w, h]) => (
    <rect key={x} x={x} y={160 - h} width={w} height={h} />
  ));

// A rooftop water tank on legs, centred on `cx`, standing on `top`.
const tank = (cx: number, top: number) =>
  `M${cx - 5} ${top - 7}h10v5h-10z` +
  `M${cx - 4} ${top - 2}h1.5v2h-1.5z` +
  `M${cx + 2.5} ${top - 2}h1.5v2h-1.5z`;

const BAND = 'block h-32 w-full sm:h-44';

// A decorative city skyline. Its look (sky, glow strength, veils) follows
// the server's 24-hour air check; clouds, rain, fog, heat and daylight follow
// this hour's weather forecast. The readout's words carry the meaning; this
// picture is hidden from assistive technology. With no scene yet, a still,
// neutral silhouette of the same city.
export function CitySkyline({ scene }: { scene: Scene | null }) {
  // Letters, digits, _ and - only, so every url(#…) resolves.
  const id = useId().replace(/[^\w-]/g, '');

  if (!scene) {
    return (
      <svg
        aria-hidden="true"
        data-air="loading"
        viewBox="0 0 800 160"
        preserveAspectRatio="xMidYMax slice"
        className={BAND}
      >
        <rect width="800" height="160" className="fill-surface-light" />
        <g className="fill-rule" opacity="0.7">
          {rects(FAR_ALL)}
        </g>
        <g className="fill-rule">{rects(NEAR_ALL)}</g>
      </svg>
    );
  }

  const sky = SKY[scene.air];
  const overcast = scene.clouds === 3;
  return (
    <svg
      aria-hidden="true"
      data-air={scene.air}
      data-clouds={scene.clouds}
      viewBox="0 0 800 160"
      preserveAspectRatio="xMidYMax slice"
      className={BAND}
    >
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" className={overcast ? sky.overcast : sky.top} />
          <stop offset="1" className={sky.bottom} />
        </linearGradient>
        <radialGradient id={`${id}-glow`}>
          <stop offset="0" className="[stop-color:var(--color-warning)]" />
          <stop
            offset="0.3"
            stopOpacity="0.6"
            className="[stop-color:var(--color-warning)]"
          />
          <stop
            offset="1"
            stopOpacity="0"
            className="[stop-color:var(--color-warning)]"
          />
        </radialGradient>
        <pattern
          id={`${id}-windows`}
          width="7"
          height="9"
          patternUnits="userSpaceOnUse"
        >
          <rect
            x="2"
            y="2"
            width="3"
            height="4"
            className="fill-surface-light"
            opacity="0.5"
          />
        </pattern>
      </defs>
      <rect data-part="sky" width="800" height="160" fill={`url(#${id}-sky)`} />
      {scene.glow && (
        <circle
          data-part="glow"
          cx="560"
          cy="58"
          r={scene.heat ? 76 : 62}
          fill={`url(#${id}-glow)`}
          opacity={GLOW[scene.air]}
        />
      )}
      {overcast && (
        <ellipse
          data-part="cloud-deck"
          cx="400"
          cy="-6"
          rx="520"
          ry="30"
          className="fill-rule"
          opacity="0.85"
        />
      )}
      <g data-part="clouds" className="motion-safe:animate-drift">
        {CLOUDS.slice(0, scene.clouds).map(([cx, cy]) => (
          <g key={cx} data-part="cloud">
            <ellipse
              cx={cx}
              cy={cy + 2}
              rx="38"
              ry="9"
              className="fill-rule"
              opacity="0.7"
            />
            <g className="fill-surface-light">
              <ellipse cx={cx} cy={cy} rx="36" ry="10" />
              <ellipse cx={cx - 15} cy={cy - 6} rx="17" ry="11" />
              <ellipse cx={cx + 12} cy={cy - 9} rx="20" ry="13" />
            </g>
          </g>
        ))}
      </g>
      <g data-part="far" className="fill-text-dark-muted" opacity="0.42">
        {rects(FAR_ALL)}
        {/* A domed hall. */}
        <rect x="160" y="120" width="50" height="40" />
        <path d="M163 120 A22 22 0 0 1 207 120 Z" />
      </g>
      <rect
        data-part="veil-far"
        width="800"
        height="160"
        className={VEIL[scene.air]}
        opacity={VEIL_FAR[scene.air]}
      />
      <g
        data-part="mid"
        className="[fill:color-mix(in_oklab,var(--color-text-dark-muted)_55%,var(--color-text-dark))]"
        opacity="0.62"
      >
        {rects(MID_ALL)}
      </g>
      {scene.air === 'above' && (
        <rect
          data-part="veil-mid"
          width="800"
          height="160"
          className={VEIL.above}
          opacity="0.2"
        />
      )}
      <g data-part="near" className="fill-text-dark" opacity="0.9">
        {rects(NEAR_ALL)}
        {/* A memorial arch. */}
        <path d="M150 160 V102 H194 V160 H182 V128 A10 10 0 0 0 162 128 V160 Z" />
      </g>
      <g data-part="tanks" className="fill-text-dark" opacity="0.9">
        {NEAR_ALL.filter((_, i) => i % 3 === 1).map(([x, w, h]) => (
          <path key={x} d={tank(x + w / 2, 160 - h)} />
        ))}
      </g>
      {/* Lit windows: detail a phone's small band can't hold. */}
      <g data-part="windows" className="max-sm:hidden">
        {NEAR_ALL.map(([x, w, h]) => (
          <rect
            key={x}
            x={x + 3}
            y={160 - h + 5}
            width={w - 6}
            height={h - 9}
            fill={`url(#${id}-windows)`}
          />
        ))}
      </g>
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
