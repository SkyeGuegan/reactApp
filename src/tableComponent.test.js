import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
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

test('shows no score buttons outside edit mode', () => {
  render(<TableComponent games={games} players={players} gameScores={gameScores} loading={false} onIncrement={() => {}} />);
  expect(screen.queryByRole('button', { name: /add a win/i })).toBeNull();
});

test('edit mode adds −/+ per cell that call onIncrement with the cell', () => {
  const onIncrement = jest.fn();
  render(<TableComponent games={games} players={players} gameScores={gameScores} loading={false} editing onIncrement={onIncrement} />);

  fireEvent.click(screen.getByRole('button', { name: 'Add a win for SG in Catan' }));
  expect(onIncrement).toHaveBeenCalledWith(gameScores[0], 1);

  fireEvent.click(screen.getByRole('button', { name: 'Remove a win from NI in Hearts' }));
  expect(onIncrement).toHaveBeenCalledWith(gameScores[4], -1);
});

test('edit mode disables − when a score is 0', () => {
  const zero = gameScores.map(gs => (gs.id === 's1' ? { ...gs, score: 0 } : gs));
  render(<TableComponent games={games} players={players} gameScores={zero} loading={false} editing onIncrement={() => {}} />);
  expect(screen.getByRole('button', { name: 'Remove a win from SG in Catan' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Remove a win from NI in Catan' })).toBeEnabled();
});

test('shows a Played column on the right, with the total in a Totals row', () => {
  const playedCounts = new Map([['g1', 7], ['g2', 4]]);
  render(<TableComponent games={games} players={players} gameScores={gameScores} loading={false} playedCounts={playedCounts} />);
  const headers = screen.getAllByRole('columnheader').map(h => h.textContent.trim());
  expect(headers[0]).toBe('Game');
  expect(headers.at(-1)).toBe('Played');
  expect(screen.getByText('7')).toBeInTheDocument();
  expect(screen.getByText('11')).toBeInTheDocument();
  expect(screen.getByText('Totals')).toBeInTheDocument();
});

test('a failed load says so instead of claiming the board is empty', () => {
  render(<TableComponent games={[]} players={[]} gameScores={[]} loading={false} error />);
  expect(screen.getByRole('alert')).toHaveTextContent("Couldn't load the scoreboard");
  expect(screen.queryByText(/scoreboard is empty/)).toBeNull();
});

test('shows box art and links each game name to its page', () => {
  const withArt = [{ id: 'g1', name: 'Catan', bggId: 13, imageUrl: 'https://cf.geekdo-images.com/x.png' }, games[1]];
  const { container } = render(<TableComponent games={withArt} players={players} gameScores={gameScores} loading={false} />);
  expect(screen.getByRole('link', { name: 'Catan' })).toHaveAttribute('href', '#/game/catan');
  expect(screen.getByRole('link', { name: 'Hearts' })).toHaveAttribute('href', '#/game/hearts');
  expect(container.querySelector('img.game-art')).toHaveAttribute('src', 'https://cf.geekdo-images.com/x.png');
  expect(screen.getByText(/Box art from/)).toBeInTheDocument();
});

test('no credit line when no game has artwork', () => {
  render(<TableComponent games={games} players={players} gameScores={gameScores} loading={false} />);
  expect(screen.queryByText(/BoardGameGeek/)).toBeNull();
});

test('notes games won by guests under the table when there are any', () => {
  const playedCounts = new Map([['g1', 7], ['g2', 4]]);
  const { rerender } = render(<TableComponent games={games} players={players} gameScores={gameScores} loading={false} playedCounts={playedCounts} guestWonGames={2} />);
  expect(screen.getByText('Played includes 2 games won by guests.')).toBeInTheDocument();
  rerender(<TableComponent games={games} players={players} gameScores={gameScores} loading={false} playedCounts={playedCounts} guestWonGames={0} />);
  expect(screen.queryByText(/won by guests/)).toBeNull();
});
