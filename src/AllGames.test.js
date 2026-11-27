import React from 'react';
import { render, screen } from '@testing-library/react';
import AllGames from './AllGames';

const players = [
  { id: 'sg', initials: 'SG', core: true }, { id: 'ni', initials: 'NI', core: true },
  { id: 'mg', initials: 'MG', core: true }, { id: 'ab', initials: 'AB' }, { id: 't', initials: 'TEST', hidden: true },
];
const play = (o) => ({ id: Math.random().toString(), gameName: 'Catan', playedAt: '2026-11-20T12:00:00Z', winnerIds: ['sg'], ...o });

test('test games are hidden from non-admins', () => {
  render(<AllGames players={players} isAdmin={false} plays={[play({ playerIds: ['sg', 't'], test: true })]} />);
  expect(screen.getByText(/No games recorded yet/)).toBeInTheDocument();
});

test('admins with only test games see them, and an empty-state note instead of stats', () => {
  render(<AllGames players={players} isAdmin plays={[play({ playerIds: ['sg', 'mg', 'ni', 't'], test: true })]} onVoid={() => {}} />);
  expect(screen.getByText(/No real games recorded yet/)).toBeInTheDocument();
  expect(screen.getByText('test')).toBeInTheDocument();
});

test('games where someone was missing are labelled and counted in Everyone', () => {
  render(<AllGames players={players} isAdmin={false} plays={[play({ playerIds: ['sg', 'ab'], winnerIds: ['ab'], counted: false })]} />);
  expect(screen.getByText('not on table')).toBeInTheDocument();
  expect(screen.getByText('guest')).toBeInTheDocument();
  expect(screen.getAllByText('100%')).toHaveLength(1);
});

test('void confirmation describes what voiding actually changes', () => {
  const { voidEffect } = require('./AllGames');
  expect(voidEffect({ counted: true, winnerIds: ['sg'] }, players)).toMatch(/win comes off the main table/);
  expect(voidEffect({ counted: true, winnerIds: ['ab'] }, players)).toMatch(/A guest won, so no table wins change/);
  expect(voidEffect({ counted: false, winnerIds: ['sg'] }, players)).toMatch(/wasn't counted/);
  expect(voidEffect({ test: true, winnerIds: ['t'] }, players)).toMatch(/test game/);
});

test('visitors see only the month of each game; admins see the day', () => {
  const plays = [play({ playerIds: ['sg', 'mg', 'ni'], playedAt: '2026-11-16T19:00:00Z', counted: true })];
  const { unmount } = render(<AllGames players={players} isAdmin={false} plays={plays} />);
  expect(screen.queryByText(/Nov 16/)).toBeNull();
  expect(screen.getAllByText(/Nov 2026/).length).toBeGreaterThan(0);
  unmount();
  render(<AllGames players={players} isAdmin plays={plays} onVoid={() => {}} />);
  expect(screen.getAllByText(/Nov 16, 2026/).length).toBeGreaterThan(0);
});

test('All games: scored games list one player per line, best first; others stay one line', () => {
  const tm = { id: 'tm', name: 'Terra Mystica', scoreFields: JSON.stringify([{ key: 'faction', label: 'Faction', type: 'text' }, { key: 'points', label: 'Points', type: 'number' }]) };
  const dom = { id: 'd', name: 'Dominion' };
  const ps = [{ id: 'sg', initials: 'SG', core: true }, { id: 'mg', initials: 'MG', core: true }];
  const plays = [
    { id: 'a', gameId: 'tm', gameName: 'Terra Mystica', playedAt: '2026-11-20T12:00:00Z', playerIds: ['sg', 'mg'], winnerIds: ['mg'], counted: true,
      details: JSON.stringify({ sg: { faction: 'Witches', points: 100 }, mg: { faction: 'Nomads', points: 120 } }) },
    { id: 'b', gameId: 'd', gameName: 'Dominion', playedAt: '2026-11-19T12:00:00Z', playerIds: ['sg', 'mg'], winnerIds: ['sg'], counted: true },
  ];
  const { container } = render(<AllGames games={[tm, dom]} players={ps} plays={plays} isAdmin={false} onVoid={() => {}} />);
  const lines = [...container.querySelectorAll('.player-line')].map(l => [...l.children].map(c => c.textContent).join('|'));
  expect(lines).toEqual(['MG|Nomads|120', 'SG|Witches|100']);
  expect(screen.getByText('SG, MG')).toBeInTheDocument();
});
