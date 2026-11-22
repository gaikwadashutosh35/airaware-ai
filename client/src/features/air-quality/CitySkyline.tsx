import { useId } from 'react';
import type { Scene, SceneAir } from './scene.ts';
import { SKYLINE } from './skylineGeometry.ts';

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
// top mutes towards `rule` under an overcast deck (weather, not air); the
// within sky keeps its hue there, so it never passes for an above one.
const SKY: Record<SceneAir, { top: string; overcast: string; bottom: string }> =
  {
    within: {
      top: '[stop-color:color-mix(in_oklab,var(--color-secondary)_46%,var(--color-surface-light))]',
      overcast:
        '[stop-color:color-mix(in_oklab,color-mix(in_oklab,var(--color-secondary)_46%,var(--color-surface-light))_75%,var(--color-rule))]',
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
// The air look changes over 700 ms (brief §5.2), and at once under reduced
// motion. The glow and the middle veil stay mounted at 0 so they can fade.
const FADE =
  'motion-safe:transition-[stop-color,opacity,background-color] motion-safe:duration-700 motion-safe:ease-out';
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

// One <path> per string of the city's path data (skylineGeometry.ts).
const paths = (ds: string[]) => ds.map((d, i) => <path key={i} d={d} />);

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
              <path d={SKYLINE.far} />
            </g>
            <g className="fill-rule">
              {paths(SKYLINE.near)}
              {paths(SKYLINE.tanks)}
            </g>
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
            <stop
              offset="0"
              className={`${overcast ? sky.overcast : sky.top} ${FADE}`}
            />
            <stop offset="1" className={`${sky.bottom} ${FADE}`} />
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
        <circle
          data-part="glow"
          cx="560"
          cy="58"
          r={scene.heat ? 76 : 62}
          fill={`url(#${id}-glow)`}
          className={FADE}
          style={{ opacity: scene.glow ? GLOW[scene.air] : 0 }}
        />
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
            <path d={SKYLINE.far} />
          </g>
        </svg>
        <div
          data-part="veil-far"
          className={`${FILL} ${VEIL[scene.air]} ${MASK} ${FADE}`}
          style={{ opacity: VEIL_FAR[scene.air] }}
        />
        <svg {...ROW}>
          <g
            data-part="mid"
            className="[fill:color-mix(in_oklab,var(--color-text-dark-muted)_55%,var(--color-text-dark))]"
            opacity="0.62"
          >
            {paths(SKYLINE.mid)}
          </g>
          {/* Railings, window squares and glass fins, at every width. */}
          <g
            data-part="mid-detail"
            className="fill-surface-light"
            opacity="0.28"
          >
            {paths(SKYLINE.midDetail)}
          </g>
        </svg>
        <div
          data-part="veil-mid"
          className={`${FILL} ${VEIL.above} ${MASK} ${FADE}`}
          style={{ opacity: scene.air === 'above' ? 0.2 : 0 }}
        />
        <svg {...ROW}>
          <g data-part="near" className="fill-text-dark" opacity="0.9">
            {paths(SKYLINE.near)}
          </g>
          <g data-part="tanks" className="fill-text-dark" opacity="0.9">
            {paths(SKYLINE.tanks)}
          </g>
          {/* Windows, balcony lines and shutters: detail a phone's small
              band can't hold. */}
          <g
            data-part="windows"
            className="fill-surface-light max-sm:hidden"
            opacity="0.5"
          >
            {paths(SKYLINE.nearDetail)}
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
