// Optional per-game scoring details (pure, unit-tested).
//
// A game's `scoreFields` (AWSJSON) lists what to collect per player when a
// game is recorded, e.g. Catan: [{ key: 'points', label: 'Victory points',
// type: 'number' }]; Terra Mystica adds { key: 'faction', label: 'Faction',
// type: 'text', options: [...] }. A play's `details` (AWSJSON) holds the values:
// { [playerId]: { points: 10, faction: 'Witches' } }. Everything is optional.

// AWSJSON arrives as a string (or already parsed); be forgiving.
export function parseJson(value, fallback) {
  if (value == null || value === '') return fallback;
  if (typeof value !== 'string') return value;
  try { return JSON.parse(value); } catch { return fallback; }
}

export const fieldsOf = (game) => {
  const f = parseJson(game && game.scoreFields, []);
  return Array.isArray(f) ? f.filter(x => x && x.key && x.label) : [];
};
export const detailsOf = (play) => {
  const d = parseJson(play && play.details, {});
  return d && typeof d === 'object' ? d : {};
};

// "Victory points" -> "victory_points"; unique within the list.
export function fieldKey(label, existing = []) {
  const base = (label || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'field';
  let key = base; let n = 2;
  while (existing.includes(key)) key = `${base}_${n++}`;
  return key;
}

// Base-game Terra Mystica factions, offered as suggestions (any text allowed).
export const TERRA_MYSTICA_FACTIONS = [
  'Alchemists', 'Auren', 'Chaos Magicians', 'Cultists', 'Darklings', 'Dwarves', 'Engineers',
  'Fakirs', 'Giants', 'Halflings', 'Mermaids', 'Nomads', 'Swarmlings', 'Witches',
];

// Ready-made setups offered in the Scoring details dialog.
export const PRESETS = {
  points: [{ key: 'points', label: 'Points', type: 'number' }],
  victoryPoints: [{ key: 'points', label: 'Victory points', type: 'number' }],
  factionPoints: [
    { key: 'faction', label: 'Faction', type: 'text', options: TERRA_MYSTICA_FACTIONS },
    { key: 'points', label: 'Points', type: 'number' },
  ],
};

// Keep only filled-in values, typed: numbers as numbers, text trimmed.
// raw: { [playerId]: { [key]: string } }  ->  same shape, empty dropped.
export function cleanDetails(raw, fields, playerIds) {
  const out = {};
  for (const id of playerIds) {
    const row = {};
    for (const f of fields) {
      const v = raw && raw[id] ? raw[id][f.key] : undefined;
      if (v == null || String(v).trim() === '') continue;
      if (f.type === 'number') {
        const n = Number(v);
        if (Number.isFinite(n)) row[f.key] = n;
      } else {
        row[f.key] = String(v).trim();
      }
    }
    if (Object.keys(row).length) out[id] = row;
  }
  return out;
}

// Players with the highest value of a number field (ties -> several).
export function topScorers(details, key, playerIds) {
  let best = -Infinity; let ids = [];
  for (const id of playerIds) {
    const v = details[id] && details[id][key];
    if (typeof v !== 'number') continue;
    if (v > best) { best = v; ids = [id]; } else if (v === best) ids.push(id);
  }
  return ids;
}

// Per-game stats from recorded plays' details.
//  - number fields: best score (value, player, play) and average winning score
//  - text fields: per value, games played and won with it (e.g. faction win rates)
export function scoringStats(game, plays) {
  const fields = fieldsOf(game);
  const live = plays.filter(p => p.gameId === game.id && !p.voided && !p.test);
  return fields.map(f => {
    if (f.type === 'number') {
      let best = null; const winning = [];
      for (const p of live) {
        const d = detailsOf(p);
        for (const [pid, row] of Object.entries(d)) {
          const v = row[f.key];
          if (typeof v !== 'number') continue;
          if (!best || v > best.value) best = { value: v, playerId: pid, playedAt: p.playedAt };
          if (p.winnerIds.includes(pid)) winning.push(v);
        }
      }
      const avgWin = winning.length ? winning.reduce((a, b) => a + b, 0) / winning.length : null;
      return { field: f, type: 'number', best, avgWin, games: winning.length };
    }
    const byValue = new Map();
    for (const p of live) {
      const d = detailsOf(p);
      for (const [pid, row] of Object.entries(d)) {
        const v = row[f.key];
        if (!v) continue;
        const s = byValue.get(v) || { value: v, played: 0, wins: 0 };
        s.played += 1;
        if (p.winnerIds.includes(pid)) s.wins += 1 / p.winnerIds.length;
        byValue.set(v, s);
      }
    }
    const rows = [...byValue.values()].sort((a, b) => b.wins - a.wins || b.played - a.played || a.value.localeCompare(b.value));
    return { field: f, type: 'text', rows };
  });
}
