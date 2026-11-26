import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RecordPlayDialog from './RecordPlayDialog';
import ScoringFieldsDialog from './ScoringFieldsDialog';
import GamePage from './GamePage';
import { PRESETS, SUGGESTED } from './scoring';

jest.mock('./TrendsChart', () => () => null); // the chart loads data; not under test here

const SG = { id: 'sg', initials: 'SG', core: true };
const MG = { id: 'mg', initials: 'MG', core: true };
const NI = { id: 'ni', initials: 'NI', core: true };
const players = [SG, MG, NI];
const tm = { id: 'tm', name: 'Terra Mystica', baselinePlays: 21, scoreFields: JSON.stringify(PRESETS.factionPoints) };

test('Record a game: optional details per player; the winner defaults to the highest points', async () => {
  const onSave = jest.fn(() => Promise.resolve(true));
  render(<RecordPlayDialog show onHide={() => {}} games={[tm]} players={players} onSave={onSave} onAddGuest={() => {}} initialGameId="tm" />);
  fireEvent.change(screen.getByLabelText('Faction for SG'), { target: { value: 'Witches' } });
  fireEvent.change(screen.getByLabelText('Points for SG'), { target: { value: '142' } });
  fireEvent.change(screen.getByLabelText('Points for NI'), { target: { value: '120' } });
  expect(screen.getByLabelText('SG', { selector: '#wins-sg' })).toBeChecked();
  fireEvent.click(screen.getByRole('button', { name: 'Save game' }));
  await waitFor(() => expect(onSave).toHaveBeenCalled());
  const saved = onSave.mock.calls[0][0];
  expect(saved.winnerIds).toEqual(['sg']);
  expect(saved.details).toEqual({ sg: { faction: 'Witches', points: 142 }, ni: { points: 120 } });
});

test('Record a game: no details section for games without scoring fields', () => {
  render(<RecordPlayDialog show onHide={() => {}} games={[{ id: 'g', name: 'Hearts' }]} players={players} onSave={() => {}} onAddGuest={() => {}} initialGameId="g" />);
  expect(screen.queryByText('Details')).toBeNull();
});

test('Scoring details dialog: a preset sets the fields that get saved', async () => {
  const onSave = jest.fn(() => Promise.resolve(true));
  render(<ScoringFieldsDialog game={{ id: 'c', name: 'Catan' }} onHide={() => {}} onSave={onSave} />);
  fireEvent.click(screen.getByRole('button', { name: 'Victory points' }));
  fireEvent.click(screen.getByRole('button', { name: 'Save' }));
  await waitFor(() => expect(onSave).toHaveBeenCalledWith([{ key: 'points', label: 'Victory points', type: 'number' }]));
});

test('Game page: scores, faction win rates, details in recent games, and the earlier-games note', () => {
  const plays = [
    { id: 'p1', gameId: 'tm', playedAt: '2026-11-20T12:00:00Z', playerIds: ['sg', 'mg', 'ni'], winnerIds: ['sg'], counted: true,
      details: JSON.stringify({ sg: { faction: 'Witches', points: 142 }, ni: { faction: 'Nomads', points: 120 } }) },
  ];
  render(<GamePage game={tm} corePlayers={players} players={players} gameScores={[]} plays={plays} played={22} isAdmin={false}
    onRecord={() => {}} onSetArt={() => {}} onSetScoring={() => {}} />);
  expect(screen.getByText('Best points')).toBeInTheDocument();
  expect(screen.getAllByText('142').length).toBeGreaterThan(0);
  expect(screen.getByText('Witches')).toBeInTheDocument();
  expect(screen.getByText(/SG \(Witches, 142\), MG, NI \(Nomads, 120\)/)).toBeInTheDocument();
  expect(screen.getByText(/Plus 21 earlier games between SG, MG, NI/)).toBeInTheDocument();
});

const catan = { id: 'c', name: 'Settlers of Catan', baselinePlays: 60, scoreFields: JSON.stringify(SUGGESTED['settlers of catan']) };

test('Record a game: Catan expansions are picked once for the game', async () => {
  const onSave = jest.fn(() => Promise.resolve(true));
  render(<RecordPlayDialog show onHide={() => {}} games={[catan]} players={players} onSave={onSave} onAddGuest={() => {}} initialGameId="c" />);
  fireEvent.click(screen.getByRole('button', { name: 'Cities & Knights' }));
  fireEvent.click(screen.getByRole('button', { name: 'Seafarers' }));
  fireEvent.click(screen.getByRole('button', { name: 'Seafarers' })); // toggled back off
  expect(screen.getByRole('button', { name: 'Cities & Knights' })).toHaveAttribute('aria-pressed', 'true');
  fireEvent.change(screen.getByLabelText('Victory points for MG'), { target: { value: '13' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save game' }));
  await waitFor(() => expect(onSave).toHaveBeenCalled());
  expect(onSave.mock.calls[0][0].details).toEqual({ mg: { points: 13 }, _game: { expansions: ['Cities & Knights'] } });
  expect(onSave.mock.calls[0][0].winnerIds).toEqual(['mg']);
});

test('Scoring details dialog: "Suggested" sets up Catan with expansions', async () => {
  const onSave = jest.fn(() => Promise.resolve(true));
  render(<ScoringFieldsDialog game={{ id: 'c', name: 'Settlers of Catan' }} onHide={() => {}} onSave={onSave} />);
  fireEvent.click(screen.getByRole('button', { name: 'Suggested for Settlers of Catan' }));
  fireEvent.click(screen.getByRole('button', { name: 'Save' }));
  await waitFor(() => expect(onSave).toHaveBeenCalledWith(SUGGESTED['settlers of catan']));
});

test('Game page: Catan setups table and expansion tag on recent games', () => {
  const plays = [
    { id: 'p1', gameId: 'c', playedAt: '2026-11-20T12:00:00Z', playerIds: ['sg', 'mg', 'ni'], winnerIds: ['sg'], counted: true,
      details: JSON.stringify({ sg: { points: 13 }, _game: { expansions: ['Cities & Knights'] } }) },
    { id: 'p2', gameId: 'c', playedAt: '2026-11-21T12:00:00Z', playerIds: ['sg', 'mg', 'ni'], winnerIds: ['ni'], counted: true,
      details: JSON.stringify({ ni: { points: 10 } }) },
  ];
  render(<GamePage game={catan} corePlayers={players} players={players} gameScores={[]} plays={plays} played={62} isAdmin={false}
    onRecord={() => {}} onSetArt={() => {}} onSetScoring={() => {}} />);
  expect(screen.getByRole('columnheader', { name: 'Setup' })).toBeInTheDocument();
  expect(screen.getAllByText('Cities & Knights').length).toBe(2); // setups table + recent game tag
  expect(screen.getByText('Base game')).toBeInTheDocument();    // setups table only
  expect(screen.getByText('SG 1')).toBeInTheDocument();
});

test('Record a game: factions are a dropdown; a hand-picked winner sticks until reset', () => {
  render(<RecordPlayDialog show onHide={() => {}} games={[tm]} players={players} onSave={() => {}} onAddGuest={() => {}} initialGameId="tm" />);
  const faction = screen.getByLabelText('Faction for SG');
  expect(faction.tagName).toBe('SELECT');
  expect([...faction.options].map(o => o.value)).toContain('Ice Maidens');
  fireEvent.change(screen.getByLabelText('Points for SG'), { target: { value: '142' } });
  fireEvent.change(screen.getByLabelText('Points for NI'), { target: { value: '150' } });
  expect(screen.getByLabelText('NI', { selector: '#wins-ni' })).toBeChecked();
  expect(screen.getByLabelText('SG', { selector: '#wins-sg' })).not.toBeChecked();
  fireEvent.click(screen.getByLabelText('SG', { selector: '#wins-sg' })); // by hand
  fireEvent.change(screen.getByLabelText('Points for MG'), { target: { value: '200' } });
  expect(screen.getByLabelText('MG', { selector: '#wins-mg' })).not.toBeChecked();
  fireEvent.click(screen.getByRole('button', { name: 'Pick the winner from the scores again' }));
  expect(screen.getByLabelText('MG', { selector: '#wins-mg' })).toBeChecked();
  expect(screen.getByLabelText('SG', { selector: '#wins-sg' })).not.toBeChecked();
});
