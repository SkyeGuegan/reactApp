import React, { useEffect, useState } from 'react';
import { Table, Badge, Button, ButtonGroup } from 'react-bootstrap';
import TrendsChart from './TrendsChart';
import { gameStandings, playsForGame, fmtPercent } from './gameStats';
import { fmtWins } from './plays';
import { fmtPlayDate } from './dates';
import { fieldsOf, scoringStats, setupStats, optionFor, playerScoringStats, playerCounts, withPlayerCount, onlineRatesFor, gameLinks } from './scoring';
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
  const [count, setCount] = useState(null); // score stats for n-player games only (null = all)
  useEffect(() => setCount(null), [game.id]);
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
  const counts = playerCounts(game, plays);
  const countPlays = withPlayerCount(plays, counts.includes(count) ? count : null);
  const gamesWith = (n) => withPlayerCount(plays, n).filter(p => p.gameId === game.id && !p.voided && !p.test).length;
  const stats = scoringStats(game, countPlays);
  const setups = setupStats(game, countPlays);
  const people = playerScoringStats(game, countPlays).filter(r => r.avgScore != null || r.mostPlayed);
  const place = (n) => (n == null ? '—' : n.toFixed(1));
  const whole = (n) => (n == null ? '—' : String(Math.round(n)));
  const signed = (n) => (n == null ? '—' : `${n >= 0.5 ? '+' : n <= -0.5 ? '−' : ''}${Math.abs(Math.round(n))}`);
  const choice = (field, c) => c && <>{(o => o && <Swatch color={o.color} />)(optionFor(field, c.value))}{c.value}</>;
  const hasScoringData = stats.some(s => (s.type === 'number' ? s.best : s.rows.length)) || setups.length > 0;
  // "SG 2, NI 1" — who has won with a setup, most first.
  const winsText = (wins) => [...wins.entries()].sort((a, b) => b[1] - a[1]).map(([id, w]) => `${name(id)} ${fmtWins(w)}`).join(', ');

  // "SG (Witches, 142)" — a player's initials with whatever details were noted.
  const withDetails = (play, id) => <PlayerDetails play={play} game={game} playerId={id} label={name(id)} />;
  const joined = (items) => items.map((x, i) => <React.Fragment key={i}>{i > 0 && ', '}{x}</React.Fragment>);

  // A choice field's table (e.g. factions): games, wins and win rate, plus
  // online win rates when known and place/score/margin/best when scored.
  const choiceTable = (s) => {
    const online = onlineRatesFor(game, s.field);
    const scored = s.rows.some(r => r.avgScore != null);
    return (
      <React.Fragment key={s.field.key}>
        <Table size="sm" responsive className="small mb-1 stats-table">
          <thead><tr>
            <th>{s.field.label}</th><th className="text-center">Games</th><th className="text-center">Wins</th><th className="text-center">Win rate</th>
            {online && <th className="text-center" title={`Win rate in online games on ${online.source}`}>Online</th>}
            {scored && <>
              <th className="text-center" title="Average finishing place (1 = first)">Avg place</th>
              <th className="text-center">Avg {s.scoreField.label.toLowerCase()}</th>
              <th className="text-center" title="Average points above or below the table's average">vs table</th>
              <th>Best</th>
            </>}
          </tr></thead>
          <tbody>
            {s.rows.map(r => (
              <tr key={r.value}>
                <td className="text-nowrap">{(o => o && <Swatch color={o.color} />)(optionFor(s.field, r.value))}{r.value}</td>
                <td className="text-center">{r.played}</td>
                <td className="text-center">{fmtWins(r.wins)}</td>
                <td className="text-center">{fmtPercent(r.wins / r.played)}</td>
                {online && <td className="text-center text-muted">{fmtPercent(online.rates[r.value])}</td>}
                {scored && <>
                  <td className="text-center">{place(r.avgPlace)}</td>
                  <td className="text-center">{whole(r.avgScore)}</td>
                  <td className={`text-center ${r.avgDiff > 0 ? 'stat-up' : r.avgDiff < 0 ? 'stat-down' : ''}`}>{signed(r.avgDiff)}</td>
                  <td className="text-nowrap">{r.best ? <>{r.best.value} <span className="text-muted">{name(r.best.playerId)}</span></> : '—'}</td>
                </>}
              </tr>
            ))}
          </tbody>
        </Table>
        <p className="text-muted small mb-3">
          {scored && <>Avg place: 1 = first. vs table: points above or below the table's average that game. </>}
          {online && <>Online: win rate in about 155,000 online games on <a href={online.url} target="_blank" rel="noopener noreferrer">{online.source}</a>.</>}
        </p>
      </React.Fragment>
    );
  };

  // Per-player table: games, wins, average place and score, best score, and
  // most-played / most-winning choice (e.g. faction).
  const playerTable = () => {
    const field = people[0].choiceField;
    return (
      <>
        <h4 className="score-stat-label mt-3 mb-1">By player <span className="text-lowercase fw-normal">· recorded games with scores, including ones not on the table</span></h4>
        <Table size="sm" responsive className="small mb-2 stats-table">
          <thead><tr>
            <th>Player</th><th className="text-center">Games</th><th className="text-center">Wins</th>
            <th className="text-center">Avg place</th><th className="text-center">Avg</th><th className="text-center">Best</th>
            {field && <><th>Most played</th><th>Most wins with</th></>}
          </tr></thead>
          <tbody>
            {people.map(r => (
              <tr key={r.playerId}>
                <td className="fw-semibold">{name(r.playerId)}</td>
                <td className="text-center">{r.played}</td>
                <td className="text-center">{fmtWins(r.wins)}</td>
                <td className="text-center">{place(r.avgPlace)}</td>
                <td className="text-center">{whole(r.avgScore)}</td>
                <td className="text-center">{r.best ? r.best.value : '—'}</td>
                {field && <>
                  <td className="text-nowrap">{r.mostPlayed ? <>{choice(field, r.mostPlayed)} <span className="text-muted">×{r.mostPlayed.played}</span></> : '—'}</td>
                  <td className="text-nowrap">{r.mostWins ? <>{choice(field, r.mostWins)} <span className="text-muted">{fmtWins(r.mostWins.wins)} of {r.mostWins.played}</span></> : '—'}</td>
                </>}
              </tr>
            ))}
          </tbody>
        </Table>
      </>
    );
  };

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
          {gameLinks(game).length > 0 && (
            <div className="game-links small">
              {gameLinks(game).map(l => (
                <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer" title={l.site}>{l.label} ↗</a>
              ))}
            </div>
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
        <thead><tr><th>Player</th><th className="text-center">Played</th><th className="text-center">Wins</th><th className="text-center">Win rate</th><th className="w-50" aria-hidden="true" /></tr></thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.player.id}>
              <td className="fw-semibold">
                {r.player.initials}{leaderIds.has(r.player.id) && ' 👑'}
                {r.guest && <span className="text-muted small fw-normal ms-2">guest</span>}
              </td>
              <td className="text-center">{r.played}</td>
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
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mt-4 mb-2">
            <h3 className="manage-subtitle m-0">Scores</h3>
            {counts.length > 1 && (
              <ButtonGroup size="sm" aria-label="Player count">
                {[null, ...counts].map(n => (
                  <Button key={n || 'all'} variant={(count || null) === n ? 'dark' : 'outline-secondary'} onClick={() => setCount(n)} title={n ? `${gamesWith(n)} ${n}-player ${gamesWith(n) === 1 ? 'game' : 'games'}` : undefined}>
                    {n ? `${n}p` : 'All'}
                  </Button>
                ))}
              </ButtonGroup>
            )}
          </div>
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
                s.rows.length > 0 && choiceTable(s)
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
              {people.length > 0 && playerTable()}
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
