import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { COLORS, fmtMonth, monthTicks, withTimeAxis } from './chartAxis';
import { cumulativeWins, winningScores } from './insights';
import { fmtPlayDate } from './dates';

// Charts from a game's recorded plays (used once most of its history is
// recorded, so the dates are the games' own): each player's cumulative wins,
// and — when the game is scored — the winning score per game with a running
// average.
export default function PlayTrends({ game, plays, label, exactDates = false, scoreLabel = 'points' }) {
  const fmtDate = (ms) => fmtPlayDate(ms, exactDates);
  const { series, labels } = cumulativeWins(game, plays, label);
  const timed = withTimeAxis(series);
  const scores = winningScores(game, plays).map(p => ({ ...p, t: Date.parse(p.time) }));

  if (!timed.length) return <p className="text-muted small">No recorded games yet.</p>;
  const ticks = (pts) => monthTicks(pts[0].t, pts[pts.length - 1].t);
  const round = (v) => Math.round(v * 100) / 100;

  return (
    <>
      <div className="play-chart">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={timed} margin={{ top: 12, right: 16, bottom: 4, left: -16 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="t" type="number" scale="time" domain={['dataMin', 'dataMax']} ticks={ticks(timed)} tickFormatter={fmtMonth} />
            <YAxis allowDecimals={false} />
            <Tooltip labelFormatter={fmtDate} formatter={round} />
            <Legend />
            {labels.map((l, i) => (
              <Line key={l} type="stepAfter" dataKey={l} stroke={COLORS[i % COLORS.length]} dot={false} strokeWidth={2} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      {scores.length >= 3 && (
        <>
          <h4 className="score-stat-label mt-3 mb-1">Winning {scoreLabel} per game</h4>
          <div className="play-chart play-chart-short">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={scores} margin={{ top: 12, right: 16, bottom: 4, left: -16 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="t" type="number" scale="time" domain={['dataMin', 'dataMax']} ticks={ticks(scores)} tickFormatter={fmtMonth} />
                <YAxis domain={['auto', 'auto']} allowDecimals={false} />
                <Tooltip labelFormatter={fmtDate} />
                <Legend />
                <Line name="Winning score" dataKey="score" stroke={COLORS[0]} strokeOpacity={0.5} dot={{ r: 3 }} strokeWidth={1} />
                <Line name="Average of last 5" dataKey="avg" stroke={COLORS[1]} dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </>
  );
}
