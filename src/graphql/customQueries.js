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
