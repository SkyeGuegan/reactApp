import React, { useState } from 'react';
import { Form, Button, Tabs, Tab, ListGroup, Dropdown, Row, Col, Badge } from 'react-bootstrap';
import ScoreHistory from './ScoreHistory';
import ArtworkDialog from './ArtworkDialog';

// Admin "Manage" card below the board, in three tabs:
//   Add     — labelled forms for a new game / player (validated here).
//   Roster  — games and players; a ⋯ menu per row with Delete (and, for
//             games, Set artwork).
//   History — the ScoreEvent ledger with Void (loads when first opened).
//
// Server work and notices stay in App: onAddGame(name) / onAddPlayer(initials, core)
// resolve true on success (so the input clears), onRequestDelete(kind, item)
// opens App's confirmation modal, onSetArt(game, { bggId, imageUrl }) resolves
// true on success.
export default function ManagePanel({
  games, players, playerTotals,
  onAddGame, onAddPlayer, onRequestDelete, onSetArt,
  onVoid, lastEvent, lastVoidedId,
}) {
  const [newGame, setNewGame] = useState('');
  const [newPlayer, setNewPlayer] = useState('');
  const [newPlayerCore, setNewPlayerCore] = useState(false);
  const [gameError, setGameError] = useState('');
  const [playerError, setPlayerError] = useState('');
  const [artGame, setArtGame] = useState(null); // game whose artwork dialog is open

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
    if (players.some(p => p.initials.toLowerCase() === initials.toLowerCase())) {
      setPlayerError(`${initials} is already a player.`);
      return;
    }
    if (await onAddPlayer(initials, newPlayerCore)) { setNewPlayer(''); setNewPlayerCore(false); }
  }

  const rosterRow = (kind, item, label, detail, badge) => (
    <ListGroup.Item key={item.id} className="d-flex align-items-center justify-content-between py-2">
      <span>
        {label}
        {badge}
        {detail && <span className="text-muted small ms-2">{detail}</span>}
      </span>
      <Dropdown align="end">
        <Dropdown.Toggle variant="link" size="sm" className="roster-menu text-secondary" aria-label={`Actions for ${label}`}>
          ⋯
        </Dropdown.Toggle>
        <Dropdown.Menu>
          {kind === 'game' && onSetArt && (
            <Dropdown.Item onClick={() => setArtGame(item)}>Set artwork…</Dropdown.Item>
          )}
          <Dropdown.Item className="text-danger" onClick={() => onRequestDelete(kind, item)}>
            Delete {kind}…
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown>
    </ListGroup.Item>
  );

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
                : (
                  <ListGroup>
                    {players.map(p => {
                      if (p.hidden) return rosterRow('player', p, p.initials, 'hidden from everyone but admins', <Badge bg="secondary" className="ms-2">test</Badge>);
                      if (!p.core) return rosterRow('player', p, p.initials, null, <Badge bg="light" text="dark" className="ms-2">guest</Badge>);
                      const wins = playerTotals.get(p.id) || 0;
                      return rosterRow('player', p, p.initials, `${wins} ${wins === 1 ? 'win' : 'wins'}`);
                    })}
                  </ListGroup>
                )}
            </Col>
            <Col md={6}>
              <h3 className="manage-subtitle">Games <span className="text-muted">({games.length})</span></h3>
              {games.length === 0
                ? <p className="text-muted small">No games yet — add one on the Add tab.</p>
                : <ListGroup className="roster-scroll">{games.map(g => rosterRow('game', g, g.name, g.imageUrl ? null : 'no artwork'))}</ListGroup>}
            </Col>
          </Row>
        </Tab>

        <Tab eventKey="history" title="History">
          <ScoreHistory onVoid={onVoid} lastEvent={lastEvent} lastVoidedId={lastVoidedId} />
        </Tab>
      </Tabs>
      <ArtworkDialog game={artGame} onHide={() => setArtGame(null)} onSave={(art) => onSetArt(artGame, art)} />
    </section>
  );
}
