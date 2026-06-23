import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Spinner from 'react-bootstrap/Spinner';
import { fetchAllPages } from './api';
import { listScoreEvents } from './graphql/customQueries';
import { buildCumulativeSeries } from './trends';

// Line colors, cycled if there are more players than entries.
const COLORS = ['#8a6d18', '#2c7be5', '#d6336c', '#2fb344', '#9b51e0', '#e8590c', '#0ca678', '#495057'];

// Format an ISO timestamp as a short local date for the axis / tooltip.
const fmtDate = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString();
};

// Lazily loads the ScoreEvent history (deliberately not fetched on the table
// view — events grow one-per-click) and charts each player's cumulative wins
// over time. Players are derived from the events' denormalized initials, so the
// legend stays correct even after a rename/delete.
export default function TrendsChart() {
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
        const built = buildCumulativeSeries(events);
        setSeries(built.series);
        setPlayers(built.players);
      } catch (err) {
        console.error('Failed to load score history', err);
        if (active) setError(true);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

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
          <XAxis dataKey="time" tickFormatter={fmtDate} minTickGap={32} />
          <YAxis allowDecimals />
          <Tooltip labelFormatter={fmtDate} />
          <Legend />
          {players.map((p, i) => (
            <Line
              key={p}
              type="monotone"
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
