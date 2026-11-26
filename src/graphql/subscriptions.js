/* eslint-disable */
// this is an auto generated file. This will be overwritten

export const onCreatePlayer = /* GraphQL */ `
  subscription OnCreatePlayer {
    onCreatePlayer {
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
export const onUpdatePlayer = /* GraphQL */ `
  subscription OnUpdatePlayer {
    onUpdatePlayer {
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
export const onDeletePlayer = /* GraphQL */ `
  subscription OnDeletePlayer {
    onDeletePlayer {
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
export const onCreateGame = /* GraphQL */ `
  subscription OnCreateGame {
    onCreateGame {
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
export const onUpdateGame = /* GraphQL */ `
  subscription OnUpdateGame {
    onUpdateGame {
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
export const onDeleteGame = /* GraphQL */ `
  subscription OnDeleteGame {
    onDeleteGame {
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
export const onCreateGameScore = /* GraphQL */ `
  subscription OnCreateGameScore {
    onCreateGameScore {
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
export const onUpdateGameScore = /* GraphQL */ `
  subscription OnUpdateGameScore {
    onUpdateGameScore {
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
export const onDeleteGameScore = /* GraphQL */ `
  subscription OnDeleteGameScore {
    onDeleteGameScore {
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
export const onCreateScoreEvent = /* GraphQL */ `
  subscription OnCreateScoreEvent {
    onCreateScoreEvent {
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
export const onUpdateScoreEvent = /* GraphQL */ `
  subscription OnUpdateScoreEvent {
    onUpdateScoreEvent {
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
export const onDeleteScoreEvent = /* GraphQL */ `
  subscription OnDeleteScoreEvent {
    onDeleteScoreEvent {
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
export const onCreatePlay = /* GraphQL */ `
  subscription OnCreatePlay {
    onCreatePlay {
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
export const onUpdatePlay = /* GraphQL */ `
  subscription OnUpdatePlay {
    onUpdatePlay {
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
export const onDeletePlay = /* GraphQL */ `
  subscription OnDeletePlay {
    onDeletePlay {
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
