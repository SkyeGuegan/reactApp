import React from 'react';
import { render, screen } from '@testing-library/react';
import { playerGameRows, playerHeadToHead, playerPlays } from './playerStats';
import PlayerPage from './PlayerPage';
import { SUGGESTED } from './scoring';

const SG = { id: 'sg', initials: 'SG', core: true };
const MG = { id: 'mg', initials: 'MG', core: true };
const LG = { id: 'lg', initials: 'LG' };
const players = [SG, MG, LG];
const core = [SG, MG];
const tm = { id: 'tm', name: 'Terra Mystica', baselinePlays: 2, scoreFields: JSON.stringify(SUGGESTED['terra mystica']) };
const dom = { id: 'd', name: 'Dominion', baselinePlays: 5 };
const games = [tm, dom];
const pl = (id, gameId, day, ids, winners, details, extra = {}) => ({
  id, gameId, gameName: gameId === 'tm' ? 'Terra Mystica' : 'Dominion', playedAt: `2026-11-${day}T12:00:00Z`,
  playerIds: ids, winnerIds: winners, counted: ids.includes('sg') && ids.includes('mg') && !ids.includes('lg'),
  ...(details ? { details: JSON.stringify(details) } : {}), ...extra,
});
const plays = [
  pl('1', 'tm', '01', ['sg', 'mg'], ['sg'], { sg: { faction: 'Witches', points: 130 }, mg: { faction: 'Nomads', points: 100 } }),
  pl('2', 'tm', '02', ['sg', 'mg', 'lg'], ['lg'], { sg: { faction: 'Witches', points: 110 }, mg: { faction: 'Auren', points: 120 }, lg: { faction: 'Dwarves', points: 140 } }),
  pl('3', 'd', '03', ['sg', 'mg'], ['mg']),
  pl('4', 'tm', '04', ['sg', 'mg'], ['sg'], null, { test: true }),
];
const gameScores = [
  { gameId: 'tm', playerId: 'sg', score: 3 }, { gameId: 'tm', playerId: 'mg', score: 0 },
  { gameId: 'd', playerId: 'sg', score: 1 }, { gameId: 'd', playerId: 'mg', score: 5 },
];
const playedCounts = new Map([['tm', 3], ['d', 6]]); // baseline + counted plays

test('playerGameRows: regulars = main scoreboard + recorded games not on it; guests = recorded', () => {
  const rows = playerGameRows(SG, { games, plays, gameScores, playedCounts, isCore: true });
  expect(rows.map(r => [r.game.name, r.played, r.wins])).toEqual([['Dominion', 6, 1], ['Terra Mystica', 4, 3]]);
  const tmRow = rows[1];
  expect(tmRow.best.value).toBe(130);
  expect(tmRow.favourite).toEqual({ value: 'Witches', played: 2, wins: 1 });
  const guest = playerGameRows(LG, { games, plays, gameScores, playedCounts, isCore: false });
  expect(guest.map(r => [r.game.name, r.played, r.wins])).toEqual([['Terra Mystica', 1, 1]]);
});

test('playerHeadToHead adds up every game; playerPlays skips test games', () => {
  const h = playerHeadToHead(SG, players, games, plays);
  expect(h.map(r => [r.opponent.initials, r.ahead, r.behind, r.games])).toEqual([['MG', 1, 2, 3], ['LG', 0, 1, 1]]);
  expect(playerPlays(SG, plays).map(p => p.id)).toEqual(['3', '2', '1']);
});

test('PlayerPage: glance, by-game table with links, head to head, recorded games', () => {
  render(<PlayerPage player={SG} players={players} corePlayers={core} games={games} gameScores={gameScores} plays={plays} playedCounts={playedCounts} isAdmin={false} />);
  expect(screen.getByText('Regular')).toBeInTheDocument();
  expect(screen.getAllByRole('link', { name: 'Terra Mystica' })[0]).toHaveAttribute('href', '#/game/terra-mystica');
  expect(screen.getByRole('link', { name: 'MG' })).toHaveAttribute('href', '#/player/mg');
  expect(screen.getByText('1–2')).toBeInTheDocument();
  expect(screen.getByText(/Recorded games/)).toHaveTextContent('(3)');
  expect(screen.getAllByText('1st of 2').length).toBeGreaterThan(0);
});
