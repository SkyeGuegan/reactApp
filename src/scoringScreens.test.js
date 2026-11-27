import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import RecordPlayDialog, { guestOrder } from './RecordPlayDialog';
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
  expect(screen.getAllByText('Witches').length).toBeGreaterThan(0);
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

const tmColours = { id: 'tm', name: 'Terra Mystica', scoreFields: JSON.stringify(SUGGESTED['terra mystica']) };
const picker = (label) => within(screen.getByLabelText(label).closest('.choice-picker'));

test('Record a game: colour-chip factions, one player per colour', async () => {
  const onSave = jest.fn(() => Promise.resolve(true));
  render(<RecordPlayDialog show onHide={() => {}} games={[tmColours]} players={players} onSave={onSave} onAddGuest={() => {}} initialGameId="tm" />);
  fireEvent.click(picker('Faction for SG').getByRole('button', { name: 'Witches' }));
  expect(screen.getByLabelText('Faction for SG')).toHaveTextContent('Witches');
  // Green (forest) is SG's now: both green factions are greyed out for MG.
  expect(picker('Faction for MG').getByRole('button', { name: 'Auren' })).toHaveAttribute('aria-disabled', 'true');
  expect(picker('Faction for MG').getByRole('button', { name: 'Witches' })).toHaveAttribute('aria-disabled', 'true');
  expect(picker('Faction for MG').getByRole('button', { name: 'Ice Maidens' })).not.toHaveAttribute('aria-disabled', 'true');
  fireEvent.click(picker('Faction for MG').getByRole('button', { name: 'Yetis' }));
  fireEvent.change(screen.getByLabelText('Points for SG'), { target: { value: '142' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save game' }));
  await waitFor(() => expect(onSave).toHaveBeenCalled());
  expect(onSave.mock.calls[0][0].details).toEqual({ sg: { faction: 'Witches', points: 142 }, mg: { faction: 'Yetis' } });
});

test('Record a game: a hand-picked winner sticks until reset', () => {
  render(<RecordPlayDialog show onHide={() => {}} games={[tm]} players={players} onSave={() => {}} onAddGuest={() => {}} initialGameId="tm" />);
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

test('Game page: faction colours show as dots in stats and recent games', () => {
  const plays = [{ id: 'p1', gameId: 'tm', playedAt: '2026-11-20T12:00:00Z', playerIds: ['sg', 'mg', 'ni'], winnerIds: ['sg'], counted: true,
    details: JSON.stringify({ sg: { faction: 'Witches', points: 142 }, ni: { faction: 'Ice Maidens', points: 120 } }) }];
  const { container } = render(<GamePage game={{ ...tmColours, baselinePlays: 0 }} corePlayers={players} players={players} gameScores={[]} plays={plays} played={1} isAdmin={false}
    onRecord={() => {}} onSetArt={() => {}} onSetScoring={() => {}} />);
  const dots = [...container.querySelectorAll('.swatch')].map(s => s.style.background);
  expect(dots.filter(b => b.includes('46, 139, 61') || b === '#2e8b3d').length).toBe(4); // Witches: faction table, by player (most played, most wins), recent game
  expect(screen.getByText(/SG \(Witches, 142\), MG, NI \(Ice Maidens, 120\)/)).toBeInTheDocument();
});

test('Game page: faction table with online rates, by-player table, player-count filter', () => {
  const plays = [
    { id: 'p1', gameId: 'tm', playedAt: '2026-11-20T12:00:00Z', playerIds: ['sg', 'mg', 'ni'], winnerIds: ['sg'], counted: true,
      details: JSON.stringify({ sg: { faction: 'Witches', points: 142 }, mg: { faction: 'Nomads', points: 120 }, ni: { faction: 'Ice Maidens', points: 100 } }) },
    { id: 'p2', gameId: 'tm', playedAt: '2026-11-21T12:00:00Z', playerIds: ['sg', 'mg'], winnerIds: ['mg'], counted: false,
      details: JSON.stringify({ sg: { faction: 'Nomads', points: 90 }, mg: { faction: 'Witches', points: 110 } }) },
  ];
  render(<GamePage game={{ ...tmColours, baselinePlays: 0 }} corePlayers={players} players={players} gameScores={[]} plays={plays} played={1} isAdmin={false}
    onRecord={() => {}} onSetArt={() => {}} onSetScoring={() => {}} />);
  const witches = screen.getAllByRole('row').find(r => r.textContent.startsWith('Witches'));
  // Games 2, wins 2, 100%, online 27%, avg place 1.0, avg 126, vs table +16, best 142 SG
  expect([...witches.cells].map(c => c.textContent)).toEqual(['Witches', '2', '2', '100%', '27%', '1.0', '126', '+16', '142 SG']);
  const sg = screen.getAllByRole('row').find(r => r.cells[0] && r.cells[0].textContent === 'SG' && r.cells.length === 8);
  expect(sg.textContent).toContain('Witches ×1');
  fireEvent.click(screen.getByRole('button', { name: '2p' }));
  expect(screen.getAllByRole('row').find(r => r.textContent.startsWith('Witches')).cells[1].textContent).toBe('1');
  expect(screen.getAllByRole('row').some(r => r.cells[0] && r.cells[0].textContent === 'Ice Maidens')).toBe(false);
});

describe('Who played: frequent guests up front, the rest folded', () => {
  const g = (id, extra = {}) => ({ id, initials: id.toUpperCase(), core: false, ...extra });
  const guests = [g('aa'), g('bb'), g('cc'), g('dd'), g('ee')];
  const everyone = [...players, ...guests, g('test', { hidden: true })];
  const pl = (gameId, ids, playedAt = '2026-01-01T00:00:00Z', extra = {}) => ({ id: Math.random().toString(), gameId, playerIds: ids, winnerIds: [], playedAt, ...extra });
  const plays = [
    pl('tm', ['sg', 'dd']), pl('tm', ['sg', 'dd']),
    pl('other', ['sg', 'aa']), pl('other', ['sg', 'aa']), pl('other', ['sg', 'aa']),
    pl('other', ['sg', 'bb'], '2026-02-01T00:00:00Z'),
    pl('tm', ['sg', 'cc'], '2026-03-01T00:00:00Z', { voided: true }),
  ];

  test('guestOrder: this game first, then most played overall, then most recent', () => {
    expect(guestOrder(guests, plays, 'tm').map(r => r.player.id)).toEqual(['dd', 'aa', 'bb', 'cc', 'ee']);
    expect(guestOrder(guests, plays, '').map(r => r.player.id)).toEqual(['aa', 'dd', 'bb', 'cc', 'ee']);
  });

  test('dialog shows regulars + top 3 guests; More players reveals the rest and TEST', () => {
    render(<RecordPlayDialog show onHide={() => {}} games={[tm]} players={everyone} plays={plays} onSave={() => {}} onAddGuest={() => {}} initialGameId="tm" />);
    const who = () => within(screen.getByRole('group', { name: 'Who played' }));
    for (const i of ['SG', 'MG', 'NI', 'DD', 'AA', 'BB']) expect(who().getByLabelText(i)).toBeInTheDocument();
    expect(who().queryByLabelText('CC')).not.toBeInTheDocument(); // voided play doesn't count
    expect(who().queryByLabelText(/TEST/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText("New guest's initials")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'More players (3)' }));
    expect(who().getByLabelText('CC')).toBeInTheDocument();
    expect(who().getByLabelText(/TEST/)).toBeInTheDocument();
    // a ticked folded player stays up front after folding again
    fireEvent.click(who().getByLabelText('EE'));
    fireEvent.click(screen.getByRole('button', { name: 'Fewer players' }));
    expect(who().getByLabelText('EE')).toBeChecked();
    expect(who().queryByLabelText('CC')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '＋ New guest' }));
    expect(screen.getByLabelText("New guest's initials")).toBeInTheDocument();
  });
});

test('Game page: standings show games played; Terra Mystica links to outside guides', () => {
  render(<GamePage game={{ ...tmColours, baselinePlays: 0 }} corePlayers={players} players={players} gameScores={[{ gameId: 'tm', playerId: 'sg', score: 3 }]} plays={[]} played={5} isAdmin={false}
    onRecord={() => {}} onSetArt={() => {}} onSetScoring={() => {}} />);
  const sg = screen.getAllByRole('row').find(r => r.cells[0] && r.cells[0].textContent.startsWith('SG'));
  expect([...sg.cells].slice(1, 4).map(c => c.textContent)).toEqual(['5', '3', '60%']);
  expect(screen.getByRole('link', { name: 'Faction stats ↗' })).toHaveAttribute('href', 'https://terra.snellman.net/stats/');
  expect(screen.getByRole('link', { name: /Faction strategy/ })).toHaveAttribute('href', expect.stringContaining('gaming-strategy.com'));
});
