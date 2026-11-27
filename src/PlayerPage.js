import React, { useEffect, useState } from 'react';
import { Table, Badge, Button } from 'react-bootstrap';
import { allTimeStats, fmtWins } from './plays';
import { fmtPercent } from './gameStats';
import { fmtPlayDate } from './dates';
import { gameHref, playerHref } from './route';
import { optionFor, placings, mainScoreField } from './scoring';
import { streaksIn, allRecordedPlays } from './insights';
import { playerGameRows, playerHeadToHead, playerPlays } from './playerStats';
import { Swatch, PlayerLines, PlayerDetails } from './Swatch';
import Tile from './Tile';
import { sortRows, activeSort, nextSort, SortHead } from './sortTable';

const RECENT = 10;
const MIN_GAMES = 3; // for "best game": a win rate over fewer games says little
const ordinal = (n) => `${n}${n % 10 === 1 && n % 100 !== 11 ? 'st' : n % 10 === 2 && n % 100 !== 12 ? 'nd' : n % 10 === 3 && n % 100 !== 13 ? 'rd' : 'th'}`;
const upDown = (n) => (n > 0 ? 'stat-up' : n < 0 ? 'stat-down' : '');

// One player's page: at a glance (record, best and most-played game, last
// game, streaks), their record in each game (sortable), head-to-head against
// everyone they've played with, and their recorded games.
export default function PlayerPage({ player, players, corePlayers, games, gameScores, plays, playedCounts, isAdmin, playerNames = new Map() }) {
  const [sort, setSort] = useState({ key: 'played', dir: 'desc' });
  const [showAll, setShowAll] = useState(false);
  useEffect(() => { setSort({ key: 'played', dir: 'desc' }); setShowAll(false); }, [player.id]);
  useEffect(() => {
    const prev = document.title;
    document.title = `${player.initials} · The Scoreboard`;
    return () => { document.title = prev; };
  }, [player.initials]);

  const fmtDay = (iso) => fmtPlayDate(iso, isAdmin);
  const isCore = corePlayers.some(p => p.id === player.id);
  const byId = new Map(players.map(p => [p.id, p]));
  const name = (id) => (byId.get(id) ? byId.get(id).initials : '?');
  const gameById = new Map(games.map(g => [g.id, g]));

  const overall = allTimeStats(players, plays, games, gameScores).find(r => r.player.id === player.id) || { played: 0, wins: 0 };
  const rows = playerGameRows(player, { games, plays, gameScores, playedCounts, isCore });
  const mine = playerPlays(player, plays);
  const streak = streaksIn(allRecordedPlays(plays)).find(r => r.playerId === player.id);
  const h2h = playerHeadToHead(player, players.filter(p => !p.hidden), games, plays);

  // ---- At a glance
  const tiles = [];
  tiles.push(<Tile key="rec" label="All time" value={`${fmtWins(overall.wins)} wins`} sub={`${overall.played} played · ${fmtPercent(overall.played ? overall.wins / overall.played : null)}`} />);
  const pool = rows.filter(r => r.played >= MIN_GAMES);
  const bestGame = [...pool].sort((a, b) => b.rate - a.rate || b.wins - a.wins)[0];
  if (bestGame) tiles.push(<Tile key="best" label="Best game" value={<a className="game-link" href={gameHref(bestGame.game)}>{bestGame.game.name}</a>} sub={`${fmtPercent(bestGame.rate)} · ${fmtWins(bestGame.wins)} of ${bestGame.played}`} />);
  if (rows.length) tiles.push(<Tile key="most" label="Most played" value={<a className="game-link" href={gameHref(rows[0].game)}>{rows[0].game.name}</a>} sub={`${rows[0].played} games`} />);
  if (mine.length) {
    const last = mine[0];
    tiles.push(<Tile key="last" label="Last game" value={gameById.get(last.gameId) ? <a className="game-link" href={gameHref(gameById.get(last.gameId))}>{last.gameName}</a> : last.gameName}
      sub={`${last.winnerIds.includes(player.id) ? 'Won' : `${last.winnerIds.map(name).join(' & ')} won`} · ${fmtDay(last.playedAt)}`} />);
  }
  if (streak && streak.longest > 1) {
    tiles.push(<Tile key="streak" label="Longest win streak" value={`${streak.longest} in a row`} sub={streak.current > 1 ? `On a ${streak.current}-game streak now` : `${fmtDay(streak.from)} – ${fmtDay(streak.to)}`} />);
  }

  // ---- By game (sortable)
  const scored = rows.some(r => r.best);
  const picked = rows.some(r => r.favourite);
  const cols = [
    { key: 'game', label: 'Game', get: r => r.game.name, dir: 'asc', left: true },
    { key: 'played', label: 'Played', get: r => r.played },
    { key: 'wins', label: 'Wins', get: r => r.wins },
    { key: 'rate', label: 'Win rate', get: r => r.rate },
    ...(scored ? [
      { key: 'avg', label: 'Avg score', get: r => r.avgScore },
      { key: 'best', label: 'Best', get: r => (r.best ? r.best.value : null) },
    ] : []),
    ...(picked ? [{ key: 'fav', label: 'Favourite', get: r => (r.favourite ? r.favourite.value : null), dir: 'asc', left: true }] : []),
  ];
  const { col, dir } = activeSort(cols, sort, 'played');

  // Their finish in a recorded game: "1st of 4" by score, else Won / —.
  const result = (p) => {
    const game = gameById.get(p.gameId);
    const placed = game ? placings(p, mainScoreField(game))[player.id] : null;
    const won = p.winnerIds.includes(player.id);
    if (placed) return <span className={won ? 'fw-semibold' : ''}>{ordinal(placed.place)} of {p.playerIds.length}</span>;
    return won ? <span className="fw-semibold">Won</span> : <span className="text-muted">—</span>;
  };

  return (
    <div className="game-page text-start">
      <a href="#/players" className="game-back">← Players</a>
      <div className="player-hero">
        <span className="player-badge" aria-hidden="true">{player.initials}</span>
        <div>
          <h2 className="game-title">{player.initials}</h2>
          <p className="game-meta mb-0">
            {player.hidden ? 'Test player' : isCore ? 'Regular' : 'Guest'}
            {isAdmin && playerNames.get(player.id) && <> · {playerNames.get(player.id)}</>}
          </p>
        </div>
      </div>

      {tiles.length > 0 && <div className="glance mt-3" aria-label="At a glance">{tiles}</div>}

      {rows.length > 0 && (
        <section className="mt-4">
          <h3 className="manage-subtitle mb-1">By game</h3>
          <Table size="sm" responsive className="small mb-1 stats-table">
            <SortHead cols={cols} col={col} dir={dir} onSort={c => setSort(prev => nextSort(prev, c))} />
            <tbody>
              {sortRows(rows, col.get, dir).map(r => (
                <tr key={r.game.id}>
                  <td className="text-nowrap"><a className="game-link" href={gameHref(r.game)}>{r.game.name}</a></td>
                  <td className="text-center">{r.played}</td>
                  <td className="text-center">{fmtWins(r.wins)}</td>
                  <td className="text-center">{fmtPercent(r.rate)}</td>
                  {scored && <>
                    <td className="text-center">{r.avgScore != null ? Math.round(r.avgScore) : '—'}</td>
                    <td className="text-center">{r.best ? r.best.value : '—'}</td>
                  </>}
                  {picked && (
                    <td className="text-nowrap">{r.favourite
                      ? <>{(o => o && <Swatch color={o.color} />)(optionFor(r.choiceField, r.favourite.value))}{r.favourite.value} <span className="text-muted">×{r.favourite.played}</span></>
                      : '—'}</td>
                  )}
                </tr>
              ))}
            </tbody>
          </Table>
          <p className="text-muted small">
            Tap a column to sort.
            {isCore && ' Played and wins include the main scoreboard\'s earlier games (only the winner was kept) and recorded games where a regular was missing.'}
            {scored && ' Scores and favourites come from recorded games with details.'}
          </p>
        </section>
      )}

      {h2h.length > 0 && (
        <section className="mt-4">
          <h3 className="manage-subtitle mb-1">Head to head</h3>
          <Table size="sm" responsive className="small mb-1 stats-table h2h">
            <thead><tr><th>Against</th><th className="text-center">Games</th><th className="text-center">Above–below</th></tr></thead>
            <tbody>
              {h2h.map(r => (
                <tr key={r.opponent.id}>
                  <td><a className="player-link fw-semibold" href={playerHref(r.opponent)}>{r.opponent.initials}</a>{!r.opponent.core && <span className="text-muted small ms-2">guest</span>}</td>
                  <td className="text-center">{r.games}</td>
                  <td className={`text-center ${upDown(r.ahead - r.behind)}`} title={`${player.initials} finished above ${r.opponent.initials} ${r.ahead} times, below ${r.behind}${r.level ? `, level ${r.level}` : ''}`}>
                    {r.ahead}–{r.behind}{r.level ? <span className="text-muted"> ({r.level} level)</span> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
          <p className="text-muted small">How often {player.initials} finished above–below each player, in recorded games they both played (by score when noted, otherwise by who won).</p>
        </section>
      )}

      <section className="mt-4">
        <h3 className="manage-subtitle mb-1">Recorded games <span className="text-muted">({mine.length})</span></h3>
        {mine.length === 0 ? (
          <p className="text-muted small">No games recorded individually yet.</p>
        ) : (
          <>
            <Table size="sm" responsive className="small mb-1">
              <thead><tr><th>Date</th><th>Game</th><th>Players</th><th className="d-none d-sm-table-cell">Result</th></tr></thead>
              <tbody>
                {(showAll ? mine : mine.slice(0, RECENT)).map(p => {
                  const game = gameById.get(p.gameId);
                  return (
                    <tr key={p.id}>
                      <td className="text-nowrap">
                        {fmtDay(p.playedAt)}
                        {!p.counted && <div><Badge bg="" className="badge-soft" title="A regular didn't play, so it doesn't change the main scoreboard">not on scoreboard</Badge></div>}
                        <div className="d-sm-none small">{result(p)}</div>
                      </td>
                      <td>{game ? <a className="game-link" href={gameHref(game)}>{p.gameName}</a> : p.gameName}</td>
                      <td>
                        {(game && PlayerLines({ play: p, game, label: name }))
                          || p.playerIds.map((id, i) => <React.Fragment key={id}>{i > 0 && ', '}<PlayerDetails play={p} game={game} playerId={id} label={p.winnerIds.includes(id) ? <strong>{name(id)}</strong> : name(id)} /></React.Fragment>)}
                      </td>
                      <td className="text-nowrap d-none d-sm-table-cell">{result(p)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
            {mine.length > RECENT && (
              <Button variant="link" size="sm" className="p-0" onClick={() => setShowAll(v => !v)}>
                {showAll ? 'Show fewer' : `Show all ${mine.length} games`}
              </Button>
            )}
          </>
        )}
      </section>
    </div>
  );
}
