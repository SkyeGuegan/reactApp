import React from 'react';
import { fmtWins } from './plays';
import { fmtPlayDate } from './dates';
import { gameHref, playerHref } from './route';
import { allRecordedPlays, streaksIn } from './insights';
import Tile from './Tile';

// Pure: the numbers behind the Scoreboard's at-a-glance strip.
//   leaders: regulars with the most main-scoreboard wins, and that total
//   last: the most recent recorded game
//   thisMonth: recorded games in the current calendar month (local time)
//   streak: the longest current win streak across every game (2+), if any
//   mostPlayed: the game played most (main scoreboard + other recorded games)
export function homeSummary({ games, corePlayers, gameScores, plays, playedCounts, now = new Date() }) {
  const totals = corePlayers.map(p => ({ player: p, wins: gameScores.filter(gs => gs.playerId === p.id).reduce((a, gs) => a + gs.score, 0) }));
  const top = Math.max(0, ...totals.map(t => t.wins));
  const leaders = top > 0 ? totals.filter(t => t.wins === top).map(t => t.player) : [];
  const recorded = allRecordedPlays(plays);
  const last = recorded.length ? recorded[recorded.length - 1] : null;
  const thisMonth = recorded.filter(p => {
    const d = new Date(p.playedAt);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }).length;
  const streak = streaksIn(recorded).filter(r => r.current > 1).sort((a, b) => b.current - a.current)[0] || null;
  const timesPlayed = (g) => (playedCounts.get(g.id) || 0) + recorded.filter(p => p.gameId === g.id && !p.counted).length;
  const mostPlayed = games.map(g => ({ game: g, played: timesPlayed(g) })).sort((a, b) => b.played - a.played)[0] || null;
  return { leaders, leaderWins: top, last, thisMonth, streak, mostPlayed };
}

// The Scoreboard's at-a-glance strip, above the main table.
export default function HomeSummary({ games, players, corePlayers, gameScores, plays, playedCounts, isAdmin }) {
  const s = homeSummary({ games, corePlayers, gameScores, plays, playedCounts });
  const byId = new Map(players.map(p => [p.id, p]));
  const who = (id) => (byId.get(id) ? <a className="player-link" href={playerHref(byId.get(id))}>{byId.get(id).initials}</a> : '?');
  const joined = (items) => items.map((x, i) => <React.Fragment key={i}>{i > 0 && ' & '}{x}</React.Fragment>);
  const lastGame = s.last && games.find(g => g.id === s.last.gameId);
  const month = new Date().toLocaleDateString([], { month: 'long' });

  const tiles = [];
  if (s.leaders.length) {
    tiles.push(<Tile key="lead" label={s.leaders.length > 1 ? 'Joint leaders' : 'Leader'} value={joined(s.leaders.map(p => who(p.id)))} sub={`${fmtWins(s.leaderWins)} wins on the main scoreboard`} />);
  }
  if (s.last) {
    tiles.push(<Tile key="last" label="Last game" value={lastGame ? <a className="game-link" href={gameHref(lastGame)}>{s.last.gameName}</a> : s.last.gameName}
      sub={<>{joined(s.last.winnerIds.map(who))} won · {fmtPlayDate(s.last.playedAt, isAdmin)}</>} />);
  }
  tiles.push(<Tile key="month" label={`Games in ${month}`} value={s.thisMonth} sub="recorded so far" />);
  if (s.streak) {
    tiles.push(<Tile key="streak" label="On a streak" value={<>{who(s.streak.playerId)} · {s.streak.current} in a row</>} sub="wins across every game" />);
  }
  if (s.mostPlayed && s.mostPlayed.played > 0) {
    tiles.push(<Tile key="most" label="Most played" value={<a className="game-link" href={gameHref(s.mostPlayed.game)}>{s.mostPlayed.game.name}</a>} sub={`${s.mostPlayed.played} games`} />);
  }
  if (tiles.length < 2) return null;
  return <div className="glance home-glance" aria-label="At a glance">{tiles}</div>;
}
