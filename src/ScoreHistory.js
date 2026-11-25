import React, { useState, useEffect } from 'react';
import { Button, Badge, Modal, Spinner, Table, Form } from 'react-bootstrap';
import { fetchAllPages } from './api';
import { listScoreEvents } from './graphql/customQueries';
import { sortNewestFirst, formatDelta } from './history';

const PAGE = 25;

const fmtTime = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
};
const fmtDay = (iso) => new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' });

// Rows written by scripts rather than people: the generated pre-June-2026
// history and the original migration totals. Hidden unless asked for.
export const isGenerated = (e) => e.recordedBy === 'backfill' || e.recordedBy === 'migration';

// Admin-only "Score changes": the ScoreEvent ledger, newest first — every +/-
// to a table score, from recorded games, the edit buttons, and corrections.
// (The list of games played lives in All games / Recent games.)
//   - A win that came from a recorded game shows that game, and voiding it
//     voids the whole game (onVoidPlay), so the game list and the scores never
//     disagree.
//   - Other changes void individually (onVoid reverses the score).
//   - Generated history is hidden behind a toggle.
// Events load when this mounts (the Manage card's tab mounts it on first open);
// `lastEvent` / `lastVoidedId` keep an open list in sync with changes elsewhere.
export default function ScoreHistory({ onVoid, onVoidPlay, plays = [], lastEvent, lastVoidedId }) {
  const [events, setEvents] = useState(null); // null = not loaded yet
  const [error, setError] = useState('');
  const [shown, setShown] = useState(PAGE);
  const [showGenerated, setShowGenerated] = useState(false);
  const [pending, setPending] = useState(null); // { event, play? } awaiting confirmation
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (events) return undefined;
    let active = true;
    fetchAllPages(listScoreEvents, 'listScoreEvents')
      .then(items => { if (active) setEvents(sortNewestFirst(items)); })
      .catch(err => {
        console.error('Failed to load score history', err);
        if (active) setError("Couldn't load the score changes.");
      });
    return () => { active = false; };
  }, [events]);

  // Show changes made after the list loaded. Skip ones already present.
  useEffect(() => {
    if (!lastEvent) return;
    setEvents(prev => (prev && !prev.some(e => e.id === lastEvent.id) ? [lastEvent, ...prev] : prev));
  }, [lastEvent]);

  // Reflect voids made elsewhere (e.g. Undo on a score notice).
  useEffect(() => {
    if (!lastVoidedId) return;
    setEvents(prev => (prev ? prev.map(e => (e.id === lastVoidedId ? { ...e, voided: true } : e)) : prev));
  }, [lastVoidedId]);

  const playById = new Map(plays.map(p => [p.id, p]));
  const playOf = (e) => (e.playId ? playById.get(e.playId) : null);
  const generatedCount = events ? events.filter(isGenerated).length : 0;
  const visible = events ? events.filter(e => showGenerated || !isGenerated(e)) : [];

  async function confirmVoid() {
    const { event, play } = pending;
    setBusy(true);
    setError('');
    try {
      if (play) {
        await onVoidPlay(play);
        setEvents(prev => prev.map(e => (e.playId === play.id ? { ...e, voided: true } : e)));
      } else {
        await onVoid(event);
        setEvents(prev => prev.map(e => (e.id === event.id ? { ...e, voided: true } : e)));
      }
    } catch (err) {
      console.error('Failed to void', err);
      setError(err.userMessage || 'Couldn\'t void that — it may already have been voided. Click Refresh to reload.');
    } finally {
      setBusy(false);
      setPending(null);
    }
  }

  const askVoid = (e) => {
    const play = playOf(e);
    setPending({ event: e, play: play && !play.voided ? play : null });
  };

  return (
    <div className="mb-3">
      <div className="d-flex align-items-start justify-content-between gap-3 mb-2">
        <span className="text-muted small">
          Every change to a table score, newest first — from recorded games, the edit buttons, and corrections.
          Voiding reverses a change and keeps the record. The list of games played is under All games.
        </span>
        <Button variant="outline-secondary" size="sm" className="flex-none" disabled={!events && !error} onClick={() => { setEvents(null); setShown(PAGE); setError(''); }}>
          Refresh
        </Button>
      </div>
      {events && generatedCount > 0 && (
        <Form.Check
          type="switch"
          id="show-generated"
          className="small mb-2"
          label={`Show generated history (${generatedCount})`}
          checked={showGenerated}
          onChange={e => { setShowGenerated(e.target.checked); setShown(PAGE); }}
        />
      )}
      {error && <div className="text-danger small mb-2">{error}</div>}
      {!events && !error && <Spinner animation="border" size="sm" role="status"><span className="visually-hidden">Loading...</span></Spinner>}
      {events && visible.length === 0 && <span className="text-muted small">No score changes yet{generatedCount ? ' (apart from generated history)' : ''}.</span>}
      {visible.length > 0 && (
        <>
          <Table size="sm" responsive className="mb-1 small">
            <thead>
              <tr><th>When</th><th>Game</th><th>Player</th><th>Change</th><th className="d-none d-sm-table-cell">By</th><th /></tr>
            </thead>
            <tbody>
              {visible.slice(0, shown).map(e => {
                const play = playOf(e);
                return (
                  <tr key={e.id} className={e.voided ? 'text-muted' : undefined}>
                    <td className="text-nowrap">{fmtTime(e.occurredAt || e.createdAt)}</td>
                    <td>
                      {e.voided ? <s>{e.gameName || '?'}</s> : (e.gameName || '?')}
                      {play && <span className="d-block text-muted" style={{ fontSize: '0.75rem' }}>from recorded game, {fmtDay(play.playedAt)}</span>}
                    </td>
                    <td>{e.playerInitials || '?'}</td>
                    <td>{formatDelta(e.delta)}</td>
                    <td className="d-none d-sm-table-cell">{isGenerated(e) ? <span className="text-muted">generated</span> : (e.recordedBy || '')}</td>
                    <td className="text-end">
                      {e.voided
                        ? <Badge bg="light" text="dark">voided</Badge>
                        : <Button variant="link" size="sm" className="text-danger p-0" onClick={() => askVoid(e)}>{play ? 'void game' : 'void'}</Button>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
          {visible.length > shown && (
            <Button variant="link" size="sm" className="p-0" onClick={() => setShown(shown + PAGE)}>
              Show more ({visible.length - shown} older)
            </Button>
          )}
        </>
      )}

      <Modal show={!!pending} onHide={() => !busy && setPending(null)} centered>
        <Modal.Header closeButton={!busy}>
          <Modal.Title>{pending && pending.play ? 'Void this game?' : 'Void score change'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {pending && pending.play && (
            <>
              This win is part of the recorded <strong>{pending.play.gameName}</strong> game on {fmtDay(pending.play.playedAt)}.
              Voiding it voids <strong>the whole game</strong>: its win comes off the board, and the game drops out of
              Played and Recent games. The records are kept, marked voided.
            </>
          )}
          {pending && !pending.play && (
            <>
              Void <strong>{formatDelta(pending.event.delta)}</strong> for <strong>{pending.event.playerInitials || '?'}</strong> in{' '}
              <strong>{pending.event.gameName || '?'}</strong> ({fmtTime(pending.event.createdAt)})? Their total goes back by{' '}
              {formatDelta(-pending.event.delta)} and the change is removed from Trends. The record is kept, marked voided.
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" disabled={busy} onClick={() => setPending(null)}>Cancel</Button>
          <Button variant="danger" disabled={busy} onClick={confirmVoid}>{busy ? 'Voiding…' : (pending && pending.play ? 'Void game' : 'Void')}</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
