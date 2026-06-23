// Centralized Amplify client + paginated read helper, shared by the data hook
// (useScoreboard) and the trends chart so the public-read path lives in one place.
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/api';
import awsconfig from './aws-exports';

// The Cognito Identity Pool (guest/IAM credentials) is unused: this app uses
// only apiKey (public reads) and userPool (writes/sign-in). Removing it from the
// runtime config prevents 400s from guest-credential fetches on load, since the
// pool has unauthenticated access disabled.
const amplifyConfig = { ...awsconfig };
delete amplifyConfig.aws_cognito_identity_pool_id;
Amplify.configure(amplifyConfig);

export const client = generateClient();

// Fetch every page of a list query — rows (= games × players, or one ScoreEvent
// per click) can exceed the 100-item default. Public read uses the API key
// explicitly (see amplify-js#12710).
export async function fetchAllPages(query, field) {
  const items = [];
  let nextToken = null;
  do {
    const res = await client.graphql({ query, authMode: 'apiKey', variables: { limit: 1000, nextToken } });
    const conn = res.data[field];
    items.push(...conn.items);
    nextToken = conn.nextToken;
  } while (nextToken);
  return items;
}
