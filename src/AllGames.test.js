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
