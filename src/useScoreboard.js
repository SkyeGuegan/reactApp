import { useState, useEffect } from 'react';
import { client, fetchAllPages } from './api';
import { listGames, listPlayers, listGameScores, listPlays, listScoreEvents } from './graphql/customQueries';
import {
  createGame as createGameMutation,
  deleteGame as deleteGameMutation,
  updateGame as updateGameMutation,
  createPlayer as createPlayerMutation,
  deletePlayer as deletePlayerMutation,
  createGameScore as createGameScoreMutation,
  deleteGameScore as deleteGameScoreMutation,
  incrementScore as incrementScoreMutation,
  createScoreEvent as createScoreEventMutation,
  updateScoreEvent as updateScoreEventMutation,
  createPlay as createPlayMutation,
  updatePlay as updatePlayMutation,
} from './graphql/customMutations';
import { cellForEvent, canApplyDelta } from './history';
import { corePlayers, classifyPlay, winShares } from './plays';

// Owns the scoreboard's board data (games, players, GameScore cells) and the
// admin mutations that change them, so App.js stays a view layer. `user` is the
// signed-in Cognito user, used to attribute ScoreEvent history rows. Input
// validation, error messages, and modals stay in the component.
export default function useScoreboard(user) {
  const [games, setGames] = useState([]);
  const [players, setPlayers] = useState([]);
  const [gameScores, setGameScores] = useState([]);
  const [plays, setPlays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  // The most recent ScoreEvent this session logged, so an open history panel
  // can show it without refetching the whole ledger.
  const [lastEvent, setLastEvent] = useState(null);
  // Id of the most recently voided event (from the history panel or an Undo),
  // so an open history panel can mark it voided.
  const [lastVoidedId, setLastVoidedId] = useState(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [g, p, gs, pl] = await Promise.all([
          fetchAllPages(listGames, 'listGames'),
          fetchAllPages(listPlayers, 'listPlayers'),
          fetchAllPages(listGameScores, 'listGameScores'),
          fetchAllPages(listPlays, 'listPlays'),
        ]);
        if (!active) return;
        setGames(g);
        setPlayers(p);
        setGameScores(gs);
        setPlays(pl);
      } catch (err) {
        console.error('Failed to load scoreboard', err);
        if (active) setLoadError(true);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  // Add a player by initials. Core players (shown on the main table) are
  // zero-filled across every existing game; guests get no table cells.
  // Returns the new player.
  async function addPlayer(initials, { core = false } = {}) {
    try {
      const res = await client.graphql({ query: createPlayerMutation, variables: { input: { initials, core } }, authMode: 'userPool' });
      const player = res.data.createPlayer;
      const created = !core ? [] : await Promise.all(games.map(game =>
        client.graphql({ query: createGameScoreMutation, variables: { input: { gameId: game.id, playerId: player.id, score: 0 } }, authMode: 'userPool' })
          .then(r => r.data.createGameScore)
      ));
      setPlayers(prev => [...prev, player]);
      setGameScores(prev => [...prev, ...created]);
      return player;
    } catch (err) {
      console.error('Failed to add player', err);
      throw err;
    }
  }

  // Add a game and start every core player at 0 in it.
  async function addGame(name) {
    try {
      const res = await client.graphql({ query: createGameMutation, variables: { input: { name, baselinePlays: 0 } }, authMode: 'userPool' });
      const game = res.data.createGame;
      const created = await Promise.all(corePlayers(players).map(player =>
        client.graphql({ query: createGameScoreMutation, variables: { input: { gameId: game.id, playerId: player.id, score: 0 } }, authMode: 'userPool' })
          .then(r => r.data.createGameScore)
      ));
      setGames([...games, game]);
      setGameScores([...gameScores, ...created]);
    } catch (err) {
      console.error('Failed to add game', err);
      throw err;
    }
  }

  // Returns the logged ScoreEvent (so the caller can offer Undo), or null if
  // the change was refused (would go below 0) or its history row failed to log.
  // Throws, after rolling back, if the score change itself failed.
  async function increment(cell, delta) {
    if (!canApplyDelta(cell.score, delta)) return null; // scores never go below 0
    // Optimistically reflect the change, keep the old list for rollback.
    const previous = gameScores;
    setGameScores(gameScores.map(gs => (gs.id === cell.id ? { ...gs, score: gs.score + delta } : gs)));
    try {
      // Atomic, server-side increment — no read-modify-write, so concurrent
      // edits no longer clobber each other. Reconcile to the authoritative value.
      const res = await client.graphql({ query: incrementScoreMutation, variables: { id: cell.id, delta }, authMode: 'userPool' });
      const updated = res.data.incrementScore;
      setGameScores(prev => prev.map(gs => (gs.id === updated.id ? { ...gs, score: updated.score } : gs)));
      // Append an immutable history row (fire-and-forget). The score change
      // already succeeded, so a failed event is only a logged gap — not a reason
      // to roll back. Labels are denormalized so the event survives the
      // player/game being renamed or deleted.
      try {
        const player = players.find(p => p.id === cell.playerId);
        const game = games.find(g => g.id === cell.gameId);
        const eventRes = await client.graphql({
          query: createScoreEventMutation,
          variables: {
            input: {
              gameId: cell.gameId,
              playerId: cell.playerId,
              playerInitials: player ? player.initials : null,
              gameName: game ? game.name : null,
              delta,
              recordedBy: user ? user.username : null,
            },
          },
          authMode: 'userPool',
        });
        const event = eventRes.data.createScoreEvent;
        setLastEvent(event);
        return event;
      } catch (eventErr) {
        console.warn('Score updated but failed to log history event', eventErr);
        return null;
      }
    } catch (err) {
      console.error('Failed to update score', err);
      setGameScores(previous);
      throw err;
    }
  }

  async function deleteGame(game) {
    const previousGames = games;
    const previousScores = gameScores;
    const related = gameScores.filter(gs => gs.gameId === game.id);
    setGames(games.filter(g => g.id !== game.id));
    setGameScores(gameScores.filter(gs => gs.gameId !== game.id));
    try {
      await Promise.all(related.map(gs => client.graphql({ query: deleteGameScoreMutation, variables: { input: { id: gs.id } }, authMode: 'userPool' })));
      await client.graphql({ query: deleteGameMutation, variables: { input: { id: game.id } }, authMode: 'userPool' });
    } catch (err) {
      console.error('Failed to delete game', err);
      setGames(previousGames);
      setGameScores(previousScores);
      throw err;
    }
  }

  async function deletePlayer(player) {
    const previousPlayers = players;
    const previousScores = gameScores;
    const related = gameScores.filter(gs => gs.playerId === player.id);
    setPlayers(players.filter(p => p.id !== player.id));
    setGameScores(gameScores.filter(gs => gs.playerId !== player.id));
    try {
      await Promise.all(related.map(gs => client.graphql({ query: deleteGameScoreMutation, variables: { input: { id: gs.id } }, authMode: 'userPool' })));
      await client.graphql({ query: deletePlayerMutation, variables: { input: { id: player.id } }, authMode: 'userPool' });
    } catch (err) {
      console.error('Failed to delete player', err);
      setPlayers(previousPlayers);
      setGameScores(previousScores);
      throw err;
    }
  }

  // Void a bogus ScoreEvent and reverse its effect on the current total, so the
  // table (GameScore) and the Trends graph (non-voided events) keep agreeing.
  // The event is voided first — conditionally, so two admins can't void it
  // twice — then the cell is adjusted by -delta directly via incrementScore
  // (not `increment`, which would log a new event). If the adjustment fails the
  // void is undone. Throws on failure so the caller can show a message.
  // `checkFloor: false` skips the client-side below-0 check (the resolver still
  // enforces it) for callers whose view of the score may be stale.
  async function voidEvent(event, { checkFloor = true } = {}) {
    const target = cellForEvent(event, gameScores);
    if (checkFloor && target && !canApplyDelta(target.score, -event.delta)) {
      const err = new Error('Voiding this would make the score negative.');
      err.userMessage = `Can't void this: ${event.playerInitials || 'the player'}'s score in ${event.gameName || 'this game'} would drop below 0.`;
      throw err;
    }
    await client.graphql({
      query: updateScoreEventMutation,
      // NOT(voided = true) also passes for rows that never had `voided` set.
      variables: { input: { id: event.id, voided: true }, condition: { not: { voided: { eq: true } } } },
      authMode: 'userPool',
    });
    if (!target) {
      setLastVoidedId(event.id);
      return;
    }
    try {
      const res = await client.graphql({ query: incrementScoreMutation, variables: { id: target.id, delta: -event.delta }, authMode: 'userPool' });
      const updated = res.data.incrementScore;
      setGameScores(prev => prev.map(gs => (gs.id === updated.id ? { ...gs, score: updated.score } : gs)));
      setLastVoidedId(event.id);
    } catch (err) {
      await client.graphql({
        query: updateScoreEventMutation,
        variables: { input: { id: event.id, voided: false } },
        authMode: 'userPool',
      }).catch(undoErr => console.error('Failed to undo void after score adjustment failed', undoErr));
      throw err;
    }
  }

  // Record a game that was played. Always saves a Play; if it counts (all core
  // players, no test player), each core winner's cell gets their share of the
  // win, logged as ScoreEvents linked by playId and dated playedAt.
  // Returns the saved play. Throws if the Play itself couldn't be saved; a
  // failure while applying wins is rethrown after voiding what was applied.
  async function recordPlay({ gameId, playedAt, playerIds, winnerIds, allPlayers = players }) {
    const game = games.find(g => g.id === gameId);
    const { counted, test } = classifyPlay(playerIds, allPlayers);
    const res = await client.graphql({
      query: createPlayMutation,
      variables: { input: { gameId, gameName: game ? game.name : null, playedAt, playerIds, winnerIds, counted, test, recordedBy: user ? user.username : null } },
      authMode: 'userPool',
    });
    const play = res.data.createPlay;
    setPlays(prev => [...prev, play]);
    if (!counted) return play;

    const applied = [];
    try {
      for (const { playerId, share } of winShares(winnerIds, allPlayers)) {
        const cell = gameScores.find(gs => gs.gameId === gameId && gs.playerId === playerId);
        if (!cell) continue;
        const inc = await client.graphql({ query: incrementScoreMutation, variables: { id: cell.id, delta: share }, authMode: 'userPool' });
        const updated = inc.data.incrementScore;
        setGameScores(prev => prev.map(gs => (gs.id === updated.id ? { ...gs, score: updated.score } : gs)));
        const player = allPlayers.find(p => p.id === playerId);
        const ev = await client.graphql({
          query: createScoreEventMutation,
          variables: { input: {
            gameId, playerId, delta: share, playId: play.id, occurredAt: playedAt,
            playerInitials: player ? player.initials : null, gameName: game ? game.name : null,
            recordedBy: user ? user.username : null,
          } },
          authMode: 'userPool',
        });
        applied.push(ev.data.createScoreEvent);
        setLastEvent(ev.data.createScoreEvent);
      }
    } catch (err) {
      console.error('Failed to apply wins for play', err);
      await voidPlay(play, applied).catch(e => console.error('Failed to roll back play', e));
      throw err;
    }
    return play;
  }

  // Void a play: void its win events (each reverses its score) then the play.
  // `knownEvents` skips refetching the ledger when the caller has them.
  async function voidPlay(play, knownEvents = null) {
    const events = knownEvents || (await fetchAllPages(listScoreEvents, 'listScoreEvents')).filter(e => e.playId === play.id && !e.voided);
    for (const ev of events) await voidEvent(ev, { checkFloor: false });
    await client.graphql({
      query: updatePlayMutation,
      variables: { input: { id: play.id, voided: true }, condition: { not: { voided: { eq: true } } } },
      authMode: 'userPool',
    });
    setPlays(prev => prev.map(p => (p.id === play.id ? { ...p, voided: true } : p)));
  }

  // Set or clear a game's artwork and BoardGameGeek id. Throws on failure.
  async function setGameArt(game, { bggId = null, imageUrl = null }) {
    const res = await client.graphql({ query: updateGameMutation, variables: { input: { id: game.id, bggId, imageUrl } }, authMode: 'userPool' });
    const updated = res.data.updateGame;
    setGames(prev => prev.map(g => (g.id === updated.id ? { ...g, ...updated } : g)));
    return updated;
  }

  return { games, players, gameScores, plays, loading, loadError, recordPlay, voidPlay, setGameArt, addGame, addPlayer, increment, deleteGame, deletePlayer, voidEvent, lastEvent, lastVoidedId };
}
