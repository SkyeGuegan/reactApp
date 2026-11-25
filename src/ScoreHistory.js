import React, { useState, useEffect } from 'react';
import { Button, Badge, Modal, Spinner, Table } from 'react-bootstrap';
import { fetchAllPages } from './api';
import { listScoreEvents } from './graphql/customQueries';
import { sortNewestFirst, formatDelta } from './history';

const PAGE = 25;

const fmtTime = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
};

// Admin-only list of recent score changes (the ScoreEvent ledger), newest
// first, with a Void action for bogus entries. Events are fetched lazily when
// the panel is opened. `onVoid(event)` reverses the event (see useScoreboard);
// `lastEvent` is the newest event logged this session, prepended while open.
export default function ScoreHistory({ onVoid, lastEvent }) {
  const [open, setOpen] = useState(false);
  const [events, setEvents] = useState(null); // null = not loaded yet
  const [error, setError] = useState('');
  const [shown, setShown] = useState(PAGE);
  const [pending, setPending] = useState(null); // event awaiting confirmation
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || events) return undefined;
    let active = true;
    fetchAllPages(listScoreEvents, 'listScoreEvents')
      .then(items => { if (active) setEvents(sortNewestFirst(items)); })
      .catch(err => {
        console.error('Failed to load score history', err);
        if (active) setError("Couldn't load the score history.");
      });
    return () => { active = false; };
  }, [open, events]);

  // Show changes made after the list loaded. Skip ones already present (e.g. an
  // event logged just before the fetch returned it).
  useEffect(() => {
    if (!lastEvent) return;
    setEvents(prev => (prev && !prev.some(e => e.id === lastEvent.id) ? [lastEvent, ...prev] : prev));
  }, [lastEvent]);

  async function confirmVoid() {
    const event = pending;
    setBusy(true);
    setError('');
    try {
      await onVoid(event);
      setEvents(prev => prev.map(e => (e.id === event.id ? { ...e, voided: true } : e)));
    } catch (err) {
      console.error('Failed to void event', err);
      setError('Couldn\'t void that change — it may already have been voided. Reopen the history to refresh.');
    } finally {
      setBusy(false);
      setPending(null);
    }
  }

  if (!open) {
    return (
      <div className="mb-3">
        <Button variant="outline-dark" size="sm" onClick={() => setOpen(true)}>Show score history</Button>
      </div>
    );
  }

  return (
    <div className="mb-3">
      <div className="d-flex align-items-center justify-content-between mb-2">
        <strong>Score history</strong>
        <Button variant="link" size="sm" className="p-0" onClick={() => { setOpen(false); setEvents(null); setShown(PAGE); setError(''); }}>
          Hide
        </Button>
      </div>
      {error && <div className="text-danger small mb-2">{error}</div>}
      {!events && !error && <Spinner animation="border" size="sm" role="status"><span className="visually-hidden">Loading...</span></Spinner>}
      {events && events.length === 0 && <span className="text-muted">No score changes yet.</span>}
      {events && events.length > 0 && (
        <>
          <Table size="sm" responsive className="mb-1 small">
            <thead>
              <tr><th>When</th><th>Game</th><th>Player</th><th>Change</th><th>By</th><th /></tr>
            </thead>
            <tbody>
              {events.slice(0, shown).map(e => (
                <tr key={e.id} className={e.voided ? 'text-muted' : undefined}>
                  <td>{fmtTime(e.createdAt)}</td>
                  <td>{e.voided ? <s>{e.gameName || '?'}</s> : (e.gameName || '?')}</td>
                  <td>{e.playerInitials || '?'}</td>
                  <td>{formatDelta(e.delta)}</td>
                  <td>{e.recordedBy || ''}</td>
                  <td className="text-end">
                    {e.voided
                      ? <Badge bg="light" text="dark">voided</Badge>
                      : <Button variant="link" size="sm" className="text-danger p-0" onClick={() => setPending(e)}>void</Button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
          {events.length > shown && (
            <Button variant="link" size="sm" className="p-0" onClick={() => setShown(shown + PAGE)}>
              Show more ({events.length - shown} older)
            </Button>
          )}
        </>
      )}

      <Modal show={!!pending} onHide={() => !busy && setPending(null)} centered>
        <Modal.Header closeButton={!busy}>
          <Modal.Title>Void score change</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {pending && (
            <>
              Void <strong>{formatDelta(pending.delta)}</strong> for <strong>{pending.playerInitials || '?'}</strong> in{' '}
              <strong>{pending.gameName || '?'}</strong> ({fmtTime(pending.createdAt)})? Their total goes back by{' '}
              {formatDelta(-pending.delta)} and the change is removed from Trends. The record is kept, marked voided.
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" disabled={busy} onClick={() => setPending(null)}>Cancel</Button>
          <Button variant="danger" disabled={busy} onClick={confirmVoid}>{busy ? 'Voiding…' : 'Void'}</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
