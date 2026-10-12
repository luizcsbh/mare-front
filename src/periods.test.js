import { describe, expect, it } from 'vitest';
import { filterByPeriod, todayInTimeZone } from './periods';

describe('filterByPeriod', () => {
  it('keeps only records within the selected number of days', () => {
    const now = Date.UTC(2026, 0, 10);
    const recent = { date: new Date(now - 3 * 864e5).toISOString() };
    const old = { date: new Date(now - 10 * 864e5).toISOString() };

    expect(filterByPeriod([recent, old], '7', now)).toEqual([recent]);
  });

  it('returns every record for the full-history option', () => {
    const records = [{ date: '2020-01-01' }, { date: '2026-01-01' }];

    expect(filterByPeriod(records, 'all')).toBe(records);
  });

  it('uses the configured Sao Paulo day for default dates', () => {
    expect(todayInTimeZone(new Date('2026-01-01T02:00:00.000Z'))).toBe('2025-12-31');
  });

  it('includes both ends of a custom calendar interval', () => {
    const records = [
      { date: '2026-01-09T00:00:00.000Z' },
      { date: '2026-01-10T22:00:00.000Z' },
      { date: '2026-01-11T00:00:00.000Z' },
    ];

    expect(filterByPeriod(records, 'custom', Date.now(), { from: '2026-01-10', to: '2026-01-10' })).toEqual([records[1]]);
  });
});