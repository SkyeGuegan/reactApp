import { fmtPlayDate } from './dates';

test('admins see the exact day, visitors only the month', () => {
  const iso = '2026-11-16T19:00:00Z';
  expect(fmtPlayDate(iso, true)).toMatch(/16/);
  const month = fmtPlayDate(iso, false);
  expect(month).toMatch(/2026/);
  expect(month).not.toMatch(/16/);
  expect(fmtPlayDate('nonsense', true)).toBe('');
});
