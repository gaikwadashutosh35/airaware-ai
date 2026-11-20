import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { expectNoAxeViolations } from '../test/axe.ts';
import Landing from './Landing.tsx';
import { LANDING_EXAMPLES } from './landingExamples.ts';

const ACTION = 'Check My Air';
const ASSISTANT = 'Meet Your Assistant';
const SUBHEAD =
  "Understand your city's air quality. Discover smarter daily routines. Make better choices for your home and community.";
const HERO_ALT =
  "Screenshot of AirAware's Today page on a phone, for Pune: the forecast verdict with its Model forecast label and the navigation bar";
const DETAILS_ALT =
  'Screenshot of the open Air quality details for Pune: the PM2.5 model forecast for one hour with its unit, and the 24-hour check in words';
const UNDERSTAND_TEXT =
  "One sentence tells you how today's forecast compares with India's 24-hour limits, labelled Model forecast with the time it was updated. Every number, unit and source is one tap away, under Air quality details.";
const EXPLAINABLE_TEXT =
  "AI can arrange our rules' suggestions and word them for your day, but it never decides them. Every suggestion opens to its reason, the answers and forecast check it used, its sources and its limits.";
const CHAPTERS = [
  'Understand your air',
  ...LANDING_EXAMPLES.map((e) => e.heading),
];
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
  // The hero screenshot's capture date.
  '20 Nov 2026',
];

describe('Landing', () => {
  afterEach(() => {
    cleanup();
  });

  it('has one main heading and both hero actions', () => {
    render(<Landing />);

    const h1s = screen.getAllByRole('heading', { level: 1 });
    expect(h1s).toHaveLength(1);
    expect(h1s[0]?.textContent).toBe('The air around you matters.');
    expect(screen.getByText(SUBHEAD)).toBeDefined();
    // The hero's and the closing section's.
    const actions = screen.getAllByRole('link', { name: ACTION });
    expect(actions).toHaveLength(2);
    for (const link of actions) expect(link.getAttribute('href')).toBe('/app');
    const assistant = screen.getAllByRole('link', { name: ASSISTANT });
    expect(assistant).toHaveLength(1);
    expect(assistant[0]?.getAttribute('href')).toBe('/app/ask');
    expect(
      screen.queryByRole('link', { name: "Check your area's air quality" }),
    ).toBeNull();
  });

  it('tells the story in seven sections, in order', () => {
    render(<Landing />);

    expect(
      screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent),
    ).toEqual([
      'Understand your air',
      'Your personal daily plan',
      'Improve indoor air',
      'Sustainable everyday choices',
      'Explainable AI',
      'How AirAware works',
      'Your city, the next two days',
    ]);
  });

  it('shows the open details screenshot, labelled as past', () => {
    render(<Landing />);

    const chapter = screen.getByRole('region', { name: 'Understand your air' });
    expect(within(chapter).getByText(UNDERSTAND_TEXT)).toBeDefined();
    const image = within(chapter).getByAltText(DETAILS_ALT);
    expect(image.getAttribute('loading')).toBe('lazy');
    const caption = chapter.querySelector('figcaption');
    expect(caption?.textContent).toBe(
      'A past screenshot of Air quality details for Pune, 20 Nov 2026. Open the app for current values.',
    );
    expect(
      caption!.compareDocumentPosition(image) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('shows a real rule card in each chapter, labelled as an example', () => {
    render(<Landing />);

    for (const example of LANDING_EXAMPLES) {
      const chapter = screen.getByRole('region', { name: example.heading });
      expect(within(chapter).getByText(example.text)).toBeDefined();
      expect(
        within(chapter).getByRole('figure').querySelector('figcaption')
          ?.textContent,
      ).toBe(example.caption);
      expect(
        within(chapter).getByRole('heading', {
          level: 3,
          name: example.candidate.title,
        }),
      ).toBeDefined();
    }
  });

  // Final review #1: the label is read before the card, so an example is
  // never taken for today's air.
  it('labels each example before its card', () => {
    render(<Landing />);

    for (const example of LANDING_EXAMPLES) {
      const chapter = screen.getByRole('region', { name: example.heading });
      const caption = chapter.querySelector('figcaption');
      const title = within(chapter).getByRole('heading', { level: 3 });
      expect(
        Boolean(
          caption &&
          caption.compareDocumentPosition(title) &
            Node.DOCUMENT_POSITION_FOLLOWING,
        ),
      ).toBe(true);
    }
  });

  it("Explainable AI keeps the card's reasons", () => {
    render(<Landing />);

    const chapter = screen.getByRole('region', { name: 'Explainable AI' });
    expect(within(chapter).getByText(EXPLAINABLE_TEXT)).toBeDefined();
    const why = chapter.querySelector('details');
    expect(why?.open).toBe(true);
    const example = LANDING_EXAMPLES[3];
    expect(within(chapter).getByText(example.candidate.reason)).toBeDefined();
    for (const name of [
      'Open-Meteo Air Quality API',
      'National Ambient Air Quality Standards (CPCB, 18 November 2009)',
    ]) {
      expect(within(chapter).getByRole('link', { name })).toBeDefined();
    }
    // The other examples start closed.
    for (const heading of LANDING_EXAMPLES.slice(0, 3).map((e) => e.heading)) {
      expect(
        screen.getByRole('region', { name: heading }).querySelector('details')
          ?.open,
      ).toBe(false);
    }
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
  });

  it('the hero screenshot is labelled as past, with its date', () => {
    render(<Landing />);

    const image = screen.getByAltText(HERO_ALT);
    const caption = image.closest('figure')?.querySelector('figcaption');
    expect(caption?.textContent).toBe(
      'A past screenshot of Today for Pune, 20 Nov 2026. Open the app for current values.',
    );
    // Final review B2: the label comes first, so it is never below the fold
    // while the figure shows.
    expect(
      caption!.compareDocumentPosition(image) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('states its limits plainly', () => {
    render(<Landing />);

    const section = screen.getByRole('region', { name: 'How AirAware works' });
    expect(section.textContent).toContain(
      'Forecasts are model estimates, not station measurements, and not the CPCB National AQI.',
    );
    expect(section.textContent).toContain(
      'Official CPCB observations are not connected yet.',
    );
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

  it('has no axe violations', async () => {
    const { container } = render(<Landing />);

    await expectNoAxeViolations(container);
  });
});
