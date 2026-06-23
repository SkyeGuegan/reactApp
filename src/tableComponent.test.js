import React from 'react';
import { render, screen } from '@testing-library/react';
import TableComponent from './tableComponent';

const sampleScores = [
  { game: 'Catan', sgScore: 3, niScore: 1, mgScore: 2 },
  { game: 'Hearts', sgScore: 2, niScore: 3, mgScore: 1 },
];

test('shows a loading indicator while loading', () => {
  render(<TableComponent scores={[]} loading={true} />);
  expect(screen.getByText(/loading/i)).toBeInTheDocument();
});

test('renders headers, game rows, and a computed total when loaded', () => {
  render(<TableComponent scores={sampleScores} loading={false} />);

  // column headers
  expect(screen.getByText('Game')).toBeInTheDocument();
  expect(screen.getByText('SG')).toBeInTheDocument();

  // game rows
  expect(screen.getByText('Catan')).toBeInTheDocument();
  expect(screen.getByText('Hearts')).toBeInTheDocument();

  // totals row: SG total = 3 + 2 = 5 (unique value, so safe to assert directly)
  expect(screen.getByText('Total Wins')).toBeInTheDocument();
  expect(screen.getByText('5')).toBeInTheDocument();
});
