// The app backdrop in a real browser (backdrop design §5): only each page's
// title block may sit on the scene, and it reads against every sky; every
// other word has a solid surface between it and the backdrop; the backdrop
// stays put between pages.
import { expect, test, type Page } from '@playwright/test';
import type { WeatherNow } from '../shared/contracts.ts';
import { expectNoAxeViolations } from './axe.ts';
import { at, pastTheEdge, stub, visibleH1, type Level } from './layout.ts';
import { searchFixture } from '../client/src/test/fixtures.ts';
import { PUNE } from './routes.ts';

const stubToday = (page: Page) => stub(page);

// Chromium only. stub() sets "no-preference"; this switches to "reduce".
async function setTransparency(page: Page, value: 'reduce') {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-transparency', value }],
  });
}

// Visible text in `main` outside the title block with no opaque background
// between it and `main`; its first 40 characters.
function textOnScene(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const main = document.querySelector('main')!;
    const opaque = (el: Element) => {
      const bg = getComputedStyle(el).backgroundColor;
      if (/^rgb\(/.test(bg)) return true;
      // A see-through card (85 %, blurred) counts as a surface too.
      const alpha = /^rgba\(.*,\s*([\d.]+)\)$|\/\s*([\d.]+)\)$/.exec(bg);
      const a = alpha?.[1] ?? alpha?.[2];
      return a !== undefined && Number(a) >= 0.85;
    };
    const offenders: string[] = [];
    const walker = document.createTreeWalker(main, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const text = node.textContent?.trim();
      const el = node.parentElement;
      if (!text || !el) continue;
      if (el.closest('[data-part="title-block"], .sr-only')) continue;
      if (!el.checkVisibility({ opacityProperty: true })) continue;
      let solid = false;
      for (let a: Element | null = el; a && a !== main; a = a.parentElement) {
        if (opaque(a)) {
          solid = true;
          break;
        }
      }
      if (!solid) offenders.push(text.slice(0, 40));
    }
    return offenders;
  });
}

for (const path of [
  '/app',
  '/app/ask',
  '/app/home',
  '/app/habits',
  '/app/profile',
]) {
  test(`no text outside the title block rests on the scene: ${path}`, async ({
    page,
  }) => {
    await stubToday(page);
    await page.goto(at(path));
    // Today and My Profile stay mounted while hidden: the shown page's h1.
    await expect(page.locator('main h1:visible').first()).toBeVisible();
    await page.waitForLoadState('networkidle');
    for (const details of await page.locator('main details').all()) {
      await details.evaluate((el) => {
        (el as HTMLDetailsElement).open = true;
      });
    }
    expect(await textOnScene(page)).toEqual([]);
  });
}

test('no text outside the title block rests on the scene: Welcome', async ({
  page,
}) => {
  await page.goto('/app/welcome');
  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'Where should we check air quality?',
    }),
  ).toBeVisible();
  expect(await textOnScene(page)).toEqual([]);
});

test('the backdrop stays put between pages', async ({ page }) => {
  await stub(page, 'not_elevated', { cloudCoverPercent: 30 });
  await page.goto(PUNE);
  await expect(page.locator('[data-air]')).toHaveAttribute(
    'data-air',
    'within',
  );
  // Past the clouds' one drift, then mark the backdrop element.
  await page.waitForTimeout(5_500);
  await page.evaluate(() => {
    Object.assign(window, { backdrop: document.querySelector('[data-air]') });
  });
  const nav = page.getByRole('navigation', { name: 'Main' });
  for (const name of [/Ask/, /Habits/]) {
    await nav.getByRole('link', { name }).click();
    await expect(visibleH1(page)).toBeVisible();
    // A remount would restart the drift: 200 ms in, the clouds would be
    // well off their resting place.
    await page.waitForTimeout(200);
    const seen = await page.evaluate(() => {
      const el = document.querySelector('[data-air]');
      const clouds = el?.querySelector('[data-part="clouds"]');
      return {
        same: el === (window as unknown as { backdrop: Element }).backdrop,
        air: el?.getAttribute('data-air'),
        transform: clouds ? getComputedStyle(clouds).transform : null,
      };
    });
    expect(seen.same).toBe(true);
    expect(seen.air).toBe('within');
    expect(['none', 'matrix(1, 0, 0, 1, 0, 0)']).toContain(seen.transform);
  }
});

// The lowest contrast between the title block's text colours and every
// colour that can pass behind it: each sky stop alone, each cloud, deck,
// glow centre and city row (far and middle, at their own opacity) over each
// sky stop, the middle row over the far one, and a rain streak over all of
// those. The near row is left out: the large-text test below keeps the title
// off the whole city at the sizes it samples, and the near row is quiet on
// purpose (CS-10).
function titleContrast(page: Page) {
  return page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    const rgb = (css: string) => {
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = '#000';
      ctx.fillStyle = css;
      ctx.fillRect(0, 0, 1, 1);
      return [...ctx.getImageData(0, 0, 1, 1).data.slice(0, 3)];
    };
    const over = (top: number[], alpha: number, base: number[]) =>
      top.map((c, i) => c * alpha + base[i]! * (1 - alpha));
    const lum = (c: number[]) => {
      const [r, g, b] = c.map((v) => {
        const s = v / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
    };
    const contrast = (a: number[], b: number[]) => {
      const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
      return (hi! + 0.05) / (lo! + 0.05);
    };
    const root = document.querySelector('[data-air]')!;
    const gradientStops = (holder: Element) => {
      const ref = /url\(#([^)]+)\)/.exec(
        holder.getAttribute('fill') ?? '',
      )![1]!;
      return [...document.getElementById(ref)!.querySelectorAll('stop')];
    };
    const skies = gradientStops(root.querySelector('[data-part="sky"]')!).map(
      (stop) => rgb(getComputedStyle(stop).stopColor),
    );
    const layers: Array<{ name: string; color: number[]; alpha: number }> = [];
    for (const el of root.querySelectorAll(
      '[data-part="cloud"] ellipse, [data-part="cloud-deck"]',
    )) {
      const style = getComputedStyle(el);
      layers.push({
        name: el.matches('[data-part="cloud-deck"]') ? 'deck' : 'cloud',
        color: rgb(style.fill),
        alpha: Number(style.opacity),
      });
    }
    for (const row of root.querySelectorAll(
      '[data-part="far"], [data-part="mid"]',
    )) {
      layers.push({
        name: 'city ' + row.getAttribute('data-part'),
        color: rgb(getComputedStyle(row).fill),
        alpha: Number(getComputedStyle(row).opacity),
      });
    }
    const glow = root.querySelector('[data-part="glow"]');
    if (glow) {
      layers.push({
        name: 'glow',
        color: rgb(getComputedStyle(gradientStops(glow)[0]!).stopColor),
        alpha: Number(getComputedStyle(glow).opacity),
      });
    }
    const streak = root.querySelector('pattern line');
    if (streak) {
      layers.push({
        name: 'rain',
        color: rgb(getComputedStyle(streak).stroke),
        alpha: Number(getComputedStyle(streak.parentElement!).opacity),
      });
    }
    // Clouds, the deck and the glow over each sky stop; then rain over each
    // of those and over the bare sky, since a streak can cross any of them.
    const rain = layers.filter((l) => l.name === 'rain');
    const bases = [
      ...skies.map((color) => ({ name: 'sky', color })),
      ...skies.flatMap((sky, i) =>
        layers
          // The city stands in the band at the foot of the screen, over the
          // sky's bottom stop.
          .filter(
            (l) =>
              l.name !== 'rain' &&
              (!l.name.startsWith('city') || i === skies.length - 1),
          )
          .map((l) => ({ name: l.name, color: over(l.color, l.alpha, sky) })),
      ),
    ];
    // The middle row stands in front of the far one.
    const far = layers.find((l) => l.name === 'city far')!;
    const mid = layers.find((l) => l.name === 'city mid')!;
    const farOver = over(far.color, far.alpha, skies[skies.length - 1]!);
    bases.push({
      name: 'city mid over far',
      color: over(mid.color, mid.alpha, farOver),
    });
    const behind = [
      ...bases,
      ...bases.flatMap((base) =>
        rain.map((r) => ({
          name: `rain over ${base.name}`,
          color: over(r.color, r.alpha, base.color),
        })),
      ),
    ];
    const texts = new Set<string>();
    // The shown page's block: My Profile stays mounted, hidden, before it.
    const block = [
      ...document.querySelectorAll('[data-part="title-block"]'),
    ].find((el) => el.checkVisibility())!;
    for (const el of [block, ...block.querySelectorAll('*')]) {
      if (el.checkVisibility() && el.textContent?.trim()) {
        texts.add(getComputedStyle(el).color);
      }
    }
    let worst = { ratio: Infinity, text: '', behind: '' };
    for (const text of texts) {
      for (const b of behind) {
        const ratio = contrast(rgb(text), b.color);
        if (ratio < worst.ratio) worst = { ratio, text, behind: b.name };
      }
    }
    return { ...worst, layers: layers.map((l) => l.name) };
  });
}

const SKIES: Array<Partial<WeatherNow>> = [
  { precipitationMm: 1, cloudCoverPercent: 30, isDay: true }, // rain
  { precipitationMm: 0, cloudCoverPercent: 90, isDay: true }, // deck
  { precipitationMm: 0, cloudCoverPercent: 30, isDay: true }, // glow
  { precipitationMm: 1, cloudCoverPercent: 90, isDay: true }, // rain, deck
];

const LOOK: Record<Level, string> = {
  not_elevated: 'within',
  elevated: 'above',
  unknown: 'unknown',
};

for (const level of ['not_elevated', 'elevated', 'unknown'] as const) {
  test(`the title block reads against every sky: ${level}`, async ({
    page,
  }) => {
    for (const weather of SKIES) {
      await stub(page, level, weather);
      await page.goto(PUNE);
      await expect(visibleH1(page)).toBeVisible();
      // The look this run asked for, not just any drawn look.
      await expect(page.locator('[data-air]')).toHaveAttribute(
        'data-air',
        LOOK[level],
      );
      const worst = await titleContrast(page);
      // Each look's city rows are among the colours tried.
      expect(worst.layers).toEqual(
        expect.arrayContaining(['city far', 'city mid']),
      );
      console.log(
        'title contrast ' +
          level +
          ': ' +
          worst.ratio.toFixed(2) +
          ' ' +
          worst.behind,
      );
      expect(
        worst.ratio,
        JSON.stringify({ weather, worst }),
      ).toBeGreaterThanOrEqual(4.5);
      await page.unrouteAll();
    }
  });
}

// Final review: a long place wraps the title, which a short landscape
// screen can push into the city band. Whenever the city shows, the title
// must end above it.
const LONG_PLACE =
  'Pune Municipal Corporation Ward Office Twenty Three, Pune, Maharashtra';
for (const [width, height] of [
  [640, 320],
  [667, 400],
] as const) {
  for (const label of ['Pune, Maharashtra', LONG_PLACE]) {
    test(`a short landscape phone keeps the title off the city: ${width}x${height}, ${label.length} chars`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height });
      await stub(page, 'not_elevated');
      await page.goto(
        PUNE.replace('Pune%2C%20Maharashtra', encodeURIComponent(label)),
      );
      await expect(visibleH1(page)).toBeVisible();
      const title = (await visibleH1(page).boundingBox())!;
      const city = page.locator('[data-layer="city"]');
      if (await city.isVisible()) {
        const top = (await city.boundingBox())!.y;
        expect(title.y + title.height).toBeLessThan(top);
      }
    });
  }
}

for (const level of ['not_elevated', 'elevated', 'unknown'] as const) {
  test(`axe passes over the ${level} look`, async ({ page }) => {
    await stub(page, level, {
      precipitationMm: 1,
      cloudCoverPercent: 30,
      isDay: true,
    });
    for (const path of ['/app', '/app/ask', '/app/habits']) {
      await page.goto(at(path));
      await expect(visibleH1(page)).toBeVisible();
      await page.waitForLoadState('networkidle');
      await expectNoAxeViolations(page);
    }
  });
}

// Final review: the rain moves its whole layer, as one box, and stays still
// under reduced motion.
for (const reducedMotion of ['no-preference', 'reduce'] as const) {
  test(`the rain layer moves as one box: ${reducedMotion}`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion });
    await stub(page, 'not_elevated', { precipitationMm: 1 });
    await page.goto(PUNE);
    const layer = page.locator('[data-layer="rain"]');
    await expect(layer).toBeAttached();
    const name = await layer.evaluate(
      (el) => getComputedStyle(el).animationName,
    );
    expect(name).toBe(reducedMotion === 'reduce' ? 'none' : 'rain-fall');
  });
}

for (const path of [
  '/app',
  '/app/ask',
  '/app/home',
  '/app/habits',
  '/app/profile',
]) {
  test(`nothing reaches past a 320 px screen: ${path}`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await stub(page, 'not_elevated', { precipitationMm: 1 });
    await page.goto(at(path));
    await expect(visibleH1(page)).toBeVisible();
    await page.waitForLoadState('networkidle');
    for (const details of await page.locator('main details').all()) {
      await details.evaluate((el) => {
        (el as HTMLDetailsElement).open = true;
      });
    }
    expect(await pastTheEdge(page)).toEqual([]);
  });
}

test('nothing reaches past a 320 px screen: Welcome', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto('/app/welcome');
  await expect(visibleH1(page)).toBeVisible();
  expect(await pastTheEdge(page)).toEqual([]);
});

// P8 CS-10: the near row, at its own opacity over the sky's bottom stop, is a
// shape but quieter than the P7 dark silhouette. The "before" ratios were
// measured on the P7 code (HEAD 57ff77c; near fill text-dark at 0.9 over the
// bottom stop) at both sizes.
const NEAR_BEFORE: Record<Level, number> = {
  not_elevated: 10.93,
  elevated: 9.91,
  unknown: 10.93,
};
for (const [width, height] of [
  [1280, 720],
  [1440, 900],
] as const) {
  for (const level of ['not_elevated', 'elevated', 'unknown'] as const) {
    test(`the near row is quieter against the sky: ${LOOK[level]} ${width}x${height}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await stub(page, level);
      await page.goto(PUNE);
      await expect(page.locator('[data-air]')).toHaveAttribute(
        'data-air',
        LOOK[level],
      );
      const ratio = await page.evaluate(() => {
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 1;
        const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
        const rgb = (css: string) => {
          ctx.clearRect(0, 0, 1, 1);
          ctx.fillStyle = '#000';
          ctx.fillStyle = css;
          ctx.fillRect(0, 0, 1, 1);
          return [...ctx.getImageData(0, 0, 1, 1).data.slice(0, 3)];
        };
        const lum = (c: number[]) => {
          const [r, g, b] = c.map((v) => {
            const s = v / 255;
            return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
          });
          return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
        };
        const root = document.querySelector('[data-air]')!;
        const stops = root.querySelectorAll('linearGradient stop');
        const bottom = rgb(getComputedStyle(stops[1]!).stopColor);
        const layer = root.querySelector('[data-part="near"]')!.parentElement!;
        const alpha = Number(getComputedStyle(layer).opacity);
        const fill = rgb(getComputedStyle(layer).fill);
        const near = fill.map((c, i) => c * alpha + bottom[i]! * (1 - alpha));
        const [hi, lo] = [lum(near), lum(bottom)].sort((a, b) => b - a);
        return (hi! + 0.05) / (lo! + 0.05);
      });
      console.log(
        `near vs sky bottom ${LOOK[level]} ${width}x${height}: ${ratio.toFixed(2)} (before ${NEAR_BEFORE[level]})`,
      );
      expect(ratio).toBeLessThan(NEAR_BEFORE[level]);
      // Still clearly a shape.
      expect(ratio).toBeGreaterThan(1.5);
    });
  }
}

// P8 D7: with the browser's own default font size at 16, 24 and 32 px (the
// real setting: media queries ignore a CSS font-size on html), no page's title
// block reaches the top of the city that shows on first load; at 16 px the
// city still shows on a 320x640 phone and every taller screen below.
const PAGES = [
  '/app',
  '/app/ask',
  '/app/home',
  '/app/habits',
  '/app/profile',
  '/app/welcome',
];
const abortOutside = (page: Page) =>
  page.route(
    (url) => !['localhost', '127.0.0.1'].includes(url.hostname),
    (route) => route.abort(),
  );
test('large text keeps every title off the city', async ({ page }) => {
  test.setTimeout(900_000);
  const cdp = await page.context().newCDPSession(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const overlaps: string[] = [];
  const hiddenAt16: string[] = [];
  for (const font of [16, 20, 24, 28, 32]) {
    await cdp.send('Page.setFontSizes', {
      fontSizes: { standard: font, fixed: 13 },
    });
    for (const [width, height] of [
      [320, 640],
      [375, 667],
      [390, 844],
      [393, 873],
      [412, 915],
      [414, 896],
      [430, 932],
      [768, 1024],
      [1280, 720],
      [1440, 900],
    ] as const) {
      await page.setViewportSize({ width, height });
      for (const path of PAGES) {
        await abortOutside(page);
        await stub(page, 'not_elevated');
        await page.goto(path === '/app/welcome' ? path : at(path));
        await expect(visibleH1(page)).toBeVisible();
        await page.waitForLoadState('networkidle');
        const seen = await page.evaluate(() => {
          const block = [
            ...document.querySelectorAll('[data-part="title-block"]'),
          ].find((el) => el.checkVisibility())!;
          const city = document.querySelector('[data-layer="city"]')!;
          return {
            shown: city.checkVisibility(),
            bottom: block.getBoundingClientRect().bottom,
            top: city.getBoundingClientRect().top,
          };
        });
        const where = `font ${font}px ${width}x${height} ${path}`;
        if (seen.shown && seen.bottom > seen.top) {
          overlaps.push(`${where}: ${Math.round(seen.bottom - seen.top)} px`);
        }
        if (font === 16 && !seen.shown && height >= 640) hiddenAt16.push(where);
        await page.unrouteAll();
      }
    }
  }
  expect(overlaps).toEqual([]);
  expect(hiddenAt16).toEqual([]);
});

// Big city (H5): the band is tall on phones, and from md up the city box is
// drawn about 1.74x wider than the screen and centred, so buildings are bigger.
test('BD-H5: the city is big on phones and wide on desktop', async ({
  page,
}) => {
  await abortOutside(page);
  await stub(page, 'not_elevated');
  const box = async (width: number, height: number) => {
    await page.setViewportSize({ width, height });
    await page.goto(PUNE);
    await expect(visibleH1(page)).toBeVisible();
    return page.evaluate(() => {
      const r = document
        .querySelector('[data-layer="city"]')!
        .getBoundingClientRect();
      return { width: r.width, height: r.height, centre: r.left + r.width / 2 };
    });
  };
  const phone = await box(390, 844);
  const wide = await box(1896, 828);
  console.log('BD-H5', JSON.stringify({ phone, wide }));
  expect(phone.height).toBeGreaterThanOrEqual(240);
  expect(wide.height).toBeGreaterThanOrEqual(300);
  expect(wide.width).toBeGreaterThanOrEqual(1896 * 1.7);
  expect(Math.abs(wide.centre - 1896 / 2)).toBeLessThanOrEqual(2);
});

// See-through cards (owner, 27 Nov): the page cards are 85 % surface-light
// over an 8 px blur; reduced transparency makes them solid.
const FOOTER_CARD = 'footer > div > div';
const cardLook = (page: Page) =>
  page.locator(FOOTER_CARD).evaluate((el) => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    const style = getComputedStyle(el);
    ctx.fillStyle = style.backgroundColor;
    ctx.fillRect(0, 0, 1, 1);
    return {
      alpha: ctx.getImageData(0, 0, 1, 1).data[3]! / 255,
      filter: style.backdropFilter,
    };
  });

test('cards are see-through with a blur, solid under reduced transparency', async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== 'chromium', 'needs Chromium DevTools media');
  await abortOutside(page);
  await stub(page, 'not_elevated');
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(PUNE);
  await expect(visibleH1(page)).toBeVisible();
  const see = await cardLook(page);
  expect(Math.abs(see.alpha - 0.85)).toBeLessThanOrEqual(0.01);
  expect(see.filter).toBe('blur(8px)');
  await setTransparency(page, 'reduce');
  const solid = await cardLook(page);
  expect(solid.alpha).toBe(1);
  expect(solid.filter).toBe('none');
});

for (const level of ['not_elevated', 'elevated', 'unknown'] as const) {
  test(`card text keeps 4.5:1 over the darkest city colour: ${level}`, async ({
    page,
  }) => {
    await abortOutside(page);
    await stub(page, level);
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(at('/app/home'));
    await expect(visibleH1(page)).toBeVisible();
    await expect(page.locator('[data-air]')).toHaveAttribute(
      'data-air',
      LOOK[level],
    );
    await page.waitForLoadState('networkidle');
    // The card's colours, read before the page is hidden.
    const card = await page.locator(FOOTER_CARD).evaluate((el) => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 1;
      const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
      const rgba = (css: string) => {
        ctx.clearRect(0, 0, 1, 1);
        ctx.fillStyle = css;
        ctx.fillRect(0, 0, 1, 1);
        return [...ctx.getImageData(0, 0, 1, 1).data];
      };
      const style = getComputedStyle(el);
      return { bg: rgba(style.backgroundColor), text: rgba(style.color) };
    });
    await page.addStyleTag({
      content: 'main, header, footer, nav { visibility: hidden !important }',
    });
    const shot = await page.screenshot({
      clip: { x: 0, y: 400, width: 1280, height: 400 },
    });
    const ratio = await page.evaluate(
      async ({ png, bg, text }) => {
        const bytes = Uint8Array.from(atob(png), (c) => c.charCodeAt(0));
        const bitmap = await createImageBitmap(
          new Blob([bytes], { type: 'image/png' }),
        );
        const canvas = document.createElement('canvas');
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
        ctx.drawImage(bitmap, 0, 0);
        const lum = (c: number[]) => {
          const [r, g, b] = c.slice(0, 3).map((v) => {
            const s = v / 255;
            return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
          });
          return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
        };
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        let dark = [255, 255, 255];
        for (let i = 0; i < data.length; i += 4) {
          const px = [data[i]!, data[i + 1]!, data[i + 2]!];
          if (lum(px) < lum(dark)) dark = px;
        }
        const a = bg[3]! / 255;
        const blended = dark.map((c, i) => bg[i]! * a + c * (1 - a));
        const [hi, lo] = [lum(blended), lum(text)].sort((x, y) => y - x);
        return {
          ratio: (hi! + 0.05) / (lo! + 0.05),
          dark,
        };
      },
      { png: shot.toString('base64'), bg: card.bg, text: card.text },
    );
    console.log('card contrast ' + level, JSON.stringify(ratio));
    expect(ratio.ratio).toBeGreaterThanOrEqual(4.5);
  });
}

// The city sits behind the cards, so a page ends at its footer; a phone keeps
// room for its fixed bar.
for (const path of ['/app', '/app/home', '/app/habits', '/app/profile']) {
  test(`the page ends at the footer: ${path}`, async ({ page }) => {
    await abortOutside(page);
    await stub(page, 'not_elevated');
    for (const [width, height] of [
      [1280, 800],
      [390, 844],
    ] as const) {
      await page.setViewportSize({ width, height });
      await page.goto(at(path));
      await expect(visibleH1(page)).toBeVisible();
      await page.waitForLoadState('networkidle');
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      const m = await page.evaluate(() => {
        const footer = document
          .querySelector('footer')!
          .getBoundingClientRect();
        const bar = document.querySelector('nav[class*="fixed"]')!;
        return {
          below:
            document.documentElement.scrollHeight - (footer.bottom + scrollY),
          // The card, not the row: the row's 32 px gap may touch the bar's edge.
          clearOfBar:
            document
              .querySelector('footer > div > div')!
              .getBoundingClientRect().bottom <=
            bar.getBoundingClientRect().top,
          // The card's bottom to the bar's top: the row's 32 px gap, give or take the
          // bar being a pixel or two taller than the 3.5rem spacer. A spacer cut
          // to 25 px leaves about 0, so 28 still catches it.
          gapToBar:
            bar.getBoundingClientRect().top -
            document
              .querySelector('footer > div > div')!
              .getBoundingClientRect().bottom,
        };
      });
      if (width >= 768)
        expect(m.below, path + ' desktop').toBeLessThanOrEqual(1);
      else {
        expect(m.below, path + ' phone').toBeLessThanOrEqual(57);
        // The bar's room is still there (56 px, give or take rounding).
        expect(m.below, path + ' phone room').toBeGreaterThanOrEqual(55);
        expect(m.clearOfBar, path + ' phone bar').toBe(true);
        expect(m.gapToBar, path + ' phone gap').toBeGreaterThanOrEqual(28);
      }
    }
  });
}

// A see-through card is a stacking context, so the place list inside it must
// be lifted above the footer card that follows, or the footer paints over it.
test('the place list is above the footer card', async ({ page }) => {
  await abortOutside(page);
  await stub(page, 'not_elevated');
  await page.route('**/api/v1/locations/search**', (route) =>
    route.fulfill({
      json: {
        data: [...searchFixture, ...searchFixture].slice(0, 5).map((r, i) => ({
          ...r,
          id: i + 1,
        })),
      },
    }),
  );
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/app/ask');
  await page
    .getByRole('combobox', { name: 'Search for a city or area in India' })
    .fill('Pune');
  const options = page.getByRole('option');
  await expect(options).toHaveCount(5);
  const m = await options.last().evaluate((el) => {
    const r = el.getBoundingClientRect();
    const top = document.elementFromPoint(r.left + r.width / 2, r.bottom - 2);
    const card = document.querySelector('footer > div > div')!;
    return {
      hit: !!top && el.contains(top),
      // Not vacuous: the list really reaches into the footer card.
      overlaps: r.bottom > card.getBoundingClientRect().top,
    };
  });
  expect(m.overlaps).toBe(true);
  expect(m.hit).toBe(true);
});
