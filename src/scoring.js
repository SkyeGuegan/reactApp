// Optional per-game scoring details (pure, unit-tested).
//
// A game's `scoreFields` (AWSJSON) lists what to collect when a game is
// recorded. Each field:
//   { key, label, type: 'number' | 'text',
//     scope?: 'game',        // asked once for the whole game (default: per player)
//     multi?: true,          // text with options: pick any number of them
//     lowWins?: true,        // number: lower is better (Hearts, Formula D finish)
//     emptyLabel?: string,   // game field: what nothing picked means ("Base game")
//     options?: [string | { name, bggId?, imageUrl? }] }  // suggestions / choices, with optional box art
// A play's `details` (AWSJSON) holds the values: per player under their id, and
// game-level values under GAME_KEY:
//   { [playerId]: { points: 10 }, _game: { expansions: ['Seafarers'] } }
// Everything is optional.

export const GAME_KEY = '_game';

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
export const playerFields = (game) => fieldsOf(game).filter(f => f.scope !== 'game');
export const gameFields = (game) => fieldsOf(game).filter(f => f.scope === 'game');

export const detailsOf = (play) => {
  const d = parseJson(play && play.details, {});
  return d && typeof d === 'object' ? d : {};
};
// Per-player details only ({ [playerId]: row }).
export const playerDetailsOf = (play) => {
  const { [GAME_KEY]: _ignored, ...rest } = detailsOf(play);
  return rest;
};
export const gameDetailsOf = (play) => detailsOf(play)[GAME_KEY] || {};

// Options may be plain names or { name, bggId, imageUrl }.
export const optionsOf = (field) =>
  (field.options || []).map(o => (typeof o === 'string' ? { name: o } : o)).filter(o => o && o.name);
export const optionNames = (field) => optionsOf(field).map(o => o.name);

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
export const ROOT_FACTIONS = ['Marquise de Cat', 'Eyrie Dynasties', 'Woodland Alliance', 'Vagabond'];
// The Catan expansions we own.
export const CATAN_EXPANSIONS = ['Seafarers', 'Cities & Knights', 'Traders & Barbarians', 'Explorers & Pirates'];

const points = { key: 'points', label: 'Points', type: 'number' };
const vp = { key: 'points', label: 'Victory points', type: 'number' };
const lowPoints = { ...points, lowWins: true };

// Ready-made setups offered in the Scoring details dialog.
export const PRESETS = {
  points: [points],
  victoryPoints: [vp],
  lowPoints: [lowPoints],
  factionPoints: [
    { key: 'faction', label: 'Faction', type: 'text', options: TERRA_MYSTICA_FACTIONS },
    points,
  ],
};

// What we collect for each game on the board, from its rules (keyed by
// lower-case name). Used by the dialog's "Suggested" button.
export const SUGGESTED = {
  'settlers of catan': [
    { key: 'expansions', label: 'Expansions', type: 'text', scope: 'game', multi: true, emptyLabel: 'Base game', options: CATAN_EXPANSIONS },
    vp,
  ],
  'terra mystica': PRESETS.factionPoints,
  cribbage: [points],                     // first to 121; the loser's score shows the margin
  dominion: [vp],
  'five crowns': [lowPoints],
  'formula d': [
    { key: 'track', label: 'Track', type: 'text', scope: 'game' },
    { key: 'finish', label: 'Finish position', type: 'number', lowWins: true },
  ],
  hearts: [lowPoints],                    // game ends when someone reaches 100
  'muffin time': [],                      // win = exactly 10 cards; nothing to score
  phase10: [
    { key: 'phase', label: 'Phase reached', type: 'number' },
    lowPoints,                            // tie-break: fewest points
  ],
  'puerto rico': [vp],
  root: [
    { key: 'faction', label: 'Faction', type: 'text', options: ROOT_FACTIONS },
    vp,                                   // blank for a dominance win
  ],
  'small world': [{ key: 'coins', label: 'Coins', type: 'number' }],
  'sushi go!': [points],
  'ticket to ride': [
    { key: 'map', label: 'Map', type: 'text', scope: 'game' },
    points,
  ],
};
export const suggestedFor = (game) => (game && SUGGESTED[game.name.trim().toLowerCase()]) || null;

function cleanValue(f, v) {
  if (f.multi) {
    const list = (Array.isArray(v) ? v : [v]).map(x => String(x == null ? '' : x).trim()).filter(Boolean);
    return list.length ? list : undefined;
  }
  if (v == null || String(v).trim() === '') return undefined;
  if (f.type === 'number') {
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  }
  return String(v).trim();
}

// Keep only filled-in values, typed: numbers as numbers, text trimmed, multi
// picks as arrays. raw: { [playerId]: { [key]: value }, _game: { [key]: value } }
// -> same shape, empty dropped.
export function cleanDetails(raw, fields, playerIds) {
  const out = {};
  for (const id of playerIds) {
    const row = {};
    for (const f of fields.filter(x => x.scope !== 'game')) {
      const v = cleanValue(f, raw && raw[id] ? raw[id][f.key] : undefined);
      if (v !== undefined) row[f.key] = v;
    }
    if (Object.keys(row).length) out[id] = row;
  }
  const game = {};
  for (const f of fields.filter(x => x.scope === 'game')) {
    const v = cleanValue(f, raw && raw[GAME_KEY] ? raw[GAME_KEY][f.key] : undefined);
    if (v !== undefined) game[f.key] = v;
  }
  if (Object.keys(game).length) out[GAME_KEY] = game;
  return out;
}

// Players with the best value of a number field (ties -> several).
export function topScorers(details, key, playerIds, lowWins = false) {
  return bestPlayers(details, [{ key, type: 'number', lowWins }], playerIds);
}

// Winners by the game's number fields, compared in order (e.g. Phase 10:
// highest phase, then fewest points). Players without the first value are out.
export function bestPlayers(details, fields, playerIds) {
  const nums = fields.filter(f => f.type === 'number' && f.scope !== 'game');
  if (!nums.length) return [];
  const score = (id) => nums.map(f => {
    const v = details[id] && details[id][f.key];
    if (typeof v !== 'number') return -Infinity;
    return f.lowWins ? -v : v;
  });
  const cmp = (a, b) => { for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] - b[i]; return 0; };
  let best = null; let ids = [];
  for (const id of playerIds) {
    const s = score(id);
    if (s[0] === -Infinity) continue;
    const c = best ? cmp(s, best) : 1;
    if (c > 0) { best = s; ids = [id]; } else if (c === 0) ids.push(id);
  }
  return ids;
}

// "Set winner from highest victory points" / "lowest points" /
// "highest phase reached, then lowest points".
export function winnerRuleLabel(fields) {
  const nums = fields.filter(f => f.type === 'number' && f.scope !== 'game');
  return nums.map(f => `${f.lowWins ? 'lowest' : 'highest'} ${f.label.toLowerCase()}`).join(', then ');
}

const better = (f, a, b) => (f.lowWins ? a < b : a > b);
const average = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

// Best value + average winning value of one number field over some plays.
function numberStat(f, plays) {
  let best = null; const winning = [];
  for (const p of plays) {
    for (const [pid, row] of Object.entries(playerDetailsOf(p))) {
      const v = row[f.key];
      if (typeof v !== 'number') continue;
      if (!best || better(f, v, best.value)) best = { value: v, playerId: pid, playedAt: p.playedAt };
      if (p.winnerIds.includes(pid)) winning.push(v);
    }
  }
  return { best, avgWin: average(winning), games: winning.length };
}

const livePlays = (game, plays) => plays.filter(p => p.gameId === game.id && !p.voided && !p.test);

// Per-game stats from recorded plays' per-player details.
//  - number fields: best score (highest, or lowest when lowWins) and average winning score
//  - text fields: per value, games played and won with it (e.g. faction win rates)
export function scoringStats(game, plays) {
  const live = livePlays(game, plays);
  return playerFields(game).map(f => {
    if (f.type === 'number') return { field: f, type: 'number', ...numberStat(f, live) };
    const byValue = new Map();
    for (const p of live) {
      for (const [pid, row] of Object.entries(playerDetailsOf(p))) {
        for (const v of [].concat(row[f.key] || [])) {
          const s = byValue.get(v) || { value: v, played: 0, wins: 0 };
          s.played += 1;
          if (p.winnerIds.includes(pid)) s.wins += 1 / p.winnerIds.length;
          byValue.set(v, s);
        }
      }
    }
    const rows = [...byValue.values()].sort((a, b) => b.wins - a.wins || b.played - a.played || a.value.localeCompare(b.value));
    return { field: f, type: 'text', rows };
  });
}

// The game-level setup of a play, e.g. "Seafarers + Cities & Knights", or the
// field's emptyLabel ("Base game") when nothing was picked. null if the game
// has no game-level fields or nothing applies.
export function setupLabel(play, game) {
  const g = gameDetailsOf(play);
  const parts = gameFields(game).map(f => {
    const v = g[f.key];
    if (Array.isArray(v) ? v.length : v !== undefined && v !== '') return [].concat(v).join(' + ');
    return f.emptyLabel || null;
  }).filter(Boolean);
  return parts.length ? parts.join(' · ') : null;
}

// Option records (with any art) picked in a play's game-level fields.
export function setupOptions(play, game) {
  const g = gameDetailsOf(play);
  const out = [];
  for (const f of gameFields(game)) {
    const opts = optionsOf(f);
    for (const name of [].concat(g[f.key] || [])) out.push(opts.find(o => o.name === name) || { name });
  }
  return out;
}

// Stats split by setup (only for games with game-level fields): per setup,
// games, wins per player, and the first number field's best/average winning.
export function setupStats(game, plays) {
  if (!gameFields(game).length) return [];
  const main = playerFields(game).find(f => f.type === 'number') || null;
  const groups = new Map();
  for (const p of livePlays(game, plays)) {
    const label = setupLabel(p, game) || 'Not noted';
    if (!groups.has(label)) groups.set(label, { setup: label, plays: [], options: setupOptions(p, game) });
    groups.get(label).plays.push(p);
  }
  return [...groups.values()].map(g => {
    const wins = new Map();
    for (const p of g.plays) for (const id of p.winnerIds) wins.set(id, (wins.get(id) || 0) + 1 / p.winnerIds.length);
    const nums = main ? numberStat(main, g.plays) : {};
    return { setup: g.setup, options: g.options, wins, field: main, best: nums.best, avgWin: nums.avgWin, games: g.plays.length };
  }).sort((a, b) => b.games - a.games || a.setup.localeCompare(b.setup));
}

// "SG (Witches, 142)": a player's label plus whatever details were noted for
// them in this play, in the game's field order. Just the label if none.
export function withDetails(play, game, playerId, label) {
  const row = playerDetailsOf(play)[playerId];
  const bits = row ? playerFields(game).map(f => row[f.key]).filter(v => v !== undefined && v !== null && v !== '')
    .map(v => [].concat(v).join(' + ')) : [];
  return bits.length ? `${label} (${bits.join(', ')})` : label;
}
