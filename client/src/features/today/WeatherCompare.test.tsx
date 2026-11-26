import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { WeatherNow } from '../../../../shared/contracts.ts';
import { expectNoAxeViolations } from '../../test/axe.ts';
import { forecastFixture } from '../../test/fixtures.ts';
import { WeatherCompare } from './WeatherCompare.tsx';

afterEach(cleanup);

// A wall-clock time as the device's locale writes it, built from a UTC
// instant directly (so it does not repeat the component's offset sum).
const clock = (...parts: [number, number, number, number, number]) =>
  new Intl.DateTimeFormat([], {
    timeZone: 'UTC',
    hour: 'numeric',
    minute: '2-digit',
  }).format(Date.UTC(...parts));
const weather = forecastFixture.weather!;
// 22:40 on 17 Nov at +05:30, the date of the fixture's middle day.
const NOW = new Date('2026-11-17T17:10:00.000Z');

describe('WeatherCompare', () => {
  it('is a captioned table with column and row headers', () => {
    render(<WeatherCompare weather={weather} now={NOW} />);
    const table = screen.getByRole('table', {
      name: 'Weather · Open-Meteo model data',
    });
    const columns = within(table).getAllByRole('columnheader');
    // The first is the corner, named by the caption's own word.
    expect(columns.map((c) => c.textContent)).toEqual([
      'Weather',
      'Yesterday',
      'Today',
      'Tomorrow',
    ]);
    for (const column of columns)
      expect(column.getAttribute('scope')).toBe('col');
    const rows = within(table).getAllByRole('rowheader');
    expect(rows.map((r) => r.textContent)).toEqual([
      `At ${clock(2026, 10, 17, 22, 30)}`,
      'Min–max',
      'Rain',
    ]);
    for (const row of rows) expect(row.getAttribute('scope')).toBe('row');
  });

  it('writes the cells, rounding degrees and rain', () => {
    render(<WeatherCompare weather={weather} now={NOW} />);
    const cells = (name: string) =>
      within(screen.getByRole('row', { name: new RegExp(`^${name}`) }))
        .getAllByRole('cell')
        .map((c) => c.textContent);
    expect(cells('At')).toEqual([
      '27 °C, 10 % cloud',
      '28 °C, 30 % cloud',
      '25 °C, 80 % cloud',
    ]);
    expect(cells('Min–max')).toEqual(['19–32 °C', '20–32 °C', '21–30 °C']);
    expect(cells('Rain')).toEqual(['0.0 mm', '0.0 mm', '2.3 mm']);
  });

  it('shows the note about yesterday', () => {
    render(<WeatherCompare weather={weather} now={NOW} />);
    expect(
      screen.getByText(
        'Yesterday is past model data, not station measurements.',
      ),
    ).toBeTruthy();
  });

  it('shows — for every missing value, never a made-up one', () => {
    const empty: WeatherNow = {
      ...weather,
      days: weather.days.map((d) => ({
        ...d,
        minC: null,
        maxC: null,
        precipitationMm: null,
        atHour: { ...d.atHour, temperatureC: null, cloudCoverPct: null },
      })) as WeatherNow['days'],
    };
    render(<WeatherCompare weather={empty} now={NOW} />);
    const cells = screen.getAllByRole('cell').map((c) => c.textContent);
    expect(cells).toEqual(Array(9).fill('—'));
  });

  it('shows a lone missing value as —', () => {
    const one: WeatherNow = {
      ...weather,
      days: weather.days.map((d, i) =>
        i === 0 ? { ...d, atHour: { ...d.atHour, cloudCoverPct: null } } : d,
      ) as WeatherNow['days'],
    };
    render(<WeatherCompare weather={one} now={NOW} />);
    expect(screen.getAllByRole('cell')[0]!.textContent).toBe('27 °C, —');
  });

  it("names the hour in the place's time zone, not the device's", () => {
    // 17:00 UTC: 22:30 at +05:30, 12:00 pm at -05:00.
    const { rerender } = render(<WeatherCompare weather={weather} now={NOW} />);
    expect(screen.getByText(`At ${clock(2026, 10, 17, 22, 30)}`)).toBeTruthy();
    rerender(
      <WeatherCompare
        weather={{ ...weather, utcOffsetSeconds: -18000 }}
        now={NOW}
      />,
    );
    expect(screen.getByText(`At ${clock(2026, 10, 17, 12, 0)}`)).toBeTruthy();
  });

  it('renders nothing when an older server sends no days', () => {
    const old: Partial<WeatherNow> = { ...weather };
    delete old.days;
    const { container } = render(
      <WeatherCompare weather={old as WeatherNow} now={NOW} />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders nothing without weather or its three days', () => {
    const { container, rerender } = render(
      <WeatherCompare weather={null} now={NOW} />,
    );
    expect(container.innerHTML).toBe('');
    rerender(<WeatherCompare weather={{ ...weather, days: [] }} now={NOW} />);
    expect(container.innerHTML).toBe('');
  });

  // Near local midnight the device's "now" is already the next day while the
  // server's days are not: yesterday would be mislabelled.
  it('renders nothing once the place is a day past the middle column', () => {
    // 18:45 UTC is 00:15 on 18 Nov at +05:30; the days are 16, 17 and 18 Nov.
    const { container } = render(
      <WeatherCompare
        weather={weather}
        now={new Date('2026-11-17T18:45:00.000Z')}
      />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('fits its panel: fixed layout, cells wrap, values keep their unit', () => {
    render(<WeatherCompare weather={weather} now={NOW} />);
    const table = screen.getByRole('table');
    expect(table.className).toContain('w-full');
    expect(table.className).toContain('table-fixed');
    expect(screen.getAllByRole('cell')[0]!.className).toContain('break-words');
  });

  it('has no axe violations', async () => {
    const { container } = render(
      <WeatherCompare weather={weather} now={NOW} />,
    );
    await expectNoAxeViolations(container);
  });
});
