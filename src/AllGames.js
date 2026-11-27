import React, { useState } from 'react';
import { Table, Badge, Button, Modal, ButtonGroup } from 'react-bootstrap';
import { everyoneStats, allTimeStats, fmtWins } from './plays';

import { fmtPlayDate } from './dates';
import { PlayerDetails, PlayerLines } from './Swatch';
import SetupTag from './SetupTag';
const PAGE = 20;

// What voiding a game does, in words, for the confirmation. Only counted games
// are in Played; only a core player's win is on the main table.
export function voidEffect(play, players) {
  if (play.test) return "It's a test game, so nothing else changes.";
  if (!play.counted) return "It wasn't counted on the main table, so no scores or Played counts change.";
  const coreIds = new Set(players.filter(p => p.core && !p.hidden).map(p => p.id));
  const coreWon = play.winnerIds.some(id => coreIds.has(id));
  return coreWon
    ? 'Its win comes off the main table and it drops out of Played.'
    : 'A guest won, so no table wins change; it drops out of Played.';
}

// Secondary view: every recorded game, including ones that don't count on the
// main table (someone missing) and guests' results.
//   - Everyone: games played / wins / win rate per player, either All time
//     (earlier history counts as games between the regulars) or Recorded games.
//   - Recent games: newest first, with who played (plus any scoring details,
//     e.g. "SG (10)") and who won.
// Test plays (hidden test player) are shown to admins only, labelled.
// onVoid(play) is passed for admins; voiding asks for confirmation here.
export default function AllGames({ plays, players, isAdmin, onVoid, games = [], gameScores = [] }) {
  const [shown, setShown] = useState(PAGE);
  const [pending, setPending] = useState(null);
  const [busy, setBusy] = useState(false);
  const [scope, setScope] = useState('all'); // 'all' | 'recorded'

  const byId = new Map(players.map(p => [p.id, p]));
  const name = (id) => (byId.get(id) ? byId.get(id).initials : '?');
  const gameById = new Map(games.map(g => [g.id, g]));
  const visiblePlays = plays
    .filter(p => !p.voided && (isAdmin || !p.test))
    .sort((a, b) => (a.playedAt < b.playedAt ? 1 : a.playedAt > b.playedAt ? -1 : 0));
  const recordedStats = everyoneStats(players, plays);
  const stats = scope === 'all' ? allTimeStats(players, plays, games, gameScores) : recordedStats;
  const realPlays = visiblePlays.filter(p => !p.test);
  const fmtDay = (iso) => fmtPlayDate(iso, isAdmin); // exact day for admins, month for visitors
  const since = realPlays.length ? fmtDay(realPlays[realPlays.length - 1].playedAt) : null;

  async function confirmVoid() {
    setBusy(true);
    try { await onVoid(pending); } finally { setBusy(false); setPending(null); }
  }

  if (!visiblePlays.length) {
    return (
      <p className="p-3 text-muted fst-italic mb-0">
        No games recorded yet. {isAdmin ? 'Use “Record a game” on the Table view after your next game night.' : 'Check back after the next game night.'}
      </p>
    );
  }

  return (
    <div className="p-2 text-start">
      <h2 className="manage-subtitle mt-1">Everyone</h2>
      <ButtonGroup size="sm" className="mb-2" aria-label="Which games to count">
        <Button variant={scope === 'all' ? 'dark' : 'outline-dark'} onClick={() => setScope('all')}>All time</Button>
        <Button variant={scope === 'recorded' ? 'dark' : 'outline-dark'} onClick={() => setScope('recorded')}>Recorded games</Button>
      </ButtonGroup>
      {!stats.length ? (
        <p className="text-muted small mb-4">No real games recorded yet — only test games, which don't count.</p>
      ) : (
      <>
      <p className="text-muted small mb-2">
        {scope === 'all'
          ? <>Every game on the scoreboard. Games before {since} count as games between the regulars (only the winner was kept); later ones are recorded individually, including guests and games where someone was missing.</>
          : <>Only games recorded individually, since {since}, including ones where someone was missing.</>}
      </p>
      <Table size="sm" responsive className="mb-4 all-games-stats">
        <thead><tr><th>Player</th><th className="text-center">Played</th><th className="text-center">Wins</th><th className="text-center">Win rate</th></tr></thead>
        <tbody>
          {stats.map(r => (
            <tr key={r.player.id}>
              <td>{r.player.initials}{!r.player.core && <span className="text-muted small ms-2">guest</span>}</td>
              <td className="text-center">{r.played}</td>
              <td className="text-center">{fmtWins(r.wins)}</td>
              <td className="text-center">{Math.round((r.wins / r.played) * 100)}%</td>
            </tr>
          ))}
        </tbody>
      </Table>
      </>
      )}

      <h2 className="manage-subtitle">Recent games</h2>
      <Table size="sm" responsive className="mb-1 small">
        <thead><tr><th>Date</th><th>Game</th><th>Players</th><th className="d-none d-sm-table-cell">Won</th></tr></thead>
        <tbody>
          {visiblePlays.slice(0, shown).map(p => (
            <tr key={p.id}>
              <td className="text-nowrap">
                {fmtDay(p.playedAt)}
                {p.test && <div><Badge bg="secondary">test</Badge></div>}
                {!p.test && !p.counted && <div><Badge bg="" className="badge-soft" title="Not everyone at the table played, so it doesn't change the main table">not on table</Badge></div>}
                {isAdmin && <div><Button variant="link" size="sm" className="text-danger p-0 small" onClick={() => setPending(p)}>void</Button></div>}
              </td>
              <td>{p.gameName || '?'}<div><SetupTag play={p} game={gameById.get(p.gameId)} /></div></td>
              <td>
                {/* One line per player when factions/scores were noted, else a plain list. */}
                {(gameById.get(p.gameId) && PlayerLines({ play: p, game: gameById.get(p.gameId), label: name }))
                  || p.playerIds.map((id, i) => <React.Fragment key={id}>{i > 0 && ', '}<PlayerDetails play={p} game={gameById.get(p.gameId)} playerId={id} label={p.winnerIds.includes(id) ? <strong>{name(id)}</strong> : name(id)} /></React.Fragment>)}
              </td>
              <td className="fw-semibold d-none d-sm-table-cell">{p.winnerIds.map(name).join(' & ')}</td>
            </tr>
          ))}
        </tbody>
      </Table>
      {visiblePlays.length > shown && (
        <Button variant="link" size="sm" className="p-0" onClick={() => setShown(shown + PAGE)}>Show more ({visiblePlays.length - shown} older)</Button>
      )}

      <Modal show={!!pending} onHide={() => !busy && setPending(null)} centered>
        <Modal.Header closeButton={!busy}><Modal.Title>Void this game?</Modal.Title></Modal.Header>
        <Modal.Body>
          {pending && <>Void <strong>{pending.gameName}</strong> on {fmtDay(pending.playedAt)} (won by {pending.winnerIds.map(name).join(' & ')})?
            {' '}{voidEffect(pending, players)} The record is kept, marked voided.</>}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" disabled={busy} onClick={() => setPending(null)}>Cancel</Button>
          <Button variant="danger" disabled={busy} onClick={confirmVoid}>{busy ? 'Voiding…' : 'Void game'}</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
