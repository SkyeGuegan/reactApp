/* eslint-disable */
// this is an auto generated file. This will be overwritten

export const getScore = /* GraphQL */ `
  query GetScore($id: ID!) {
    getScore(id: $id) {
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
export const listScores = /* GraphQL */ `
  query ListScores(
    $filter: ModelScoreFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listScores(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
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
      nextToken
      __typename
    }
  }
`;
export const getPlayer = /* GraphQL */ `
  query GetPlayer($id: ID!) {
    getPlayer(id: $id) {
      id
      initials
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const listPlayers = /* GraphQL */ `
  query ListPlayers(
    $filter: ModelPlayerFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listPlayers(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
        id
        initials
        createdAt
        updatedAt
        __typename
      }
      nextToken
      __typename
    }
  }
`;
export const getGame = /* GraphQL */ `
  query GetGame($id: ID!) {
    getGame(id: $id) {
      id
      name
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const listGames = /* GraphQL */ `
  query ListGames(
    $filter: ModelGameFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listGames(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
        id
        name
        createdAt
        updatedAt
        __typename
      }
      nextToken
      __typename
    }
  }
`;
export const getGameScore = /* GraphQL */ `
  query GetGameScore($id: ID!) {
    getGameScore(id: $id) {
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
export const listGameScores = /* GraphQL */ `
  query ListGameScores(
    $filter: ModelGameScoreFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listGameScores(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
        id
        gameId
        playerId
        score
        createdAt
        updatedAt
        __typename
      }
      nextToken
      __typename
    }
  }
`;
