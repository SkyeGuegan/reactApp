import { corePlayers, classifyPlay, winShares, playedCounts, everyoneStats, fmtWins, gamesWonByGuests, allTimeStats } from './plays';

const SG = { id: 'sg', initials: 'SG', core: true };
const NI = { id: 'ni', initials: 'NI', core: true };
const MG = { id: 'mg', initials: 'MG', core: true };
const AB = { id: 'ab', initials: 'AB' };                       // guest
const TEST = { id: 't', initials: 'TEST', hidden: true };      // test player
const players = [SG, NI, MG, AB, TEST];

test('core players are the flagged regulars, falling back to all visible players', () => {
  expect(corePlayers(players).map(p => p.id)).toEqual(['sg', 'ni', 'mg']);
  expect(corePlayers([{ id: 'x', initials: 'X' }, TEST]).map(p => p.id)).toEqual(['x']);
});

test('a play counts only when all core players played and no test player did', () => {
  expect(classifyPlay(['sg', 'ni', 'mg'], players)).toEqual({ counted: true, test: false, missing: [] });
  expect(classifyPlay(['sg', 'ni', 'mg', 'ab'], players).counted).toBe(true);
  expect(classifyPlay(['sg', 'ni'], players)).toEqual({ counted: false, test: false, missing: ['MG'] });
  expect(classifyPlay(['sg', 'ni', 'mg', 't'], players)).toEqual({ counted: false, test: true, missing: [] });
});

test('one win is shared by all winners, but only core winners get table points', () => {
  expect(winShares(['sg'], players)).toEqual([{ playerId: 'sg', share: 1 }]);
  expect(winShares(['sg', 'ni'], players)).toEqual([{ playerId: 'sg', share: 0.5 }, { playerId: 'ni', share: 0.5 }]);
  expect(winShares(['sg', 'ab'], players)).toEqual([{ playerId: 'sg', share: 0.5 }]);
  expect(winShares(['ab'], players)).toEqual([]);
});

test('played counts = rounded baseline + counted, live, non-test plays', () => {
  const games = [{ id: 'g1', baselinePlays: 61 }, { id: 'g2', baselinePlays: 7.5 }, { id: 'g3' }];
  const plays = [
    { gameId: 'g1', counted: true },
    { gameId: 'g1', counted: false },
    { gameId: 'g1', counted: true, voided: true },
    { gameId: 'g3', counted: true },
    { gameId: 'g3', counted: false, test: true },
  ];
  const c = playedCounts(games, plays);
  expect([c.get('g1'), c.get('g2'), c.get('g3')]).toEqual([62, 8, 1]);
});

test('everyone stats cover all non-test plays, including ones that did not count', () => {
  const plays = [
    { playerIds: ['sg', 'ni', 'mg'], winnerIds: ['sg'] },
    { playerIds: ['sg', 'ab'], winnerIds: ['ab'] },
    { playerIds: ['sg', 'ni', 'mg', 'ab'], winnerIds: ['sg', 'ab'] },
    { playerIds: ['sg', 't'], winnerIds: ['t'], test: true },
    { playerIds: ['ni'], winnerIds: ['ni'], voided: true },
  ];
  const rows = everyoneStats(players, plays).map(r => [r.player.initials, r.played, r.wins]);
  expect(rows).toEqual([['SG', 3, 1.5], ['AB', 2, 1.5], ['MG', 2, 0], ['NI', 2, 0]]);
});

test('fmtWins trims long fractions', () => {
  expect(fmtWins(1)).toBe('1');
  expect(fmtWins(1 / 3)).toBe('0.33');
});

test('gamesWonByGuests counts counted, live, non-test games a guest won', () => {
  const plays = [
    { counted: true, winnerIds: ['ab'] },
    { counted: true, winnerIds: ['sg', 'ab'] },
    { counted: true, winnerIds: ['sg'] },
    { counted: false, winnerIds: ['ab'] },
    { counted: true, winnerIds: ['ab'], voided: true },
    { counted: true, winnerIds: ['t'], test: true },
  ];
  expect(gamesWonByGuests(plays, players)).toBe(2);
});

test('allTimeStats counts earlier games as regulars-only games plus every recorded game', () => {
  const games = [{ id: 'g1', baselinePlays: 10 }, { id: 'g2', baselinePlays: 2.5 }];
  const gameScores = [
    { gameId: 'g1', playerId: 'sg', score: 6 }, { gameId: 'g1', playerId: 'ni', score: 4 },
    { gameId: 'g2', playerId: 'mg', score: 2.5 }, { gameId: 'g2', playerId: 'sg', score: 1 },
  ];
  const plays = [
    { gameId: 'g1', playerIds: ['sg', 'ni', 'mg', 'ab'], winnerIds: ['sg'], counted: true },  // already in sg's table score
    { gameId: 'g1', playerIds: ['sg', 'ni', 'mg', 'ab'], winnerIds: ['ab'], counted: true },  // guest win
    { gameId: 'g1', playerIds: ['sg', 'ni'], winnerIds: ['ni'], counted: false },              // not on the table
    { gameId: 'g1', playerIds: ['sg', 't'], winnerIds: ['t'], test: true },
  ];
  const rows = Object.fromEntries(allTimeStats(players, plays, games, gameScores).map(r => [r.player.initials, [r.played, r.wins]]));
  // baseline = round(10) + round(2.5) = 13
  expect(rows.SG).toEqual([16, 7]);
  expect(rows.NI).toEqual([16, 5]);
  expect(rows.MG).toEqual([15, 2.5]);
  expect(rows.AB).toEqual([2, 1]);
  expect(rows.TEST).toBeUndefined();
});
