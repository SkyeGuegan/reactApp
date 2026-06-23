/* eslint-disable */
// this is an auto generated file. This will be overwritten

export const onCreateScore = /* GraphQL */ `
  subscription OnCreateScore {
    onCreateScore {
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
export const onUpdateScore = /* GraphQL */ `
  subscription OnUpdateScore {
    onUpdateScore {
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
export const onDeleteScore = /* GraphQL */ `
  subscription OnDeleteScore {
    onDeleteScore {
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
export const onCreatePlayer = /* GraphQL */ `
  subscription OnCreatePlayer {
    onCreatePlayer {
      id
      initials
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const onUpdatePlayer = /* GraphQL */ `
  subscription OnUpdatePlayer {
    onUpdatePlayer {
      id
      initials
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const onDeletePlayer = /* GraphQL */ `
  subscription OnDeletePlayer {
    onDeletePlayer {
      id
      initials
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const onCreateGame = /* GraphQL */ `
  subscription OnCreateGame {
    onCreateGame {
      id
      name
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
