#!/usr/bin/env node
/* One-time migration: legacy Score (wide columns) -> Player/Game/GameScore.
 *
 * Run AFTER the Phase A `amplify push` has created the new tables, and BEFORE
 * Phase B removes the Score model. Uses your existing Amplify AWS credentials
 * (default credential chain / AWS_PROFILE).
 *
 *   node scripts/migrate-to-players.mjs            # dry run (no writes)
 *   node scripts/migrate-to-players.mjs --commit   # write to the new tables
 *   node scripts/migrate-to-players.mjs --commit --force   # write even if targets non-empty
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const commit = process.argv.includes('--commit');
const force = process.argv.includes('--force');

const readJson = (p) => JSON.parse(readFileSync(resolve(root, p), 'utf8'));

// Resolve API id / region / env from local Amplify metadata.
const meta = readJson('amplify/backend/amplify-meta.json');
const apiId = meta.api?.reactapp?.output?.GraphQLAPIIdOutput;
const region = process.env.AWS_REGION || meta.providers?.awscloudformation?.Region;
let env = process.env.AMPLIFY_ENV;
try { env = env || readJson('amplify/.config/local-env-info.json').envName; } catch { /* fall back below */ }
env = env || 'dev';

if (!apiId || !region) {
  console.error('Could not resolve apiId/region from amplify-meta.json. Is the API pushed?');
  process.exit(1);
}

const table = (model) => `${model}-${apiId}-${env}`;
const T = { Score: table('Score'), Player: table('Player'), Game: table('Game'), GameScore: table('GameScore') };

console.log(`Region: ${region}   Env: ${env}`);
console.log('Tables:', T);
console.log(commit ? '\n*** COMMIT MODE: writing to new tables ***\n' : '\n(dry run — no writes; pass --commit to write)\n');

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region }));

async function scanAll(TableName) {
  const items = [];
  let ExclusiveStartKey;
  do {
    const res = await ddb.send(new ScanCommand({ TableName, ExclusiveStartKey }));
    items.push(...(res.Items || []));
    ExclusiveStartKey = res.LastEvaluatedKey;
  } while (ExclusiveStartKey);
  return items;
}

async function batchPut(TableName, items) {
  for (let i = 0; i < items.length; i += 25) {
    const chunk = items.slice(i, i + 25);
    await ddb.send(new BatchWriteCommand({
      RequestItems: { [TableName]: chunk.map((Item) => ({ PutRequest: { Item } })) },
    }));
  }
}

const stamp = () => { const t = new Date().toISOString(); return { createdAt: t, updatedAt: t }; };

// Score column -> player initials.
const PLAYER_FIELDS = [
  { field: 'sgScore', initials: 'SG' },
  { field: 'niScore', initials: 'NI' },
  { field: 'mgScore', initials: 'MG' },
];

const scores = await scanAll(T.Score);
console.log(`Read ${scores.length} legacy Score rows.`);

// Only migrate a 4th player if fourScore actually has data.
const fourUsed = scores.some((s) => s.fourScore !== null && s.fourScore !== undefined);
const playerDefs = [...PLAYER_FIELDS];
if (fourUsed) {
  playerDefs.push({ field: 'fourScore', initials: 'P4' });
  console.warn('NOTE: fourScore has data — migrating it as player "P4" (rename in the UI later).');
}

// Players (keep a private `field` for joining; stripped before writing).
const players = playerDefs.map((d) => ({ id: randomUUID(), initials: d.initials, field: d.field, __typename: 'Player', ...stamp() }));

// Games + per-player GameScore rows.
const games = [];
const gameScores = [];
for (const s of scores) {
  const game = { id: randomUUID(), name: s.game, __typename: 'Game', ...stamp() };
  games.push(game);
  for (const p of players) {
    const raw = s[p.field];
    if (raw === null || raw === undefined) continue;
    gameScores.push({ id: randomUUID(), gameId: game.id, playerId: p.id, score: Number(raw), __typename: 'GameScore', ...stamp() });
  }
}

const playerItems = players.map(({ field, ...rest }) => rest);

console.log(`\nWould create: ${playerItems.length} players, ${games.length} games, ${gameScores.length} game scores.`);
console.log('Players:', playerItems.map((p) => p.initials).join(', '));
console.log('Sample scores:', gameScores.slice(0, 8).map((g) => g.score).join(', '));

if (!commit) {
  console.log('\nDry run complete. Re-run with --commit to write.');
  process.exit(0);
}

// Safety: do not write into already-populated target tables unless --force.
for (const m of ['Player', 'Game', 'GameScore']) {
  const existing = await scanAll(T[m]);
  if (existing.length && !force) {
    console.error(`ABORT: ${T[m]} already has ${existing.length} items. Re-run with --force to add anyway.`);
    process.exit(1);
  }
}

await batchPut(T.Player, playerItems);
await batchPut(T.Game, games);
await batchPut(T.GameScore, gameScores);
console.log('\nMigration committed. Reload the app to verify.');
