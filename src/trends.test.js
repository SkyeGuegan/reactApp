import { buildCumulativeSeries } from './trends';

test('accumulates delta per player in chronological order', () => {
  const events = [
    { playerInitials: 'SG', delta: 1, createdAt: '2026-01-01T00:00:00Z' },
    { playerInitials: 'NI', delta: 1, createdAt: '2026-01-02T00:00:00Z' },
    { playerInitials: 'SG', delta: 1, createdAt: '2026-01-03T00:00:00Z' },
  ];
  const { series, players } = buildCumulativeSeries(events);

  expect(players).toEqual(['NI', 'SG']);
  expect(series).toHaveLength(3);
  // First point: SG took its win, NI carried forward at 0.
  expect(series[0]).toMatchObject({ SG: 1, NI: 0 });
  // Last point: SG=2, NI=1.
  expect(series[2]).toMatchObject({ SG: 2, NI: 1 });
});

test('excludes voided events', () => {
  const events = [
    { playerInitials: 'SG', delta: 1, createdAt: '2026-01-01T00:00:00Z' },
    { playerInitials: 'SG', delta: 5, createdAt: '2026-01-02T00:00:00Z', voided: true },
  ];
  const { series } = buildCumulativeSeries(events);

  expect(series).toHaveLength(1);
  expect(series[0].SG).toBe(1);
});

test('sorts out-of-order events by createdAt', () => {
  const events = [
    { playerInitials: 'SG', delta: 1, createdAt: '2026-01-03T00:00:00Z' },
    { playerInitials: 'SG', delta: 1, createdAt: '2026-01-01T00:00:00Z' },
  ];
  const { series } = buildCumulativeSeries(events);

  expect(series[0].time).toBe('2026-01-01T00:00:00Z');
  expect(series[1].SG).toBe(2);
});

test('supports fractional deltas (half-point draws)', () => {
  const events = [
    { playerInitials: 'MG', delta: 0.5, createdAt: '2026-01-01T00:00:00Z' },
    { playerInitials: 'MG', delta: 0.5, createdAt: '2026-01-02T00:00:00Z' },
  ];
  const { series } = buildCumulativeSeries(events);

  expect(series[1].MG).toBe(1);
});

test('handles empty input', () => {
  expect(buildCumulativeSeries([])).toEqual({ series: [], players: [] });
});

test('a +1 then -1 correction leaves no dip in the line', () => {
  const events = [
    { gameId: 'g1', playerId: 'p1', playerInitials: 'SG', delta: 1, createdAt: '2026-01-01T00:00:00Z' },
    { gameId: 'g2', playerId: 'p1', playerInitials: 'SG', delta: 1, createdAt: '2026-01-02T00:00:00Z' },
    { gameId: 'g2', playerId: 'p1', playerInitials: 'SG', delta: -1, createdAt: '2026-01-02T00:01:00Z' },
  ];
  const { series } = buildCumulativeSeries(events);
  expect(series.map(p => p.SG)).toEqual([1]);
});

test('a decrease cancels an earlier win in the same game, keeping the total', () => {
  const events = [
    { gameId: 'g1', playerId: 'p2', playerInitials: 'NI', delta: 1, createdAt: '2026-10-10T00:00:00Z' },
    { gameId: 'g1', playerId: 'p2', playerInitials: 'NI', delta: -1, createdAt: '2026-11-04T00:00:00Z' },
    { gameId: 'g1', playerId: 'p2', playerInitials: 'NI', delta: 1, createdAt: '2026-11-04T00:00:01Z' },
    { gameId: 'g1', playerId: 'p2', playerInitials: 'NI', delta: 1, createdAt: '2026-11-04T00:00:02Z' },
  ];
  const { series } = buildCumulativeSeries(events);
  const values = series.map(p => p.NI);
  expect(values).toEqual([1, 2]); // never goes down
  expect(values.at(-1)).toBe(2);  // same end total as the raw deltas
});

test('a decrease in a different game does not cancel', () => {
  const events = [
    { gameId: 'g1', playerId: 'p1', playerInitials: 'SG', delta: 1, createdAt: '2026-01-01T00:00:00Z' },
    { gameId: 'g2', playerId: 'p1', playerInitials: 'SG', delta: -1, createdAt: '2026-01-02T00:00:00Z' },
  ];
  expect(buildCumulativeSeries(events).series.map(p => p.SG)).toEqual([1, 0]);
});
