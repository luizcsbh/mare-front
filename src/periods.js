export const PERIODS = [
  ['7', '7 dias'],
  ['30', '30 dias'],
  ['90', '90 dias'],
  ['180', '6 meses'],
  ['365', '12 meses'],
  ['all', 'Todo o histórico'],
  ['custom', 'Intervalo personalizado'],
];

export function todayInTimeZone(now = new Date(), timeZone = 'America/Sao_Paulo') {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now).map(({ type, value }) => [type, value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function filterByPeriod(items, period, now = Date.now(), range) {
  if (period === 'all') return items;
  if (period === 'custom') {
    if (!range?.from || !range?.to || range.from > range.to) return [];
    const start = Date.parse(`${range.from}T00:00:00.000Z`);
    const end = Date.parse(`${range.to}T23:59:59.999Z`);
    return items.filter((item) => {
      const date = new Date(item.date).getTime();
      return date >= start && date <= end;
    });
  }
  const cutoff = now - Number(period) * 864e5;
  return items.filter((item) => new Date(item.date).getTime() >= cutoff);
}