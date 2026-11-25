import React, { useEffect, useState } from 'react';
import { Table, Badge, Button } from 'react-bootstrap';
import TrendsChart from './TrendsChart';
import { gameStandings, playsForGame, fmtPercent } from './gameStats';
import { fmtWins } from './plays';

const fmtDay = (iso) => new Date(iso).toLocaleDateString([], { dateStyle: 'medium' });

// One game's page: box art + BoardGameGeek link, standings with win rates,
// wins over time for this game, and its recorded games. Admins also get
// "Record a game" (this game preselected) and "Set artwork".
export default function GamePage({ game, corePlayers, players, gameScores, plays, played, isAdmin, onRecord, onSetArt }) {
  const [artFailed, setArtFailed] = useState(false);
  useEffect(() => setArtFailed(false), [game.imageUrl]);
  useEffect(() => {
    const prev = document.title;
    document.title = `${game.name} · The Scoreboard`;
    return () => { document.title = prev; };
  }, [game.name]);

  const { rows, leaderIds } = gameStandings(game, corePlayers, gameScores, played);
  const recent = playsForGame(game.id, plays, isAdmin);
  const lastReal = recent.find(p => !p.test);
  const byId = new Map(players.map(p => [p.id, p.initials]));
  const name = (id) => byId.get(id) || '?';
  const maxWins = Math.max(1, ...rows.map(r => r.wins));

  return (
    <div className="game-page text-start">
      <a href="#/" className="game-back">← Back to the scoreboard</a>

      <div className="game-hero">
        {game.imageUrl && !artFailed && (
          <img className="game-hero-art" src={game.imageUrl} alt={`${game.name} box art`} referrerPolicy="no-referrer" onError={() => setArtFailed(true)} />
        )}
        <div>
          <h2 className="game-title">{game.name}</h2>
          <p className="game-meta mb-2">
            {played} played{lastReal && <> · last played {fmtDay(lastReal.playedAt)}</>}
          </p>
          {game.bggId && (
            <a className="game-bgg" href={`https://boardgamegeek.com/boardgame/${game.bggId}`} target="_blank" rel="noopener noreferrer">
              View on BoardGameGeek ↗
            </a>
          )}
          {isAdmin && (
            <div className="d-flex gap-2 mt-3 flex-wrap">
              <Button size="sm" variant="dark" onClick={onRecord}>＋ Record a game</Button>
              <Button size="sm" variant="outline-secondary" onClick={onSetArt}>Set artwork…</Button>
            </div>
          )}
        </div>
      </div>

      <h3 className="manage-subtitle mt-4">Standings</h3>
      <Table size="sm" className="game-standings mb-1">
        <thead><tr><th>Player</th><th className="text-center">Wins</th><th className="text-center">Win rate</th><th className="w-50" aria-hidden="true" /></tr></thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.player.id}>
              <td className="fw-semibold">{r.player.initials}{leaderIds.has(r.player.id) && ' 👑'}</td>
              <td className="text-center">{fmtWins(r.wins)}</td>
              <td className="text-center">{fmtPercent(r.rate)}</td>
              <td aria-hidden="true">
                <div className="win-bar"><div className={`win-bar-fill${leaderIds.has(r.player.id) ? ' leader' : ''}`} style={{ width: `${(r.wins / maxWins) * 100}%` }} /></div>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
      <p className="text-muted small">Win rate = wins ÷ games played with everyone at the table.</p>

      <h3 className="manage-subtitle mt-4">Wins over time</h3>
      <TrendsChart gameId={game.id} />

      <h3 className="manage-subtitle mt-4">Recent games</h3>
      {recent.length === 0 ? (
        <p className="text-muted small">No games recorded individually yet — results from before Nov 2026 are in the totals above.</p>
      ) : (
        <Table size="sm" responsive className="small">
          <thead><tr><th>Date</th><th>Players</th><th>Won</th><th /></tr></thead>
          <tbody>
            {recent.map(p => (
              <tr key={p.id}>
                <td className="text-nowrap">{fmtDay(p.playedAt)}</td>
                <td>{p.playerIds.map(name).join(', ')}</td>
                <td className="fw-semibold">{p.winnerIds.map(name).join(' & ')}</td>
                <td className="text-end">
                  {p.test && <Badge bg="secondary">test</Badge>}
                  {!p.test && !p.counted && <Badge bg="light" text="dark" title="Not everyone at the table played">not on table</Badge>}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {game.imageUrl && <p className="board-credit mb-0">Box art from <a href="https://boardgamegeek.com" target="_blank" rel="noopener noreferrer">BoardGameGeek</a></p>}
    </div>
  );
}
