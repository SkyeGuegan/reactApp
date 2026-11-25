import React from 'react';
import Spinner from 'react-bootstrap/Spinner';
import './App.css';

import Table from 'react-bootstrap/Table';
import 'bootstrap/dist/css/bootstrap.min.css';

// Renders a dynamic scoreboard: one column per player (from props.players),
// one row per game (props.games), with cell values joined from
// props.gameScores. Players and games are expected pre-sorted by the caller.
//
// With `editing` and `onIncrement(cell, delta)` set (admins in edit mode), each
// score cell gets −/+ buttons. − is disabled at scores below 1 (scores never go
// negative).
function tableComponent(props) {
  const { games = [], players = [], gameScores = [], loading, editing = false, onIncrement } = props;

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
        <td>{game.name}</td>
        {players.map((p, i) => (
          <td key={p.id} style={numCol}>
            {scoreCell(game, p, rowScores[i], rowScores[i] >= max)}
          </td>
        ))}
      </tr>
    );
  }

  function totalRow() {
    return (
      <tr className="table-dark">
        <td>Total Wins</td>
        {players.map((p, i) => (
          <td key={p.id} style={{ ...numCol, fontWeight: isLeader(i) ? 'bold' : 'normal', color: isLeader(i) ? 'gold' : 'white' }}>
            {totals[i]}
          </td>
        ))}
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
              <th key={p.id} style={numCol}>
                <span>{p.initials}</span>{isLeader(i) ? ' 👑' : ''}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {games.map(game => gameRow(game))}
          {totalRow()}
        </tbody>
      </Table>
    </div>
  );
}

export default tableComponent;
