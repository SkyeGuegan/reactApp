import React, { useEffect, useState } from 'react';
import './App.css';
import { Authenticator, useAuthenticator, ThemeProvider, defaultDarkModeOverride } from '@aws-amplify/ui-react';
import { fetchAuthSession } from 'aws-amplify/auth';
import '@aws-amplify/ui-react/styles.css';
import { Button, ButtonGroup, Modal, Toast, ToastContainer } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import TableComponent from './tableComponent';
import TrendsChart from './TrendsChart';
import ManagePanel from './ManagePanel';
import RecordPlayDialog from './RecordPlayDialog';
import AllGames from './AllGames';
import PlayersView from './PlayersView';
import PlayerPage from './PlayerPage';
import { corePlayers, playedCounts as computePlayedCounts, gamesWonByGuests } from './plays';
import ThemeMenu from './ThemeMenu';
import { useTheme } from './theme';
import GamePage from './GamePage';
import GamePicker from './GamePicker';
import ViewIcon from './ViewIcon';
import ScoringFieldsDialog from './ScoringFieldsDialog';
import ArtworkDialog from './ArtworkDialog';
import { useRoute, gameSlug, playerSlug, VIEWS } from './route';
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

// The gold trophy from the favicon, sized to the title text.
function Trophy() {
  return (
    <svg className="header-trophy" viewBox="12 10 40 45" aria-hidden="true" focusable="false">
      <g fill="none" stroke="#d4a72c" strokeWidth="4" strokeLinecap="round">
        <path d="M20 17h-6c0 9 4 13 9 13" />
        <path d="M44 17h6c0 9-4 13-9 13" />
      </g>
      <g fill="#d4a72c">
        <path d="M19 12h26v10c0 9-5.5 15-13 15s-13-6-13-15z" />
        <rect x="29" y="36" width="6" height="8" />
        <rect x="22" y="44" width="20" height="5" rx="1.5" />
        <rect x="18" y="49" width="28" height="4" rx="1.5" />
      </g>
    </svg>
  );
}

// Amplify UI (the sign-in box) follows the system light/dark setting too.
const amplifyTheme = { name: 'scoreboard', overrides: [defaultDarkModeOverride] };

function Scoreboard({ themeMode, onThemeChange }) {
    const { user, authStatus, signOut } = useAuthenticator((context) => [context.user, context.authStatus]);
    const { games, players, gameScores, plays, loading, loadError, addGame, addPlayer, increment, deleteGame, deletePlayer, voidEvent, recordPlay, voidPlay, setGameArt, setGameScoring, lastEvent, lastVoidedId, playerNames, loadPlayerNames, updatePlayerInfo } = useScoreboard(user);
    const [showSignIn, setShowSignIn] = useState(false);
    const [showRecord, setShowRecord] = useState(false);
    const [recordGameId, setRecordGameId] = useState(''); // game preselected in Record a game
    const [artGame, setArtGame] = useState(null); // game page's Set artwork dialog
    const [scoringGame, setScoringGame] = useState(null); // Scoring details dialog
    const route = useRoute();
    // Every view has an address (see route.js); the nav highlights where you are.
    const view = route.page === 'board' ? route.view : null;
    const activeTab = view || (route.page === 'player' ? 'players' : route.page === 'manage' ? 'manage' : null);
    // { kind: 'game' | 'player', item } when a delete is awaiting confirmation.
    const [pendingDelete, setPendingDelete] = useState(null);
    // { cell, label, from, to } while a decrease (− in edit mode) awaits confirmation.
    const [pendingDecrease, setPendingDecrease] = useState(null);
    // Admin edit mode: −/+ in the table cells. While editing, player columns
    // keep the order they had when editing started (frozenOrder: player ids),
    // so a click that changes the leader can't move buttons under the cursor.
    const [editing, setEditing] = useState(false);
    const [frozenOrder, setFrozenOrder] = useState([]);
    // One notice at a time: { id, variant: 'success' | 'danger', message, undo? }
    // where undo is a function run by the notice's Undo button.
    const [notice, setNotice] = useState(null);
    // Pause the notice's auto-hide while the pointer or focus is on it.
    const [noticeHeld, setNoticeHeld] = useState(false);

    const isAuthenticated = authStatus === 'authenticated' && user;
    const inAdminGroup = useIsAdmin(isAuthenticated ? user : null);
    const isAdmin = isAuthenticated && inAdminGroup;
    // Editing totals (−/+) lives in Manage → Corrections.
    const editMode = isAdmin && editing && route.page === 'manage';

    // Full names are admin-only on the server; fetch them once signed in as admin.
    useEffect(() => {
      if (isAdmin) loadPlayerNames();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAdmin]);

    function notify(variant, message, undo = null) {
      setNotice({ id: Date.now(), variant, message, undo });
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

    async function handleAddPlayer(initials, core = false, name = '') {
      try {
        await addPlayer(initials, { core, name });
        notify('success', `Added ${core ? 'player' : 'guest'} ${initials}.`);
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
        if (event) notify('success', label, () => undo(event));
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

    // Guests added from the Record a game dialog. Resolves to the new player.
    async function handleAddGuest(initials, name = '') {
      try {
        return await addPlayer(initials, { core: false, name });
      } catch (err) {
        failed(`add guest ${initials}`, err);
        return null;
      }
    }

    // Edit player dialog: new initials and/or full name. Resolves true on success.
    async function handleEditPlayer(player, info) {
      try {
        const updated = await updatePlayerInfo(player, info);
        notify('success', `Saved ${updated.initials}.`);
        return true;
      } catch (err) {
        failed(`save ${player.initials}`, err);
        return false;
      }
    }

    // Save a recorded game; the notice says where it landed and offers Undo.
    async function handleRecordPlay(data) {
      try {
        const play = await recordPlay(data);
        const name = (id) => (data.allPlayers.find(p => p.id === id) || {}).initials || '?';
        const where = play.test ? ' (test — admins only)' : play.counted ? '' : ' (not on the main scoreboard)';
        notify('success', `Recorded ${play.gameName}: ${play.winnerIds.map(name).join(' & ')} won${where}.`, () => undoPlay(play));
        return true;
      } catch (err) {
        failed('save that game', err);
        return false;
      }
    }

    async function undoPlay(play) {
      setNotice(null);
      try {
        await voidPlay(play);
        notify('success', `Removed ${play.gameName}.`);
      } catch (err) {
        failed('undo that game', err);
      }
    }

    async function handleSetScoring(game, fields) {
      try {
        await setGameScoring(game, fields);
        notify('success', fields.length
          ? `${game.name} now collects ${fields.map(f => f.label.toLowerCase()).join(' and ')}.`
          : `${game.name} no longer collects scoring details.`);
        return true;
      } catch (err) {
        failed(`save scoring details for ${game.name}`, err);
        return false;
      }
    }

    async function handleSetArt(game, art) {
      try {
        await setGameArt(game, art);
        notify('success', art.imageUrl || art.bggId ? `Updated artwork for ${game.name}.` : `Cleared artwork for ${game.name}.`);
        return true;
      } catch (err) {
        failed(`save artwork for ${game.name}`, err);
        return false;
      }
    }

    // Score changes: voiding a win from a recorded game voids the whole game.
    // Errors propagate so the list can show them.
    async function voidPlayFromHistory(play) {
      await voidPlay(play);
      notify('success', `Voided the ${play.gameName} game.`);
    }

    async function handleVoidPlay(play) {
      try {
        await voidPlay(play);
        notify('success', `Voided ${play.gameName}.`);
      } catch (err) {
        failed(`void ${play.gameName}`, err);
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
    // Main table columns: the core players only (guests and the test player
    // live in All games / the roster).
    const tablePlayers = corePlayers(players);
    // The game whose page is open (matched by its name in the address).
    const currentGame = route.page === 'game' ? games.find(g => gameSlug(g.name) === route.slug) || null : null;
    // The player whose page is open (by initials); the test player is admin-only.
    const currentPlayer = route.page === 'player'
      ? players.find(p => playerSlug(p) === route.slug && (isAdmin || !p.hidden)) || null
      : null;
    const playedCounts = computePlayedCounts(games, plays);
    const guestWonGames = gamesWonByGuests(plays, players);
    const playerTotals = new Map(players.map(p => [p.id, 0]));
    gameScores.forEach(gs => {
      if (playerTotals.has(gs.playerId)) {
        playerTotals.set(gs.playerId, playerTotals.get(gs.playerId) + gs.score);
      }
    });
    const byWins = [...tablePlayers].sort((a, b) => {
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
    // Roster order: core players by wins, then guests, then the test player.
    const rosterPlayers = [
      ...sortedPlayers,
      ...players.filter(p => !tablePlayers.includes(p) && !p.hidden).sort(byInitials),
      ...players.filter(p => p.hidden).sort(byInitials),
    ];

  return (
    <div className="App">
      <header className="App-header">
      <h1>
        {/* Title + trophy go home: the Scoreboard, scrolled to top. */}
        <a href="#/" className="home-link" onClick={() => window.scrollTo(0, 0)}>
          <Trophy />The Scoreboard
        </a>
      </h1>
      <div className="header-action">
      {isAuthenticated
      ? <>
          {isAdmin && (
            <Button variant="light" size="sm" className="header-record" onClick={() => { setRecordGameId(currentGame ? currentGame.id : ''); setShowRecord(true); }}>
              ＋ Record<span className="d-none d-sm-inline"> a game</span>
            </Button>
          )}
          <span className="header-hello">Hello, {user.username}</span>
          <Button variant="outline-light" size="sm" onClick={() => { signOut(); setShowSignIn(false); }}>Sign out</Button>
        </>
      : <Button variant="outline-light" size="sm" onClick={handleClick}>{showSignIn ? "Back to table" : "Sign in"}</Button>
      }
      <ThemeMenu mode={themeMode} onChange={onThemeChange} />
      </div>
      </header>
      {(!showSignIn || isAuthenticated)
      ?
      <>
      <nav className="board-controls" aria-label="Sections">
        <ButtonGroup size="sm" className="view-nav">
          {VIEWS.map(([v, href, label]) => (
            <Button key={v} as="a" href={href} variant={activeTab === v ? 'dark' : 'outline-dark'} className="view-btn" aria-current={activeTab === v ? 'page' : undefined}>
              <ViewIcon name={v} />{label}
            </Button>
          ))}
          {isAdmin && (
            <Button as="a" href="#/manage" variant={activeTab === 'manage' ? 'dark' : 'outline-dark'} className="view-btn" aria-current={activeTab === 'manage' ? 'page' : undefined}>
              <ViewIcon name="manage" />Manage
            </Button>
          )}
        </ButtonGroup>
      </nav>
      {route.page === 'game' ? (
        <div className="board-card game-card">
          {loading
            ? <p className="p-3 text-muted mb-0">Loading…</p>
            : currentGame
              ? <GamePage
                  game={currentGame}
                  corePlayers={tablePlayers}
                  players={players}
                  gameScores={gameScores}
                  plays={plays}
                  played={playedCounts.get(currentGame.id) || 0}
                  isAdmin={isAdmin}
                  onRecord={() => { setRecordGameId(currentGame.id); setShowRecord(true); }}
                  onSetArt={() => setArtGame(currentGame)}
                  onSetScoring={() => setScoringGame(currentGame)}
                />
              : <div className="p-3 text-start"><a href="#/" className="game-back">← Back to the scoreboard</a><p className="mt-3 mb-0">That game isn't on the scoreboard.</p></div>}
        </div>
      ) : route.page === 'player' ? (
        <div className="board-card game-card">
          {loading
            ? <p className="p-3 text-muted mb-0">Loading…</p>
            : currentPlayer
              ? <PlayerPage
                  player={currentPlayer}
                  players={players}
                  corePlayers={tablePlayers}
                  games={sortedGames}
                  gameScores={gameScores}
                  plays={plays}
                  playedCounts={playedCounts}
                  isAdmin={isAdmin}
                  playerNames={playerNames}
                />
              : <div className="p-3 text-start"><a href="#/players" className="game-back">← Players</a><p className="mt-3 mb-0">That player isn't on the scoreboard.</p></div>}
        </div>
      ) : route.page === 'manage' ? (
        !isAdmin && (
          <div className="board-card">
            <p className="p-3 mb-0 text-start">Manage is for admins{isAuthenticated ? '.' : ' — sign in to use it.'}</p>
          </div>
        )
      ) : (
      <div className="board-card">
      {view === 'scoreboard'
        ? <TableComponent
            games={sortedGames}
            players={sortedPlayers}
            gameScores={gameScores}
            loading={loading}
            error={loadError}
            onIncrement={handleIncrement}
            playedCounts={playedCounts}
            guestWonGames={guestWonGames}
          />
        : view === 'players'
          ? <PlayersView plays={plays} players={players} games={games} gameScores={gameScores} isAdmin={isAdmin} />
          : view === 'trends'
            ? <TrendsChart exactDates={isAdmin} />
            : view === 'pick'
              ? <GamePicker
                  games={games}
                  plays={plays}
                  isAdmin={isAdmin}
                  onRecord={(gameId) => { setRecordGameId(gameId); setShowRecord(true); }}
                  onAddGame={handleAddGame}
                />
              : <AllGames plays={plays} players={players} games={games} isAdmin={isAdmin} onVoid={isAdmin ? handleVoidPlay : undefined} />}
      </div>
      )}
      </>
      :
      <div className="signin-wrap">
      <Authenticator hideSignUp />
      </div>
      }
      {isAdmin && route.page === 'manage'
      ?
      <ManagePanel
        corrections={(
          <>
            <p className="small text-muted text-start mb-2">
              Recording a game is the normal way to add a win. Use this only to fix a total that's wrong; every change is listed under Score changes below and can be voided.
            </p>
            {editMode
              ? (
                <div className="board-toolbar editing" role="status">
                  <span>✎ Editing — changes save instantly</span>
                  <Button size="sm" variant="dark" onClick={toggleEditing}>Done</Button>
                </div>
              )
              : (
                <div className="board-toolbar">
                  <Button size="sm" variant="outline-secondary" onClick={toggleEditing}>✎ Edit totals</Button>
                </div>
              )}
            <TableComponent
              games={sortedGames}
              players={sortedPlayers}
              gameScores={gameScores}
              loading={loading}
              error={loadError}
              editing={editMode}
              onIncrement={handleIncrement}
              playedCounts={playedCounts}
              guestWonGames={guestWonGames}
            />
          </>
        )}
        games={sortedGames}
        players={rosterPlayers}
        gameScores={gameScores}
        onAddGame={handleAddGame}
        onAddPlayer={handleAddPlayer}
        onEditPlayer={handleEditPlayer}
        playerNames={playerNames}
        onRequestDelete={(kind, item) => setPendingDelete({ kind, item })}
        onSetArt={handleSetArt}
        onOpenScoring={setScoringGame}
        onVoid={voidEvent}
        onVoidPlay={voidPlayFromHistory}
        plays={plays}
        lastEvent={lastEvent}
        lastVoidedId={lastVoidedId}
      />
      : isAuthenticated && !isAdmin
          ? <p className="viewer-note">You're signed in as {user.username}. Only admins can change scores.</p>
          : null
      }

      {isAdmin && (
        <RecordPlayDialog
          show={showRecord}
          onHide={() => setShowRecord(false)}
          games={games}
          players={players}
          plays={plays}
          onSave={handleRecordPlay}
          onAddGuest={handleAddGuest}
          playerNames={playerNames}
          initialGameId={recordGameId}
        />
      )}
      {isAdmin && (
        <ArtworkDialog game={artGame} onHide={() => setArtGame(null)} onSave={(art) => handleSetArt(artGame, art)} />
      )}
      {isAdmin && (
        <ScoringFieldsDialog game={scoringGame} onHide={() => setScoringGame(null)} onSave={(fields) => handleSetScoring(scoringGame, fields)} />
      )}

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
              {notice.undo && (
                <Button size="sm" variant="outline-light" onClick={notice.undo}>Undo</Button>
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
  // Light/dark choice (Automatic / Light / Dark), shared by the page and the
  // Amplify sign-in box.
  const [themeMode, setThemeMode] = useTheme();
  return (
    <ThemeProvider theme={amplifyTheme} colorMode={themeMode === 'auto' ? 'system' : themeMode}>
      <Authenticator.Provider>
        <Scoreboard themeMode={themeMode} onThemeChange={setThemeMode} />
      </Authenticator.Provider>
    </ThemeProvider>
  );
}

export default App;
