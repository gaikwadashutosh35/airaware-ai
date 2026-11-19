import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { expectNoAxeViolations } from '../../test/axe.ts';
import { forecastFixture } from '../../test/fixtures.ts';
import { summarize } from './chart.ts';
import { ForecastChart } from './ForecastChart.tsx';

const loadedAt = new Date('2026-11-17T17:30:00Z');

describe('ForecastChart', () => {
  afterEach(cleanup);

  it('is a labelled image with a text summary and legend', () => {
    render(<ForecastChart series={forecastFixture} loadedAt={loadedAt} />);

    expect(
      screen.getByRole('img', { name: 'PM2.5 and PM10 forecast chart' }),
    ).toBeDefined();
    expect(
      screen.getByText(summarize(forecastFixture.hours, 'PM2_5', 'μg/m³')),
    ).toBeDefined();
    expect(
      screen.getByText(summarize(forecastFixture.hours, 'PM10', 'μg/m³')),
    ).toBeDefined();
    expect(screen.getByText('PM2.5 (solid line)')).toBeDefined();
    expect(screen.getByText('PM10 (dashed line)')).toBeDefined();
  });

  it('marks the load hour as "At load", never "now"', () => {
    const { container } = render(
      <ForecastChart series={forecastFixture} loadedAt={loadedAt} />,
    );

    expect(screen.getByText('At load')).toBeDefined();
    expect(container.textContent).not.toMatch(/\bnow\b/i);
  });

  it('draws no marker when the load time is outside the forecast', () => {
    render(
      <ForecastChart
        series={forecastFixture}
        loadedAt={new Date('2026-11-18T12:00:00Z')}
      />,
    );

    expect(screen.queryByText('At load')).toBeNull();
  });

  it('breaks the PM2.5 line at a missing hour', () => {
    const series = {
      ...forecastFixture,
      hours: forecastFixture.hours.map((hour, i) =>
        i === 1 ? { ...hour, values: { ...hour.values, PM2_5: null } } : hour,
      ),
    };
    const { container } = render(
      <ForecastChart series={series} loadedAt={loadedAt} />,
    );

    expect(container.querySelectorAll('[data-pollutant="PM2_5"]')).toHaveLength(
      2,
    );
    expect(container.querySelectorAll('[data-pollutant="PM10"]')).toHaveLength(
      1,
    );
  });

  // Phase 8 review: no empty axes for an empty forecast, and no unit the
  // provider never sent.
  it('draws nothing when the forecast has no hours', () => {
    const { container } = render(
      <ForecastChart
        series={{ ...forecastFixture, hours: [] }}
        loadedAt={loadedAt}
      />,
    );

    expect(container.textContent).toBe('');
  });

  it('never assumes a unit the provider did not send', () => {
    const { container } = render(
      <ForecastChart
        series={{ ...forecastFixture, units: {} }}
        loadedAt={loadedAt}
      />,
    );

    expect(container.textContent).not.toContain('μg/m³');
    expect(
      screen.getByText(/^PM2\.5 ranges from 43\.1 to 48 over the next 3 hours/),
    ).toBeDefined();
  });

  it('passes axe', async () => {
    const { container } = render(
      <ForecastChart series={forecastFixture} loadedAt={loadedAt} />,
    );
    await expectNoAxeViolations(container);
  });
});
