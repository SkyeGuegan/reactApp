import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ScoreHistory, { isGenerated } from './ScoreHistory';

const mockEvents = [
  { id: 'e1', gameName: 'Catan', playerInitials: 'SG', delta: 1, createdAt: '2026-11-04T04:09:00Z', recordedBy: 'sguegan', playId: 'p1' },
  { id: 'e2', gameName: 'Hearts', playerInitials: 'NI', delta: 1, createdAt: '2026-10-10T03:00:00Z', recordedBy: 'sguegan' },
  { id: 'e3', gameName: 'Root', playerInitials: 'MG', delta: 1, createdAt: '2025-03-01T00:00:00Z', recordedBy: 'backfill' },
];
// Plain function (CRA resets jest.fn implementations between tests).
jest.mock('./api', () => ({ fetchAllPages: () => Promise.resolve(mockEvents) }));
const events = mockEvents;
const plays = [{ id: 'p1', gameName: 'Catan', playedAt: '2026-11-04T04:09:00Z', winnerIds: ['sg'] }];

test('generated rows are hidden until the toggle is on', async () => {
  render(<ScoreHistory onVoid={jest.fn()} onVoidPlay={jest.fn()} plays={plays} />);
  await screen.findByText('Hearts');
  expect(screen.queryByText('Root')).toBeNull();
  fireEvent.click(screen.getByLabelText('Show generated history (1)'));
  expect(screen.getByText('Root')).toBeInTheDocument();
  expect(isGenerated(events[2])).toBe(true);
});

test('a win from a recorded game is labelled and voids the whole game', async () => {
  const onVoid = jest.fn();
  const onVoidPlay = jest.fn(() => Promise.resolve());
  render(<ScoreHistory onVoid={onVoid} onVoidPlay={onVoidPlay} plays={plays} />);
  await screen.findByText(/from recorded game/);
  fireEvent.click(screen.getByRole('button', { name: 'void game' }));
  expect(await screen.findByText('Void this game?')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Void game' }));
  await waitFor(() => expect(onVoidPlay).toHaveBeenCalledWith(plays[0]));
  expect(onVoid).not.toHaveBeenCalled();
});

test('a manual change still voids on its own', async () => {
  const onVoid = jest.fn(() => Promise.resolve());
  const onVoidPlay = jest.fn();
  render(<ScoreHistory onVoid={onVoid} onVoidPlay={onVoidPlay} plays={plays} />);
  await screen.findByText('Hearts');
  fireEvent.click(screen.getByRole('button', { name: 'void' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Void' }));
  await waitFor(() => expect(onVoid).toHaveBeenCalledWith(events[1]));
  expect(onVoidPlay).not.toHaveBeenCalled();
});

test('voided changes are hidden until "Show voided changes" is on', async () => {
  mockEvents.push({ id: 'v1', gameName: 'Puerto Rico', playerInitials: 'SG', delta: 1, createdAt: '2026-11-24T22:00:00Z', recordedBy: 'sguegan', voided: true });
  render(<ScoreHistory onVoid={jest.fn()} onVoidPlay={jest.fn()} plays={plays} />);
  await screen.findByText('Hearts');
  expect(screen.queryByText('Puerto Rico')).toBeNull();
  fireEvent.click(screen.getByLabelText('Show voided changes (1)'));
  expect(screen.getByText('Puerto Rico')).toBeInTheDocument();
  mockEvents.pop();
});
