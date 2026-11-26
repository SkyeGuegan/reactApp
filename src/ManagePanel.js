import React, { useState } from 'react';
import { Form, Button, Tabs, Tab, ListGroup, Dropdown, Row, Col } from 'react-bootstrap';
import { allTimeStats, fmtWins } from './plays';
import ScoreHistory from './ScoreHistory';
import ArtworkDialog, { bggSearchUrl } from './ArtworkDialog';
import EditPlayerDialog from './EditPlayerDialog';

// Admin "Manage" card below the board, in three tabs:
//   Add     — labelled forms for a new game / player (validated here).
//   Roster  — games and players; a ⋯ menu per row with Delete (players: Edit
//             player; games: Set artwork, Scoring details). Admins see
//             players' full names (playerNames: Map id → name) here.
//   Score changes — the ScoreEvent ledger with Void (loads when first opened).
//
// Server work and notices stay in App: onAddGame(name) / onAddPlayer(initials, core, name)
// / onEditPlayer(player, { initials, name }) resolve true on success (so the input clears), onRequestDelete(kind, item)
// opens App's confirmation modal, onSetArt(game, { bggId, imageUrl }) resolves
// true on success.
export default function ManagePanel({
  games, players, gameScores = [],
  onAddGame, onAddPlayer, onEditPlayer, playerNames = new Map(), onRequestDelete, onSetArt, onOpenScoring,
  onVoid, onVoidPlay, plays, lastEvent, lastVoidedId,
}) {
  const [newGame, setNewGame] = useState('');
  const [newPlayer, setNewPlayer] = useState('');
  const [newPlayerCore, setNewPlayerCore] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [gameError, setGameError] = useState('');
  const [playerError, setPlayerError] = useState('');
  const [artGame, setArtGame] = useState(null); // game whose artwork dialog is open
  const [editPlayer, setEditPlayer] = useState(null); // player whose Edit dialog is open

  async function submitGame(e) {
    e.preventDefault();
    const name = newGame.trim();
    if (!name) return;
    if (games.some(g => g.name.toLowerCase() === name.toLowerCase())) {
      setGameError(`"${name}" is already on the board.`);
      return;
    }
    if (await onAddGame(name)) setNewGame('');
  }

  async function submitPlayer(e) {
    e.preventDefault();
    const initials = newPlayer.trim();
    if (!initials) return;
    const clash = players.find(p => p.initials.toLowerCase() === initials.toLowerCase());
    if (clash) {
      const who = playerNames.get(clash.id);
      setPlayerError(`${initials} is already a player${who ? ` (${who})` : ''}. Use different initials, e.g. add a letter.`);
      return;
    }
    if (await onAddPlayer(initials, newPlayerCore, newPlayerName)) { setNewPlayer(''); setNewPlayerCore(false); setNewPlayerName(''); }
  }

  const actionsMenu = (kind, item, label) => (
      <Dropdown align="end">
        <Dropdown.Toggle variant="link" size="sm" className="roster-menu" aria-label={`Actions for ${label}`}>
          ⋯
        </Dropdown.Toggle>
        <Dropdown.Menu>
          {kind === 'player' && onEditPlayer && (
            <Dropdown.Item onClick={() => setEditPlayer(item)}>Edit player…</Dropdown.Item>
          )}
          {kind === 'game' && onSetArt && (
            <Dropdown.Item onClick={() => setArtGame(item)}>Set artwork…</Dropdown.Item>
          )}
          {kind === 'game' && onOpenScoring && (
            <Dropdown.Item onClick={() => onOpenScoring(item)}>Scoring details…</Dropdown.Item>
          )}
          <Dropdown.Item className="text-danger" onClick={() => onRequestDelete(kind, item)}>
            Delete {kind}…
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown>
  );

  const gameRow = (g) => (
    <ListGroup.Item key={g.id} className="d-flex align-items-center justify-content-between py-2">
      <span>{g.name}{!g.imageUrl && <span className="text-muted small ms-2">no artwork</span>}</span>
      {actionsMenu('game', g, g.name)}
    </ListGroup.Item>
  );

  // Players in three groups. Every row: initials (fixed column), full name,
  // then the same all-time numbers as the All games view.
  const stats = new Map(allTimeStats(players, plays || [], games, gameScores).map(r => [r.player.id, r]));
  const statText = (p) => {
    if (p.hidden) return 'admins only';
    const r = stats.get(p.id);
    if (!r) return 'no games yet';
    return `${fmtWins(r.wins)} ${r.wins === 1 ? 'win' : 'wins'} · ${r.played} ${r.played === 1 ? 'game' : 'games'}`;
  };
  const playerRow = (p) => (
    <ListGroup.Item key={p.id} className="roster-player">
      <span className="roster-initials">{p.initials}</span>
      <span className="roster-name">{playerNames.get(p.id) || <span className="text-muted">No full name</span>}</span>
      <span className="roster-stats">{statText(p)}</span>
      {actionsMenu('player', p, p.initials)}
    </ListGroup.Item>
  );
  const playerGroups = [
    ['Regulars', players.filter(p => p.core && !p.hidden)],
    ['Guests', players.filter(p => !p.core && !p.hidden)],
    ['Test', players.filter(p => p.hidden)],
  ].filter(([, list]) => list.length);

  return (
    <section className="manage-card" aria-label="Manage scoreboard">
      <h2 className="manage-title">Manage</h2>
      <Tabs defaultActiveKey="add" id="manage-tabs" className="manage-tabs mb-3" mountOnEnter>
        <Tab eventKey="add" title="Add">
          <Row className="g-4">
            <Col md={6}>
              <Form onSubmit={submitGame} noValidate>
                <Form.Group controlId="new-game">
                  <Form.Label className="fw-semibold">New game</Form.Label>
                  <div className="d-flex gap-2">
                    <Form.Control
                      value={newGame}
                      onChange={e => { setNewGame(e.target.value); setGameError(''); }}
                      placeholder="e.g. Wingspan"
                      isInvalid={!!gameError}
                      aria-describedby="new-game-help"
                    />
                    <Button type="submit" variant="dark" disabled={!newGame.trim()}>Add</Button>
                  </div>
                  {gameError
                    ? <div className="text-danger small mt-1" role="alert">{gameError}</div>
                    : <Form.Text id="new-game-help">Every player starts at 0 in it.</Form.Text>}
                  {newGame.trim() && !gameError && (
                    <div className="small mt-1">
                      <a href={bggSearchUrl(newGame)} target="_blank" rel="noopener noreferrer">Find “{newGame.trim()}” on BoardGameGeek ↗</a>
                      <span className="text-muted"> to check the name and get its box art (add it under Roster → Set artwork).</span>
                    </div>
                  )}
                </Form.Group>
              </Form>
            </Col>
            <Col md={6}>
              <Form onSubmit={submitPlayer} noValidate>
                <Form.Group controlId="new-player">
                  <Form.Label className="fw-semibold">New player</Form.Label>
                  <div className="d-flex gap-2">
                    <Form.Control
                      value={newPlayer}
                      onChange={e => { setNewPlayer(e.target.value.toUpperCase()); setPlayerError(''); }}
                      placeholder="Initials, e.g. AB"
                      maxLength={4}
                      autoCapitalize="characters"
                      isInvalid={!!playerError}
                      aria-describedby="new-player-help"
                    />
                    <Button type="submit" variant="dark" disabled={!newPlayer.trim()}>Add</Button>
                  </div>
                  {playerError
                    ? <div className="text-danger small mt-1" role="alert">{playerError}</div>
                    : <Form.Text id="new-player-help">Up to 4 letters. New players are guests unless ticked below.</Form.Text>}
                  <Form.Control
                    className="mt-2"
                    id="new-player-name"
                    value={newPlayerName}
                    onChange={e => setNewPlayerName(e.target.value)}
                    placeholder="Full name (optional, admins only)"
                    aria-label="Full name"
                  />
                  <Form.Check
                    className="mt-2 small"
                    id="new-player-core"
                    label="Regular player (gets a column on the main table)"
                    checked={newPlayerCore}
                    onChange={e => setNewPlayerCore(e.target.checked)}
                  />
                </Form.Group>
              </Form>
            </Col>
          </Row>
        </Tab>

        <Tab eventKey="roster" title="Roster">
          <Row className="g-4">
            <Col md={6}>
              <h3 className="manage-subtitle">Players <span className="text-muted">({players.length})</span></h3>
              {players.length === 0
                ? <p className="text-muted small">No players yet — add one on the Add tab.</p>
                : playerGroups.map(([title, list]) => (
                  <div key={title} className="roster-group">
                    <div className="roster-group-title">{title}</div>
                    <ListGroup>{list.map(playerRow)}</ListGroup>
                  </div>
                ))}
            </Col>
            <Col md={6}>
              <h3 className="manage-subtitle">Games <span className="text-muted">({games.length})</span></h3>
              {games.length === 0
                ? <p className="text-muted small">No games yet — add one on the Add tab.</p>
                : <ListGroup className="roster-scroll">{games.map(gameRow)}</ListGroup>}
            </Col>
          </Row>
        </Tab>

        <Tab eventKey="history" title="Score changes">
          <ScoreHistory onVoid={onVoid} onVoidPlay={onVoidPlay} plays={plays} lastEvent={lastEvent} lastVoidedId={lastVoidedId} />
        </Tab>
      </Tabs>
      <EditPlayerDialog
        player={editPlayer}
        players={players}
        playerNames={playerNames}
        onHide={() => setEditPlayer(null)}
        onSave={(info) => onEditPlayer(editPlayer, info)}
      />
      <ArtworkDialog game={artGame} onHide={() => setArtGame(null)} onSave={(art) => onSetArt(artGame, art)} />
    </section>
  );
}
