// Stage 0 supplement, local dev + e2e fixtures only: expanded disclosures,
// the place dialog and search journey, Welcome steps 2-3, landing search.
import { readFileSync, writeFileSync } from 'node:fs';

const ROOT =
  'C:/Code/Projects/AirAwareAI/AirAware_AI_Challenge06_Extended_Project_Kit';
const R = (p) => `file:///${ROOT}/${p}`;
const { chromium } = await import(R('node_modules/playwright/index.mjs'));
const layout = await import(R('e2e/layout.ts'));
const fx = await import(R('client/src/test/fixtures.ts'));
const AXE = readFileSync(`${ROOT}/node_modules/axe-core/axe.min.js`, 'utf8');
const BASE = 'http://localhost:5174';
const SHOTS = `${ROOT}/docs/redesign/audit/screenshots`;
const OUT = `${process.env.TEMP}/claude/04831a48b8c01fbf/8aba605c-f22e-47de-9791-a4b5ffa9abb5/scratchpad/stage0`;
const Q = '?place=Pune%2C%20Maharashtra&lat=18.52&lon=73.86';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const out = { startedAt: new Date().toISOString(), blocked: [], entries: [] };

async function newPage(browser, w, h) {
  const context = await browser.newContext({
    viewport: { width: w, height: h },
    deviceScaleFactor: 1,
    isMobile: w < 768,
    hasTouch: w <= 768,
  });
  await context.route('**/*', (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (
      (url.pathname.startsWith('/api/') ||
        url.hostname.endsWith('.supabase.co')) &&
      req.method() !== 'GET' &&
      !url.pathname.endsWith('/daily-plan')
    ) {
      out.blocked.push(`${req.method()} ${url.pathname}`);
      return route.abort();
    }
    return route.continue();
  });
  const page = await context.newPage();
  const consoleLines = [];
  page.on(
    'console',
    (m) => m.type() === 'error' && consoleLines.push(m.text().slice(0, 200)),
  );
  page.on('pageerror', (e) => consoleLines.push(String(e).slice(0, 200)));
  return { context, page, consoleLines };
}

async function check(page) {
  await page.evaluate(AXE);
  const axe = await page.evaluate(async () => {
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
      nodes: v.nodes.length,
      targets: v.nodes.slice(0, 4).map((n) => n.target.join(' ')),
    }));
  });
  return {
    axe,
    edge: await layout.pastTheEdge(page),
    small: await layout.smallTargets(page),
    screens: await page.evaluate(
      () => +(document.documentElement.scrollHeight / innerHeight).toFixed(1),
    ),
  };
}

async function shot(page, name, full) {
  await page.screenshot({
    path: `${SHOTS}/${name}.jpg`,
    type: 'jpeg',
    quality: full ? 40 : 50,
    fullPage: full,
    animations: 'disabled',
  });
  return `${name}.jpg`;
}

async function step(browser, name, [w, h], fn) {
  const { context, page, consoleLines } = await newPage(browser, w, h);
  const entry = { name, viewport: `${w}x${h}`, shots: [] };
  try {
    await fn(page, entry);
  } catch (e) {
    entry.error = String(e).slice(0, 300);
  }
  entry.console = consoleLines;
  out.entries.push(entry);
  console.log(
    `${name} ${w}x${h} ${entry.error ? 'ERROR ' + entry.error.slice(0, 100) : 'ok'}`,
  );
  await context.close();
}

const searchStub = (reply) => (page) =>
  page.route('**/api/v1/locations/search**', reply);
const results = (r) => r.fulfill({ json: { data: fx.searchFixture } });

const browser = await chromium.launch();
try {
  // A. Every disclosure open on Today: Why?, See your full day, Air quality details.
  for (const vp of [
    [320, 640],
    [390, 844],
    [1280, 720],
  ]) {
    await step(browser, 'today-details-open', vp, async (page, e) => {
      await layout.stub(page, 'not_elevated');
      await page.goto(BASE + `/app${Q}`);
      await page.waitForLoadState('networkidle');
      await page
        .getByRole('heading', { name: 'Your recommendation for today' })
        .waitFor();
      await sleep(500);
      e.opened = await page.$$eval('details', (ds) => {
        ds.forEach((d) => {
          d.open = true;
        });
        return ds.map((d) =>
          (d.querySelector('summary')?.textContent ?? '').trim().slice(0, 50),
        );
      });
      await sleep(600);
      Object.assign(e, await check(page));
      e.shots.push(
        await shot(
          page,
          `local-today-details-open-${vp[0]}x${vp[1]}-full`,
          true,
        ),
      );
    });
  }
  // B-D. Place dialog: open, results, no result, error; Escape returns focus.
  for (const vp of [
    [390, 844],
    [1280, 720],
  ]) {
    await step(browser, 'place-dialog', vp, async (page, e) => {
      await layout.stub(page, 'not_elevated');
      await searchStub(results)(page);
      await page.goto(BASE + `/app${Q}`);
      await page.waitForLoadState('networkidle');
      const chip = page.getByRole('button', { name: /^Change place/ });
      await chip.click();
      const box = page.getByRole('combobox', {
        name: 'Search for a city or area in India',
      });
      await box.waitFor();
      await sleep(400);
      Object.assign(e, await check(page));
      e.shots.push(
        await shot(
          page,
          `local-place-dialog-open-${vp[0]}x${vp[1]}-first`,
          false,
        ),
      );
      await box.fill('Pu');
      await page.getByRole('option').first().waitFor({ timeout: 5000 });
      await sleep(300);
      e.options = await page.getByRole('option').allTextContents();
      e.resultsAxe = (await check(page)).axe;
      e.shots.push(
        await shot(
          page,
          `local-place-dialog-results-${vp[0]}x${vp[1]}-first`,
          false,
        ),
      );
      await page.keyboard.press('Escape');
      await sleep(300);
      if (await box.isVisible()) await page.keyboard.press('Escape');
      await sleep(300);
      e.dialogClosed = !(await box.isVisible());
      e.focusAfterEscape = await page.evaluate(() =>
        (
          document.activeElement?.getAttribute('aria-label') ||
          document.activeElement?.textContent ||
          ''
        )
          .trim()
          .slice(0, 50),
      );
    });
  }
  for (const [state, reply] of [
    ['no-result', (r) => r.fulfill({ json: { data: [] } })],
    [
      'error',
      (r) =>
        r.fulfill({
          status: 502,
          json: { error: { code: 'PROVIDER_ERROR', message: 'x' } },
        }),
    ],
  ]) {
    await step(
      browser,
      `place-search-${String(state)}`,
      [390, 844],
      async (page, e) => {
        await layout.stub(page, 'not_elevated');
        await searchStub(reply)(page);
        await page.goto(BASE + `/app${Q}`);
        await page.waitForLoadState('networkidle');
        await page.getByRole('button', { name: /^Change place/ }).click();
        const box = page.getByRole('combobox', {
          name: 'Search for a city or area in India',
        });
        await box.fill(state === 'no-result' ? 'Zzqx' : 'Pune');
        await sleep(1500);
        e.dialogText = (await page.getByRole('dialog').innerText())
          .replace(/\s+/g, ' ')
          .slice(0, 400);
        e.shots.push(
          await shot(
            page,
            `local-place-search-${String(state)}-390x844-first`,
            false,
          ),
        );
      },
    );
  }
  // E. Welcome steps 2 and 3 (Remember must be off by default). Never press See my air.
  for (const vp of [
    [390, 844],
    [1280, 720],
  ]) {
    await step(browser, 'welcome-steps', vp, async (page, e) => {
      await layout.stub(page, 'not_elevated');
      await searchStub(results)(page);
      await page.goto(BASE + '/app/welcome');
      await page.waitForLoadState('networkidle');
      await page
        .getByRole('combobox', { name: 'Search for a city or area in India' })
        .fill('Pune');
      await page
        .getByRole('option', { name: 'Pune, Maharashtra', exact: true })
        .click();
      await page
        .getByRole('heading', { name: 'What does your typical day look like?' })
        .waitFor();
      await sleep(400);
      e.step2 = await check(page);
      e.shots.push(
        await shot(page, `local-welcome-step2-${vp[0]}x${vp[1]}-full`, true),
      );
      await page.getByRole('button', { name: 'Next' }).click();
      await page
        .getByRole('heading', { name: 'Tell us a little about your home.' })
        .waitFor();
      await sleep(400);
      e.step3 = await check(page);
      e.rememberChecked = await page
        .getByRole('checkbox', { name: 'Remember on this device' })
        .isChecked();
      e.step3Text = (await page.locator('main').innerText())
        .replace(/\s+/g, ' ')
        .slice(0, 600);
      e.shots.push(
        await shot(page, `local-welcome-step3-${vp[0]}x${vp[1]}-full`, true),
      );
    });
  }
  // F. Landing hero search with suggestions.
  await step(browser, 'landing-search', [390, 844], async (page, e) => {
    await searchStub(results)(page);
    await page.goto(BASE + '/');
    await page.waitForLoadState('networkidle');
    await page
      .getByRole('combobox', { name: 'Search for a city or area in India' })
      .first()
      .fill('Pu');
    await page.getByRole('option').first().waitFor({ timeout: 5000 });
    await sleep(300);
    Object.assign(e, await check(page));
    e.shots.push(await shot(page, 'local-landing-search-390x844-first', false));
  });
} finally {
  await browser.close();
  writeFileSync(`${OUT}/supplement-metrics.json`, JSON.stringify(out, null, 1));
  console.log(
    `done entries=${out.entries.length} blocked=${out.blocked.length}`,
  );
}
