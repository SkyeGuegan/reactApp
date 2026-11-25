// Pure logic for the "Pick a game" wheel (unit-tested, no React).

const DAY = 24 * 60 * 60 * 1000;

// Latest recorded play (non-voided, non-test) per game id -> ms timestamp.
export function lastPlayedByGame(plays) {
  const last = new Map();
  for (const p of plays) {
    if (p.voided || p.test) continue;
    const t = Date.parse(p.playedAt);
    if (!Number.isNaN(t) && t > (last.get(p.gameId) || 0)) last.set(p.gameId, t);
  }
  return last;
}

// How likely each entry is to come up. Without "favour stale" every game is
// equal. With it, games come up more the longer it's been since they were
// last recorded as played: weight 1 for "played this week", rising by 1 per
// month to a cap of 6. Games with no recorded play (older history only, or a
// new game typed in) count as "a long time ago" (weight 4).
// entries: [{ key, gameId? }]; returns weights in the same order.
export function pickWeights(entries, { favorStale = false, lastPlayed = new Map(), now = Date.now() } = {}) {
  return entries.map(e => {
    if (!favorStale) return 1;
    const t = e.gameId ? lastPlayed.get(e.gameId) : undefined;
    if (!t) return 4;
    const months = Math.max(0, (now - t) / (30 * DAY));
    return Math.min(6, 1 + months);
  });
}

// Index chosen in proportion to weights. rand() in [0, 1).
export function pickWeighted(weights, rand = Math.random) {
  const total = weights.reduce((a, w) => a + w, 0);
  if (!(total > 0)) return -1;
  let r = rand() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r < 0) return i;
  }
  return weights.length - 1;
}

// Wheel segments: each entry's slice is proportional to its weight, so the
// wheel shows the real odds. Angles in degrees, clockwise from the top.
export function wheelSegments(weights) {
  const total = weights.reduce((a, w) => a + w, 0) || 1;
  let a = 0;
  return weights.map(w => {
    const start = a;
    a += (w / total) * 360;
    return { start, end: a };
  });
}

// New wheel rotation (degrees, always increasing) that spins `turns` full
// times and stops with the pointer (at the top) inside segment `seg`, at a
// random spot away from its edges.
export function spinRotation(current, seg, rand = Math.random, turns = 5) {
  const span = seg.end - seg.start;
  const target = seg.start + span * (0.15 + 0.7 * rand());
  const delta = (((360 - target) - (current % 360)) % 360 + 360) % 360;
  return current + turns * 360 + delta;
}

// Which segment is under the pointer for a given rotation (for checking).
export function segmentAtPointer(segments, rotation) {
  const angle = ((360 - (rotation % 360)) % 360 + 360) % 360;
  return segments.findIndex(s => angle >= s.start && angle < s.end);
}
