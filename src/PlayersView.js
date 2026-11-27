import React, { useState } from 'react';
import { Table, Button, ButtonGroup } from 'react-bootstrap';
import { everyoneStats, allTimeStats, fmtWins } from './plays';
import { fmtPlayDate } from './dates';
import { playerHref } from './route';

// The Players view: everyone's record, each linking to their page.
//   All time: every game we know of — before recording started only the
//     winner was kept, so those count as games between the regulars.
//   All recorded: only games recorded individually (guests included).
// Test plays never count.
export default function PlayersView({ plays, players, games = [], gameScores = [], isAdmin = false }) {
  const [scope, setScope] = useState('all'); // 'all' | 'recorded'
  const stats = scope === 'all' ? allTimeStats(players, plays, games, gameScores) : everyoneStats(players, plays);
  const real = plays.filter(p => !p.voided && !p.test).sort((a, b) => (a.playedAt < b.playedAt ? -1 : 1));
  const since = real.length ? fmtPlayDate(real[0].playedAt, isAdmin) : null;

  return (
    <div className="p-2 text-start">
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2">
        <h2 className="manage-subtitle m-0">Players</h2>
        <ButtonGroup size="sm" aria-label="Which games to count">
          <Button variant={scope === 'all' ? 'dark' : 'outline-secondary'} onClick={() => setScope('all')}>All time</Button>
          <Button variant={scope === 'recorded' ? 'dark' : 'outline-secondary'} onClick={() => setScope('recorded')}>All recorded</Button>
        </ButtonGroup>
      </div>
      {!stats.length ? (
        <p className="text-muted small">No games recorded yet.</p>
      ) : (
        <>
          <Table size="sm" responsive className="mb-2 all-games-stats">
            <thead><tr><th>Player</th><th className="text-center">Played</th><th className="text-center">Wins</th><th className="text-center">Win rate</th></tr></thead>
            <tbody>
              {stats.map(r => (
                <tr key={r.player.id}>
                  <td>
                    <a className="player-link fw-semibold" href={playerHref(r.player)}>{r.player.initials}</a>
                    {!r.player.core && <span className="text-muted small ms-2">guest</span>}
                  </td>
                  <td className="text-center">{r.played}</td>
                  <td className="text-center">{fmtWins(r.wins)}</td>
                  <td className="text-center">{Math.round((r.wins / r.played) * 100)}%</td>
                </tr>
              ))}
            </tbody>
          </Table>
          <p className="text-muted small mb-0">
            {scope === 'all'
              ? <>All time: every game we know of. Games before {since} kept only the winner, so they count as games between the regulars; later games are recorded individually, including guests. </>
              : <>All recorded: only games recorded individually (since {since}), including ones where a regular was missing. </>}
            Tap a player to see their page.
          </p>
        </>
      )}
    </div>
  );
}
