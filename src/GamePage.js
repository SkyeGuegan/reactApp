import React, { useEffect, useState } from 'react';
import { Table, Badge, Button } from 'react-bootstrap';
import TrendsChart from './TrendsChart';
import { gameStandings, playsForGame, fmtPercent } from './gameStats';
import { fmtWins } from './plays';
import { fmtPlayDate } from './dates';
import { fieldsOf, scoringStats, setupStats, optionFor } from './scoring';
import { Swatch, PlayerDetails } from './Swatch';
import SetupTag from './SetupTag';

// One game's page: box art + BoardGameGeek link, standings with win rates,
// optional scoring stats (best score, average winning score, faction win
// rates), wins over time for this game, and its recorded games with any
// details. Admins also get "Record a game" (this game preselected), "Set
// artwork" and "Scoring details".
export default function GamePage({ game, corePlayers, players, gameScores, plays, played, isAdmin, onRecord, onSetArt, onSetScoring }) {
  const [artFailed, setArtFailed] = useState(false);
  useEffect(() => setArtFailed(false), [game.imageUrl]);
  useEffect(() => {
    const prev = document.title;
    document.title = `${game.name} · The Scoreboard`;
    return () => { document.title = prev; };
  }, [game.name]);

  const fmtDay = (iso) => fmtPlayDate(iso, isAdmin); // exact day for admins, month for visitors
  const { rows, leaderIds } = gameStandings(game, corePlayers, gameScores, played, { plays, players });
  const hasGuests = rows.some(r => r.guest);
  const recent = playsForGame(game.id, plays, isAdmin);
  const lastReal = recent.find(p => !p.test);
  const byId = new Map(players.map(p => [p.id, p.initials]));
  const name = (id) => byId.get(id) || '?';
  const maxWins = Math.max(1, ...rows.map(r => r.wins));
  const earlier = Math.round(game.baselinePlays || 0);

  const fields = fieldsOf(game);
  const stats = scoringStats(game, plays);
  const setups = setupStats(game, plays);
  const hasScoringData = stats.some(s => (s.type === 'number' ? s.best : s.rows.length)) || setups.length > 0;
  // "SG 2, NI 1" — who has won with a setup, most first.
  const winsText = (wins) => [...wins.entries()].sort((a, b) => b[1] - a[1]).map(([id, w]) => `${name(id)} ${fmtWins(w)}`).join(', ');

  // "SG (Witches, 142)" — a player's initials with whatever details were noted.
  const withDetails = (play, id) => <PlayerDetails play={play} game={game} playerId={id} label={name(id)} />;
  const joined = (items) => items.map((x, i) => <React.Fragment key={i}>{i > 0 && ', '}{x}</React.Fragment>);

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
              <Button size="sm" variant="outline-secondary" onClick={onSetScoring}>Scoring details…</Button>
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
              <td className="fw-semibold">
                {r.player.initials}{leaderIds.has(r.player.id) && ' 👑'}
                {r.guest && <span className="text-muted small fw-normal ms-2">guest</span>}
              </td>
              <td className="text-center">{fmtWins(r.wins)}</td>
              <td className="text-center">{fmtPercent(r.rate)}</td>
              <td aria-hidden="true">
                <div className="win-bar"><div className={`win-bar-fill${leaderIds.has(r.player.id) ? ' leader' : ''}`} style={{ width: `${(r.wins / maxWins) * 100}%` }} /></div>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
      <p className="text-muted small">
        Win rate = wins ÷ games played with everyone at the table.
        {hasGuests && ' Guests count only individually recorded games.'}
      </p>

      {fields.length > 0 && (
        <>
          <h3 className="manage-subtitle mt-4">Scores</h3>
          {!hasScoringData ? (
            <p className="text-muted small">
              No {fields.map(f => f.label.toLowerCase()).join(' or ')} noted yet. They're optional when recording a game.
            </p>
          ) : (
            <div className="scoring-stats">
              {stats.map(s => (s.type === 'number' ? (
                s.best && (
                  <div key={s.field.key} className="score-stat">
                    <div><span className="score-stat-label">Best {s.field.label.toLowerCase()}{s.field.lowWins ? ' (lowest)' : ''}</span>
                      <span className="score-stat-value">{s.best.value}</span>
                      <span className="text-muted small"> by {name(s.best.playerId)}, {fmtDay(s.best.playedAt)}</span></div>
                    {s.avgWin != null && (
                      <div><span className="score-stat-label">Average winning {s.field.label.toLowerCase()}</span>
                        <span className="score-stat-value">{Math.round(s.avgWin * 10) / 10}</span>
                        <span className="text-muted small"> over {s.games} {s.games === 1 ? 'game' : 'games'}</span></div>
                    )}
                  </div>
                )
              ) : (
                s.rows.length > 0 && (
                  <Table key={s.field.key} size="sm" className="small mb-2">
                    <thead><tr><th>{s.field.label}</th><th className="text-center">Played</th><th className="text-center">Wins</th><th className="text-center">Win rate</th></tr></thead>
                    <tbody>
                      {s.rows.map(r => (
                        <tr key={r.value}>
                          <td>{(o => o && <Swatch color={o.color} />)(optionFor(s.field, r.value))}{r.value}</td>
                          <td className="text-center">{r.played}</td>
                          <td className="text-center">{fmtWins(r.wins)}</td>
                          <td className="text-center">{fmtPercent(r.wins / r.played)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                )
              )))}
              {setups.length > 0 && (
                <Table size="sm" responsive className="small mb-2">
                  <thead><tr>
                    <th>Setup</th><th className="text-center">Games</th>
                    {setups[0].field && <><th className="text-center">Best</th><th className="text-center">Avg winning</th></>}
                    <th>Wins</th>
                  </tr></thead>
                  <tbody>
                    {setups.map(s => (
                      <tr key={s.setup}>
                        <td>
                          {s.options.filter(o => o.imageUrl).map(o => (
                            <img key={o.name} className="setup-thumb" src={o.imageUrl} alt="" title={o.name} referrerPolicy="no-referrer" onError={e => { e.currentTarget.style.display = 'none'; }} />
                          ))}
                          {s.setup}
                        </td>
                        <td className="text-center">{s.games}</td>
                        {s.field && <>
                          <td className="text-center">{s.best ? s.best.value : '—'}</td>
                          <td className="text-center">{s.avgWin != null ? Math.round(s.avgWin * 10) / 10 : '—'}</td>
                        </>}
                        <td>{winsText(s.wins)}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </div>
          )}
        </>
      )}

      <h3 className="manage-subtitle mt-4">Wins over time</h3>
      <TrendsChart gameId={game.id} exactDates={isAdmin} />

      <h3 className="manage-subtitle mt-4">Recent games</h3>
      {recent.length === 0 ? (
        <p className="text-muted small">No games recorded individually yet.</p>
      ) : (
        <Table size="sm" responsive className="small mb-1">
          <thead><tr><th>Date</th><th>Players</th><th>Won</th><th /></tr></thead>
          <tbody>
            {recent.map(p => (
              <tr key={p.id}>
                <td className="text-nowrap">{fmtDay(p.playedAt)}</td>
                <td>{joined(p.playerIds.map(id => withDetails(p, id)))}<div><SetupTag play={p} game={game} /></div></td>
                <td className="fw-semibold">{p.winnerIds.map(name).join(' & ')}</td>
                <td className="text-end">
                  {p.test && <Badge bg="secondary">test</Badge>}
                  {!p.test && !p.counted && <Badge bg="" className="badge-soft" title="Not everyone at the table played">not on table</Badge>}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      {earlier > 0 && (
        <p className="text-muted small">
          Plus {earlier} earlier {earlier === 1 ? 'game' : 'games'} between {corePlayers.map(p => p.initials).join(', ')} from before games were recorded individually — only the winner was kept, and they're included in the standings above.
        </p>
      )}

      {game.imageUrl && <p className="board-credit mb-0">Box art from <a href="https://boardgamegeek.com" target="_blank" rel="noopener noreferrer">BoardGameGeek</a></p>}
    </div>
  );
}
