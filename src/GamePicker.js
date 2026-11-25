import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Form, Badge } from 'react-bootstrap';
import { lastPlayedByGame, pickWeights, pickWeighted, wheelSegments, spinRotation } from './picker';

const STORE_KEY = 'scoreboard-picker';
const SPIN_MS = 4200;
const COLORS = ['#8a6d18', '#2c7be5', '#d6336c', '#2fb344', '#9b51e0', '#e8590c', '#0ca678', '#5c636a'];

function loadSaved() {
  try { return JSON.parse(window.localStorage.getItem(STORE_KEY)) || {}; } catch { return {}; }
}
function save(state) {
  try { window.localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch { /* fine */ }
}
const prefersReducedMotion = () =>
  !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

// SVG path for a pie slice from a0 to a1 degrees (clockwise from the top).
function slicePath(a0, a1, r = 100) {
  if (a1 - a0 >= 359.999) return `M 0 ${-r} A ${r} ${r} 0 1 1 0 ${r} A ${r} ${r} 0 1 1 0 ${-r} Z`;
  const p = (a) => [r * Math.sin((a * Math.PI) / 180), -r * Math.cos((a * Math.PI) / 180)];
  const [x0, y0] = p(a0); const [x1, y1] = p(a1);
  return `M 0 0 L ${x0} ${y0} A ${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1} ${y1} Z`;
}
const short = (s) => (s.length > 14 ? `${s.slice(0, 13)}…` : s);

// "Pick a game": choose a pool (board games and/or new games typed in), spin a
// wheel, get a game. Slices are sized by each game's odds, so with "favour
// games we haven't played lately" the wheel visibly shows the weighting.
// Anyone can use it (it changes no data). Admins can record the picked game, or
// add a typed-in game to the board. The pool is remembered on this device.
export default function GamePicker({ games, plays, isAdmin, onRecord, onAddGame }) {
  const saved = useMemo(loadSaved, []);
  const [selected, setSelected] = useState(() => new Set(saved.selected || []));
  // Games the picker has already offered; anything new joins the wheel once.
  const knownRef = useRef(new Set(saved.known || []));
  const [extras, setExtras] = useState(saved.extras || []);
  const [favorStale, setFavorStale] = useState(!!saved.favorStale);
  const [newName, setNewName] = useState('');
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState(null); // entry key
  const reduced = prefersReducedMotion();

  // Games not seen before (all of them on a first visit, then newly added
  // board games) join the wheel once; games you've unticked stay off.
  useEffect(() => {
    const added = games.map(g => g.id).filter(id => !knownRef.current.has(id));
    if (!added.length) return;
    added.forEach(id => knownRef.current.add(id));
    setSelected(prev => new Set([...prev, ...added]));
  }, [games]);

  useEffect(() => {
    save({ selected: [...selected], extras, favorStale, known: [...knownRef.current] });
  }, [selected, extras, favorStale, games]);

  const sortedGames = useMemo(() => [...games].sort((a, b) => a.name.localeCompare(b.name)), [games]);
  const boardNames = new Set(games.map(g => g.name.toLowerCase()));
  // A typed-in name that has since been added to the board becomes that game.
  const liveExtras = extras.filter(n => !boardNames.has(n.toLowerCase()));

  const entries = [
    ...sortedGames.filter(g => selected.has(g.id)).map(g => ({ key: g.id, gameId: g.id, name: g.name, game: g })),
    ...liveExtras.map(n => ({ key: `new:${n}`, name: n, isNew: true })),
  ];
  const lastPlayed = useMemo(() => lastPlayedByGame(plays), [plays]);
  const weights = pickWeights(entries, { favorStale, lastPlayed });
  const segments = wheelSegments(weights);
  const total = weights.reduce((a, w) => a + w, 0);
  const picked = entries.find(e => e.key === result) || null;

  function spin() {
    if (spinning || entries.length === 0) return;
    const i = pickWeighted(weights);
    setResult(null);
    const next = spinRotation(rotation, segments[i]);
    if (reduced) {
      setRotation(next);
      setResult(entries[i].key);
      return;
    }
    setSpinning(true);
    setRotation(next);
    window.setTimeout(() => { setSpinning(false); setResult(entries[i].key); }, SPIN_MS);
  }

  function removePicked() {
    if (!picked) return;
    if (picked.isNew) setExtras(prev => prev.filter(n => `new:${n}` !== picked.key));
    else setSelected(prev => { const s = new Set(prev); s.delete(picked.gameId); return s; });
    setResult(null);
  }

  function addExtra(e) {
    e.preventDefault();
    const n = newName.trim();
    if (!n) return;
    const match = games.find(g => g.name.toLowerCase() === n.toLowerCase());
    if (match) setSelected(prev => new Set(prev).add(match.id));
    else if (!extras.some(x => x.toLowerCase() === n.toLowerCase())) setExtras(prev => [...prev, n]);
    setNewName('');
  }

  const toggle = (id) => setSelected(prev => { const s = new Set(prev); if (s.has(id)) s.delete(id); else s.add(id); return s; });

  return (
    <div className="picker text-start">
      <div className="picker-layout">
        <div className="picker-wheel-col">
          <div className="wheel-wrap">
            <div className="wheel-pointer" aria-hidden="true" />
            <svg
              className="wheel"
              viewBox="-104 -104 208 208"
              role="img"
              aria-label={entries.length ? `Wheel with ${entries.length} games` : 'Empty wheel'}
              style={{ transform: `rotate(${rotation}deg)`, transition: spinning ? `transform ${SPIN_MS}ms cubic-bezier(0.12, 0.7, 0.12, 1)` : 'none' }}
            >
              {entries.length === 0
                ? <circle r="100" fill="var(--soft-bg)" />
                : entries.map((e, i) => {
                  const { start, end } = segments[i];
                  const mid = (start + end) / 2;
                  const span = end - start;
                  return (
                    <g key={e.key}>
                      <path d={slicePath(start, end)} fill={COLORS[i % COLORS.length]} stroke="var(--card-bg)" strokeWidth="1" />
                      {span >= 9 && (
                        <text
                          // Labels on the left half would be upside down; flip them in place.
                          transform={`rotate(${mid - 90}) translate(58 0)${mid > 180 ? ' rotate(180)' : ''}`}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fill="#fff"
                          fontSize={span < 16 ? 6.5 : 8}
                          fontWeight="600"
                        >
                          {short(e.name)}
                        </text>
                      )}
                    </g>
                  );
                })}
              <circle r="14" fill="var(--card-bg)" stroke="var(--divider)" />
            </svg>
          </div>
          <div className="text-center mt-3">
            <Button variant="dark" size="lg" onClick={spin} disabled={spinning || entries.length === 0}>
              {spinning ? 'Spinning…' : result ? 'Spin again' : 'Spin'}
            </Button>
          </div>

          <div className="picker-result mt-3" aria-live="polite">
            {picked && !spinning && (
              <>
                {picked.game && picked.game.imageUrl && <img className="picker-result-art" src={picked.game.imageUrl} alt="" referrerPolicy="no-referrer" />}
                <div>
                  <div className="picker-result-label">Let's play</div>
                  <div className="picker-result-name">{picked.name}{picked.isNew && <Badge bg="secondary" className="ms-2 align-middle">new</Badge>}</div>
                  <div className="d-flex flex-wrap gap-2 mt-2">
                    <Button size="sm" variant="outline-secondary" onClick={removePicked}>Remove from wheel</Button>
                    {isAdmin && picked.game && <Button size="sm" variant="dark" onClick={() => onRecord(picked.gameId)}>＋ Record this game</Button>}
                    {isAdmin && picked.isNew && <Button size="sm" variant="dark" onClick={() => onAddGame(picked.name)}>Add to the board</Button>}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="picker-pool-col">
          <div className="d-flex align-items-center justify-content-between mb-2">
            <h3 className="manage-subtitle mb-0">Games on the wheel <span className="text-muted">({entries.length})</span></h3>
            <div className="d-flex gap-2">
              <Button size="sm" variant="link" className="p-0" onClick={() => setSelected(new Set(games.map(g => g.id)))}>All</Button>
              <Button size="sm" variant="link" className="p-0" onClick={() => setSelected(new Set())}>None</Button>
            </div>
          </div>
          <Form.Check
            type="switch"
            id="favor-stale"
            className="small mb-2"
            label="Favour games we haven't played lately"
            checked={favorStale}
            onChange={e => setFavorStale(e.target.checked)}
          />
          {favorStale && (
            <p className="text-muted small mb-2">Bigger slice = longer since it was last recorded. Games without a recorded game yet count as a while ago.</p>
          )}
          <div className="picker-pool">
            {sortedGames.map(g => {
              const i = entries.findIndex(e => e.gameId === g.id);
              return (
                <label key={g.id} className={`picker-item${selected.has(g.id) ? ' on' : ''}`}>
                  <input type="checkbox" checked={selected.has(g.id)} onChange={() => toggle(g.id)} disabled={spinning} />
                  {g.imageUrl ? <img src={g.imageUrl} alt="" referrerPolicy="no-referrer" /> : <span className="picker-noart" />}
                  <span className="flex-grow-1">{g.name}</span>
                  {favorStale && i >= 0 && <span className="text-muted small">{Math.round((weights[i] / total) * 100)}%</span>}
                </label>
              );
            })}
            {liveExtras.map(n => {
              const i = entries.findIndex(e => e.key === `new:${n}`);
              return (
                <div key={n} className="picker-item on">
                  <Badge bg="secondary">new</Badge>
                  <span className="flex-grow-1">{n}</span>
                  {favorStale && i >= 0 && <span className="text-muted small">{Math.round((weights[i] / total) * 100)}%</span>}
                  <button type="button" className="btn-close btn-sm" aria-label={`Remove ${n}`} onClick={() => setExtras(prev => prev.filter(x => x !== n))} disabled={spinning} />
                </div>
              );
            })}
          </div>
          <Form onSubmit={addExtra} className="d-flex gap-2 mt-2">
            <Form.Control size="sm" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Add a game not on the board" aria-label="Add a game to the wheel" />
            <Button size="sm" variant="outline-secondary" type="submit" disabled={!newName.trim()}>Add</Button>
          </Form>
        </div>
      </div>
    </div>
  );
}
