import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ManagePanel from './ManagePanel';

// ScoreHistory (History tab) talks to Amplify; keep tests offline.
jest.mock('./api', () => ({ fetchAllPages: jest.fn(() => Promise.resolve([])) }));

const players = [{ id: 'p1', initials: 'SG', core: true }, { id: 'p2', initials: 'NI', core: true }];
const games = [{ id: 'g1', name: 'Catan' }];
const playerTotals = new Map([['p1', 5], ['p2', 1]]);

function setup(overrides = {}) {
  const props = {
    games, players, playerTotals,
    onAddGame: jest.fn(() => Promise.resolve(true)),
    onAddPlayer: jest.fn(() => Promise.resolve(true)),
    onRequestDelete: jest.fn(),
    onVoid: jest.fn(),
    ...overrides,
  };
  render(<ManagePanel {...props} />);
  return props;
}

test('adds a game and clears the input on success', async () => {
  const props = setup();
  const input = screen.getByLabelText('New game');
  fireEvent.change(input, { target: { value: '  Wingspan ' } });
  fireEvent.click(screen.getAllByRole('button', { name: 'Add' })[0]);
  await waitFor(() => expect(props.onAddGame).toHaveBeenCalledWith('Wingspan'));
  await waitFor(() => expect(input).toHaveValue(''));
});

test('rejects a duplicate game without calling the server', () => {
  const props = setup();
  fireEvent.change(screen.getByLabelText('New game'), { target: { value: 'catan' } });
  fireEvent.click(screen.getAllByRole('button', { name: 'Add' })[0]);
  expect(screen.getByRole('alert')).toHaveTextContent('already on the board');
  expect(props.onAddGame).not.toHaveBeenCalled();
});

test('uppercases player initials as you type', () => {
  setup();
  const input = screen.getByLabelText('New player');
  fireEvent.change(input, { target: { value: 'ab' } });
  expect(input).toHaveValue('AB');
});

test('roster lists players with wins and deletes via the menu', async () => {
  const props = setup();
  fireEvent.click(screen.getByRole('tab', { name: 'Roster' }));
  expect(screen.getByText('5 wins')).toBeInTheDocument();
  expect(screen.getByText('1 win')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Actions for Catan' }));
  fireEvent.click(await screen.findByText('Delete game…'));
  expect(props.onRequestDelete).toHaveBeenCalledWith('game', games[0]);
});

test('new players are guests unless "Regular player" is ticked', async () => {
  const props = setup();
  fireEvent.change(screen.getByLabelText('New player'), { target: { value: 'ab' } });
  fireEvent.click(screen.getAllByRole('button', { name: 'Add' })[1]);
  await waitFor(() => expect(props.onAddPlayer).toHaveBeenCalledWith('AB', false));
  fireEvent.change(screen.getByLabelText('New player'), { target: { value: 'cd' } });
  fireEvent.click(screen.getByLabelText(/Regular player/));
  fireEvent.click(screen.getAllByRole('button', { name: 'Add' })[1]);
  await waitFor(() => expect(props.onAddPlayer).toHaveBeenCalledWith('CD', true));
});

test('roster labels guests and the test player', () => {
  setup({ players: [...players, { id: 'g', initials: 'AB' }, { id: 't', initials: 'TEST', hidden: true }] });
  fireEvent.click(screen.getByRole('tab', { name: 'Roster' }));
  expect(screen.getByText('guest')).toBeInTheDocument();
  expect(screen.getByText('test')).toBeInTheDocument();
});

test('typing a new game name offers a BoardGameGeek search link', () => {
  setup();
  fireEvent.change(screen.getByLabelText('New game'), { target: { value: 'Wingspan' } });
  expect(screen.getByRole('link', { name: /Find “Wingspan” on BoardGameGeek/ })).toHaveAttribute('href', expect.stringContaining('q=Wingspan'));
});
