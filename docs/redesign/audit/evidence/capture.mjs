// Stage 0 capture. Read-only on production; local mode answers every API
// call from the e2e fixtures. Usage: node capture.mjs prod|local
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const ROOT =
  'C:/Code/Projects/AirAwareAI/AirAware_AI_Challenge06_Extended_Project_Kit';
const R = (p) => `file:///${ROOT}/${p}`;
const { chromium } = await import(R('node_modules/playwright/index.mjs'));
const layout = await import(R('e2e/layout.ts'));
const routes = await import(R('e2e/routes.ts'));
const planFx = await import(R('client/src/test/planFixtures.ts'));
const askFx = await import(R('client/src/test/askFixtures.ts'));
const AXE = readFileSync(`${ROOT}/node_modules/axe-core/axe.min.js`, 'utf8');

const MODE = process.argv[2];
if (MODE !== 'prod' && MODE !== 'local') throw new Error('mode: prod|local');
const BASE =
  MODE === 'prod' ? 'https://airaware-ai.netlify.app' : 'http://localhost:5174';
const PROD_HOST = 'airaware-ai.netlify.app';
const SHOTS = `${ROOT}/docs/redesign/audit/screenshots`;
const OUT = `${process.env.TEMP}/claude/04831a48b8c01fbf/8aba605c-f22e-47de-9791-a4b5ffa9abb5/scratchpad/stage0`;
mkdirSync(SHOTS, { recursive: true });

const VIEWPORTS = [
  [320, 640],
  [390, 844],
  [768, 1024],
  [1280, 720],
  [1440, 900],
];
const FULL_AT = new Set(['390x844', '1280x720']);
const AXE_AT = new Set(['390x844', '1280x720']);
const Q = '?place=Pune%2C%20Maharashtra&lat=18.52&lon=73.86';

const run = {
  mode: MODE,
  base: BASE,
  startedAt: new Date().toISOString(),
  apiCalls: [],
  blocked: [],
  plan: { realCalls: 0, replayed: 0, status: null },
  http429: [],
  pages: [],
  keyboard: [],
  motion: [],
  errors: [],
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Keep production API traffic well under the 60-a-minute limit.
async function pace() {
  if (MODE !== 'prod') return;
  for (;;) {
    const recent = run.apiCalls.filter((c) => Date.now() - c.t < 60_000).length;
    if (recent < 30) return;
    await sleep(2_000);
  }
}

let planReply = null;
async function guard(context) {
  await context.route('**/*', async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const method = req.method();
    const api =
      url.pathname.startsWith('/api/') &&
      (url.hostname === PROD_HOST || url.hostname === 'localhost');
    const supabase = url.hostname.endsWith('.supabase.co');
    if (
      MODE === 'prod' &&
      api &&
      method === 'POST' &&
      url.pathname === '/api/v1/recommendations/daily-plan'
    ) {
      if (planReply) {
        run.plan.replayed++;
        return route.fulfill({
          status: planReply.status,
          contentType: 'application/json',
          body: planReply.body,
        });
      }
      if (run.plan.realCalls >= 1) {
        run.blocked.push({
          method,
          path: url.pathname,
          why: 'second plan call',
        });
        return route.abort();
      }
      run.plan.realCalls++;
      const resp = await route.fetch({ timeout: 60_000 });
      const body = await resp.text();
      planReply = { status: resp.status(), body };
      run.plan.status = resp.status();
      return route.fulfill({ response: resp, body });
    }
    if ((api && method !== 'GET') || (supabase && method !== 'GET')) {
      run.blocked.push({ method, path: `${url.hostname}${url.pathname}` });
      return route.abort();
    }
    return route.continue();
  });
}

function options(w, h, extra = {}) {
  const touch = w <= 768;
  return {
    viewport: { width: w, height: h },
    deviceScaleFactor: 1,
    isMobile: w < 768,
    hasTouch: touch,
    ...extra,
  };
}

function watch(page, sink) {
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning')
      sink.console.push(`${m.type()}: ${m.text().slice(0, 300)}`);
  });
  page.on('pageerror', (e) =>
    sink.console.push(`pageerror: ${String(e).slice(0, 300)}`),
  );
  page.on('requestfailed', (r) =>
    sink.failed.push(
      `${r.method()} ${r.url().slice(0, 160)} ${r.failure()?.errorText}`,
    ),
  );
  page.on('response', (r) => {
    const u = new URL(r.url());
    if (u.pathname.startsWith('/api/')) {
      run.apiCalls.push({
        t: Date.now(),
        path: u.pathname,
        status: r.status(),
      });
      sink.api.push(
        `${r.request().method()} ${u.pathname}${u.search ? '?…' : ''} ${r.status()}`,
      );
      if (r.status() === 429)
        run.http429.push(`${u.pathname} ${new Date().toISOString()}`);
    } else if (r.status() >= 400) {
      sink.failed.push(`${r.status()} ${r.url().slice(0, 160)}`);
    }
  });
}

// What the 20 Nov audit measured, with the same definitions.
function measure(page) {
  return page.evaluate(() => {
    const vis = (el) => el.checkVisibility?.() ?? true;
    const yOf = (re) => {
      let best = null;
      for (const el of document.body.querySelectorAll('*')) {
        if (!vis(el)) continue;
        const own = (el.textContent ?? '').trim();
        if (!re.test(own)) continue;
        if ([...el.children].some((c) => re.test((c.textContent ?? '').trim())))
          continue;
        const r = el.getBoundingClientRect();
        if (r.height === 0) continue;
        const y = Math.round(r.top + window.scrollY);
        if (best === null || y < best) best = y;
      }
      return best;
    };
    const text = document.body.innerText;
    const count = (re) => (text.match(re) ?? []).length;
    const navs = [...document.querySelectorAll('nav')].filter(vis).map((n) => ({
      label: n.getAttribute('aria-label'),
      items: [...n.querySelectorAll('a,button')].map((a) => ({
        name: (a.textContent ?? '').trim().slice(0, 30),
        current: a.getAttribute('aria-current'),
        h: Math.round(a.getBoundingClientRect().height),
      })),
      position: getComputedStyle(n).position,
      bottom: Math.round(n.getBoundingClientRect().bottom),
      top: Math.round(n.getBoundingClientRect().top),
    }));
    const h1 = [...document.querySelectorAll('h1')]
      .filter(vis)
      .map((h) => (h.textContent ?? '').trim().slice(0, 80));
    const headings = [...document.querySelectorAll('h1,h2,h3')]
      .filter(vis)
      .map((h) => `${h.tagName} ${(h.textContent ?? '').trim().slice(0, 60)}`);
    return {
      title: document.title,
      url: location.pathname + location.search,
      innerHeight: window.innerHeight,
      docHeight: document.documentElement.scrollHeight,
      screens: +(
        document.documentElement.scrollHeight / window.innerHeight
      ).toFixed(1),
      y: {
        verdict: yOf(
          /^(Forecast (within|above) India|We could not get a complete|Air (information|forecast) unavailable)/,
        ),
        recommendationHeading: yOf(/^Your recommendation for today$/),
        firstWhy: yOf(/^Why\??/),
        modelForecast: yOf(/Model forecast/),
        notCurrent: yOf(/Not current/),
        checkMyAir: yOf(/^Check My Air$/),
      },
      terms: {
        forecast: count(/forecast/gi),
        '24-hour': count(/24-hour/gi),
        model: count(/\bmodel\b/gi),
        CPCB: count(/CPCB/g),
        'PM2.5': count(/PM2\.5/g),
        'µg/m³': count(/[µμ]g\/m[³3]/g),
        'GMT+5:30': count(/GMT\+5:30/g),
        AQI: count(/\bAQI\b/g),
      },
      bannedWords: [
        'safe',
        'healthy',
        'clean air',
        'good air',
        'bad air',
      ].filter((w) => new RegExp(`\\b${w}\\b`, 'i').test(text)),
      h1,
      headings: headings.slice(0, 30),
      navs,
      buttons: [...document.querySelectorAll('button,a[href]')].filter(vis)
        .length,
    };
  });
}

async function axe(page) {
  await page.evaluate(AXE);
  return page.evaluate(async () => {
    // eslint-disable-next-line no-undef
    const r = await axe.run(document, {
      runOnly: {
        type: 'tag',
        values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'],
      },
    });
    return r.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      help: v.help,
      nodes: v.nodes.length,
      targets: v.nodes.slice(0, 4).map((n) => n.target.join(' ')),
    }));
  });
}

async function perf(page) {
  return page.evaluate(async () => {
    const nav = performance.getEntriesByType('navigation')[0];
    const lcp = await new Promise((res) => {
      let v = 0;
      try {
        new PerformanceObserver((l) => {
          for (const e of l.getEntries()) v = e.startTime;
        }).observe({ type: 'largest-contentful-paint', buffered: true });
      } catch {}
      setTimeout(() => res(Math.round(v)), 300);
    });
    const cls = await new Promise((res) => {
      let v = 0;
      try {
        new PerformanceObserver((l) => {
          for (const e of l.getEntries()) if (!e.hadRecentInput) v += e.value;
        }).observe({ type: 'layout-shift', buffered: true });
      } catch {}
      setTimeout(() => res(+v.toFixed(3)), 300);
    });
    const res = performance.getEntriesByType('resource');
    const by = {};
    for (const r of res) {
      const k = r.initiatorType;
      by[k] ??= { n: 0, kb: 0 };
      by[k].n++;
      by[k].kb += r.transferSize / 1024;
    }
    for (const k of Object.keys(by)) by[k].kb = Math.round(by[k].kb);
    return {
      ttfb: nav ? Math.round(nav.responseStart) : null,
      dcl: nav ? Math.round(nav.domContentLoadedEventEnd) : null,
      load: nav ? Math.round(nav.loadEventEnd) : null,
      lcp,
      cls,
      docKb: nav ? Math.round(nav.transferSize / 1024) : null,
      resources: by,
      fonts: res
        .filter((r) => /\.woff2?($|\?)/.test(r.name))
        .map(
          (r) =>
            `${r.name.split('/').pop()} ${Math.round(r.transferSize / 1024)}kB`,
        ),
      scripts: res
        .filter((r) => r.initiatorType === 'script')
        .map(
          (r) =>
            `${r.name.split('/').pop()} ${Math.round(r.transferSize / 1024)}kB`,
        ),
    };
  });
}

function meta(page) {
  return page.evaluate(() => ({
    lang: document.documentElement.lang,
    title: document.title,
    description: document
      .querySelector('meta[name="description"]')
      ?.getAttribute('content'),
    viewport: document
      .querySelector('meta[name="viewport"]')
      ?.getAttribute('content'),
    themeColor: [...document.querySelectorAll('meta[name="theme-color"]')].map(
      (m) => `${m.getAttribute('media') ?? ''} ${m.getAttribute('content')}`,
    ),
    colorScheme: document
      .querySelector('meta[name="color-scheme"]')
      ?.getAttribute('content'),
    icons: [...document.querySelectorAll('link[rel*="icon"]')].map(
      (l) => `${l.getAttribute('rel')} ${l.getAttribute('href')}`,
    ),
    manifest:
      document.querySelector('link[rel="manifest"]')?.getAttribute('href') ??
      null,
    og: [...document.querySelectorAll('meta[property^="og:"]')].map(
      (m) =>
        `${m.getAttribute('property')}=${(m.getAttribute('content') ?? '').slice(0, 60)}`,
    ),
  }));
}

async function shot(page, name, full) {
  const file = `${SHOTS}/${name}.jpg`;
  await page.screenshot({
    path: file,
    type: 'jpeg',
    quality: full ? 40 : 50,
    fullPage: full,
    animations: 'disabled',
  });
  return `${name}.jpg`;
}

async function settle(page) {
  try {
    await page.waitForLoadState('networkidle', { timeout: 45_000 });
  } catch {
    run.errors.push(`networkidle timeout ${page.url()}`);
  }
  await page.evaluate(() => document.fonts.ready);
  await sleep(700);
}

// One capture: a fresh context per viewport, so each load is a real first load.
async function capture(
  browser,
  {
    name,
    path,
    state = 'default',
    setup,
    viewports = VIEWPORTS,
    extra = {},
    after,
    fullAt = FULL_AT,
  },
) {
  for (const [w, h] of viewports) {
    await pace();
    const vp = `${w}x${h}`;
    const context = await browser.newContext(options(w, h, extra));
    await guard(context);
    const page = await context.newPage();
    const sink = { console: [], failed: [], api: [] };
    watch(page, sink);
    if (setup) await setup(page);
    const entry = {
      source: MODE,
      route: name,
      state,
      path,
      viewport: vp,
      shots: [],
    };
    try {
      await page.goto(BASE + path, {
        waitUntil: 'domcontentloaded',
        timeout: 60_000,
      });
      await settle(page);
      if (after) await after(page, entry);
      entry.perf = await perf(page);
      entry.m = await measure(page);
      entry.edge = await layout.pastTheEdge(page);
      entry.small = await layout.smallTargets(page);
      if (AXE_AT.has(vp)) entry.axe = await axe(page);
      const base = `${MODE}-${name}-${state}-${vp}`;
      entry.shots.push(await shot(page, `${base}-first`, false));
      if (fullAt.has(vp))
        entry.shots.push(await shot(page, `${base}-full`, true));
      if (!run.meta && MODE === 'prod') run.meta = await meta(page);
    } catch (e) {
      entry.error = String(e).slice(0, 400);
    }
    entry.console = sink.console;
    entry.failed = sink.failed;
    entry.api = sink.api;
    run.pages.push(entry);
    console.log(
      `${name}/${state} ${vp} ${entry.error ? 'ERROR ' + entry.error.slice(0, 80) : 'ok'} api=${sink.api.length}`,
    );
    await context.close();
    if (MODE === 'prod') await sleep(2_500);
  }
}

// Tab through a page and record where focus goes and whether it shows.
async function tabWalk(browser, name, path, [w, h], setup) {
  await pace();
  const context = await browser.newContext(options(w, h));
  await guard(context);
  const page = await context.newPage();
  if (setup) await setup(page);
  await page.goto(BASE + path, {
    waitUntil: 'domcontentloaded',
    timeout: 60_000,
  });
  await settle(page);
  const steps = [];
  for (let i = 1; i <= 45; i++) {
    await page.keyboard.press('Tab');
    await sleep(60);
    const s = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      const ring =
        (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) ||
        (cs.boxShadow && cs.boxShadow !== 'none');
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const hit =
        cx >= 0 && cy >= 0 && cx <= innerWidth && cy <= innerHeight
          ? document.elementFromPoint(cx, cy)
          : null;
      return {
        tag: el.tagName.toLowerCase(),
        name: (
          el.getAttribute('aria-label') ||
          el.textContent ||
          el.getAttribute('placeholder') ||
          ''
        )
          .trim()
          .replace(/\s+/g, ' ')
          .slice(0, 40),
        top: Math.round(r.top + scrollY),
        visibleRing: ring,
        obscured: hit
          ? !(el === hit || el.contains(hit) || hit.contains(el))
          : null,
        focusVisible: el.matches(':focus-visible'),
      };
    });
    steps.push(s);
    if (s === null && i > 3) break;
  }
  run.keyboard.push({ route: name, viewport: `${w}x${h}`, steps });
  await context.close();
  if (MODE === 'prod') await sleep(2_500);
}

async function motion(browser, name, path, setup) {
  for (const reducedMotion of ['no-preference', 'reduce']) {
    await pace();
    const context = await browser.newContext(
      options(390, 844, { reducedMotion }),
    );
    await guard(context);
    const page = await context.newPage();
    if (setup) await setup(page);
    await page.goto(BASE + path, {
      waitUntil: 'domcontentloaded',
      timeout: 60_000,
    });
    await settle(page);
    await sleep(1_500);
    const a = await page.evaluate(() =>
      document.getAnimations().map((x) => ({
        name: x.animationName ?? x.transitionProperty ?? x.constructor.name,
        state: x.playState,
        iterations: x.effect?.getTiming?.().iterations,
        duration: x.effect?.getTiming?.().duration,
      })),
    );
    run.motion.push({ route: name, reducedMotion, animations: a });
    await context.close();
    if (MODE === 'prod') await sleep(2_500);
  }
}

const browser = await chromium.launch();
try {
  if (MODE === 'prod') {
    const pages = [
      { name: 'landing', path: '/' },
      { name: 'app-noplace', path: '/app' },
      { name: 'welcome', path: '/app/welcome' },
      { name: 'today', path: `/app${Q}` },
      { name: 'ask', path: `/app/ask${Q}` },
      { name: 'home', path: `/app/home${Q}` },
      { name: 'habits', path: `/app/habits${Q}` },
      { name: 'profile', path: `/app/profile${Q}` },
      { name: 'privacy', path: '/privacy' },
      {
        name: 'unknown-app',
        path: '/app/nope',
        viewports: [
          [390, 844],
          [1280, 720],
        ],
      },
      { name: 'unknown', path: '/nope', viewports: [[1280, 720]] },
    ];
    for (const p of pages) await capture(browser, p);
    for (const [name, path] of [
      ['landing', '/'],
      ['today', `/app${Q}`],
      ['ask', `/app/ask${Q}`],
      ['welcome', '/app/welcome'],
    ]) {
      await tabWalk(browser, name, path, [1280, 720]);
      await tabWalk(browser, name, path, [390, 844]);
    }
    await motion(browser, 'today', `/app${Q}`);
  } else {
    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - 2 * 3600_000);
    const phones = [
      [320, 640],
      [390, 844],
      [1280, 720],
    ];
    const stubbed =
      (level, when = now) =>
      async (page) =>
        layout.stub(page, level, {}, when);
    const override = (level, pattern, handler) => async (page) => {
      await layout.stub(page, level);
      await page.route(pattern, handler);
    };
    const longPlace =
      'Thiruvananthapuram Municipal Corporation Ward Forty Two, Kerala, India';
    const longQ = `?place=${encodeURIComponent(longPlace)}&lat=8.52&lon=76.94`;
    const longPlan = structuredClone(planFx.rulesPlanFixture);
    (function lengthen(o) {
      if (Array.isArray(o)) return o.forEach(lengthen);
      if (o && typeof o === 'object') {
        if (
          typeof o.title === 'string' &&
          typeof o.text === 'string' &&
          typeof o.id === 'string'
        ) {
          o.title +=
            ' when the morning commute, school run and evening cooking all overlap';
          o.text +=
            ' This longer body checks how the card wraps when a rule explains several steps in plain words, across more than one sentence, on a narrow phone screen.';
        }
        Object.values(o).forEach(lengthen);
      }
    })(longPlan);
    const states = [
      {
        name: 'today',
        state: 'within',
        path: `/app${Q}`,
        setup: stubbed('not_elevated'),
        viewports: VIEWPORTS,
      },
      {
        name: 'today',
        state: 'above',
        path: `/app${Q}`,
        setup: stubbed('elevated'),
        viewports: phones,
      },
      {
        name: 'today',
        state: 'unknown-check',
        path: `/app${Q}`,
        setup: stubbed('unknown'),
        viewports: phones,
      },
      {
        name: 'today',
        state: 'stale',
        path: `/app${Q}`,
        setup: stubbed('not_elevated', twoHoursAgo),
        viewports: phones,
      },
      {
        name: 'today',
        state: 'unavailable',
        path: `/app${Q}`,
        viewports: phones,
        setup: override(
          'not_elevated',
          '**/api/v1/air-quality/forecast**',
          (r) =>
            r.fulfill({
              status: 502,
              json: {
                error: {
                  code: 'PROVIDER_ERROR',
                  message: 'Forecast provider unavailable.',
                },
              },
            }),
        ),
      },
      {
        name: 'today',
        state: 'loading',
        path: `/app${Q}`,
        viewports: phones,
        setup: override(
          'not_elevated',
          '**/api/v1/air-quality/forecast**',
          () => new Promise(() => {}),
        ),
      },
      {
        name: 'today',
        state: 'plan-error',
        path: `/app${Q}`,
        viewports: phones,
        setup: override(
          'not_elevated',
          '**/api/v1/recommendations/daily-plan',
          (r) =>
            r.fulfill({
              status: 503,
              json: { error: { code: 'AI_UNAVAILABLE', message: 'x' } },
            }),
        ),
      },
      {
        name: 'today',
        state: 'plan-building',
        path: `/app${Q}`,
        viewports: phones,
        setup: override(
          'not_elevated',
          '**/api/v1/recommendations/daily-plan',
          () => new Promise(() => {}),
        ),
      },
      {
        name: 'today',
        state: 'unavailable-plan',
        path: `/app${Q}`,
        viewports: phones,
        setup: override(
          'unknown',
          '**/api/v1/recommendations/daily-plan',
          (r) =>
            r.fulfill({
              json: {
                data: routes.planAt(planFx.unavailablePlanFixture, new Date()),
              },
            }),
        ),
      },
      {
        name: 'welcome',
        state: 'noplace',
        path: '/app',
        setup: stubbed('not_elevated'),
        viewports: phones,
      },
      {
        name: 'profile',
        state: 'empty',
        path: `/app/profile${Q}`,
        setup: stubbed('not_elevated'),
        viewports: phones,
      },
      {
        name: 'today',
        state: 'long-place',
        path: `/app${longQ}`,
        setup: stubbed('not_elevated'),
        viewports: phones,
      },
      {
        name: 'today',
        state: 'long-recommendation',
        path: `/app${Q}`,
        viewports: phones,
        setup: override(
          'not_elevated',
          '**/api/v1/recommendations/daily-plan',
          (r) =>
            r.fulfill({ json: { data: routes.planAt(longPlan, new Date()) } }),
        ),
      },
      {
        name: 'today',
        state: 'ai-plan',
        path: `/app${Q}`,
        viewports: phones,
        setup: override(
          'elevated',
          '**/api/v1/recommendations/daily-plan',
          (r) =>
            r.fulfill({
              json: { data: routes.planAt(planFx.aiPlanFixture, new Date()) },
            }),
        ),
      },
      {
        name: 'today',
        state: 'text-200',
        path: `/app${Q}`,
        viewports: [
          [390, 844],
          [1280, 720],
        ],
        setup: stubbed('not_elevated'),
        after: async (page) => {
          await page.evaluate(() => {
            document.documentElement.style.fontSize = '200%';
          });
          await sleep(500);
        },
      },
      {
        name: 'ask',
        state: 'answer',
        path: `/app/ask${Q}`,
        viewports: phones,
        setup: override('not_elevated', '**/api/v1/assistant/answer', (r) =>
          r.fulfill({
            json: { data: routes.planAt(askFx.rulesAskFixture, new Date()) },
          }),
        ),
        after: async (page, entry) => {
          const starter = page.getByRole('button', { name: /\?$/ }).first();
          if (await starter.count()) {
            entry.clicked = (await starter.textContent())?.trim();
            await starter.click();
            await sleep(1_500);
          } else {
            entry.clicked = 'no starter question button found';
          }
        },
      },
      {
        name: 'home',
        state: 'within',
        path: `/app/home${Q}`,
        setup: stubbed('not_elevated'),
        viewports: phones,
      },
      {
        name: 'habits',
        state: 'within',
        path: `/app/habits${Q}`,
        setup: stubbed('not_elevated'),
        viewports: phones,
      },
    ];
    for (const s of states)
      await capture(browser, {
        fullAt:
          s.state === 'within' && s.name === 'today'
            ? FULL_AT
            : new Set(['390x844']),
        ...s,
      });
    await tabWalk(
      browser,
      'today',
      `/app${Q}`,
      [1280, 720],
      stubbed('not_elevated'),
    );
    await motion(browser, 'today', `/app${Q}`, stubbed('not_elevated'));
  }
} finally {
  await browser.close();
  run.finishedAt = new Date().toISOString();
  run.apiCallCount = run.apiCalls.length;
  delete run.apiCalls;
  writeFileSync(`${OUT}/${MODE}-metrics.json`, JSON.stringify(run, null, 1));
  console.log(
    `done: pages=${run.pages.length} blocked=${run.blocked.length} 429=${run.http429.length} plan=${JSON.stringify(run.plan)}`,
  );
}
