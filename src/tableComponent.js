import React from 'react';
import Spinner from 'react-bootstrap/Spinner';
import './App.css';

import Table from 'react-bootstrap/Table';
import { gameHref } from './route';
import 'bootstrap/dist/css/bootstrap.min.css';

// Renders a dynamic scoreboard: one column per player (from props.players),
// one row per game (props.games), with cell values joined from
// props.gameScores. Players and games are expected pre-sorted by the caller.
//
// With `editing` and `onIncrement(cell, delta)` set (admins in edit mode), each
// score cell gets −/+ buttons. − is disabled at scores below 1 (scores never go
// negative).
//
// With `playedCounts` (Map gameId -> games played) a muted Played column is
// added on the right, set off from the player columns by a divider; the bottom
// row (then labelled "Totals") shows the overall count.
// Game name with its box-art thumbnail (hidden if the image fails to load),
// linking to the game's own page.
function GameName({ game }) {
  const [artFailed, setArtFailed] = React.useState(false);
  const art = game.imageUrl && !artFailed
    ? <img className="game-art" src={game.imageUrl} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setArtFailed(true)} />
    : null;
  return (
    <a className="game-name game-link" href={gameHref(game)} title={`${game.name}: standings and history`}>
      {art}<span>{game.name}</span>
    </a>
  );
}

function tableComponent(props) {
  const { games = [], players = [], gameScores = [], loading, error = false, editing = false, onIncrement, playedCounts, guestWonGames = 0 } = props;

  // (gameId#playerId) -> GameScore cell
  const lookup = new Map(gameScores.map(gs => [`${gs.gameId}#${gs.playerId}`, gs]));
  const cellFor = (gameId, playerId) => lookup.get(`${gameId}#${playerId}`);
  const scoreFor = (gameId, playerId) => {
    const cell = cellFor(gameId, playerId);
    return cell === undefined ? 0 : cell.score;
  };

  // Per-player grand totals, computed once: drives the totals row plus the
  // overall "leader" column highlight (gold tint + crown). No leader until at
  // least one win exists.
  const totals = players.map(p => games.reduce((sum, g) => sum + scoreFor(g.id, p.id), 0));
  const maxTotal = totals.length ? Math.max(...totals) : 0;
  const isLeader = (i) => maxTotal > 0 && totals[i] === maxTotal;
  const numCol = { textAlign: 'center' };
  // Player columns share the space equally (otherwise the leader's crown makes
  // one wider); the Game column takes what's left, Played stays narrow (CSS).
  const playerCol = { ...numCol, width: `${Math.floor(60 / Math.max(players.length, 1))}%` };

  function scoreCell(game, player, score, bold) {
    const cell = cellFor(game.id, player.id);
    const value = <span style={{ fontWeight: bold ? 'bold' : 'normal' }}>{score}</span>;
    if (!editing || !cell || !onIncrement) return value;
    return (
      <div className="score-stepper">
        <button
          type="button"
          className="score-btn"
          disabled={cell.score < 1}
          aria-label={`Remove a win from ${player.initials} in ${game.name}`}
          onClick={() => onIncrement(cell, -1)}
        >
          −
        </button>
        <span className="score-value">{value}</span>
        <button
          type="button"
          className="score-btn"
          aria-label={`Add a win for ${player.initials} in ${game.name}`}
          onClick={() => onIncrement(cell, 1)}
        >
          +
        </button>
      </div>
    );
  }

  function gameRow(game) {
    const rowScores = players.map(p => scoreFor(game.id, p.id));
    const max = rowScores.length ? Math.max(...rowScores) : 0;
    return (
      <tr key={game.id}>
        <td><GameName game={game} /></td>
        {players.map((p, i) => (
          <td key={p.id} style={numCol}>
            {scoreCell(game, p, rowScores[i], rowScores[i] >= max)}
          </td>
        ))}
        {playedCounts && <td className="played-col">{playedCounts.get(game.id) || 0}</td>}
      </tr>
    );
  }

  function totalRow() {
    return (
      <tr className="table-dark">
        <td>{playedCounts ? 'Totals' : 'Total Wins'}</td>
        {players.map((p, i) => (
          <td key={p.id} style={{ ...numCol, fontWeight: isLeader(i) ? 'bold' : 'normal', color: isLeader(i) ? 'gold' : 'white' }}>
            {totals[i]}
          </td>
        ))}
        {playedCounts && (
          <td className="played-col">{games.reduce((sum, g) => sum + (playedCounts.get(g.id) || 0), 0)}</td>
        )}
      </tr>
    );
  }

  if (loading) {
    return (
      <Spinner animation="border" role="status">
        <span className="visually-hidden">Loading...</span>
      </Spinner>
    );
  }

  if (error) {
    return (
      <p role="alert" style={{ padding: '10px', color: '#a00', margin: 0 }}>
        Couldn't load the scoreboard. Check your connection and refresh to try again.
      </p>
    );
  }

  if (!games.length || !players.length) {
    return (
      <div style={{ padding: '10px' }}>
        <p style={{ fontStyle: 'italic', color: '#666' }}>
          The scoreboard is empty — sign in as an admin to add games and players.
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: '10px' }}>
      <Table striped bordered hover={!editing} responsive className={`align-middle mb-0${editing ? ' board-editing' : ''}`}>
        <thead>
          <tr>
            <th>Game</th>
            {players.map((p, i) => (
              <th key={p.id} style={playerCol}>
                <span>{p.initials}</span>{isLeader(i) ? ' 👑' : ''}
              </th>
            ))}
            {playedCounts && <th className="played-col" title="Games played with all regulars at the table">Played</th>}
          </tr>
        </thead>
        <tbody>
          {games.map(game => gameRow(game))}
          {totalRow()}
        </tbody>
      </Table>
      {playedCounts && guestWonGames > 0 && (
        <p className="board-note mb-0">
          Played includes {guestWonGames} {guestWonGames === 1 ? 'game' : 'games'} won by guests.
        </p>
      )}
      {games.some(g => g.imageUrl || g.bggId) && (
        <p className="board-credit mb-0">
          Box art from <a href="https://boardgamegeek.com" target="_blank" rel="noopener noreferrer">BoardGameGeek</a>
        </p>
      )}
    </div>
  );
}

export default tableComponent;
