import { cleanup, render, screen, within } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import type { AirAssessment } from '../../../../shared/contracts.ts';
import { LIMITATIONS } from '../air-quality/limitations.ts';
import { expectNoAxeViolations } from '../../test/axe.ts';
import { forecastFixture, sourcesFixture } from '../../test/fixtures.ts';
import { AirDetails } from './AirDetails.tsx';

afterEach(cleanup);

// Inside the fixture's first hour (17:00 UTC, PM2.5 48).
const NOW = new Date('2026-11-17T17:30:00.000Z');
const place = {
  label: 'Pune, Maharashtra',
  latitude: 18.51957,
  longitude: 73.85535,
};
const CPCB_NOTE =
  'No verified machine-readable CPCB feed is connected; official observations are not shown.';

const elevated: AirAssessment = {
  level: 'elevated',
  windowStart: '2026-11-17T17:00:00.000Z',
  checks: [
    { pollutant: 'PM2_5', status: 'above_limit', average24h: 72.4, limit: 60 },
    { pollutant: 'PM10', status: 'within_limit', average24h: 80, limit: 100 },
  ],
};

function show(props: Partial<ComponentProps<typeof AirDetails>> = {}) {
  return render(
    <AirDetails
      data={{ ...forecastFixture, airCheck: elevated }}
      loadedAt={NOW}
      place={place}
      sources={sourcesFixture}
      cpcbNote={CPCB_NOTE}
      {...props}
    />,
  );
}

const limitationItems = (details: HTMLElement) =>
  [
    ...(within(details).getByText('Limitations').nextElementSibling?.children ??
      []),
  ].map((item) => item.textContent);

describe('AirDetails', () => {
  it('the details are closed and hold the figure, the panel, the CPCB line, the method and the sources', () => {
    const { container } = show();
    const details = container.querySelector('details')!;

    expect(details.open).toBe(false);
    expect(details.querySelector('summary')?.textContent).toBe(
      'Air quality details',
    );
    expect(within(details).getByTestId('readout-pm25')).toBeDefined();
    expect(
      within(details).getByText('Forecast location: 18.52, 73.86'),
    ).toBeDefined();
    expect(
      within(details).getByText('Your city, the next two days'),
    ).toBeDefined();
    expect(
      within(details).getByText(
        'Official CPCB observations are not connected yet.',
      ),
    ).toBeDefined();
    expect(within(details).getByText(CPCB_NOTE)).toBeDefined();
    expect(
      within(details).getByText('How the 24-hour check works'),
    ).toBeDefined();
    // Its own arrow (owner, 27 Nov); the sr-only heading repeats the words.
    expect(
      within(details).getByText('Sources and limitations', {
        selector: 'summary',
      }),
    ).toBeDefined();
  });

  // A heading inside <summary> is dropped by some screen readers, so the
  // details get their own h2 and the parts sit one level below it.
  it('heads the details at level 2, with the parts below', () => {
    show();

    expect(
      screen.getByRole('heading', { level: 2, name: 'Air quality details' }),
    ).toBeDefined();
    for (const name of [
      'Model forecast',
      'How the 24-hour check works',
      'Sources and limitations',
    ]) {
      expect(
        screen.getByRole('heading', { level: 3, name, hidden: true }),
      ).toBeDefined();
    }
    expect(
      screen.getByRole('heading', {
        level: 4,
        name: 'Limitations',
        hidden: true,
      }),
    ).toBeDefined();
  });

  it('the details hold every number with its unit', () => {
    const { container } = show();
    const details = container.querySelector('details')!;

    expect(within(details).getByTestId('readout-pm25').textContent).toMatch(
      /48\s*μg\/m³/,
    );
    expect(details.textContent).toContain(
      'PM2.5 24-hour average 72.4 μg/m³, above the 60 μg/m³ limit',
    );
    expect(details.textContent).toContain(
      'PM10 24-hour average 80 μg/m³, within the 100 μg/m³ limit',
    );
    expect(details.textContent).toContain('60 μg/m³ for PM2.5');
    expect(details.textContent).toContain('100 μg/m³ for PM10');
  });

  it("the check explains India's limits and no AQI", () => {
    // Read from the server's check, never retyped.
    show({
      data: {
        ...forecastFixture,
        airCheck: {
          ...elevated,
          checks: [
            { ...elevated.checks[0]!, limit: 61 },
            { ...elevated.checks[1]!, limit: 101 },
          ],
        },
      },
    });

    expect(
      screen.getByText(
        "India's 24-hour limits are 61 μg/m³ for PM2.5 and 101 μg/m³ for PM10. We compare the model forecast's 24-hour averages with them. We don't calculate an AQI.",
      ),
    ).toBeDefined();
  });

  it("lists the forecast's limitations word for word, then the app's own", () => {
    const { container } = show();
    const items = limitationItems(container.querySelector('details')!);

    expect(items).toEqual([
      ...forecastFixture.limitations,
      LIMITATIONS[2],
      LIMITATIONS[3],
    ]);
  });

  it('without a forecast, still holds the CPCB line and the sources', () => {
    const { container } = show({ data: null });
    const details = container.querySelector('details')!;

    expect(within(details).queryByTestId('readout-pm25')).toBeNull();
    expect(
      within(details).queryByText('How the 24-hour check works'),
    ).toBeNull();
    expect(
      within(details).getByText(
        'Official CPCB observations are not connected yet.',
      ),
    ).toBeDefined();
    expect(limitationItems(details)).toEqual(LIMITATIONS);
  });

  it('passes axe', async () => {
    const { container } = show();
    await expectNoAxeViolations(container);
  });
});
