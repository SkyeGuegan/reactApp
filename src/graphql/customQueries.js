/* Hand-written GraphQL queries for the Player/Game/GameScore models.
   Kept separate from the generated queries.js so `amplify codegen` does not
   overwrite them, and so the client builds without depending on a push. */

export const listGames = /* GraphQL */ `
  query ListGames($limit: Int, $nextToken: String) {
    listGames(limit: $limit, nextToken: $nextToken) {
      items {
        id
        name
      }
      nextToken
    }
  }
`;

export const listPlayers = /* GraphQL */ `
  query ListPlayers($limit: Int, $nextToken: String) {
    listPlayers(limit: $limit, nextToken: $nextToken) {
      items {
        id
        initials
      }
      nextToken
    }
  }
`;

export const listGameScores = /* GraphQL */ `
  query ListGameScores($limit: Int, $nextToken: String) {
    listGameScores(limit: $limit, nextToken: $nextToken) {
      items {
        id
        gameId
        playerId
        score
      }
      nextToken
    }
  }
`;

// History feed for future wins-over-time graphs. Not consumed by the UI yet —
// each event carries createdAt so the client can bucket/accumulate by time.
export const listScoreEvents = /* GraphQL */ `
  query ListScoreEvents($limit: Int, $nextToken: String) {
    listScoreEvents(limit: $limit, nextToken: $nextToken) {
      items {
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
      nextToken
    }
  }
`;
