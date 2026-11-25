import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Spinner from 'react-bootstrap/Spinner';
import { fetchAllPages } from './api';
import { listScoreEvents } from './graphql/customQueries';
import { buildCumulativeSeries } from './trends';

// Line colors, cycled if there are more players than entries.
const COLORS = ['#8a6d18', '#2c7be5', '#d6336c', '#2fb344', '#9b51e0', '#e8590c', '#0ca678', '#495057'];

// Axis ticks: "Jan 2025". Tooltip: the full date.
const fmtMonth = (ms) => new Date(ms).toLocaleDateString([], { month: 'short', year: 'numeric' });
const fmtDate = (ms) => new Date(ms).toLocaleDateString();

// The x-axis is real time (ms since epoch), so quiet months show as flat
// stretches instead of being squeezed out. A final point at "now" carries the
// current totals to today.
function withTimeAxis(series) {
  if (!series.length) return series;
  const points = series.map(p => ({ ...p, t: Date.parse(p.time) }));
  const last = points[points.length - 1];
  const now = Date.now();
  if (now > last.t) points.push({ ...last, time: new Date(now).toISOString(), t: now });
  return points;
}

// One tick per month (thinned to at most ~8 so labels don't collide).
function monthTicks(min, max) {
  const ticks = [];
  const d = new Date(min);
  d.setDate(1); d.setHours(0, 0, 0, 0); d.setMonth(d.getMonth() + 1);
  for (; d.getTime() <= max; d.setMonth(d.getMonth() + 1)) ticks.push(d.getTime());
  const step = Math.max(1, Math.ceil(ticks.length / 8));
  return ticks.filter((_, i) => i % step === 0);
}

// Lazily loads the ScoreEvent history (deliberately not fetched on the table
// view — events grow one-per-click) and charts each player's cumulative wins
// over time. Players are derived from the events' denormalized initials, so the
// legend stays correct even after a rename/delete.
// With `gameId`, only that game's history is charted (a game's page).
export default function TrendsChart({ gameId = null } = {}) {
  const [series, setSeries] = useState([]);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const events = await fetchAllPages(listScoreEvents, 'listScoreEvents');
        if (!active) return;
        const built = buildCumulativeSeries(gameId ? events.filter(e => e.gameId === gameId) : events);
        setSeries(withTimeAxis(built.series));
        setPlayers(built.players);
      } catch (err) {
        console.error('Failed to load score history', err);
        if (active) setError(true);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [gameId]);

  if (loading) {
    return (
      <div style={{ padding: '10px' }}>
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </div>
    );
  }

  if (error) {
    return <p style={{ padding: '10px', color: '#a00' }}>Couldn't load the score history.</p>;
  }

  if (!series.length) {
    return (
      <p style={{ padding: '10px', fontStyle: 'italic', color: '#666' }}>
        No history yet — play some games and the trend will appear here.
      </p>
    );
  }

  return (
    <div style={{ width: '100%', height: 420, padding: '10px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={series} margin={{ top: 16, right: 24, bottom: 8, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="t"
            type="number"
            scale="time"
            domain={['dataMin', 'dataMax']}
            ticks={monthTicks(series[0].t, series[series.length - 1].t)}
            tickFormatter={fmtMonth}
          />
          <YAxis allowDecimals />
          <Tooltip labelFormatter={fmtDate} />
          <Legend />
          {players.map((p, i) => (
            <Line
              key={p}
              type="stepAfter"
              dataKey={p}
              stroke={COLORS[i % COLORS.length]}
              dot={false}
              strokeWidth={2}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
