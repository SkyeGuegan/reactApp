import React, { useEffect, useState } from 'react';
import './App.css';
import { Authenticator, useAuthenticator } from '@aws-amplify/ui-react';
import { fetchAuthSession } from 'aws-amplify/auth';
import '@aws-amplify/ui-react/styles.css';
import { Button, ButtonGroup, Modal, Toast, ToastContainer } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import TableComponent from './tableComponent';
import TrendsChart from './TrendsChart';
import ManagePanel from './ManagePanel';
import useScoreboard from './useScoreboard';
import { formatDelta } from './history';

const byName = (a, b) => a.name.toUpperCase().localeCompare(b.name.toUpperCase());
const byInitials = (a, b) => a.initials.toUpperCase().localeCompare(b.initials.toUpperCase());

// True when the signed-in user is in the Cognito "admin" group — the same group
// the backend requires for writes. UI gating only; the server is the real boundary.
function useIsAdmin(user) {
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setIsAdmin(false);
      return undefined;
    }
    fetchAuthSession()
      .then(({ tokens }) => {
        const groups = tokens?.accessToken?.payload?.['cognito:groups'] || [];
        if (!cancelled) setIsAdmin(groups.includes('admin'));
      })
      .catch(() => { if (!cancelled) setIsAdmin(false); });
    return () => { cancelled = true; };
  }, [user]);
  return isAdmin;
}

function Scoreboard() {
    const { user, authStatus, signOut } = useAuthenticator((context) => [context.user, context.authStatus]);
    const { games, players, gameScores, loading, addGame, addPlayer, increment, deleteGame, deletePlayer, voidEvent, lastEvent, lastVoidedId } = useScoreboard(user);
    const [showSignIn, setShowSignIn] = useState(false);
    const [view, setView] = useState('table'); // 'table' | 'trends'
    // { kind: 'game' | 'player', item } when a delete is awaiting confirmation.
    const [pendingDelete, setPendingDelete] = useState(null);
    // { cell, label, from, to } while a decrease (− in edit mode) awaits confirmation.
    const [pendingDecrease, setPendingDecrease] = useState(null);
    // Admin edit mode: −/+ in the table cells. While editing, player columns
    // keep the order they had when editing started (frozenOrder: player ids),
    // so a click that changes the leader can't move buttons under the cursor.
    const [editing, setEditing] = useState(false);
    const [frozenOrder, setFrozenOrder] = useState([]);
    // One notice at a time: { id, variant: 'success' | 'danger', message, undoEvent? }.
    const [notice, setNotice] = useState(null);
    // Pause the notice's auto-hide while the pointer or focus is on it.
    const [noticeHeld, setNoticeHeld] = useState(false);

    const isAuthenticated = authStatus === 'authenticated' && user;
    const inAdminGroup = useIsAdmin(isAuthenticated ? user : null);
    const isAdmin = isAuthenticated && inAdminGroup;
    const editMode = isAdmin && editing && view === 'table';

    function notify(variant, message, undoEvent = null) {
      setNotice({ id: Date.now(), variant, message, undoEvent });
      setNoticeHeld(false);
    }
    const failed = (what, err) => notify('danger', (err && err.userMessage) || `Couldn't ${what}. Check your connection and try again.`);

    // Server side of the Manage card's Add forms (which validate first).
    // Resolve true on success so the form clears its input.
    async function handleAddGame(name) {
      try {
        await addGame(name);
        notify('success', `Added game ${name}.`);
        return true;
      } catch (err) {
        failed(`add ${name}`, err);
        return false;
      }
    }

    async function handleAddPlayer(initials) {
      try {
        await addPlayer(initials);
        notify('success', `Added player ${initials}.`);
        return true;
      } catch (err) {
        failed(`add ${initials}`, err);
        return false;
      }
    }

    // A score click from the table. On success, offer Undo (voids the event,
    // which also reverses the total).
    // Decreases ask first (they're usually fixing a mistake); increases are
    // instant, with Undo on the notice.
    async function handleIncrement(cell, delta, confirmed = false) {
      const player = players.find(p => p.id === cell.playerId);
      const game = games.find(g => g.id === cell.gameId);
      const label = `${player ? player.initials : '?'} ${formatDelta(delta)} in ${game ? game.name : '?'}`;
      if (delta < 0 && !confirmed) {
        setPendingDecrease({
          cell, delta,
          player: player ? player.initials : '?',
          game: game ? game.name : '?',
          from: cell.score,
          to: cell.score + delta,
        });
        return;
      }
      try {
        const event = await increment(cell, delta);
        if (event) notify('success', label, event);
      } catch (err) {
        failed(`save ${label}`, err);
      }
    }

    async function undo(event) {
      setNotice(null);
      try {
        await voidEvent(event);
        notify('success', `Undid ${event.playerInitials} ${formatDelta(event.delta)} in ${event.gameName}.`);
      } catch (err) {
        failed('undo that change', err);
      }
    }

    function toggleEditing() {
      if (!editing) setFrozenOrder(sortedPlayers.map(p => p.id));
      setEditing(!editing);
    }

    function handleClick() {
      setShowSignIn((prev) => !prev);
    }

    // Run the delete the modal was confirming, then close it.
    async function confirmDelete() {
      if (!pendingDelete) return;
      const { kind, item } = pendingDelete;
      setPendingDelete(null);
      const label = kind === 'game' ? item.name : item.initials;
      try {
        if (kind === 'game') await deleteGame(item);
        else await deletePlayer(item);
        notify('success', `Deleted ${kind} ${label}.`);
      } catch (err) {
        failed(`delete ${label}`, err);
      }
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
    const byWins = [...players].sort((a, b) => {
      const diff = playerTotals.get(b.id) - playerTotals.get(a.id);
      return diff !== 0 ? diff : byInitials(a, b);
    });
    // In edit mode keep the frozen order; players added meanwhile go last.
    const frozenIndex = (p) => {
      const i = frozenOrder.indexOf(p.id);
      return i === -1 ? Infinity : i;
    };
    const sortedPlayers = editMode
      ? [...byWins].sort((a, b) => {
          const ia = frozenIndex(a);
          const ib = frozenIndex(b);
          return ia === ib ? 0 : ia < ib ? -1 : 1;
        })
      : byWins;

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
      <div className="board-controls">
        <ButtonGroup size="sm">
          <Button variant={view === 'table' ? 'dark' : 'outline-dark'} onClick={() => setView('table')}>Table</Button>
          <Button variant={view === 'trends' ? 'dark' : 'outline-dark'} onClick={() => setView('trends')}>Trends</Button>
        </ButtonGroup>
      </div>
      <div className="board-card">
      {/* Admin toolbar: the Edit action sits with the table it changes; while
          editing it becomes a status bar so the mode is unmistakable. */}
      {isAdmin && view === 'table' && !loading && (
        editMode
          ? (
            <div className="board-toolbar editing" role="status">
              <span>✎ Editing — changes save instantly</span>
              <Button size="sm" variant="dark" onClick={toggleEditing}>Done</Button>
            </div>
          )
          : (
            <div className="board-toolbar">
              <Button size="sm" variant="outline-secondary" onClick={toggleEditing}>✎ Edit scores</Button>
            </div>
          )
      )}
      {view === 'table'
        ? <TableComponent
            games={sortedGames}
            players={sortedPlayers}
            gameScores={gameScores}
            loading={loading}
            editing={editMode}
            onIncrement={handleIncrement}
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
      <ManagePanel
        games={sortedGames}
        players={sortedPlayers}
        playerTotals={playerTotals}
        onAddGame={handleAddGame}
        onAddPlayer={handleAddPlayer}
        onRequestDelete={(kind, item) => setPendingDelete({ kind, item })}
        onVoid={voidEvent}
        lastEvent={lastEvent}
        lastVoidedId={lastVoidedId}
      />
      : isAuthenticated
          ? <h3>Hello, {user.username} you are not authorized to enter data</h3>
          : null
      }

      <Modal show={!!pendingDecrease} onHide={() => setPendingDecrease(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Remove a win?</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {pendingDecrease && (
            <>Take a win away from <strong>{pendingDecrease.player}</strong> in <strong>{pendingDecrease.game}</strong>?
            {' '}Their score goes from {pendingDecrease.from} to {pendingDecrease.to}.</>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setPendingDecrease(null)}>Cancel</Button>
          <Button
            variant="danger"
            autoFocus
            onClick={() => {
              const { cell, delta } = pendingDecrease;
              setPendingDecrease(null);
              handleIncrement(cell, delta, true);
            }}
          >
            Remove win
          </Button>
        </Modal.Footer>
      </Modal>

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

      {/* One notice at a time; a new action replaces it. Errors stay longer. */}
      <ToastContainer position="bottom-center" className="p-3" style={{ position: 'fixed', zIndex: 1080 }}>
        {notice && (
          <Toast
            key={notice.id}
            bg={notice.variant === 'danger' ? 'danger' : 'dark'}
            onClose={() => setNotice(null)}
            delay={notice.variant === 'danger' ? 12000 : 8000}
            autohide={!noticeHeld}
            onMouseEnter={() => setNoticeHeld(true)}
            onMouseLeave={() => setNoticeHeld(false)}
            onFocus={() => setNoticeHeld(true)}
            onBlur={() => setNoticeHeld(false)}
          >
            <Toast.Body className="d-flex align-items-center gap-3 text-white" role={notice.variant === 'danger' ? 'alert' : 'status'}>
              <span className="flex-grow-1">{notice.message}</span>
              {notice.undoEvent && (
                <Button size="sm" variant="outline-light" onClick={() => undo(notice.undoEvent)}>Undo</Button>
              )}
              <button type="button" className="btn-close btn-close-white" aria-label="Dismiss" onClick={() => setNotice(null)} />
            </Toast.Body>
          </Toast>
        )}
      </ToastContainer>
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
