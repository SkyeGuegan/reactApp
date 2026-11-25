import { gameStandings, playsForGame, fmtPercent } from './gameStats';
import { gameSlug, gameHref, parseRoute } from './route';

const SG = { id: 'sg', initials: 'SG' }, MG = { id: 'mg', initials: 'MG' }, NI = { id: 'ni', initials: 'NI' };
const game = { id: 'g1', name: 'Settlers of Catan' };
const scores = [
  { gameId: 'g1', playerId: 'sg', score: 28 }, { gameId: 'g1', playerId: 'mg', score: 16 },
  { gameId: 'g1', playerId: 'ni', score: 17 }, { gameId: 'g2', playerId: 'sg', score: 99 },
];

test('standings sort by wins with win rates over games played, and name the leader', () => {
  const { rows, leaderIds } = gameStandings(game, [SG, MG, NI], scores, 61);
  expect(rows.map(r => [r.player.initials, r.wins, fmtPercent(r.rate)])).toEqual([['SG', 28, '46%'], ['NI', 17, '28%'], ['MG', 16, '26%']]);
  expect([...leaderIds]).toEqual(['sg']);
});

test('a tie for first makes co-leaders; no leader with no wins; no rate with no games played', () => {
  const tied = [{ gameId: 'g1', playerId: 'sg', score: 2 }, { gameId: 'g1', playerId: 'ni', score: 2 }, { gameId: 'g1', playerId: 'mg', score: 1 }];
  expect([...gameStandings(game, [SG, MG, NI], tied, 5).leaderIds].sort()).toEqual(['ni', 'sg']);
  const none = gameStandings(game, [SG, NI], [], 0);
  expect(none.leaderIds.size).toBe(0);
  expect(fmtPercent(none.rows[0].rate)).toBe('—');
});

test('playsForGame keeps this game, newest first, hides voided and (unless asked) test plays', () => {
  const plays = [
    { id: 'a', gameId: 'g1', playedAt: '2026-01-01' }, { id: 'b', gameId: 'g1', playedAt: '2026-03-01' },
    { id: 'c', gameId: 'g1', playedAt: '2026-02-01', voided: true }, { id: 'd', gameId: 'g1', playedAt: '2026-04-01', test: true },
    { id: 'e', gameId: 'g2', playedAt: '2026-05-01' },
  ];
  expect(playsForGame('g1', plays).map(p => p.id)).toEqual(['b', 'a']);
  expect(playsForGame('g1', plays, true).map(p => p.id)).toEqual(['d', 'b', 'a']);
});

test('game addresses use readable slugs and parse back', () => {
  expect(gameSlug('Settlers of Catan')).toBe('settlers-of-catan');
  expect(gameSlug('Sushi Go!')).toBe('sushi-go');
  expect(gameHref({ name: 'Phase10' })).toBe('#/game/phase10');
  expect(parseRoute('#/game/sushi-go')).toEqual({ page: 'game', slug: 'sushi-go' });
  expect(parseRoute('')).toEqual({ page: 'board' });
  expect(parseRoute('#/')).toEqual({ page: 'board' });
});
