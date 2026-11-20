import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { expectNoAxeViolations } from '../../test/axe.ts';
import { forecastFixture, sourcesFixture } from '../../test/fixtures.ts';
import { LIMITATIONS } from './limitations.ts';
import { SourcesPanel } from './SourcesPanel.tsx';

function limitationItems() {
  const heading = screen.getByRole('heading', { name: 'Limitations' });
  const list = heading.nextElementSibling as HTMLElement;
  return within(list)
    .getAllByRole('listitem')
    .map((item) => item.textContent);
}

describe('SourcesPanel', () => {
  afterEach(cleanup);

  it("lists the forecast's limitations word for word, then the app's own", () => {
    render(
      <SourcesPanel
        sources={sourcesFixture}
        forecastLimitations={forecastFixture.limitations}
      />,
    );

    expect(LIMITATIONS).toEqual([
      'Forecasts are model estimates for an area about 45 km wide, not station measurements.',
      'We do not calculate the CPCB National AQI.',
      "The 24-hour check compares a model forecast with India's 24-hour limits; official compliance is judged on measured station data over a year.",
      'AI personalisation can be unavailable; plans then use our fixed rules only.',
    ]);
    // The two app lines the forecast's own lines don't cover.
    expect(limitationItems()).toEqual([
      ...forecastFixture.limitations,
      LIMITATIONS[2],
      LIMITATIONS[3],
    ]);
  });

  it("without a forecast, lists the app's four", () => {
    render(<SourcesPanel sources={sourcesFixture} forecastLimitations={[]} />);

    expect(limitationItems()).toEqual(LIMITATIONS);
  });

  it('lists sources with licence and connection state', () => {
    render(<SourcesPanel sources={sourcesFixture} forecastLimitations={[]} />);

    expect(
      screen.getByRole('heading', {
        level: 2,
        name: 'Sources and limitations',
      }),
    ).toBeDefined();
    expect(screen.getByRole('heading', { name: 'Sources' })).toBeDefined();
    // Open-Meteo air and Open-Meteo weather are connected; CPCB is not.
    expect(screen.getAllByText('Connected')).toHaveLength(2);
    expect(screen.getByText('Not connected')).toBeDefined();
    expect(screen.getAllByText('Licence: CC BY 4.0')).toHaveLength(2);
    expect(
      screen.getByText('Weather forecasts from Open-Meteo.com.'),
    ).toBeDefined();
  });

  it('leaves out the sources list when sources failed', () => {
    render(<SourcesPanel sources={null} forecastLimitations={[]} />);

    expect(screen.queryByRole('heading', { name: 'Sources' })).toBeNull();
    expect(limitationItems()).toEqual([...LIMITATIONS]);
  });

  it('passes axe', async () => {
    const { container } = render(
      <SourcesPanel
        sources={sourcesFixture}
        forecastLimitations={forecastFixture.limitations}
      />,
    );
    await expectNoAxeViolations(container);
  });
});
