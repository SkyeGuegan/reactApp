import React, { useEffect, useState } from 'react';
import { Modal, Form, Button, Badge } from 'react-bootstrap';
import { corePlayers, classifyPlay, winShares, fmtWins } from './plays';

const todayLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// Store a picked calendar date as noon local time, so it never slips a day
// when shown in another timezone. Today keeps the current time.
const toPlayedAt = (ymd) => {
  if (ymd === todayLocal()) return new Date().toISOString();
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d, 12).toISOString();
};

// Admin dialog for recording one game: which game, when, who played, who won.
// Core players start ticked. Guests can be added inline (saved as non-core
// players). The footer explains whether the game will count on the main table.
// onSave({ gameId, playedAt, playerIds, winnerIds, allPlayers }) resolves
// truthy on success; onAddGuest(initials) resolves to the new player.
export default function RecordPlayDialog({ show, onHide, games, players, onSave, onAddGuest }) {
  const [gameId, setGameId] = useState('');
  const [date, setDate] = useState(todayLocal());
  const [playing, setPlaying] = useState(new Set());
  const [winners, setWinners] = useState(new Set());
  const [guest, setGuest] = useState('');
  const [guestError, setGuestError] = useState('');
  const [extraPlayers, setExtraPlayers] = useState([]); // guests added in this dialog
  const [busy, setBusy] = useState(false);

  const allPlayers = [...players, ...extraPlayers.filter(x => !players.some(p => p.id === x.id))];
  const core = corePlayers(allPlayers);
  const coreIds = core.map(p => p.id).join(',');
  const others = allPlayers
    .filter(p => !core.some(c => c.id === p.id))
    .sort((a, b) => (a.hidden === b.hidden ? a.initials.localeCompare(b.initials) : a.hidden ? 1 : -1));
  // Display order everywhere in the dialog (and the saved playerIds): regulars,
  // then guests, then the test player.
  const ordered = [...core, ...others];

  // Fresh form each time it opens: core players ticked, nobody winning yet.
  useEffect(() => {
    if (!show) return;
    setGameId('');
    setDate(todayLocal());
    setPlaying(new Set(coreIds ? coreIds.split(',') : []));
    setWinners(new Set());
    setGuest('');
    setGuestError('');
    setExtraPlayers([]);
    setBusy(false);
  }, [show, coreIds]);

  const toggle = (set, setter, id) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id); else next.add(id);
    setter(next);
  };
  const togglePlaying = (id) => {
    toggle(playing, setPlaying, id);
    if (playing.has(id) && winners.has(id)) toggle(winners, setWinners, id); // can't win if not playing
  };

  async function addGuest() {
    const initials = guest.trim().toUpperCase();
    if (!initials) return;
    if (allPlayers.some(p => p.initials.toUpperCase() === initials)) {
      setGuestError(`${initials} is already a player — tick them above.`);
      return;
    }
    setBusy(true);
    try {
      const p = await onAddGuest(initials);
      if (p) {
        setExtraPlayers(prev => [...prev, p]);
        setPlaying(prev => new Set(prev).add(p.id));
        setGuest('');
      }
    } finally {
      setBusy(false);
    }
  }

  const playerIds = ordered.filter(p => playing.has(p.id)).map(p => p.id);
  const winnerIds = playerIds.filter(id => winners.has(id));
  const { counted, test, missing } = classifyPlay(playerIds, allPlayers);
  const shares = counted ? winShares(winnerIds, allPlayers) : [];
  const canSave = gameId && date && playerIds.length >= 1 && winnerIds.length >= 1 && !busy;

  let status;
  if (test) status = <><Badge bg="secondary">test</Badge> Only admins will see this game; it won't affect any scores.</>;
  else if (!counted) status = <>Won't count on the main table — {missing.join(', ')} didn't play. It still shows under All games.</>;
  else if (!winnerIds.length) status = <>Counts on the main table. Pick the winner.</>;
  else if (!shares.length) status = <>Counts as a game played. A guest won, so no table wins change.</>;
  else {
    const byId = new Map(allPlayers.map(p => [p.id, p.initials]));
    status = <>Counts on the main table: {shares.map(s => `${byId.get(s.playerId)} +${fmtWins(s.share)}`).join(', ')}.</>;
  }

  async function save() {
    setBusy(true);
    const ok = await onSave({ gameId, playedAt: toPlayedAt(date), playerIds, winnerIds, allPlayers });
    setBusy(false);
    if (ok) onHide();
  }

  const playerCheck = (p) => (
    <Form.Check
      key={p.id}
      inline
      type="checkbox"
      id={`plays-${p.id}`}
      label={<>{p.initials}{p.hidden && <Badge bg="secondary" className="ms-1">test</Badge>}</>}
      checked={playing.has(p.id)}
      onChange={() => togglePlaying(p.id)}
    />
  );

  return (
    <Modal show={show} onHide={() => !busy && onHide()} centered>
      <Modal.Header closeButton={!busy}>
        <Modal.Title>Record a game</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="d-flex gap-3 mb-3">
          <Form.Group controlId="play-game" className="flex-grow-1">
            <Form.Label className="fw-semibold">Game</Form.Label>
            <Form.Select value={gameId} onChange={e => setGameId(e.target.value)}>
              <option value="">Choose a game…</option>
              {[...games].sort((a, b) => a.name.localeCompare(b.name)).map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </Form.Select>
          </Form.Group>
          <Form.Group controlId="play-date">
            <Form.Label className="fw-semibold">Date</Form.Label>
            <Form.Control type="date" value={date} max={todayLocal()} onChange={e => setDate(e.target.value)} />
          </Form.Group>
        </div>

        <fieldset className="mb-3">
          <legend className="fs-6 fw-semibold mb-1">Who played</legend>
          <div>{core.map(playerCheck)}</div>
          {others.length > 0 && <div className="mt-1">{others.map(playerCheck)}</div>}
          <div className="d-flex gap-2 mt-2">
            <Form.Control
              size="sm"
              value={guest}
              onChange={e => { setGuest(e.target.value.toUpperCase()); setGuestError(''); }}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addGuest(); } }}
              placeholder="New guest's initials"
              maxLength={4}
              aria-label="New guest's initials"
              style={{ maxWidth: 200 }}
            />
            <Button size="sm" variant="outline-secondary" disabled={!guest.trim() || busy} onClick={addGuest}>Add guest</Button>
          </div>
          {guestError && <div className="text-danger small mt-1" role="alert">{guestError}</div>}
        </fieldset>

        <fieldset>
          <legend className="fs-6 fw-semibold mb-1">Who won</legend>
          {playerIds.length === 0
            ? <span className="text-muted small">Tick who played first.</span>
            : ordered.filter(p => playing.has(p.id)).map(p => (
              <Form.Check
                key={p.id}
                inline
                type="checkbox"
                id={`wins-${p.id}`}
                label={p.initials}
                checked={winners.has(p.id)}
                onChange={() => toggle(winners, setWinners, p.id)}
              />
            ))}
          <div className="form-text">Tick more than one for a shared win; the win is split evenly.</div>
        </fieldset>

        <div className={`play-status mt-3 ${counted && !test ? 'counts' : ''}`} role="status">{status}</div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" disabled={busy} onClick={onHide}>Cancel</Button>
        <Button variant="dark" disabled={!canSave} onClick={save}>{busy ? 'Saving…' : 'Save game'}</Button>
      </Modal.Footer>
    </Modal>
  );
}
