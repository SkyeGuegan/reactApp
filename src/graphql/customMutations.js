/* Hand-written GraphQL mutations for the Player/Game/GameScore models and the
   custom incrementScore resolver. Kept separate from the generated
   mutations.js so `amplify codegen` does not overwrite them, and so the client
   builds without depending on a push. */

export const createPlayer = /* GraphQL */ `
  mutation CreatePlayer($input: CreatePlayerInput!) {
    createPlayer(input: $input) {
      id
      initials
    }
  }
`;

export const deletePlayer = /* GraphQL */ `
  mutation DeletePlayer($input: DeletePlayerInput!) {
    deletePlayer(input: $input) {
      id
    }
  }
`;

export const createGame = /* GraphQL */ `
  mutation CreateGame($input: CreateGameInput!) {
    createGame(input: $input) {
      id
      name
    }
  }
`;

export const deleteGame = /* GraphQL */ `
  mutation DeleteGame($input: DeleteGameInput!) {
    deleteGame(input: $input) {
      id
    }
  }
`;

export const createGameScore = /* GraphQL */ `
  mutation CreateGameScore($input: CreateGameScoreInput!) {
    createGameScore(input: $input) {
      id
      gameId
      playerId
      score
    }
  }
`;

export const deleteGameScore = /* GraphQL */ `
  mutation DeleteGameScore($input: DeleteGameScoreInput!) {
    deleteGameScore(input: $input) {
      id
    }
  }
`;

// Atomic, server-side increment of a single GameScore cell (see the custom
// resolver in amplify/.../resolvers/Mutation.incrementScore.*.vtl).
export const incrementScore = /* GraphQL */ `
  mutation IncrementScore($id: ID!, $delta: Float!) {
    incrementScore(id: $id, delta: $delta) {
      id
      score
    }
  }
`;

// Append-only history row, written alongside each increment so wins-over-time
// can be reconstructed later. createdAt is set automatically.
export const createScoreEvent = /* GraphQL */ `
  mutation CreateScoreEvent($input: CreateScoreEventInput!) {
    createScoreEvent(input: $input) {
      id
      gameId
      playerId
      playerInitials
      gameName
      delta
      recordedBy
      voided
      createdAt
    }
  }
`;

// Soft-delete (void) an event instead of hard-deleting it — pass
// { id, voided: true }. Preserves the row and its audit trail. Pass
// condition { not: { voided: { eq: true } } } so an event can't be voided twice.
export const updateScoreEvent = /* GraphQL */ `
  mutation UpdateScoreEvent($input: UpdateScoreEventInput!, $condition: ModelScoreEventConditionInput) {
    updateScoreEvent(input: $input, condition: $condition) {
      id
      voided
    }
  }
`;
