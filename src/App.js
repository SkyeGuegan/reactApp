import React, { useState } from 'react';
import './App.css';
import { Authenticator, useAuthenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import { Form, InputGroup, Button, ButtonGroup, Badge, Modal } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import TableComponent from './tableComponent';
import TrendsChart from './TrendsChart';
import useScoreboard from './useScoreboard';

// Key for looking up the GameScore cell at (game, player).
const scoreKey = (gameId, playerId) => `${gameId}#${playerId}`;

const byName = (a, b) => a.name.toUpperCase().localeCompare(b.name.toUpperCase());
const byInitials = (a, b) => a.initials.toUpperCase().localeCompare(b.initials.toUpperCase());

function Scoreboard() {
    const { user, authStatus, signOut } = useAuthenticator((context) => [context.user, context.authStatus]);
    const { games, players, gameScores, loading, addGame, addPlayer, increment, deleteGame, deletePlayer } = useScoreboard(user);
    const [showSignIn, setShowSignIn] = useState(false);
    const [view, setView] = useState('table'); // 'table' | 'trends'
    const [newGame, setNewGame] = useState('');
    const [newPlayer, setNewPlayer] = useState('');
    const [gameError, setGameError] = useState('');
    const [playerError, setPlayerError] = useState('');
    // { kind: 'game' | 'player', item } when a delete is awaiting confirmation.
    const [pendingDelete, setPendingDelete] = useState(null);

    const isAuthenticated = authStatus === 'authenticated' && user;
    const isAdmin = isAuthenticated && user.username === 'sguegan';

    // Validate (non-empty, no duplicate) then delegate the server work to the hook.
    async function submitGame() {
      const name = newGame.trim();
      if (!name) return;
      if (games.some(g => g.name.toLowerCase() === name.toLowerCase())) {
        setGameError(`Game "${name}" already exists.`);
        return;
      }
      setGameError('');
      await addGame(name);
      setNewGame('');
    }

    async function submitPlayer() {
      const initials = newPlayer.trim();
      if (!initials) return;
      if (players.some(p => p.initials.toLowerCase() === initials.toLowerCase())) {
        setPlayerError(`Player "${initials}" already exists.`);
        return;
      }
      setPlayerError('');
      await addPlayer(initials);
      setNewPlayer('');
    }

    function handleClick() {
      setShowSignIn((prev) => !prev);
    }

    // Run the delete the modal was confirming, then close it.
    function confirmDelete() {
      if (!pendingDelete) return;
      const { kind, item } = pendingDelete;
      setPendingDelete(null);
      if (kind === 'game') deleteGame(item);
      else deletePlayer(item);
    }

    const sortedGames = [...games].sort(byName);
    // Order player columns by total wins (descending) so the leader sits leftmost;
    // fall back to initials for ties / players with no scores yet.
    const playerTotals = new Map(players.map(p => [p.id, 0]));
    gameScores.forEach(gs => {
      if (playerTotals.has(gs.playerId)) {
        playerTotals.set(gs.playerId, playerTotals.get(gs.playerId) + gs.score);
      }
    });
    const sortedPlayers = [...players].sort((a, b) => {
      const diff = playerTotals.get(b.id) - playerTotals.get(a.id);
      return diff !== 0 ? diff : byInitials(a, b);
    });
    const scoreLookup = new Map(gameScores.map(gs => [scoreKey(gs.gameId, gs.playerId), gs]));

  return (
    <div className="App">
      <header className="App-header">
      <h1>The Scoreboard</h1>
      <div className="header-action">
      {isAuthenticated
      ? <>
          <span>Hello, {user.username}</span>
          <Button variant="outline-light" size="sm" onClick={() => { signOut(); setShowSignIn(false); }}>Sign Out</Button>
        </>
      : <Button variant="outline-light" size="sm" onClick={handleClick}>{showSignIn ? "Back to Table" : "Sign IN"}</Button>
      }
      </div>
      </header>
      {(!showSignIn || isAuthenticated)
      ?
      <>
      <div style={{ textAlign: 'center', marginTop: 16 }}>
        <ButtonGroup size="sm">
          <Button variant={view === 'table' ? 'dark' : 'outline-dark'} onClick={() => setView('table')}>Table</Button>
          <Button variant={view === 'trends' ? 'dark' : 'outline-dark'} onClick={() => setView('trends')}>Trends</Button>
        </ButtonGroup>
      </div>
      <div className="board-card">
      {view === 'table'
        ? <TableComponent
            games={sortedGames}
            players={sortedPlayers}
            gameScores={gameScores}
            loading={loading}
          />
        : <TrendsChart />}
      </div>
      </>
      :
      <div className="signin-wrap">
      <Authenticator hideSignUp />
      </div>
      }
      {isAdmin
      ?
      <div style={{ maxWidth: 640, margin: '20px auto', textAlign: 'left', padding: '0 12px' }}>
          <Form className="mb-2" onSubmit={e => { e.preventDefault(); submitGame(); }}>
            <InputGroup>
              <Form.Control
                value={newGame}
                onChange={e => { setNewGame(e.target.value); setGameError(''); }}
                placeholder="New game name"
                isInvalid={!!gameError}
              />
              <Button type="submit" disabled={!newGame.trim()}>Add Game</Button>
            </InputGroup>
            {gameError && <div className="text-danger small mt-1">{gameError}</div>}
          </Form>

          <Form className="mb-3" onSubmit={e => { e.preventDefault(); submitPlayer(); }}>
            <InputGroup>
              <Form.Control
                value={newPlayer}
                onChange={e => { setNewPlayer(e.target.value); setPlayerError(''); }}
                placeholder="New player initials"
                isInvalid={!!playerError}
              />
              <Button type="submit" disabled={!newPlayer.trim()}>Add Player</Button>
            </InputGroup>
            {playerError && <div className="text-danger small mt-1">{playerError}</div>}
          </Form>

          <div className="mb-3">
            <strong className="me-2">Players:</strong>
            {sortedPlayers.length === 0 && <span className="text-muted">none yet</span>}
            {sortedPlayers.map(player => (
              <span key={player.id} className="me-3">
                <Badge bg="secondary">{player.initials}</Badge>
                <Button
                  variant="link"
                  size="sm"
                  className="text-danger p-0 ms-1"
                  onClick={() => setPendingDelete({ kind: 'player', item: player })}
                >
                  remove
                </Button>
              </span>
            ))}
          </div>

          <div className="mb-3">
            {sortedGames.map(game => (
              <div key={game.id} className="mb-2 pb-2 border-bottom">
                <div className="d-flex align-items-center justify-content-between">
                  <strong>{game.name}</strong>
                  <Button
                    variant="outline-danger"
                    size="sm"
                    onClick={() => setPendingDelete({ kind: 'game', item: game })}
                  >
                    Delete
                  </Button>
                </div>
                <div className="mt-1">
                {sortedPlayers.map(player => {
                  const cell = scoreLookup.get(scoreKey(game.id, player.id));
                  if (!cell) return null;
                  return (
                    <span key={player.id} className="me-3 d-inline-block mb-1">
                      {player.initials}:
                      <Button variant="outline-secondary" size="sm" className="ms-1" onClick={() => increment(cell, -1)}>−</Button>
                      <span className="mx-2">{cell.score}</span>
                      <Button variant="outline-secondary" size="sm" onClick={() => increment(cell, 1)}>+</Button>
                    </span>
                  );
                })}
                </div>
              </div>
            ))}
          </div>
      </div>
      : isAuthenticated
          ? <h3>Hello, {user.username} you are not authorized to enter data</h3>
          : null
      }

      <Modal show={!!pendingDelete} onHide={() => setPendingDelete(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Confirm delete</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {pendingDelete && pendingDelete.kind === 'game' && (
            <>Delete game <strong>{pendingDelete.item.name}</strong> and all of its scores? This can't be undone.</>
          )}
          {pendingDelete && pendingDelete.kind === 'player' && (
            <>Delete player <strong>{pendingDelete.item.initials}</strong> and all of their scores? This can't be undone.</>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setPendingDelete(null)}>Cancel</Button>
          <Button variant="danger" onClick={confirmDelete}>Delete</Button>
        </Modal.Footer>
      </Modal>
      </div>
  );
}

function App() {
  return (
    <Authenticator.Provider>
      <Scoreboard />
    </Authenticator.Provider>
  );
}

export default App;
