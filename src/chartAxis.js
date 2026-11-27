// Shared helpers for the time-axis line charts (TrendsChart, PlayTrends).

// Line colors, cycled if there are more players than entries.
export const COLORS = ['#8a6d18', '#2c7be5', '#d6336c', '#2fb344', '#9b51e0', '#e8590c', '#0ca678', '#495057'];

// Axis ticks: "Jan 2025". Tooltip: the full date.
export const fmtMonth = (ms) => new Date(ms).toLocaleDateString([], { month: 'short', year: 'numeric' });

// The x-axis is real time (ms since epoch), so quiet months show as flat
// stretches instead of being squeezed out. A final point at "now" carries the
// current totals to today.
export function withTimeAxis(series) {
  if (!series.length) return series;
  const points = series.map(p => ({ ...p, t: Date.parse(p.time) }));
  const last = points[points.length - 1];
  const now = Date.now();
  if (now > last.t) points.push({ ...last, time: new Date(now).toISOString(), t: now });
  return points;
}

// One tick per month (thinned to at most ~8 so labels don't collide).
export function monthTicks(min, max) {
  const ticks = [];
  const d = new Date(min);
  d.setDate(1); d.setHours(0, 0, 0, 0); d.setMonth(d.getMonth() + 1);
  for (; d.getTime() <= max; d.setMonth(d.getMonth() + 1)) ticks.push(d.getTime());
  const step = Math.max(1, Math.ceil(ticks.length / 8));
  return ticks.filter((_, i) => i % step === 0);
}
