import React, { useEffect, useState } from 'react';
import { Modal, Form, Button, Badge } from 'react-bootstrap';
import { corePlayers, classifyPlay, winShares, fmtWins } from './plays';
import { fieldsOf, cleanDetails, bestPlayers, winnerRuleLabel, optionsOf, hasColors, takenChoices, GAME_KEY } from './scoring';
import { ChoicePicker } from './Swatch';

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
// players). The footer explains whether the game will count on the main scoreboard.
// If the game collects scoring details, optional inputs ask for them: game-level
// ones first (e.g. Catan expansions, as tappable covers), then a grid per player
// (points, faction…).
// onSave({ gameId, playedAt, playerIds, winnerIds, details, allPlayers }) resolves
// truthy on success; onAddGuest(initials, name) resolves to the new player.
// playerNames (Map id → full name, admin-only) shows on hover and in clashes.
// plays (recorded games) decide which guests show up front: the ones who play
// this game most, then most overall; everyone else is behind "More players".
export const FRONT_GUESTS = 3;
export function guestOrder(guests, plays, gameId) {
  const score = new Map(guests.map(g => [g.id, { here: 0, all: 0, last: '' }]));
  for (const p of plays) {
    if (p.voided || p.test) continue;
    for (const id of p.playerIds) {
      const s = score.get(id);
      if (!s) continue;
      s.all += 1;
      if (p.gameId === gameId) s.here += 1;
      if (p.playedAt > s.last) s.last = p.playedAt;
    }
  }
  return [...guests].sort((a, b) => {
    const x = score.get(a.id), y = score.get(b.id);
    return y.here - x.here || y.all - x.all || (x.last < y.last ? 1 : x.last > y.last ? -1 : 0) || a.initials.localeCompare(b.initials);
  }).map(g => ({ player: g, played: score.get(g.id).all }));
}

export default function RecordPlayDialog({ show, onHide, games, players, plays = [], onSave, onAddGuest, playerNames = new Map(), initialGameId = '' }) {
  const [gameId, setGameId] = useState('');
  const [date, setDate] = useState(todayLocal());
  const [playing, setPlaying] = useState(new Set());
  const [winners, setWinners] = useState(new Set());
  // Winners follow the scores (highest points, or the game's rule) until the
  // admin ticks or unticks someone by hand.
  const [winnersByHand, setWinnersByHand] = useState(false);
  const [guest, setGuest] = useState('');
  const [guestName, setGuestName] = useState('');
  const [guestError, setGuestError] = useState('');
  const [extraPlayers, setExtraPlayers] = useState([]); // guests added in this dialog
  const [showAllPlayers, setShowAllPlayers] = useState(false);
  const [showNewGuest, setShowNewGuest] = useState(false);
  const [busy, setBusy] = useState(false);
  const [rawDetails, setRawDetails] = useState({}); // { playerId: { key: string } }

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
    setGameId(initialGameId || '');
    setDate(todayLocal());
    setPlaying(new Set(coreIds ? coreIds.split(',') : []));
    setWinners(new Set());
    setWinnersByHand(false);
    setGuest('');
    setGuestError('');
    setExtraPlayers([]);
    setShowAllPlayers(false);
    setShowNewGuest(false);
    setRawDetails({});
    setBusy(false);
  }, [show, coreIds, initialGameId]);

  // Details belong to one game's fields; start over when the game changes.
  useEffect(() => { setRawDetails({}); setWinnersByHand(false); }, [gameId]);

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
    const clash = allPlayers.find(p => p.initials.toUpperCase() === initials);
    if (clash) {
      const who = playerNames.get(clash.id);
      setGuestError(`${initials} is already a player${who ? ` (${who})` : ''} — tick them above, or use different initials for someone new.`);
      return;
    }
    setBusy(true);
    try {
      const p = await onAddGuest(initials, guestName);
      if (p) {
        setExtraPlayers(prev => [...prev, p]);
        setPlaying(prev => new Set(prev).add(p.id));
        setGuest('');
        setGuestName('');
      }
    } finally {
      setBusy(false);
    }
  }

  const selectedGame = games.find(g => g.id === gameId) || null;
  const fields = fieldsOf(selectedGame);
  const pFields = fields.filter(fl => fl.scope !== 'game');
  const gFields = fields.filter(fl => fl.scope === 'game');
  const hasNumber = pFields.some(fl => fl.type === 'number');
  const setDetail = (pid, key, value) => setRawDetails(prev => ({ ...prev, [pid]: { ...(prev[pid] || {}), [key]: value } }));
  const gameValue = (key) => (rawDetails[GAME_KEY] || {})[key];
  const togglePick = (key, name) => {
    const cur = [].concat(gameValue(key) || []);
    setDetail(GAME_KEY, key, cur.includes(name) ? cur.filter(n => n !== name) : [...cur, name]);
  };

  const playerIds = ordered.filter(p => playing.has(p.id)).map(p => p.id);
  const winnerIds = playerIds.filter(id => winners.has(id));
  const { counted, test, missing } = classifyPlay(playerIds, allPlayers);
  const shares = counted ? winShares(winnerIds, allPlayers) : [];
  const canSave = gameId && date && playerIds.length >= 1 && winnerIds.length >= 1 && !busy;

  // Default the winner from the scores entered so far.
  const scoreWinners = hasNumber ? bestPlayers(cleanDetails(rawDetails, fields, playerIds), pFields, playerIds) : [];
  const scoreWinnersKey = scoreWinners.join(',');
  useEffect(() => {
    if (!winnersByHand && hasNumber) setWinners(new Set(scoreWinnersKey ? scoreWinnersKey.split(',') : []));
  }, [scoreWinnersKey, winnersByHand, hasNumber]);
  const autoPicked = !winnersByHand && scoreWinners.length > 0;

  let status;
  if (test) status = <><Badge bg="secondary">test</Badge> Only admins will see this game; it won't affect any scores.</>;
  else if (!counted) status = <>Won't count on the main scoreboard — {missing.join(', ')} didn't play. It still shows in the Game log and on the game's page.</>;
  else if (!winnerIds.length) status = <>Counts on the main scoreboard. Pick the winner.</>;
  else if (!shares.length) status = <>Counts as a game played. A guest won, so no table wins change.</>;
  else {
    const byId = new Map(allPlayers.map(p => [p.id, p.initials]));
    status = <>Counts on the main scoreboard: {shares.map(s => `${byId.get(s.playerId)} +${fmtWins(s.share)}`).join(', ')}.</>;
  }

  async function save() {
    setBusy(true);
    const details = cleanDetails(rawDetails, fields, playerIds);
    const ok = await onSave({ gameId, playedAt: toPlayedAt(date), playerIds, winnerIds, details, allPlayers });
    setBusy(false);
    if (ok) onHide();
  }

  // Guests up front: the few who play this game most (plus anyone ticked or
  // just added); the rest and the test player are folded away.
  const ranked = guestOrder(others.filter(p => !p.hidden), plays, gameId);
  // While the full list is open the order stays put; ticked players move up
  // front only once it's folded again.
  const promoted = (id) => !showAllPlayers && playing.has(id);
  const isFront = (r, i) => (i < FRONT_GUESTS && r.played > 0) || promoted(r.player.id) || extraPlayers.some(x => x.id === r.player.id);
  const testers = others.filter(p => p.hidden);
  const front = [...ranked.filter(isFront).map(r => r.player), ...testers.filter(p => promoted(p.id))];
  const folded = [...ranked.filter((r, i) => !isFront(r, i)).map(r => r.player), ...testers.filter(p => !promoted(p.id))];

  const playerCheck = (p) => (
    <Form.Check
      key={p.id}
      inline
      type="checkbox"
      id={`plays-${p.id}`}
      title={playerNames.get(p.id)}
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
          {front.length > 0 && <div className="mt-1">{front.map(playerCheck)}</div>}
          {showAllPlayers && folded.length > 0 && <div className="mt-1">{folded.map(playerCheck)}</div>}
          <div className="d-flex flex-wrap gap-3 mt-1 small">
            {folded.length > 0 && (
              <Button variant="link" size="sm" className="p-0" aria-expanded={showAllPlayers} onClick={() => setShowAllPlayers(v => !v)}>
                {showAllPlayers ? 'Fewer players' : `More players (${folded.length})`}
              </Button>
            )}
            {!showNewGuest && (
              <Button variant="link" size="sm" className="p-0" onClick={() => setShowNewGuest(true)}>＋ New guest</Button>
            )}
          </div>
          {showNewGuest && <div className="d-flex flex-wrap gap-2 mt-2">
            <Form.Control
              size="sm"
              value={guest}
              onChange={e => { setGuest(e.target.value.toUpperCase()); setGuestError(''); }}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addGuest(); } }}
              placeholder="New guest's initials"
              maxLength={4}
              aria-label="New guest's initials"
              style={{ maxWidth: 140 }}
            />
            <Form.Control
              size="sm"
              value={guestName}
              onChange={e => setGuestName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addGuest(); } }}
              placeholder="Full name (optional)"
              aria-label="New guest's full name"
              style={{ maxWidth: 200 }}
            />
            <Button size="sm" variant="outline-secondary" disabled={!guest.trim() || busy} onClick={addGuest}>Add guest</Button>
          </div>}
          {guestError && <div className="text-danger small mt-1" role="alert">{guestError}</div>}
        </fieldset>

        {gFields.map(fl => {
          const opts = optionsOf(fl);
          return (
            <fieldset key={fl.key} className="mb-3">
              <legend className="fs-6 fw-semibold mb-1">{fl.label} <span className="fw-normal text-muted small">(optional{fl.multi && fl.emptyLabel ? `; none = ${fl.emptyLabel.toLowerCase()}` : ''})</span></legend>
              {fl.multi && opts.length ? (
                <div className="option-picks">
                  {opts.map(o => {
                    const on = [].concat(gameValue(fl.key) || []).includes(o.name);
                    return (
                      <button
                        key={o.name}
                        type="button"
                        className={`option-pick ${on ? 'on' : ''}`}
                        aria-pressed={on}
                        aria-label={o.name}
                        onClick={() => togglePick(fl.key, o.name)}
                      >
                        {o.imageUrl && <img src={o.imageUrl} alt="" referrerPolicy="no-referrer" onError={e => { e.currentTarget.style.display = 'none'; }} />}
                        <span>{o.name}</span>
                      </button>
                    );
                  })}
                </div>
              ) : opts.length ? (
                <Form.Select size="sm" value={gameValue(fl.key) || ''} onChange={e => setDetail(GAME_KEY, fl.key, e.target.value)} aria-label={fl.label} style={{ maxWidth: 260 }}>
                  <option value="">—</option>
                  {opts.map(o => <option key={o.name} value={o.name}>{o.name}</option>)}
                </Form.Select>
              ) : (
                <Form.Control
                  size="sm"
                  type={fl.type === 'number' ? 'number' : 'text'}
                  value={gameValue(fl.key) || ''}
                  onChange={e => setDetail(GAME_KEY, fl.key, e.target.value)}
                  aria-label={fl.label}
                  style={{ maxWidth: 260 }}
                />
              )}
            </fieldset>
          );
        })}

        {pFields.length > 0 && playerIds.length > 0 && (
          <fieldset className="mb-3">
            <legend className="fs-6 fw-semibold mb-1">Details <span className="fw-normal text-muted small">(optional)</span></legend>
            <table className="details-grid">
              <thead>
                <tr><th />{pFields.map(fl => <th key={fl.key}>{fl.label}{fl.lowWins && <span className="fw-normal text-muted"> (low wins)</span>}</th>)}</tr>
              </thead>
              <tbody>
                {ordered.filter(p => playing.has(p.id)).map(p => (
                  <tr key={p.id}>
                    <th scope="row">{p.initials}</th>
                    {pFields.map(fl => (
                      <td key={fl.key}>
                        {fl.type === 'text' && hasColors(fl) ? (
                          <ChoicePicker
                            field={fl}
                            value={(rawDetails[p.id] && rawDetails[p.id][fl.key]) || ''}
                            onChange={v => setDetail(p.id, fl.key, v)}
                            taken={takenChoices(fl, rawDetails, p.id, playerIds)}
                            label={`${fl.label} for ${p.initials}`}
                          />
                        ) : fl.type === 'text' && optionsOf(fl).length ? (
                          <Form.Select
                            size="sm"
                            value={(rawDetails[p.id] && rawDetails[p.id][fl.key]) || ''}
                            onChange={e => setDetail(p.id, fl.key, e.target.value)}
                            aria-label={`${fl.label} for ${p.initials}`}
                          >
                            <option value="">—</option>
                            {optionsOf(fl).map(o => {
                              const taken = takenChoices(fl, rawDetails, p.id, playerIds);
                              return <option key={o.name} value={o.name} disabled={taken.has(o.name)}>{o.name}</option>;
                            })}
                          </Form.Select>
                        ) : (
                          <Form.Control
                            size="sm"
                            type={fl.type === 'number' ? 'number' : 'text'}
                            inputMode={fl.type === 'number' ? 'decimal' : undefined}
                            value={(rawDetails[p.id] && rawDetails[p.id][fl.key]) || ''}
                            onChange={e => setDetail(p.id, fl.key, e.target.value)}
                            aria-label={`${fl.label} for ${p.initials}`}
                          />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {hasNumber && winnersByHand && (
              <Button size="sm" variant="link" className="p-0 mt-1" onClick={() => setWinnersByHand(false)}>
                Pick the winner from the scores again
              </Button>
            )}
          </fieldset>
        )}

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
                onChange={() => { setWinnersByHand(true); toggle(winners, setWinners, p.id); }}
              />
            ))}
          <div className="form-text">
            {autoPicked && <>Picked from the {winnerRuleLabel(pFields)}. Tick or untick to change. </>}
            Tick more than one for a shared win; the win is split evenly.
          </div>
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
