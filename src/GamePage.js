import React, { useEffect, useState } from 'react';
import { Table, Badge, Button, ButtonGroup, Form } from 'react-bootstrap';
import TrendsChart from './TrendsChart';
import PlayTrends from './PlayTrends';
import { gameStandings, playsForGame, fmtPercent } from './gameStats';
import { fmtWins } from './plays';
import { fmtPlayDate } from './dates';
import { fieldsOf, scoringStats, setupStats, optionFor, optionsOf, playerScoringStats, playerCounts, withPlayerCount, onlineRatesFor, gameLinks, playerDetailsOf } from './scoring';
import { recordedPlays, gameRecords, headToHead, winStreaks } from './insights';
import { Swatch, PlayerDetails, PlayerLines } from './Swatch';
import { playerHref } from './route';
import SetupTag from './SetupTag';
import Tile from './Tile';
import { sortRows, activeSort, nextSort, SortHead } from './sortTable';
import { splitOccasional, OccasionalToggle } from './Occasional';

// Choices with fewer games than this can be hidden from a choice table, so a
// single lucky game doesn't top the win rates.
export const MIN_GAMES = 3;
const RECENT = 10; // recent games shown before "Show all"

const plural = (label) => (/s$/i.test(label) ? label : `${label}s`);
const place = (n) => (n == null ? '—' : n.toFixed(1));
const whole = (n) => (n == null ? '—' : String(Math.round(n)));
const tenth = (n) => (n == null ? '—' : String(Math.round(n * 10) / 10));
const signed = (n) => (n == null ? '—' : `${n >= 0.5 ? '+' : n <= -0.5 ? '−' : ''}${Math.abs(Math.round(n))}`);
const upDown = (n) => (n > 0 ? 'stat-up' : n < 0 ? 'stat-down' : '');

// One game's page, top to bottom:
//   header (box art, links, admin buttons) · at a glance (headline numbers)
//   · a player-count filter for everything below it (when games had different
//   player counts) · Players (the main table's standings, or every recorded
//   game with scores) · one sortable table per choice field (e.g. Factions)
//   and Setups · Records & rivalries (records, head-to-head, streaks) · Wins
//   over time (from recorded games once most history is recorded) · Recent
//   games. Sections without data don't show.
export default function GamePage({ game, corePlayers, players, gameScores, plays, played, isAdmin, onRecord, onSetArt, onSetScoring }) {
  const [artFailed, setArtFailed] = useState(false);
  const [count, setCount] = useState(null); // only n-player games (null = all)
  const [mode, setMode] = useState('table'); // Players: 'table' | 'recorded'
  const [sort, setSort] = useState({ key: 'wins', dir: 'desc' }); // choice tables
  const [psort, setPsort] = useState({ key: 'wins', dir: 'desc' }); // All recorded players
  const [hideFew, setHideFew] = useState(true);
  const [showAllRecent, setShowAllRecent] = useState(false);
  const [showOccasional, setShowOccasional] = useState(false); // guests with a single game
  useEffect(() => setArtFailed(false), [game.imageUrl]);
  useEffect(() => {
    setCount(null); setMode('table'); setSort({ key: 'wins', dir: 'desc' }); setPsort({ key: 'wins', dir: 'desc' }); setHideFew(true); setShowAllRecent(false); setShowOccasional(false);
  }, [game.id]);
  useEffect(() => {
    const prev = document.title;
    document.title = `${game.name} · The Scoreboard`;
    return () => { document.title = prev; };
  }, [game.name]);

  const fmtDay = (iso) => fmtPlayDate(iso, isAdmin); // exact day for admins, month for visitors
  const byId = new Map(players.map(p => [p.id, p.initials]));
  const byPlayer = new Map(players.map(p => [p.id, p]));
  const name = (id) => byId.get(id) || '?';
  const coreIds = new Set(corePlayers.map(p => p.id));
  const earlier = Math.round(game.baselinePlays || 0);
  const fields = fieldsOf(game);

  // The player-count filter applies to everything below it.
  const allRecorded = recordedPlays(game, plays);
  const counts = playerCounts(game, plays);
  const n = counts.includes(count) ? count : null;
  const scoped = withPlayerCount(plays, n);
  const gamesWith = (k) => allRecorded.filter(p => p.playerIds.length === k).length;
  const recorded = recordedPlays(game, scoped);
  // Every game we know of: the earlier ones that kept only the winner plus
  // every recorded one. (The main table's Played counts only games with all
  // the regulars.)
  const total = Math.max(played, earlier + allRecorded.length);

  const { rows: standings, leaderIds } = gameStandings(game, corePlayers, gameScores, played, { plays, players });
  const hasGuests = standings.some(r => r.guest);
  const maxWins = Math.max(1, ...standings.map(r => r.wins));
  const playersMode = n ? 'recorded' : mode;
  const people = playerScoringStats(game, scoped);

  const stats = scoringStats(game, scoped);
  const numberStats = stats.filter(s => s.type === 'number' && s.best);
  const choiceStats = stats.filter(s => s.type === 'text' && s.rows.length);
  const setups = setupStats(game, scoped);
  const hasScoringData = numberStats.length > 0 || choiceStats.length > 0 || setups.length > 0;
  const choiceField = choiceStats.length ? choiceStats[0].field : null;

  // Records need a few scored games to mean anything.
  const MIN_RECORD_GAMES = 3;
  const rec = gameRecords(game, scoped);
  const records = rec && rec.games >= MIN_RECORD_GAMES ? rec : null;
  const rivals = corePlayers.filter(p => recorded.some(g => g.playerIds.includes(p.id)));
  const h2h = headToHead(game, scoped, rivals.map(p => p.id));
  const hasH2h = rivals.length > 1 && [...h2h.values()].some(r => r.games > 0);
  const streaks = winStreaks(game, scoped);

  const recent = playsForGame(game.id, scoped, isAdmin);
  const lastReal = playsForGame(game.id, plays, false)[0];
  const lastShown = recent.find(p => !p.test);
  // Charts from recorded games once they cover most of the history; until
  // then the score-history ledger (which includes pre-recording wins).
  const chartFromPlays = allRecorded.length > 0 && allRecorded.length >= earlier;

  const swatch = (field, value) => (o => o && <Swatch color={o.color} />)(optionFor(field, value));
  const choice = (field, c) => c && <>{swatch(field, c.value)}{c.value}</>;
  const choiceOf = (play, id) => {
    if (!choiceField) return null;
    const row = playerDetailsOf(play)[id] || {};
    return row[choiceField.key] || null;
  };
  // "SG (● Ice Maidens)": who set a score, with their choice that game.
  const byWith = (rec) => {
    const v = rec.play ? choiceOf(rec.play, rec.playerId) : null;
    return <>{name(rec.playerId)}{v && <> ({swatch(choiceField, v)}{v})</>}</>;
  };
  // Winners in bold, so the winner shows even where the Won column is hidden (phones).
  const withDetails = (play, id) => <PlayerDetails play={play} game={game} playerId={id} label={play.winnerIds.includes(id) ? <strong>{name(id)}</strong> : name(id)} />;
  const joined = (items) => items.map((x, i) => <React.Fragment key={i}>{i > 0 && ', '}{x}</React.Fragment>);
  // "SG 2, NI 1" — who has won with a setup, most first.
  const winsText = (wins) => [...wins.entries()].sort((a, b) => b[1] - a[1]).map(([id, w]) => `${name(id)} ${fmtWins(w)}`).join(', ');

  // ---- At a glance
  const tiles = [];
  tiles.push(<Tile key="played" label={n ? `${n}-player games` : 'Games played'} value={n ? gamesWith(n) : total}
    sub={!n && total !== played ? `${played} main scoreboard ${played === 1 ? 'game' : 'games'}` : null} />);
  if (lastShown) {
    tiles.push(<Tile key="last" label="Last winner" value={lastShown.winnerIds.map(name).join(' & ') || '—'} sub={fmtDay(lastShown.playedAt)} />);
  }
  for (const s of numberStats) {
    const lbl = s.field.label.toLowerCase();
    tiles.push(<Tile key={`best-${s.field.key}`} label={`Best ${lbl}${s.field.lowWins ? ' (lowest)' : ''}`} value={s.best.value} sub={<>{byWith(s.best)} · {fmtDay(s.best.playedAt)}</>} />);
    if (s.avgWin != null) tiles.push(<Tile key={`avg-${s.field.key}`} label={`Avg winning ${lbl}`} value={tenth(s.avgWin)} sub={`over ${s.games} ${s.games === 1 ? 'game' : 'games'}`} />);
  }
  if (choiceStats.length) {
    const s = choiceStats[0];
    const pool = s.rows.some(r => r.played >= MIN_GAMES) ? s.rows.filter(r => r.played >= MIN_GAMES) : s.rows;
    const top = [...pool].sort((a, b) => b.wins - a.wins || b.wins / b.played - a.wins / a.played)[0];
    if (top && top.wins > 0) tiles.push(<Tile key="top" label={`Top ${s.field.label.toLowerCase()}`} value={choice(s.field, top)} sub={`${fmtWins(top.wins)} wins in ${top.played}`} />);
  }
  if (streaks.length && streaks[0].longest > 1) {
    tiles.push(<Tile key="streak" label="Longest win streak" value={`${name(streaks[0].playerId)} · ${streaks[0].longest}`} sub={`${fmtDay(streaks[0].from)} – ${fmtDay(streaks[0].to)}`} />);
  }

  // ---- Players
  const playersTable = () => (playersMode === 'table' ? (
    <>
      <Table size="sm" className="game-standings mb-1">
        <thead><tr><th>Player</th><th className="text-center">Played</th><th className="text-center">Wins</th><th className="text-center">Win rate</th><th className="w-50" aria-hidden="true" /></tr></thead>
        <tbody>
          {(showOccasional ? standings : splitOccasional(standings, r => r.guest, r => r.played).shown).map(r => (
            <tr key={r.player.id}>
              <td className="fw-semibold">
                <a className="player-link" href={playerHref(r.player)}>{r.player.initials}</a>{leaderIds.has(r.player.id) && ' 👑'}
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
      <OccasionalToggle count={splitOccasional(standings, r => r.guest, r => r.played).folded.length} open={showOccasional} onToggle={() => setShowOccasional(v => !v)} />
      <p className="text-muted small">
        The main scoreboard: wins ÷ games played with all the regulars.
        {hasGuests && ' Guests count only individually recorded games.'}
      </p>
    </>
  ) : (() => {
    const scored = people.some(r => r.avgScore != null);
    const field = people.length ? people[0].choiceField : null;
    const picked = field && people.some(r => r.mostPlayed);
    const cols = [
      { key: 'player', label: 'Player', get: r => name(r.playerId), dir: 'asc', left: true },
      { key: 'played', label: 'Played', get: r => r.played },
      { key: 'wins', label: 'Wins', get: r => r.wins },
      { key: 'rate', label: 'Win rate', get: r => (r.played ? r.wins / r.played : null) },
      ...(scored ? [
        { key: 'avgPlace', label: 'Avg place', get: r => r.avgPlace, dir: 'asc', title: 'Average finishing place (1 = first)' },
        { key: 'avgScore', label: `Avg ${numberStats[0] ? numberStats[0].field.label.toLowerCase() : 'score'}`, get: r => r.avgScore },
        { key: 'best', label: 'Best', get: r => (r.best ? r.best.value : null), left: true },
      ] : []),
      ...(picked ? [
        { key: 'fav', label: 'Favourite', get: r => (r.mostPlayed ? r.mostPlayed.played : null), left: true, title: 'Most-played, sorted by how often' },
        { key: 'bestWith', label: 'Most wins with', get: r => (r.mostWins ? r.mostWins.wins : null), left: true, title: 'Sorted by wins with it' },
      ] : []),
    ];
    const { col, dir } = activeSort(cols, psort, 'wins');
    return (
      <>
        <Table size="sm" responsive className="small mb-1 stats-table">
          <SortHead cols={cols} col={col} dir={dir} onSort={c => setPsort(prev => nextSort(prev, c))} />
          <tbody>
            {sortRows(showOccasional ? people : splitOccasional(people, r => !coreIds.has(r.playerId), r => r.played).shown, col.get, dir).map(r => (
              <tr key={r.playerId}>
                <td className="fw-semibold text-nowrap">{byPlayer.get(r.playerId) ? <a className="player-link" href={playerHref(byPlayer.get(r.playerId))}>{name(r.playerId)}</a> : name(r.playerId)}{!coreIds.has(r.playerId) && <span className="text-muted small fw-normal ms-2">guest</span>}</td>
                <td className="text-center">{r.played}</td>
                <td className="text-center">{fmtWins(r.wins)}</td>
                <td className="text-center">{fmtPercent(r.played ? r.wins / r.played : null)}</td>
                {scored && <>
                  <td className="text-center">{place(r.avgPlace)}</td>
                  <td className="text-center">{whole(r.avgScore)}</td>
                  <td className="text-nowrap">{r.best ? <>{r.best.value}{choiceOf(r.best.play, r.playerId) && <span className="text-muted"> {swatch(choiceField, choiceOf(r.best.play, r.playerId))}{choiceOf(r.best.play, r.playerId)}</span>}</> : '—'}</td>
                </>}
                {picked && <>
                  <td className="text-nowrap">{r.mostPlayed ? <>{choice(field, r.mostPlayed)} <span className="text-muted">×{r.mostPlayed.played}</span></> : '—'}</td>
                  <td className="text-nowrap">{r.mostWins ? <>{choice(field, r.mostWins)} <span className="text-muted">{fmtWins(r.mostWins.wins)} of {r.mostWins.played}</span></> : '—'}</td>
                </>}
              </tr>
            ))}
          </tbody>
        </Table>
        <OccasionalToggle count={splitOccasional(people, r => !coreIds.has(r.playerId), r => r.played).folded.length} open={showOccasional} onToggle={() => setShowOccasional(v => !v)} />
        <p className="text-muted small">
          Tap a column to sort. Every recorded {n ? `${n}-player ` : ''}game, including ones not on the main scoreboard{earlier > 0 ? ` (the ${earlier} earlier ${earlier === 1 ? 'game' : 'games'} kept only the winner, so they're only on the main scoreboard)` : ''}.
        </p>
      </>
    );
  })());

  // ---- A sortable choice table (e.g. Factions)
  const choiceTable = (s) => {
    const online = onlineRatesFor(game, s.field);
    const scored = s.rows.some(r => r.avgScore != null);
    const few = s.rows.filter(r => r.played < MIN_GAMES).length;
    const canHide = few > 0 && few < s.rows.length;
    const shown = canHide && hideFew ? s.rows.filter(r => r.played >= MIN_GAMES) : s.rows;
    const cols = [
      { key: 'value', label: s.field.label, get: r => r.value, dir: 'asc', left: true },
      { key: 'played', label: 'Games', get: r => r.played },
      { key: 'wins', label: 'Wins', get: r => r.wins },
      { key: 'rate', label: 'Win rate', get: r => r.wins / r.played },
      ...(online ? [{ key: 'online', label: 'Online', get: r => (online.rates[r.value] == null ? null : online.rates[r.value]), title: `Win rate in online games on ${online.source}` }] : []),
      ...(scored ? [
        { key: 'avgPlace', label: 'Avg place', get: r => r.avgPlace, dir: 'asc', title: 'Average finishing place (1 = first)' },
        { key: 'avgScore', label: `Avg ${s.scoreField.label.toLowerCase()}`, get: r => r.avgScore },
        { key: 'avgDiff', label: 'vs table', get: r => r.avgDiff, title: "Average points above or below the table's average" },
        { key: 'best', label: 'Best', get: r => (r.best ? r.best.value : null), left: true },
      ] : []),
    ];
    const { col, dir } = activeSort(cols, sort, 'wins');
    const sorted = sortRows(shown, col.get, dir);
    const used = new Set(s.rows.map(r => r.value));
    const untried = n ? [] : optionsOf(s.field).filter(o => !used.has(o.name));
    return (
      <section key={s.field.key} className="mt-4">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-1">
          <h3 className="manage-subtitle m-0">{plural(s.field.label)}</h3>
          {canHide && (
            <Form.Check type="switch" id={`hide-few-${s.field.key}`} className="small mb-0" checked={hideFew} onChange={e => setHideFew(e.target.checked)}
              label={`Hide ones with under ${MIN_GAMES} games (${few})`} />
          )}
        </div>
        <Table size="sm" responsive className="small mb-1 stats-table">
          <SortHead cols={cols} col={col} dir={dir} onSort={c => setSort(prev => nextSort(prev, c))} />
          <tbody>
            {sorted.map(r => (
              <tr key={r.value}>
                <td className="text-nowrap">{swatch(s.field, r.value)}{r.value}</td>
                <td className="text-center">{r.played}</td>
                <td className="text-center">{fmtWins(r.wins)}</td>
                <td className="text-center">{fmtPercent(r.wins / r.played)}</td>
                {online && <td className="text-center text-muted">{fmtPercent(online.rates[r.value])}</td>}
                {scored && <>
                  <td className="text-center">{place(r.avgPlace)}</td>
                  <td className="text-center">{whole(r.avgScore)}</td>
                  <td className={`text-center ${upDown(Math.round(r.avgDiff || 0))}`}>{signed(r.avgDiff)}</td>
                  <td className="text-nowrap">{r.best ? <>{r.best.value} <span className="text-muted">{name(r.best.playerId)}</span></> : '—'}</td>
                </>}
              </tr>
            ))}
          </tbody>
        </Table>
        {untried.length > 0 && (
          <p className="small mb-1"><span className="text-muted">Not played yet:</span> {joined(untried.map(o => <span key={o.name} className="text-nowrap">{swatch(s.field, o.name)}{o.name}</span>))}</p>
        )}
        <p className="text-muted small mb-0">
          Tap a column to sort.
          {scored && <> Avg place: 1 = first. vs table: points above or below the table's average that game.</>}
          {online && <> Online: win rate in about 155,000 online games on <a href={online.url} target="_blank" rel="noopener noreferrer">{online.source}</a>.</>}
        </p>
      </section>
    );
  };

  // ---- Records & rivalries
  const recordLine = (rec, label, value) => rec && (
    <Tile label={label} value={value}
      sub={<>{byWith(rec)}
        {rec.runnerUpId && <> {rec.score} vs {name(rec.runnerUpId)} {rec.score + (records.field.lowWins ? rec.margin : -rec.margin)}</>}
        {' · '}{fmtDay(rec.play.playedAt)}</>} />
  );
  const hasRecords = !!records || hasH2h || streaks.length > 0;

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
            {total} played{lastReal && <> · last played {fmtDay(lastReal.playedAt)}</>}
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

      {counts.length > 1 && (
        <div className="count-filter mt-3">
          <span className="text-muted small">Show</span>
          <ButtonGroup size="sm" aria-label="Player count">
            {[null, ...counts].map(k => (
              <Button key={k || 'all'} variant={n === k ? 'dark' : 'outline-secondary'} onClick={() => setCount(k)}>
                {k ? `${k}p` : 'All games'}{k && <span className="count-n">{gamesWith(k)}</span>}
              </Button>
            ))}
          </ButtonGroup>
        </div>
      )}

      {tiles.length > 1 && <div className="glance mt-3" aria-label="At a glance">{tiles}</div>}

      <section className="mt-4">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-1">
          <h3 className="manage-subtitle m-0">Players</h3>
          {allRecorded.length > 0 && (
            <ButtonGroup size="sm" aria-label="Which games">
              <Button variant={playersMode === 'table' ? 'dark' : 'outline-secondary'} disabled={!!n} onClick={() => setMode('table')}
                title={n ? 'The main scoreboard counts every game; pick All games to see it' : undefined}>Main scoreboard</Button>
              <Button variant={playersMode === 'recorded' ? 'dark' : 'outline-secondary'} onClick={() => setMode('recorded')}>All recorded</Button>
            </ButtonGroup>
          )}
        </div>
        {playersTable()}
      </section>

      {fields.length > 0 && !hasScoringData && (
        <p className="text-muted small mt-3">
          No {fields.map(f => f.label.toLowerCase()).join(' or ')} noted yet. They're optional when recording a game.
        </p>
      )}

      {choiceStats.map(choiceTable)}

      {setups.length > 0 && (
        <section className="mt-4">
          <h3 className="manage-subtitle mb-1">Setups</h3>
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
                    <td className="text-center">{s.avgWin != null ? tenth(s.avgWin) : '—'}</td>
                  </>}
                  <td>{winsText(s.wins)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </section>
      )}

      {hasRecords && (
        <section className="mt-4">
          <h3 className="manage-subtitle mb-2">Records &amp; rivalries</h3>
          {records && (
            <div className="glance mb-3">
              {recordLine(records.biggestWin, 'Biggest win', `by ${records.biggestWin && records.biggestWin.margin}`)}
              {records.closest && records.closest !== records.biggestWin && recordLine(records.closest, 'Closest game', `by ${records.closest.margin}`)}
              {recordLine(records.bestLosing, `Best losing ${records.field.label.toLowerCase()}`, records.bestLosing && records.bestLosing.score)}
              {recordLine(records.worstWinning, `Lowest winning ${records.field.label.toLowerCase()}`, records.worstWinning && records.worstWinning.score)}
            </div>
          )}
          {hasH2h && (
            <>
              <h4 className="score-stat-label mb-1">Head to head</h4>
              <Table size="sm" responsive className="small mb-1 stats-table h2h">
                <thead><tr><th />{rivals.map(p => <th key={p.id} className="text-center">vs {p.initials}</th>)}</tr></thead>
                <tbody>
                  {rivals.map(a => (
                    <tr key={a.id}>
                      <td className="fw-semibold">{a.initials}</td>
                      {rivals.map(b => {
                        if (a.id === b.id) return <td key={b.id} className="text-center text-muted">—</td>;
                        const r = h2h.get(`${a.id}|${b.id}`);
                        return (
                          <td key={b.id} className={`text-center ${upDown(r.ahead - r.behind)}`}
                            title={`${a.initials} finished above ${b.initials} ${r.ahead} times, below ${r.behind}${r.level ? `, level ${r.level}` : ''} (${r.games} games)`}>
                            {r.games ? `${r.ahead}–${r.behind}` : '—'}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </Table>
              <p className="text-muted small">Times the row player finished above–below the column player, in recorded games they both played.</p>
            </>
          )}
          {streaks.length > 0 && (
            <p className="small mb-0">
              <span className="text-muted">Longest win streaks:</span>{' '}
              {joined(streaks.slice(0, 4).map(r => <span key={r.playerId} className="text-nowrap">{name(r.playerId)} {r.longest}</span>))}
              {streaks.some(r => r.current > 0) && <>
                {' · '}<span className="text-muted">On a streak now:</span>{' '}
                {joined(streaks.filter(r => r.current > 0).map(r => <span key={r.playerId} className="text-nowrap">{name(r.playerId)} {r.current}</span>))}
              </>}
            </p>
          )}
        </section>
      )}

      <section className="mt-4">
        <h3 className="manage-subtitle mb-1">Wins over time</h3>
        {chartFromPlays ? (
          <>
            <PlayTrends game={game} plays={scoped} label={name} exactDates={isAdmin} scoreLabel={numberStats[0] ? numberStats[0].field.label.toLowerCase() : 'score'} />
            <p className="text-muted small">From recorded games{n ? ` with ${n} players` : ''}.{earlier > 0 && (earlier === 1 ? ' The 1 earlier game without a date isn’t shown.' : ` The ${earlier} earlier games without a date aren’t shown.`)}</p>
          </>
        ) : (
          <TrendsChart gameId={game.id} exactDates={isAdmin} />
        )}
      </section>

      <section className="mt-4">
        <h3 className="manage-subtitle mb-1">Recent games</h3>
        {recent.length === 0 ? (
          <p className="text-muted small">No games recorded individually yet.</p>
        ) : (
          <>
            <Table size="sm" responsive className="small mb-1">
              <thead><tr><th>Date</th><th>Players</th><th className="d-none d-sm-table-cell">Won</th></tr></thead>
              <tbody>
                {(showAllRecent ? recent : recent.slice(0, RECENT)).map(p => (
                  <tr key={p.id}>
                    <td className="text-nowrap">
                      {fmtDay(p.playedAt)}
                      {p.test && <div><Badge bg="secondary">test</Badge></div>}
                      {!p.test && !p.counted && <div><Badge bg="" className="badge-soft" title="A regular didn't play, so it doesn't change the main scoreboard">not on scoreboard</Badge></div>}
                    </td>
                    <td>
                      {PlayerLines({ play: p, game, label: name }) || joined(p.playerIds.map(id => withDetails(p, id)))}
                      <div><SetupTag play={p} game={game} /></div>
                    </td>
                    <td className="fw-semibold d-none d-sm-table-cell">{p.winnerIds.map(name).join(' & ')}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
            {recent.length > RECENT && (
              <Button variant="link" size="sm" className="p-0" onClick={() => setShowAllRecent(v => !v)}>
                {showAllRecent ? 'Show fewer' : `Show all ${recent.length} games`}
              </Button>
            )}
          </>
        )}
        {earlier > 0 && !n && (
          <p className="text-muted small mt-2">
            Plus {earlier} earlier {earlier === 1 ? 'game' : 'games'} between {corePlayers.map(p => p.initials).join(', ')} from before games were recorded individually — only the winner was kept, and they're included on the main scoreboard.
          </p>
        )}
      </section>

      {game.imageUrl && <p className="board-credit mb-0">Box art from <a href="https://boardgamegeek.com" target="_blank" rel="noopener noreferrer">BoardGameGeek</a></p>}
    </div>
  );
}
