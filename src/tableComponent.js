import React from 'react';
import Spinner from 'react-bootstrap/Spinner';
import './App.css';

import Table from 'react-bootstrap/Table';
import 'bootstrap/dist/css/bootstrap.min.css';

// Renders a dynamic scoreboard: one column per player (from props.players),
// one row per game (props.games), with cell values joined from
// props.gameScores. Players and games are expected pre-sorted by the caller.
function tableComponent(props) {
  const { games = [], players = [], gameScores = [], loading } = props;

  // (gameId#playerId) -> score
  const lookup = new Map(gameScores.map(gs => [`${gs.gameId}#${gs.playerId}`, gs.score]));
  const scoreFor = (gameId, playerId) => {
    const v = lookup.get(`${gameId}#${playerId}`);
    return v === undefined ? 0 : v;
  };

  function gameRow(game) {
    const rowScores = players.map(p => scoreFor(game.id, p.id));
    const max = rowScores.length ? Math.max(...rowScores) : 0;
    return (
      <tr key={game.id}>
        <td>{game.name}</td>
        {players.map((p, i) => (
          <td key={p.id} style={{ fontWeight: rowScores[i] >= max ? 'bold' : 'normal' }}>
            {rowScores[i]}
          </td>
        ))}
      </tr>
    );
  }

  function totalRow() {
    const totals = players.map(p => games.reduce((sum, g) => sum + scoreFor(g.id, p.id), 0));
    const max = totals.length ? Math.max(...totals) : 0;
    return (
      <tr className="table-dark">
        <td>Total Wins</td>
        {players.map((p, i) => {
          const isLeader = totals[i] >= max;
          return (
            <td key={p.id} style={{ fontWeight: isLeader ? 'bold' : 'normal', color: isLeader ? 'gold' : 'white' }}>
              {totals[i]}
            </td>
          );
        })}
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
      <Table striped bordered>
        <thead>
          <tr>
            <th>Game</th>
            {players.map(p => <th key={p.id}>{p.initials}</th>)}
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
