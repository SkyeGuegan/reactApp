import React from 'react';
import { Button } from 'react-bootstrap';

// Guests who have played only this many games (or fewer) are "occasional":
// player tables fold them behind a "Show N occasional guests" link so the
// regulars and repeat guests stay in view.
export const OCCASIONAL_GAMES = 1;

// Split rows into the ones shown by default and the occasional guests.
// isGuest(row) and played(row) read the row.
export function splitOccasional(rows, isGuest, played) {
  const occasional = (r) => isGuest(r) && played(r) <= OCCASIONAL_GAMES;
  return { shown: rows.filter(r => !occasional(r)), folded: rows.filter(occasional) };
}

// The link under a table that shows or hides the occasional guests.
export function OccasionalToggle({ count, open, onToggle }) {
  if (!count) return null;
  return (
    <Button variant="link" size="sm" className="p-0 mb-2" aria-expanded={open} onClick={onToggle}>
      {open ? 'Hide occasional guests' : `Show ${count} occasional ${count === 1 ? 'guest' : 'guests'} (1 game)`}
    </Button>
  );
}
