import { parseJson, fieldsOf, detailsOf, fieldKey, cleanDetails, topScorers, bestPlayers, winnerRuleLabel, scoringStats, setupLabel, setupStats, withDetails, suggestedFor, takenChoices, optionsOf, GAME_KEY, SUGGESTED, PRESETS } from './scoring';

test('parseJson accepts strings, objects and junk', () => {
  expect(parseJson('[1,2]', [])).toEqual([1, 2]);
  expect(parseJson([3], [])).toEqual([3]);
  expect(parseJson('not json', 'fallback')).toBe('fallback');
  expect(parseJson(null, {})).toEqual({});
});

test('fieldsOf / detailsOf read AWSJSON strings and ignore bad entries', () => {
  expect(fieldsOf({ scoreFields: JSON.stringify([{ key: 'p', label: 'Points', type: 'number' }, { nope: 1 }]) })).toHaveLength(1);
  expect(fieldsOf({})).toEqual([]);
  expect(detailsOf({ details: '{"a":{"p":3}}' })).toEqual({ a: { p: 3 } });
});

test('fieldKey makes unique snake_case keys', () => {
  expect(fieldKey('Victory points')).toBe('victory_points');
  expect(fieldKey('Points', ['points'])).toBe('points_2');
  expect(fieldKey('!!!')).toBe('field');
});

test('cleanDetails keeps only filled, typed values for players in the game', () => {
  const fields = PRESETS.factionPoints;
  const raw = { sg: { faction: ' Witches ', points: '142' }, ni: { faction: '', points: 'abc' }, mg: {}, x: { points: '5' } };
  expect(cleanDetails(raw, fields, ['sg', 'ni', 'mg'])).toEqual({ sg: { faction: 'Witches', points: 142 } });
});

test('topScorers finds the highest, including ties', () => {
  const d = { a: { points: 10 }, b: { points: 12 }, c: { points: 12 }, d: {} };
  expect(topScorers(d, 'points', ['a', 'b', 'c', 'd'])).toEqual(['b', 'c']);
  expect(topScorers({}, 'points', ['a'])).toEqual([]);
});

test('scoringStats: best score, average winning score, and faction win rates', () => {
  const game = { id: 'tm', scoreFields: JSON.stringify(PRESETS.factionPoints) };
  const plays = [
    { gameId: 'tm', winnerIds: ['sg'], playedAt: '2026-11-01', details: JSON.stringify({ sg: { faction: 'Witches', points: 140 }, ni: { faction: 'Nomads', points: 120 } }) },
    { gameId: 'tm', winnerIds: ['ni'], playedAt: '2026-11-08', details: { sg: { faction: 'Witches', points: 110 }, ni: { faction: 'Giants', points: 150 } } },
    { gameId: 'tm', winnerIds: ['ni'], playedAt: '2026-11-09', voided: true, details: { ni: { points: 999 } } },
    { gameId: 'other', winnerIds: ['sg'], details: { sg: { points: 500 } } },
  ];
  const [faction, points] = scoringStats(game, plays);
  expect(points.best).toEqual({ value: 150, playerId: 'ni', playedAt: '2026-11-08' });
  expect(points.avgWin).toBe(145);
  expect(faction.rows.map(r => [r.value, r.played, r.wins])).toEqual([['Witches', 2, 1], ['Giants', 1, 1], ['Nomads', 1, 0]]);
});

test('withDetails labels a player with their noted details, in field order', () => {
  const game = { scoreFields: JSON.stringify([{ key: 'faction', label: 'Faction', type: 'text' }, { key: 'points', label: 'Points', type: 'number' }]) };
  const play = { details: JSON.stringify({ a: { points: 142, faction: 'Witches' }, b: {} }) };
  expect(withDetails(play, game, 'a', 'SG')).toBe('SG (Witches, 142)');
  expect(withDetails(play, game, 'b', 'MG')).toBe('MG');
  expect(withDetails({ details: null }, undefined, 'a', 'SG')).toBe('SG');
});

const catan = { id: 'c', name: 'Settlers of Catan', scoreFields: JSON.stringify(SUGGESTED['settlers of catan']) };

test('cleanDetails keeps game-level picks under _game, as a list for multi fields', () => {
  const fields = SUGGESTED['settlers of catan'];
  const raw = { a: { points: '13' }, [GAME_KEY]: { expansions: ['Seafarers', ' ', 'Cities & Knights'] } };
  expect(cleanDetails(raw, fields, ['a'])).toEqual({ a: { points: 13 }, _game: { expansions: ['Seafarers', 'Cities & Knights'] } });
  expect(cleanDetails({ [GAME_KEY]: { expansions: [] } }, fields, ['a'])).toEqual({});
});

test('bestPlayers: lowest wins, and Phase 10 compares phase then fewest points', () => {
  const hearts = SUGGESTED.hearts;
  expect(bestPlayers({ a: { points: 40 }, b: { points: 12 }, c: {} }, hearts, ['a', 'b', 'c'])).toEqual(['b']);
  const phase = SUGGESTED.phase10;
  const d = { a: { phase: 10, points: 120 }, b: { phase: 10, points: 85 }, c: { phase: 9, points: 5 } };
  expect(bestPlayers(d, phase, ['a', 'b', 'c'])).toEqual(['b']);
  expect(winnerRuleLabel(phase)).toBe('highest phase reached, then lowest points');
  expect(topScorers({ a: { points: 3 }, b: { points: 1 } }, 'points', ['a', 'b'], true)).toEqual(['b']);
});

test('lowest-wins stats pick the lowest as best', () => {
  const game = { id: 'h', scoreFields: JSON.stringify(SUGGESTED.hearts) };
  const plays = [{ gameId: 'h', winnerIds: ['b'], playedAt: '2026-11-01', details: { a: { points: 60 }, b: { points: 9 } } }];
  expect(scoringStats(game, plays)[0].best).toMatchObject({ value: 9, playerId: 'b' });
});

test('setups: label, base-game default, and stats per expansion mix', () => {
  const p = (exp, winner, pts) => ({ gameId: 'c', winnerIds: [winner], playedAt: '2026-11-01',
    details: JSON.stringify({ [winner]: { points: pts }, ...(exp ? { _game: { expansions: exp } } : {}) }) });
  const plays = [p(['Cities & Knights'], 'a', 13), p(['Cities & Knights'], 'b', 14), p(null, 'a', 10), { ...p(null, 'a', 10), voided: true }];
  expect(setupLabel(plays[0], catan)).toBe('Cities & Knights');
  expect(setupLabel(plays[2], catan)).toBe('Base game');
  const s = setupStats(catan, plays);
  expect(s.map(x => [x.setup, x.games])).toEqual([['Cities & Knights', 2], ['Base game', 1]]);
  expect(s[0].best.value).toBe(14);
  expect(s[0].avgWin).toBe(13.5);
  expect(s[0].wins.get('a')).toBe(1);
  expect(setupStats({ id: 'x', scoreFields: JSON.stringify(PRESETS.points) }, plays)).toEqual([]);
});

test('withDetails ignores game-level details; options can carry art', () => {
  const play = { details: { a: { points: 13 }, _game: { expansions: ['Seafarers'] } } };
  expect(withDetails(play, catan, 'a', 'SG')).toBe('SG (13)');
  expect(optionsOf({ options: ['A', { name: 'B', imageUrl: 'x' }, { nope: 1 }] })).toEqual([{ name: 'A' }, { name: 'B', imageUrl: 'x' }]);
  expect(suggestedFor({ name: 'Hearts ' })).toBe(SUGGESTED.hearts);
  expect(suggestedFor({ name: 'Unknown' })).toBeNull();
});

test('takenChoices: Terra Mystica colours are one per player; Riverwalkers and Shapeshifters stand alone', () => {
  const [faction] = SUGGESTED['terra mystica'];
  const raw = { a: { faction: 'Witches' }, b: { faction: 'Shapeshifters' } };
  expect([...takenChoices(faction, raw, 'c', ['a', 'b', 'c'])].sort()).toEqual(['Auren', 'Shapeshifters', 'Witches']);
  expect(takenChoices(faction, raw, 'a', ['a', 'b', 'c']).has('Witches')).toBe(false); // your own pick stays available
  expect(takenChoices({ ...faction, unique: false }, raw, 'c', ['a', 'b', 'c']).size).toBe(0);
  expect(SUGGESTED['terra mystica'][0].options).toHaveLength(20);
});

test('setupStats counts every game, not just ones with points noted', () => {
  const plays = [
    { gameId: 'c', winnerIds: ['a'], playedAt: '2026-11-01', details: JSON.stringify({ a: { points: 10 } }) },
    { gameId: 'c', winnerIds: ['a'], playedAt: '2026-11-02', details: null },
  ];
  const [base] = setupStats(catan, plays);
  expect(base).toMatchObject({ setup: 'Base game', games: 2, avgWin: 10 });
  expect(base.wins.get('a')).toBe(2);
});
