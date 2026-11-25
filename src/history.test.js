import { sortNewestFirst, cellForEvent, formatDelta, canApplyDelta } from './history';

test('canApplyDelta never lets a score go below 0', () => {
  expect(canApplyDelta(1, -1)).toBe(true);
  expect(canApplyDelta(0, -1)).toBe(false);
  expect(canApplyDelta(0.5, -1)).toBe(false);
  expect(canApplyDelta(0, 1)).toBe(true);
});

test('sortNewestFirst orders by createdAt descending without mutating input', () => {
  const events = [
    { id: 'a', createdAt: '2026-01-01T00:00:00Z' },
    { id: 'c', createdAt: '2026-01-03T00:00:00Z' },
    { id: 'b', createdAt: '2026-01-02T00:00:00Z' },
  ];
  expect(sortNewestFirst(events).map(e => e.id)).toEqual(['c', 'b', 'a']);
  expect(events.map(e => e.id)).toEqual(['a', 'c', 'b']);
});

test('cellForEvent finds the matching game/player cell', () => {
  const cells = [
    { id: 'x', gameId: 'g1', playerId: 'p1' },
    { id: 'y', gameId: 'g1', playerId: 'p2' },
  ];
  expect(cellForEvent({ gameId: 'g1', playerId: 'p2' }, cells).id).toBe('y');
});

test('cellForEvent returns null when the game or player was deleted', () => {
  expect(cellForEvent({ gameId: 'gone', playerId: 'p1' }, [{ id: 'x', gameId: 'g1', playerId: 'p1' }])).toBeNull();
});

test('formatDelta signs values with a real minus', () => {
  expect(formatDelta(1)).toBe('+1');
  expect(formatDelta(0.5)).toBe('+0.5');
  expect(formatDelta(-1)).toBe('−1');
});
