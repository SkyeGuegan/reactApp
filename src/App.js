import React, { useState, useEffect } from 'react';
import './App.css';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/api';
import { Authenticator, useAuthenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import { Form, InputGroup, Button, Badge, Modal } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import { listGames, listPlayers, listGameScores } from './graphql/customQueries';
import {
  createGame as createGameMutation,
  deleteGame as deleteGameMutation,
  createPlayer as createPlayerMutation,
  deletePlayer as deletePlayerMutation,
  createGameScore as createGameScoreMutation,
  deleteGameScore as deleteGameScoreMutation,
  incrementScore as incrementScoreMutation,
  createScoreEvent as createScoreEventMutation,
} from './graphql/customMutations';
import TableComponent from './tableComponent';
import awsconfig from './aws-exports';

// The Cognito Identity Pool (guest/IAM credentials) is unused: this app uses
// only apiKey (public reads) and userPool (writes/sign-in). Removing it from the
// runtime config prevents 400s from guest-credential fetches on load, since the
// pool has unauthenticated access disabled.
const amplifyConfig = { ...awsconfig };
delete amplifyConfig.aws_cognito_identity_pool_id;
Amplify.configure(amplifyConfig);
const client = generateClient();

// Key for looking up the GameScore cell at (game, player).
const scoreKey = (gameId, playerId) => `${gameId}#${playerId}`;

const byName = (a, b) => a.name.toUpperCase().localeCompare(b.name.toUpperCase());
const byInitials = (a, b) => a.initials.toUpperCase().localeCompare(b.initials.toUpperCase());

// Fetch every page of a list query — rows (= games × players) can exceed the
// 100-item default. Public read uses the API key explicitly (see amplify-js#12710).
async function fetchAllPages(query, field) {
  const items = [];
  let nextToken = null;
  do {
    const res = await client.graphql({ query, authMode: 'apiKey', variables: { limit: 1000, nextToken } });
    const conn = res.data[field];
    items.push(...conn.items);
    nextToken = conn.nextToken;
  } while (nextToken);
  return items;
}

function Scoreboard() {
    const { user, authStatus, signOut } = useAuthenticator((context) => [context.user, context.authStatus]);
    const [showSignIn, setShowSignIn] = useState(false);
    const [games, setGames] = useState([]);
    const [players, setPlayers] = useState([]);
    const [gameScores, setGameScores] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newGame, setNewGame] = useState('');
    const [newPlayer, setNewPlayer] = useState('');
    const [gameError, setGameError] = useState('');
    const [playerError, setPlayerError] = useState('');
    // { kind: 'game' | 'player', item } when a delete is awaiting confirmation.
    const [pendingDelete, setPendingDelete] = useState(null);

    const isAuthenticated = authStatus === 'authenticated' && user;
    const isAdmin = isAuthenticated && user.username === 'sguegan';

    useEffect(() => {
      fetchBoard();
    }, []);

    async function fetchBoard() {
      try {
        const [g, p, gs] = await Promise.all([
          fetchAllPages(listGames, 'listGames'),
          fetchAllPages(listPlayers, 'listPlayers'),
          fetchAllPages(listGameScores, 'listGameScores'),
        ]);
        setGames(g);
        setPlayers(p);
        setGameScores(gs);
      } catch (err) {
        console.error('Failed to load scoreboard', err);
      } finally {
        setLoading(false);
      }
    }

    // Add a player by initials and zero-fill them across every existing game.
    async function addPlayer() {
      const initials = newPlayer.trim();
      if (!initials) return;
      if (players.some(p => p.initials.toLowerCase() === initials.toLowerCase())) {
        setPlayerError(`Player "${initials}" already exists.`);
        return;
      }
      setPlayerError('');
      try {
        const res = await client.graphql({ query: createPlayerMutation, variables: { input: { initials } }, authMode: 'userPool' });
        const player = res.data.createPlayer;
        const created = await Promise.all(games.map(game =>
          client.graphql({ query: createGameScoreMutation, variables: { input: { gameId: game.id, playerId: player.id, score: 0 } }, authMode: 'userPool' })
            .then(r => r.data.createGameScore)
        ));
        setPlayers([...players, player]);
        setGameScores([...gameScores, ...created]);
        setNewPlayer('');
      } catch (err) {
        console.error('Failed to add player', err);
      }
    }

    // Add a game and start every existing player at 0 in it.
    async function addGame() {
      const name = newGame.trim();
      if (!name) return;
      if (games.some(g => g.name.toLowerCase() === name.toLowerCase())) {
        setGameError(`Game "${name}" already exists.`);
        return;
      }
      setGameError('');
      try {
        const res = await client.graphql({ query: createGameMutation, variables: { input: { name } }, authMode: 'userPool' });
        const game = res.data.createGame;
        const created = await Promise.all(players.map(player =>
          client.graphql({ query: createGameScoreMutation, variables: { input: { gameId: game.id, playerId: player.id, score: 0 } }, authMode: 'userPool' })
            .then(r => r.data.createGameScore)
        ));
        setGames([...games, game]);
        setGameScores([...gameScores, ...created]);
        setNewGame('');
      } catch (err) {
        console.error('Failed to add game', err);
      }
    }

    async function increment(cell, delta) {
      // Optimistically reflect the change, keep the old list for rollback.
      const previous = gameScores;
      setGameScores(gameScores.map(gs => (gs.id === cell.id ? { ...gs, score: gs.score + delta } : gs)));
      try {
        // Atomic, server-side increment — no read-modify-write, so concurrent
        // edits no longer clobber each other. Reconcile to the authoritative value.
        const res = await client.graphql({ query: incrementScoreMutation, variables: { id: cell.id, delta }, authMode: 'userPool' });
        const updated = res.data.incrementScore;
        setGameScores(prev => prev.map(gs => (gs.id === updated.id ? { ...gs, score: updated.score } : gs)));
        // Append an immutable history row (fire-and-forget). The score change
        // already succeeded, so a failed event is only a logged gap — not a
        // reason to roll back the increment. Labels are denormalized so the
        // event survives the player/game being renamed or deleted.
        try {
          const player = players.find(p => p.id === cell.playerId);
          const game = games.find(g => g.id === cell.gameId);
          await client.graphql({
            query: createScoreEventMutation,
            variables: {
              input: {
                gameId: cell.gameId,
                playerId: cell.playerId,
                playerInitials: player ? player.initials : null,
                gameName: game ? game.name : null,
                delta,
                recordedBy: user ? user.username : null,
              },
            },
            authMode: 'userPool',
          });
        } catch (eventErr) {
          console.warn('Score updated but failed to log history event', eventErr);
        }
      } catch (err) {
        console.error('Failed to update score', err);
        setGameScores(previous);
      }
    }

    async function deleteGame(game) {
      const previousGames = games;
      const previousScores = gameScores;
      const related = gameScores.filter(gs => gs.gameId === game.id);
      setGames(games.filter(g => g.id !== game.id));
      setGameScores(gameScores.filter(gs => gs.gameId !== game.id));
      try {
        await Promise.all(related.map(gs => client.graphql({ query: deleteGameScoreMutation, variables: { input: { id: gs.id } }, authMode: 'userPool' })));
        await client.graphql({ query: deleteGameMutation, variables: { input: { id: game.id } }, authMode: 'userPool' });
      } catch (err) {
        console.error('Failed to delete game', err);
        setGames(previousGames);
        setGameScores(previousScores);
      }
    }

    async function deletePlayer(player) {
      const previousPlayers = players;
      const previousScores = gameScores;
      const related = gameScores.filter(gs => gs.playerId === player.id);
      setPlayers(players.filter(p => p.id !== player.id));
      setGameScores(gameScores.filter(gs => gs.playerId !== player.id));
      try {
        await Promise.all(related.map(gs => client.graphql({ query: deleteGameScoreMutation, variables: { input: { id: gs.id } }, authMode: 'userPool' })));
        await client.graphql({ query: deletePlayerMutation, variables: { input: { id: player.id } }, authMode: 'userPool' });
      } catch (err) {
        console.error('Failed to delete player', err);
        setPlayers(previousPlayers);
        setGameScores(previousScores);
      }
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
      <div className="board-card">
      <TableComponent
        games={sortedGames}
        players={sortedPlayers}
        gameScores={gameScores}
        loading={loading}
      />
      </div>
      :
      <div className="signin-wrap">
      <Authenticator hideSignUp />
      </div>
      }
      {isAdmin
      ?
      <div style={{ maxWidth: 640, margin: '20px auto', textAlign: 'left', padding: '0 12px' }}>
          <Form className="mb-2" onSubmit={e => { e.preventDefault(); addGame(); }}>
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

          <Form className="mb-3" onSubmit={e => { e.preventDefault(); addPlayer(); }}>
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
