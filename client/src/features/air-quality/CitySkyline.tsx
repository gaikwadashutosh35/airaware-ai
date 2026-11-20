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

// The rain tile (24 x 64): two slanted streaks a row (32) and half a column
// (12) apart, so the loop (one row down, half a column left) lands the tile
// on itself. Each streak runs to (x - 4, y + 10), inside the tile.
const RAIN_TILE: Array<[number, number]> = [
  [8, 4],
  [20, 36],
];

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
  within: 'bg-rule',
  above:
    'bg-[color-mix(in_oklab,var(--color-rule)_88%,var(--color-secondary))]',
  unknown: 'bg-rule',
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

// The fixed full-screen backdrop and its layers (backdrop design §5.1). The
// city band never takes over a fifth of the screen, and sits above the phone
// bar (56 px plus the safe area) below md. Under 24rem tall (a phone held
// sideways) a wrapped title could reach the band, so the city hides and the
// sky alone carries the look. In Windows High Contrast (forced colours) the
// whole backdrop steps aside, so the words sit on the system background.
const ROOT =
  'pointer-events-none fixed inset-0 -z-10 overflow-hidden forced-colors:hidden';
const FILL = 'absolute inset-0 size-full';
const CITY =
  'absolute inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] h-[min(8rem,20vh)] w-full sm:h-[min(11rem,20vh)] md:bottom-0 [@media(max-height:24rem)]:hidden';

// The city's rows share one drawing box, stacked as layers so the veils
// and fog can sit between them as HTML. Those fade in from the top of the
// city box as shown, to full strength at 60 % of it: on screens wider than
// 5:1, `slice` crops the drawing's top, so a fade drawn inside it would
// start part-way and show an edge across the sky.
const ROW = {
  viewBox: '0 0 800 160',
  preserveAspectRatio: 'xMidYMax slice',
  className: FILL,
} as const;
const MASK = '[mask-image:linear-gradient(transparent,black_60%)]';

// The app's backdrop: a decorative city behind every page. Its look (sky,
// glow strength, veils) follows the server's 24-hour air check; clouds, rain,
// fog, heat and daylight follow this hour's weather forecast. The page's
// words carry the meaning; this picture is hidden from assistive technology.
// With no scene yet, a still, neutral silhouette of the same city.
export function CitySkyline({ scene }: { scene: Scene | null }) {
  // Letters, digits, _ and - only, so every url(#…) resolves.
  const id = useId().replace(/[^\w-]/g, '');

  if (!scene) {
    return (
      <div aria-hidden="true" data-air="loading" className={ROOT}>
        <svg data-layer="sky" className={FILL}>
          <rect width="100%" height="100%" className="fill-surface-light" />
        </svg>
        <div data-layer="city" className={CITY}>
          <svg {...ROW}>
            <g className="fill-rule" opacity="0.7">
              {rects(FAR_ALL)}
            </g>
            <g className="fill-rule">{rects(NEAR_ALL)}</g>
          </svg>
        </div>
      </div>
    );
  }

  const sky = SKY[scene.air];
  const overcast = scene.clouds === 3;
  return (
    <div
      aria-hidden="true"
      data-air={scene.air}
      data-clouds={scene.clouds}
      className={ROOT}
    >
      <svg
        data-layer="sky"
        viewBox="0 0 1 1"
        preserveAspectRatio="none"
        className={FILL}
      >
        <defs>
          <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" className={overcast ? sky.overcast : sky.top} />
            <stop offset="1" className={sky.bottom} />
          </linearGradient>
        </defs>
        <rect data-part="sky" width="1" height="1" fill={`url(#${id}-sky)`} />
      </svg>
      {/* The upper sky, under the 64 px header. */}
      <svg
        data-layer="upper"
        viewBox="0 0 800 160"
        preserveAspectRatio="xMidYMin slice"
        className="absolute inset-x-0 top-16 h-40 w-full sm:h-56"
      >
        <defs>
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
        </defs>
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
      </svg>
      <div data-layer="city" className={CITY}>
        <svg {...ROW}>
          <g data-part="far" className="fill-text-dark-muted" opacity="0.42">
            {rects(FAR_ALL)}
            {/* A domed hall. */}
            <rect x="160" y="120" width="50" height="40" />
            <path d="M163 120 A22 22 0 0 1 207 120 Z" />
          </g>
        </svg>
        <div
          data-part="veil-far"
          className={`${FILL} ${VEIL[scene.air]} ${MASK}`}
          style={{ opacity: VEIL_FAR[scene.air] }}
        />
        <svg {...ROW}>
          <g
            data-part="mid"
            className="[fill:color-mix(in_oklab,var(--color-text-dark-muted)_55%,var(--color-text-dark))]"
            opacity="0.62"
          >
            {rects(MID_ALL)}
          </g>
        </svg>
        {scene.air === 'above' && (
          <div
            data-part="veil-mid"
            className={`${FILL} ${VEIL.above} ${MASK}`}
            style={{ opacity: 0.2 }}
          />
        )}
        <svg {...ROW}>
          <defs>
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
        </svg>
        {/* Fog at the city's base only (backdrop design §5.1). */}
        {scene.fog && (
          <div
            data-part="fog"
            className={`${FILL} bg-surface-light ${MASK}`}
            style={{ opacity: 0.6 }}
          />
        )}
        {scene.heat && (
          <svg {...ROW}>
            <rect
              data-part="shimmer"
              x="-8"
              y="142"
              width="816"
              height="18"
              className="fill-warning"
              opacity="0.14"
            />
          </svg>
        )}
      </div>
      {/* Rain over the whole screen: a tile one loop of rain-fall maps onto
          itself. The whole layer moves, as one box the browser can hand to
          the GPU, and overhangs the screen by 64 px each side, so the loop
          (12 px left, 32 px down) never shows an edge. */}
      {scene.rain && (
        <svg
          data-layer="rain"
          className="absolute -inset-16 motion-safe:animate-rain"
        >
          <defs>
            <pattern
              id={`${id}-rain`}
              width="24"
              height="64"
              patternUnits="userSpaceOnUse"
            >
              <g
                className="stroke-text-dark-muted"
                opacity="0.5"
                strokeWidth="1.5"
              >
                {RAIN_TILE.map(([x, y]) => (
                  <line key={x} x1={x} y1={y} x2={x - 4} y2={y + 10} />
                ))}
              </g>
            </pattern>
          </defs>
          <rect
            data-part="rain"
            width="100%"
            height="100%"
            fill={`url(#${id}-rain)`}
          />
        </svg>
      )}
    </div>
  );
}
