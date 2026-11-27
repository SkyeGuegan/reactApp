import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Spinner from 'react-bootstrap/Spinner';
import { fetchAllPages } from './api';
import { listScoreEvents } from './graphql/customQueries';
import { buildCumulativeSeries } from './trends';
import { fmtPlayDate } from './dates';
import { COLORS, fmtMonth, withTimeAxis, monthTicks } from './chartAxis';

// Lazily loads the ScoreEvent history (deliberately not fetched on the table
// view — events grow one-per-click) and charts each player's cumulative wins
// over time. Players are derived from the events' denormalized initials, so the
// legend stays correct even after a rename/delete.
// With `gameId`, only that game's history is charted (a game's page).
export default function TrendsChart({ gameId = null, exactDates = false } = {}) {
  // Tooltip date: exact day for admins, month for visitors.
  const fmtDate = (ms) => fmtPlayDate(ms, exactDates);
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
