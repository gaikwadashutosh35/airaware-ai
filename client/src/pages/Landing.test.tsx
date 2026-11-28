import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { CHOICES } from '../features/today/helpChoices.ts';
import { expectNoAxeViolations } from '../test/axe.ts';
import Landing from './Landing.tsx';
import { LANDING_EXAMPLES } from './landingExamples.ts';

const ACTION = 'Check My Air';
const ASSISTANT = 'Meet Your Assistant';
const SUBHEAD =
  "Understand your city's air quality. Discover smarter daily routines. Make better choices for your home and community.";
const HERO_ALT =
  "Screenshot of AirAware's Today page on a phone, for Pune: the forecast verdict with its Model forecast label and the navigation bar";
const UNDERSTAND_TEXT =
  "One sentence tells you how today's forecast compares with India's 24-hour limits, labelled Model forecast with the time it was retrieved. Every number, unit and source is one tap away, under Air quality details.";
const EXPLAINABLE_TEXT =
  "AI can arrange our rules' suggestions and word them for your day, but it never decides them. Every suggestion opens to its reason, the answers and forecast check it used, its sources and its limits.";
// The examples in their file order: the plan's text moves into Explainable
// AI, and its card is no longer shown.
const [PLAN, HOME, HABITS, EXPLAIN] = LANDING_EXAMPLES as [
  (typeof LANDING_EXAMPLES)[number],
  (typeof LANDING_EXAMPLES)[number],
  (typeof LANDING_EXAMPLES)[number],
  (typeof LANDING_EXAMPLES)[number],
];
const HOME_HABITS = 'My Home and Better Habits';
// The sections that carry a decorative chapter number, in order.
const CHAPTERS = ['Understand your air', 'Explainable AI', HOME_HABITS];
// Documented facts the page may state; any other digit would be invented.
const REAL_FIGURES = [
  'PM2.5',
  'PM10',
  '45 km',
  '48 hours',
  '2 letters',
  '12 hours',
  '1 km',
  '10 minutes',
  // From the real rule cards and their source's date.
  '24-hour',
  '18 November 2009',
  // The screenshot's capture date.
  '22 Nov 2026',
];

describe('Landing', () => {
  afterEach(() => {
    cleanup();
  });

  it('clears the side safe areas on the header, hero, sections and footer', () => {
    const { container } = render(<Landing />);
    for (const el of [
      container.querySelector('header')?.firstElementChild,
      container.querySelector('main section > div'),
      container.querySelector('main section:nth-of-type(2)'),
      container.querySelector('footer')?.firstElementChild,
    ]) {
      for (const r of ['1rem', '2rem']) {
        expect(el?.className).toContain(
          `pl-[max(${r},env(safe-area-inset-left,0px))]`,
        );
        expect(el?.className).toContain(
          `pr-[max(${r},env(safe-area-inset-right,0px))]`,
        );
      }
    }
  });

  it('has one main heading and both hero actions', () => {
    render(<Landing />);

    const h1s = screen.getAllByRole('heading', { level: 1 });
    expect(h1s).toHaveLength(1);
    expect(h1s[0]?.textContent).toBe('The air around you matters.');
    expect(screen.getByText(SUBHEAD)).toBeDefined();
    // The hero's, the middle one's and the closing section's.
    const actions = screen.getAllByRole('link', { name: ACTION });
    expect(actions).toHaveLength(3);
    for (const link of actions) expect(link.getAttribute('href')).toBe('/app');
    const assistant = screen.getAllByRole('link', { name: ASSISTANT });
    expect(assistant).toHaveLength(1);
    expect(assistant[0]?.getAttribute('href')).toBe('/app/ask');
    expect(
      screen.queryByRole('link', { name: "Check your area's air quality" }),
    ).toBeNull();
  });

  // Doc 09 C2: a transition utility would override the .press rule (120 ms).
  it('leaves the actions to the shared press feel', () => {
    render(<Landing />);

    const links = [
      ...screen.getAllByRole('link', { name: ACTION }),
      ...screen.getAllByRole('link', { name: ASSISTANT }),
    ];
    for (const link of links) {
      expect(link.classList.contains('press')).toBe(true);
      expect(link.className).not.toMatch(/(^|\s)(transition|duration-)/);
    }
  });

  it('tells the story in the hero and six sections, in order', () => {
    render(<Landing />);

    expect(
      screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent),
    ).toEqual([
      'Understand your air',
      'What AirAware helps with',
      'Explainable AI',
      HOME_HABITS,
      'How AirAware works',
      'Your city, the next two days',
    ]);
  });

  it('has the Understand section without an image', () => {
    const { container } = render(<Landing />);

    const chapter = screen.getByRole('region', { name: 'Understand your air' });
    expect(within(chapter).getByText(UNDERSTAND_TEXT)).toBeDefined();
    expect(chapter.querySelector('img, figure')).toBeNull();
    expect(container.querySelector('img[src*="air-details"]')).toBeNull();
    expect(screen.queryByAltText(/Air quality details/)).toBeNull();
    // The hero's Today capture is the page's only image.
    expect(container.querySelectorAll('img')).toHaveLength(1);
  });

  it('lists the four help choices as static text, from the help data', () => {
    render(<Landing />);

    const section = screen.getByRole('region', {
      name: 'What AirAware helps with',
    });
    expect(CHOICES.map((c) => c.title)).toEqual([
      'Outdoor activities',
      'My home',
      'My family',
      'Better habits',
    ]);
    expect(section.querySelector('a, button')).toBeNull();
    expect(
      within(section)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(CHOICES.map((c) => c.title + c.line));
  });

  it('folds the personal daily plan into Explainable AI', () => {
    render(<Landing />);

    expect(
      screen.queryByRole('region', { name: 'Your personal daily plan' }),
    ).toBeNull();
    expect(screen.queryByText(PLAN.candidate.title)).toBeNull();
    const chapter = screen.getByRole('region', { name: 'Explainable AI' });
    expect(within(chapter).getByText(PLAN.text)).toBeDefined();
    // The middle "Check My Air" follows the card.
    const card = within(chapter).getByRole('heading', {
      level: 3,
      name: EXPLAIN.candidate.title,
    });
    const link = within(chapter).getByRole('link', { name: ACTION });
    expect(link.getAttribute('href')).toBe('/app');
    expect(
      card.compareDocumentPosition(link) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('puts My Home and Better Habits side by side, each with its card', () => {
    render(<Landing />);

    const section = screen.getByRole('region', { name: HOME_HABITS });
    expect(
      within(section)
        .getAllByRole('heading', { level: 3 })
        .map((h) => h.textContent),
    ).toEqual(['Improve indoor air', 'Sustainable everyday choices']);
    for (const example of [HOME, HABITS]) {
      expect(within(section).getByText(example.text)).toBeDefined();
      expect(
        within(section).getByRole('heading', {
          level: 4,
          name: example.candidate.title,
        }),
      ).toBeDefined();
    }
    const captions = [...section.querySelectorAll('figcaption')];
    expect(captions.map((c) => c.textContent)).toEqual([
      HOME.caption,
      HABITS.caption,
    ]);
  });

  it('draws a still, decorative skyline along the hero', () => {
    const { container } = render(<Landing />);

    const hero = container.querySelector('main > section')!;
    const skyline = hero.querySelector('svg[aria-hidden="true"]')!;
    expect(skyline).not.toBeNull();
    expect(skyline.hasAttribute('data-air')).toBe(false);
    expect(skyline.querySelectorAll('path').length).toBeGreaterThan(10);
    expect(skyline.outerHTML).not.toMatch(/data-air|animate|<text/);
  });

  it('shows a real rule card in Explainable AI, labelled as an example', () => {
    render(<Landing />);

    const chapter = screen.getByRole('region', { name: EXPLAIN.heading });
    expect(within(chapter).getByText(EXPLAIN.text)).toBeDefined();
    expect(
      within(chapter).getByRole('figure').querySelector('figcaption')
        ?.textContent,
    ).toBe(EXPLAIN.caption);
  });

  // Final review #1: the label is read before the card, so an example is
  // never taken for today's air.
  it('labels each example before its card', () => {
    render(<Landing />);

    for (const name of ['Explainable AI', HOME_HABITS]) {
      const chapter = screen.getByRole('region', { name });
      const captions = [...chapter.querySelectorAll('figcaption')];
      expect(captions.length).toBeGreaterThan(0);
      for (const caption of captions) {
        const card = caption.parentElement!.querySelector('article')!;
        expect(
          caption.compareDocumentPosition(card) &
            Node.DOCUMENT_POSITION_FOLLOWING,
        ).toBeTruthy();
      }
    }
  });

  it("Explainable AI keeps the card's reasons", () => {
    render(<Landing />);

    const chapter = screen.getByRole('region', { name: 'Explainable AI' });
    expect(within(chapter).getByText(EXPLAINABLE_TEXT)).toBeDefined();
    const why = chapter.querySelector('details');
    expect(why?.open).toBe(true);
    expect(within(chapter).getByText(EXPLAIN.candidate.reason)).toBeDefined();
    for (const name of [
      'Open-Meteo Air Quality API',
      'National Ambient Air Quality Standards (CPCB, 18 November 2009)',
    ]) {
      expect(within(chapter).getByRole('link', { name })).toBeDefined();
    }
    // The other examples start closed.
    const others = [
      ...screen
        .getByRole('region', { name: HOME_HABITS })
        .querySelectorAll('details'),
    ];
    expect(others).toHaveLength(2);
    for (const details of others) expect(details.open).toBe(false);
  });

  it('puts the place search in the hero, after "Or search a city"', () => {
    render(<Landing />);

    const lead = screen.getByText('Or search a city');
    const search = screen.getByRole('combobox', {
      name: 'Search for a city or area in India',
    });
    expect(
      lead.compareDocumentPosition(search) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Search' })).toBeDefined();
  });

  it('chapter numbers are decorative', () => {
    render(<Landing />);

    CHAPTERS.forEach((heading, i) => {
      const chapter = screen.getByRole('region', { name: heading });
      const number = within(chapter).getByText(String(i + 1).padStart(2, '0'));
      expect(number.closest('[aria-hidden="true"]')).not.toBeNull();
    });
  });

  it('the pipeline steps are numbered cards', () => {
    render(<Landing />);

    const steps = screen.getByRole('list', {
      name: 'How a forecast reaches you',
    });
    within(steps)
      .getAllByRole('listitem')
      .forEach((item, i) => {
        const number = within(item).getByText(String(i + 1).padStart(2, '0'));
        expect(number.closest('[aria-hidden="true"]')).not.toBeNull();
      });
  });

  it('explains how AirAware works, in order', () => {
    render(<Landing />);

    const section = screen.getByRole('region', { name: 'How AirAware works' });
    const steps = within(section).getByRole('list', {
      name: 'How a forecast reaches you',
    });
    expect(steps.tagName).toBe('OL');
    expect(
      within(steps)
        .getAllByRole('heading', { level: 3 })
        .map((h) => h.textContent),
    ).toEqual([
      'CAMS global model',
      'Open-Meteo',
      'AirAware server',
      'Your screen',
    ]);
    // A flow: steps 2-4 open with a decorative arrow before their number.
    within(steps)
      .getAllByRole('listitem')
      .forEach((item, i) => {
        const arrow = item.querySelector('svg[aria-hidden="true"]');
        if (i === 0) {
          expect(arrow).toBeNull();
          return;
        }
        const number = within(item).getByText(String(i + 1).padStart(2, '0'));
        expect(
          arrow!.compareDocumentPosition(number) &
            Node.DOCUMENT_POSITION_FOLLOWING,
        ).toBeTruthy();
      });
    // The two transparency lines moved to the last section.
    expect(section.textContent).not.toContain('Official CPCB observations');
  });

  it('the hero screenshot is labelled as past, with its date', () => {
    render(<Landing />);

    const image = screen.getByAltText(HERO_ALT);
    const caption = image.closest('figure')?.querySelector('figcaption');
    expect(caption?.textContent).toBe(
      'A past screenshot of Today for Pune, 22 Nov 2026. Open the app for current values.',
    );
    expect([image.getAttribute('width'), image.getAttribute('height')]).toEqual(
      ['390', '844'],
    );
    // Final review B2: the label comes first, so it is never below the fold
    // while the figure shows.
    expect(
      caption!.compareDocumentPosition(image) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('states its limits plainly, in the last section', () => {
    render(<Landing />);

    const section = screen.getByRole('region', {
      name: 'Your city, the next two days',
    });
    expect(section.textContent).toContain(
      'Forecasts are model estimates, not station measurements, and not the CPCB National AQI.',
    );
    expect(section.textContent).toContain(
      'Official CPCB observations are not connected yet.',
    );
    const heading = within(section).getByRole('heading', { level: 2 });
    const link = within(section).getByRole('link', { name: ACTION });
    expect(
      heading.compareDocumentPosition(
        within(section).getByText(
          'Official CPCB observations are not connected yet.',
        ),
      ) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      section.querySelector('p')!.compareDocumentPosition(link) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('credits the data source in the footer', () => {
    render(<Landing />);

    const footer = screen.getByRole('contentinfo');
    expect(footer.textContent).toContain('Open-Meteo.com');
    expect(footer.textContent).toContain('CC BY 4.0');
    expect(
      within(footer).getByRole('link', { name: 'Open-Meteo.com' }),
    ).toBeDefined();
  });

  it('links to the privacy page from the footer', () => {
    render(<Landing />);

    const footer = screen.getByRole('contentinfo');
    expect(
      within(footer)
        .getByRole('link', { name: 'Privacy' })
        .getAttribute('href'),
    ).toBe('/privacy');
  });

  it('invents no numbers', () => {
    const { container } = render(<Landing />);

    // The footer, and the chapter and step ordinals ("01"…, labels, not
    // data), are dropped as elements, so no other text loses a digit.
    const copy = container.cloneNode(true) as HTMLElement;
    for (const exempt of copy.querySelectorAll('footer, [data-ordinal]')) {
      exempt.remove();
    }
    let text = copy.textContent ?? '';
    for (const figure of REAL_FIGURES) text = text.replaceAll(figure, '');
    expect(text).not.toMatch(/\d/);
  });

  it('never says safe, healthy or clean air', () => {
    const { container } = render(<Landing />);

    expect(container.textContent).not.toMatch(/\bsafe|healthy|clean air/i);
  });

  // The motion itself is CSS (index.css `.reveal`), checked in a real
  // browser by e2e/landing.spec.ts.
  it('every section after the hero rises in', () => {
    const { container } = render(<Landing />);

    const [hero, ...rest] = container.querySelectorAll('main > section');
    expect(hero?.classList.contains('reveal')).toBe(false);
    expect(rest).toHaveLength(6);
    for (const section of rest) {
      expect(section.classList.contains('reveal')).toBe(true);
    }
  });

  it('has no axe violations', async () => {
    const { container } = render(<Landing />);

    await expectNoAxeViolations(container);
  });
});
