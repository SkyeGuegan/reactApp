/* Hand-written GraphQL documents for custom resolvers.
   Kept separate from the generated mutations.js so `amplify codegen`
   does not overwrite them. */

export const incrementScore = /* GraphQL */ `
  mutation IncrementScore($id: ID!, $field: String!, $delta: Int!) {
    incrementScore(id: $id, field: $field, delta: $delta) {
      id
      game
      sgScore
      niScore
      mgScore
      fourScore
    }
  }
`;
