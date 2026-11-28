import { parseJson, fieldsOf, detailsOf, fieldKey, cleanDetails, topScorers, bestPlayers, winnerRuleLabel, scoringStats, setupLabel, setupStats, withDetails, suggestedFor, takenChoices, placings, playerScoringStats, playerCounts, withPlayerCount, onlineRatesFor, optionsOf, GAME_KEY, SUGGESTED, PRESETS } from './scoring';

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
  expect(points.best).toMatchObject({ value: 150, playerId: 'ni', playedAt: '2026-11-08' });
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

describe('richer stats (Terra Mystica style)', () => {
  const game = { id: 'g', name: 'Terra Mystica', scoreFields: JSON.stringify(SUGGESTED['terra mystica']) };
  const play = (id, rows, winners, extra = {}) => ({ id, gameId: 'g', playedAt: '2026-01-0' + id + 'T12:00:00Z', playerIds: Object.keys(rows), winnerIds: winners, details: JSON.stringify(rows), ...extra });
  const plays = [
    play('1', { a: { faction: 'Witches', points: 130 }, b: { faction: 'Nomads', points: 110 }, c: { faction: 'Giants', points: 90 } }, ['a']),
    play('2', { a: { faction: 'Nomads', points: 100 }, b: { faction: 'Witches', points: 120 }, c: { faction: 'Giants', points: 100 }, d: { faction: 'Auren', points: 80 } }, ['b']),
    play('3', { a: { faction: 'Witches', points: 200 }, b: { faction: 'Nomads', points: 10 } }, ['a'], { test: true }),
  ];

  test('placings: ties share the better place; margin is vs the table average', () => {
    const p = placings(plays[1], { key: 'points' });
    expect(p.b).toEqual({ score: 120, place: 1, diff: 120 - 100 });
    expect(p.a.place).toBe(2);
    expect(p.c.place).toBe(2);
    expect(p.d.place).toBe(4);
    const low = placings(plays[1], { key: 'points', lowWins: true });
    expect(low.d.place).toBe(1);
    expect(low.d.diff).toBe(20); // 20 under the average is good when lowest wins
  });

  test('faction rows get average place, score, margin and best', () => {
    const [faction] = scoringStats(game, plays);
    const witches = faction.rows.find(r => r.value === 'Witches');
    expect(witches).toMatchObject({ played: 2, wins: 2, avgPlace: 1, avgScore: 125, best: { value: 130, playerId: 'a' } });
    expect(witches.avgDiff).toBeCloseTo(((130 - 110) + (120 - 100)) / 2);
    const giants = faction.rows.find(r => r.value === 'Giants');
    expect(giants.avgPlace).toBe(2.5);
  });

  test('player rows: most played and most-winning faction; test plays ignored', () => {
    const rows = playerScoringStats(game, plays);
    expect(rows.map(r => r.playerId)).toEqual(['a', 'b', 'c', 'd']);
    const a = rows[0];
    expect(a).toMatchObject({ played: 2, wins: 1, avgPlace: 1.5, avgScore: 115, best: { value: 130 } });
    expect(a.mostWins).toEqual({ value: 'Witches', played: 1, wins: 1 });
    expect(rows[2].mostWins).toBeNull();
    expect(rows[2].mostPlayed).toEqual({ value: 'Giants', played: 2, wins: 0 });
  });

  test('player counts and filtering', () => {
    expect(playerCounts(game, plays)).toEqual([3, 4]);
    expect(withPlayerCount(plays, 4).map(p => p.id)).toEqual(['2']);
    expect(withPlayerCount(plays, null)).toBe(plays);
  });

  test('online win rates only for the matching game and field', () => {
    const [faction, points] = SUGGESTED['terra mystica'];
    expect(onlineRatesFor(game, faction).rates.Darklings).toBeCloseTo(0.327, 3);
    expect(onlineRatesFor(game, points)).toBeNull();
    expect(onlineRatesFor({ name: 'Root' }, faction)).toBeNull();
    // every Terra Mystica faction has an online rate
    expect(faction.options.every(o => onlineRatesFor(game, faction).rates[o.name] > 0)).toBe(true);
  });
});

test('suggested fields for Heroes of Barcadia (hero) and Robo Rally (checkpoints, most wins)', () => {
  const [hero] = suggestedFor({ name: 'Heroes of Barcadia' });
  expect(hero).toMatchObject({ key: 'hero', type: 'text', unique: true });
  expect(hero.options).toHaveLength(13);
  expect(hero.options).toContain('Keggar the Barbeerian');
  const [cp] = suggestedFor({ name: 'Robo Rally' });
  expect(cp).toMatchObject({ key: 'checkpoints', type: 'number' });
  expect(cp.lowWins).toBeUndefined();
});
