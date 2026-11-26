/* eslint-disable */
// this is an auto generated file. This will be overwritten

export const getPlayer = /* GraphQL */ `
  query GetPlayer($id: ID!) {
    getPlayer(id: $id) {
      id
      initials
      core
      hidden
      createdAt
      updatedAt
      name
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
        core
        hidden
        createdAt
        updatedAt
        name
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
      baselinePlays
      bggId
      imageUrl
      scoreFields
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
        baselinePlays
        bggId
        imageUrl
        scoreFields
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
export const getScoreEvent = /* GraphQL */ `
  query GetScoreEvent($id: ID!) {
    getScoreEvent(id: $id) {
      id
      gameId
      playerId
      delta
      playerInitials
      gameName
      recordedBy
      voided
      playId
      occurredAt
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const listScoreEvents = /* GraphQL */ `
  query ListScoreEvents(
    $filter: ModelScoreEventFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listScoreEvents(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
        id
        gameId
        playerId
        delta
        playerInitials
        gameName
        recordedBy
        voided
        playId
        occurredAt
        createdAt
        updatedAt
        __typename
      }
      nextToken
      __typename
    }
  }
`;
export const getPlay = /* GraphQL */ `
  query GetPlay($id: ID!) {
    getPlay(id: $id) {
      id
      gameId
      gameName
      playedAt
      playerIds
      winnerIds
      counted
      test
      recordedBy
      voided
      details
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const listPlays = /* GraphQL */ `
  query ListPlays(
    $filter: ModelPlayFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listPlays(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
        id
        gameId
        gameName
        playedAt
        playerIds
        winnerIds
        counted
        test
        recordedBy
        voided
        details
        createdAt
        updatedAt
        __typename
      }
      nextToken
      __typename
    }
  }
`;
