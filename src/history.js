// Pure helpers for the admin score-history list, kept out of the component so
// they're unit-testable without rendering.

// Newest first. Ties keep their original order.
export function sortNewestFirst(events) {
  return [...events].sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));
}

// The GameScore cell a voided event must be reversed against, or null when the
// game or player has since been deleted (then there's no total to correct and
// voiding only removes the event from the history/graph).
export function cellForEvent(event, gameScores) {
  return gameScores.find(gs => gs.gameId === event.gameId && gs.playerId === event.playerId) || null;
}

// Scores never go below 0. The incrementScore resolver enforces the same rule
// server-side; this lets the UI refuse early with a clear message.
export function canApplyDelta(score, delta) {
  return score + delta >= 0;
}

// "+1", "−1", "+0.5" — signed, with a real minus sign.
export function formatDelta(delta) {
  return delta > 0 ? `+${delta}` : `−${Math.abs(delta)}`;
}
