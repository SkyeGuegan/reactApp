import React, { useState } from 'react';
import { Table, Badge, Button, Modal } from 'react-bootstrap';
import { gameHref } from './route';

import { fmtPlayDate } from './dates';
import { PlayerDetails, PlayerLines } from './Swatch';
import SetupTag from './SetupTag';
const PAGE = 20;

// What voiding a game does, in words, for the confirmation. Only games on the
// main scoreboard are in Played; only a regular's win is on it.
export function voidEffect(play, players) {
  if (play.test) return "It's a test game, so nothing else changes.";
  if (!play.counted) return "It wasn't on the main scoreboard, so no scores or Played counts change.";
  const coreIds = new Set(players.filter(p => p.core && !p.hidden).map(p => p.id));
  const coreWon = play.winnerIds.some(id => coreIds.has(id));
  return coreWon
    ? 'Its win comes off the main scoreboard and it drops out of Played.'
    : 'A guest won, so no table wins change; it drops out of Played.';
}

// The Game log: every recorded game, newest first, including ones not on the
// main scoreboard (a regular missing) and guests' results — who played (one
// line each with any faction/score), who won. Test plays (hidden test player)
// are shown to admins only, labelled. onVoid(play) is passed for admins; this
// is the one place to undo a recorded game, and it asks first.
export default function AllGames({ plays, players, isAdmin, onVoid, games = [] }) {
  const [shown, setShown] = useState(PAGE);
  const [pending, setPending] = useState(null);
  const [busy, setBusy] = useState(false);

  const byId = new Map(players.map(p => [p.id, p]));
  const name = (id) => (byId.get(id) ? byId.get(id).initials : '?');
  const gameById = new Map(games.map(g => [g.id, g]));
  const visiblePlays = plays
    .filter(p => !p.voided && (isAdmin || !p.test))
    .sort((a, b) => (a.playedAt < b.playedAt ? 1 : a.playedAt > b.playedAt ? -1 : 0));
  const fmtDay = (iso) => fmtPlayDate(iso, isAdmin); // exact day for admins, month for visitors

  async function confirmVoid() {
    setBusy(true);
    try { await onVoid(pending); } finally { setBusy(false); setPending(null); }
  }

  if (!visiblePlays.length) {
    return (
      <p className="p-3 text-muted fst-italic mb-0">
        No games recorded yet. {isAdmin ? 'Use “Record a game” at the top after your next game night.' : 'Check back after the next game night.'}
      </p>
    );
  }

  return (
    <div className="p-2 text-start">
      <h2 className="manage-subtitle mt-1">Game log <span className="text-muted">({visiblePlays.length})</span></h2>
      <Table size="sm" responsive className="mb-1 small">
        <thead><tr><th>Date</th><th>Game</th><th>Players</th><th className="d-none d-sm-table-cell">Won</th></tr></thead>
        <tbody>
          {visiblePlays.slice(0, shown).map(p => (
            <tr key={p.id}>
              <td className="text-nowrap">
                {fmtDay(p.playedAt)}
                {p.test && <div><Badge bg="secondary">test</Badge></div>}
                {!p.test && !p.counted && <div><Badge bg="" className="badge-soft" title="A regular didn't play, so it doesn't change the main scoreboard">not on scoreboard</Badge></div>}
                {isAdmin && <div><Button variant="link" size="sm" className="text-danger p-0 small" onClick={() => setPending(p)}>void</Button></div>}
              </td>
              <td>{gameById.get(p.gameId) ? <a className="game-link" href={gameHref(gameById.get(p.gameId))}>{p.gameName}</a> : (p.gameName || '?')}<div><SetupTag play={p} game={gameById.get(p.gameId)} /></div></td>
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
