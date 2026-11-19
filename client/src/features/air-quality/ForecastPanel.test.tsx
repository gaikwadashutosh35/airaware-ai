import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { AirAssessment } from '../../../../shared/contracts.ts';
import { expectNoAxeViolations } from '../../test/axe.ts';
import { forecastFixture } from '../../test/fixtures.ts';
import { ForecastPanel } from './ForecastPanel.tsx';

afterEach(cleanup);

const NOW = new Date('2026-11-17T17:30:00.000Z');

const elevated: AirAssessment = {
  level: 'elevated',
  windowStart: '2026-11-17T17:00:00.000Z',
  checks: [
    { pollutant: 'PM2_5', status: 'above_limit', average24h: 72.4, limit: 60 },
    { pollutant: 'PM10', status: 'within_limit', average24h: 80, limit: 100 },
  ],
};

function checkCell(key: string) {
  const row = screen.getByTestId(`metric-${key}`);
  const cells = within(row).getAllByRole('cell');
  return cells[cells.length - 1]!.textContent;
}

describe('ForecastPanel', () => {
  it('the pollutant table has a 24-hour check only for PM2.5 and PM10', async () => {
    const { container } = render(
      <ForecastPanel
        data={{ ...forecastFixture, airCheck: elevated }}
        now={NOW}
      />,
    );
    expect(
      screen.getByRole('heading', { name: 'Your city, the next two days' }),
    ).toBeDefined();
    const pm25 = screen.getByTestId('metric-PM2_5');
    expect(pm25.textContent).toContain('48');
    expect(pm25.textContent).toContain('μg/m³');
    expect(checkCell('PM2_5')).toBe(
      'Above the limit (24-hour average 72.4 μg/m³)',
    );
    expect(checkCell('PM10')).toBe(
      'Within the limit (24-hour average 80 μg/m³)',
    );
    // Final review I1: values for the load hour are never called "this hour".
    expect(
      screen.getByRole('columnheader', { name: 'Forecast value' }),
    ).toBeDefined();
    expect(container.textContent).not.toContain('This hour');
    for (const key of ['NO2', 'SO2', 'O3', 'CO']) {
      expect(checkCell(key)).toBe('Not assessed');
    }
    await expectNoAxeViolations(container);
  });

  it('a high hour beside a within-limit day shows the average it judged', () => {
    const data = structuredClone(forecastFixture);
    data.hours[0]!.values.PM2_5 = 95;
    data.airCheck = {
      level: 'not_elevated',
      windowStart: '2026-11-17T17:00:00.000Z',
      checks: [
        {
          pollutant: 'PM2_5',
          status: 'within_limit',
          average24h: 36,
          limit: 60,
        },
        {
          pollutant: 'PM10',
          status: 'within_limit',
          average24h: 50,
          limit: 100,
        },
      ],
    };
    render(<ForecastPanel data={data} now={NOW} />);
    expect(screen.getByTestId('metric-PM2_5').textContent).toContain('95');
    expect(checkCell('PM2_5')).toBe(
      'Within the limit (24-hour average 36 μg/m³)',
    );
  });

  it('says when a 24-hour check has too little data', () => {
    render(<ForecastPanel data={forecastFixture} now={NOW} />);
    expect(checkCell('PM2_5')).toBe('Not enough data');
    expect(checkCell('PM10')).toBe('Not enough data');
  });

  it('no category labels', () => {
    const { container } = render(
      <ForecastPanel
        data={{ ...forecastFixture, airCheck: elevated }}
        now={NOW}
      />,
    );
    expect(container.textContent).not.toMatch(
      /\b(Good|Moderate|Poor|Severe)\b/,
    );
  });

  it("keeps the chart's accessible name and summary", () => {
    render(<ForecastPanel data={forecastFixture} now={NOW} />);
    expect(
      screen.getByRole('img', { name: 'PM2.5 and PM10 forecast chart' }),
    ).toBeDefined();
    expect(screen.getByText(/^PM2\.5 ranges from/)).toBeDefined();
  });

  it('keeps the chart free of a limit line', () => {
    const { container } = render(
      <ForecastPanel data={forecastFixture} now={NOW} />,
    );
    expect(container.querySelector('[data-part="limit-line"]')).toBeNull();
    expect(container.textContent).not.toMatch(/60 μg\/m³ standard/i);
  });
});
