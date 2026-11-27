import React from 'react';

// A small headline number (the "at a glance" strips): label, value, and a
// line of detail. Lay several out in a <div className="glance">.
export default function Tile({ label, value, sub }) {
  return (
    <div className="glance-tile">
      <span className="score-stat-label">{label}</span>
      <span className="glance-value">{value}</span>
      {sub && <span className="glance-sub">{sub}</span>}
    </div>
  );
}
