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
export const createScore = /* GraphQL */ `
  mutation CreateScore(
    $input: CreateScoreInput!
    $condition: ModelScoreConditionInput
  ) {
    createScore(input: $input, condition: $condition) {
      id
      game
      sgScore
      niScore
      mgScore
      fourScore
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const updateScore = /* GraphQL */ `
  mutation UpdateScore(
    $input: UpdateScoreInput!
    $condition: ModelScoreConditionInput
  ) {
    updateScore(input: $input, condition: $condition) {
      id
      game
      sgScore
      niScore
      mgScore
      fourScore
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const deleteScore = /* GraphQL */ `
  mutation DeleteScore(
    $input: DeleteScoreInput!
    $condition: ModelScoreConditionInput
  ) {
    deleteScore(input: $input, condition: $condition) {
      id
      game
      sgScore
      niScore
      mgScore
      fourScore
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
