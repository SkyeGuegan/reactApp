import React from 'react';
import { render, screen } from '@testing-library/react';
import TableComponent from './tableComponent';

const players = [
  { id: 'p1', initials: 'SG' },
  { id: 'p2', initials: 'NI' },
  { id: 'p3', initials: 'MG' },
];
const games = [
  { id: 'g1', name: 'Catan' },
  { id: 'g2', name: 'Hearts' },
];
const gameScores = [
  { id: 's1', gameId: 'g1', playerId: 'p1', score: 3 },
  { id: 's2', gameId: 'g1', playerId: 'p2', score: 1 },
  { id: 's3', gameId: 'g1', playerId: 'p3', score: 2 },
  { id: 's4', gameId: 'g2', playerId: 'p1', score: 2 },
  { id: 's5', gameId: 'g2', playerId: 'p2', score: 3 },
  { id: 's6', gameId: 'g2', playerId: 'p3', score: 1 },
];

test('shows a loading indicator while loading', () => {
  render(<TableComponent games={[]} players={[]} gameScores={[]} loading={true} />);
  expect(screen.getByText(/loading/i)).toBeInTheDocument();
});

test('renders headers, game rows, and a computed total when loaded', () => {
  render(<TableComponent games={games} players={players} gameScores={gameScores} loading={false} />);

  // column headers (Game + player initials)
  expect(screen.getByText('Game')).toBeInTheDocument();
  expect(screen.getByText('SG')).toBeInTheDocument();

  // game rows
  expect(screen.getByText('Catan')).toBeInTheDocument();
  expect(screen.getByText('Hearts')).toBeInTheDocument();

  // totals row: SG total = 3 + 2 = 5 (unique value, so safe to assert directly)
  expect(screen.getByText('Total Wins')).toBeInTheDocument();
  expect(screen.getByText('5')).toBeInTheDocument();
});
