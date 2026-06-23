/* eslint-disable */
// this is an auto generated file. This will be overwritten

export const incrementScore = /* GraphQL */ `
  mutation IncrementScore($id: ID!, $delta: Float!) {
    incrementScore(id: $id, delta: $delta) {
      id
      gameId
      playerId
      score
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const createPlayer = /* GraphQL */ `
  mutation CreatePlayer(
    $input: CreatePlayerInput!
    $condition: ModelPlayerConditionInput
  ) {
    createPlayer(input: $input, condition: $condition) {
      id
      initials
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const updatePlayer = /* GraphQL */ `
  mutation UpdatePlayer(
    $input: UpdatePlayerInput!
    $condition: ModelPlayerConditionInput
  ) {
    updatePlayer(input: $input, condition: $condition) {
      id
      initials
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const deletePlayer = /* GraphQL */ `
  mutation DeletePlayer(
    $input: DeletePlayerInput!
    $condition: ModelPlayerConditionInput
  ) {
    deletePlayer(input: $input, condition: $condition) {
      id
      initials
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const createGame = /* GraphQL */ `
  mutation CreateGame(
    $input: CreateGameInput!
    $condition: ModelGameConditionInput
  ) {
    createGame(input: $input, condition: $condition) {
      id
      name
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const updateGame = /* GraphQL */ `
  mutation UpdateGame(
    $input: UpdateGameInput!
    $condition: ModelGameConditionInput
  ) {
    updateGame(input: $input, condition: $condition) {
      id
      name
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const deleteGame = /* GraphQL */ `
  mutation DeleteGame(
    $input: DeleteGameInput!
    $condition: ModelGameConditionInput
  ) {
    deleteGame(input: $input, condition: $condition) {
      id
      name
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const createGameScore = /* GraphQL */ `
  mutation CreateGameScore(
    $input: CreateGameScoreInput!
    $condition: ModelGameScoreConditionInput
  ) {
    createGameScore(input: $input, condition: $condition) {
      id
      gameId
      playerId
      score
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const updateGameScore = /* GraphQL */ `
  mutation UpdateGameScore(
    $input: UpdateGameScoreInput!
    $condition: ModelGameScoreConditionInput
  ) {
    updateGameScore(input: $input, condition: $condition) {
      id
      gameId
      playerId
      score
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const deleteGameScore = /* GraphQL */ `
  mutation DeleteGameScore(
    $input: DeleteGameScoreInput!
    $condition: ModelGameScoreConditionInput
  ) {
    deleteGameScore(input: $input, condition: $condition) {
      id
      gameId
      playerId
      score
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const createScoreEvent = /* GraphQL */ `
  mutation CreateScoreEvent(
    $input: CreateScoreEventInput!
    $condition: ModelScoreEventConditionInput
  ) {
    createScoreEvent(input: $input, condition: $condition) {
      id
      gameId
      playerId
      delta
      playerInitials
      gameName
      recordedBy
      voided
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const updateScoreEvent = /* GraphQL */ `
  mutation UpdateScoreEvent(
    $input: UpdateScoreEventInput!
    $condition: ModelScoreEventConditionInput
  ) {
    updateScoreEvent(input: $input, condition: $condition) {
      id
      gameId
      playerId
      delta
      playerInitials
      gameName
      recordedBy
      voided
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const deleteScoreEvent = /* GraphQL */ `
  mutation DeleteScoreEvent(
    $input: DeleteScoreEventInput!
    $condition: ModelScoreEventConditionInput
  ) {
    deleteScoreEvent(input: $input, condition: $condition) {
      id
      gameId
      playerId
      delta
      playerInitials
      gameName
      recordedBy
      voided
      createdAt
      updatedAt
      __typename
    }
  }
`;
