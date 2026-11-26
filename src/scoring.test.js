import { parseJson, fieldsOf, detailsOf, fieldKey, cleanDetails, topScorers, scoringStats, withDetails, PRESETS } from './scoring';

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
