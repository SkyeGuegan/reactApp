import React, { useState, useEffect } from 'react';
import './App.css';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/api';
import { Authenticator, useAuthenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import { listScores } from './graphql/queries';
import { createScore as createScoreMutation, deleteScore as deleteScoreMutation, updateScore as updateScoreMutation } from './graphql/mutations';
import TableComponent from './tableComponent';
import awsconfig from './aws-exports';

Amplify.configure(awsconfig);
const client = generateClient();

const initialFormState = { game: '', sgScore: '', niScore: '', mgScore: '' }

function Scoreboard() {
    const { user, authStatus, signOut } = useAuthenticator((context) => [context.user, context.authStatus]);
    const [showSignIn, setShowSignIn] = useState(false);
    const [scores, setScores] = useState([]);
    const [formData, setFormData] = useState(initialFormState);
    const [loadingScores, setLoadingScores] = useState(true);

    const isAuthenticated = authStatus === 'authenticated' && user;
    const isAdmin = isAuthenticated && user.username === 'sguegan';

    useEffect(() => {
      fetchScores();
    }, []);

    async function fetchScores() {
      try {
        // Public read uses the API key explicitly (see amplify-js#12710).
        const apiData = await client.graphql({ query: listScores, authMode: 'apiKey' });
        setScores(apiData.data.listScores.items);
      } catch (err) {
        console.error('Failed to load scores', err);
      } finally {
        setLoadingScores(false);
      }
    }

    async function createScore() {
      if (!formData.game || !formData.sgScore || !formData.niScore || !formData.mgScore) return;
      const input = {
        game: formData.game,
        sgScore: Number(formData.sgScore),
        niScore: Number(formData.niScore),
        mgScore: Number(formData.mgScore),
      };
      try {
        const result = await client.graphql({ query: createScoreMutation, variables: { input }, authMode: 'userPool' });
        setScores([ ...scores, result.data.createScore ]);
        setFormData(initialFormState);
      } catch (err) {
        console.error('Failed to create score', err);
      }
    }

    async function deleteScore({ id }) {
      const previousScores = scores;
      setScores(scores.filter(score => score.id !== id));
      try {
        await client.graphql({ query: deleteScoreMutation, variables: { input: { id } }, authMode: 'userPool' });
      } catch (err) {
        console.error('Failed to delete score', err);
        setScores(previousScores);
      }
    }

    async function updateScore(score, player, action) {
      const field = player === 'sg' ? 'sgScore' : player === 'ni' ? 'niScore' : 'mgScore';
      const delta = action === 'plus' ? 1 : -1;
      const input = {
        id: score.id,
        game: score.game,
        sgScore: score.sgScore,
        niScore: score.niScore,
        mgScore: score.mgScore,
        [field]: score[field] + delta,
      };
      try {
        await client.graphql({ query: updateScoreMutation, variables: { input }, authMode: 'userPool' });
        setScores(scores.map(s => (s.id === score.id ? { ...s, ...input } : s)));
      } catch (err) {
        console.error('Failed to update score', err);
      }
    }

    function handleClick() {
      setShowSignIn((prev) => !prev);
    }

    const sortedScores = [...scores].sort(function(a, b) {
    // ignore upper and lowercase
    var gameA = a.game.toUpperCase();
    var gameB = b.game.toUpperCase();
    if (gameA < gameB) {
      return -1;
    }
    if (gameA > gameB) {
      return 1;
    }
    return 0;
  })

  return (
    <div className="App">
      <header className="App-header">
      <h1>The Scoreboard</h1>
      {isAuthenticated
      ? <h3>Hello, {user.username}</h3>
      : <button onClick={handleClick}>{showSignIn ? "Back To Table" : "Sign IN"}</button>
      }
      </header>
      {(!showSignIn || isAuthenticated)
      ?
      <div>
      <TableComponent
      scores = {sortedScores}
      loading = {loadingScores}
      />
      </div>
      :
      <div>
      <Authenticator hideSignUp />
      </div>
      }
      {isAdmin
      ?
      <div>
           <input
            onChange={e => setFormData({ ...formData, 'game': e.target.value})}
            placeholder="Name of the Game"
            value={formData.game}
          />
          <input
            type="number"
            onChange={e => setFormData({ ...formData, 'sgScore': e.target.value})}
            placeholder="SG's score"
            value={formData.sgScore}
          />
          <input
            type="number"
            onChange={e => setFormData({ ...formData, niScore: e.target.value})}
            placeholder="NI's score"
            value={formData.niScore}
          />
          <input
            type="number"
            onChange={e => setFormData({ ...formData, mgScore: e.target.value})}
            placeholder="MG's score"
            value={formData.mgScore}
          />
          <button onClick={createScore}>Create Score</button>
          <div style={{marginBottom: 30}}>
            {
              sortedScores.map(score => (
                <div key={score.id || score.game}>
                  <h2>
                  {score.game}
                  {<button onClick={() => updateScore(score, 'sg','plus')}>+</button>}{score.sgScore}{<button onClick={() => updateScore(score, 'sg','minus')}>-</button>}
                  {<button onClick={() => updateScore(score, 'ni','plus')}>+</button>}{score.niScore}{<button onClick={() => updateScore(score, 'ni','minus')}>-</button>}
                  {<button onClick={() => updateScore(score, 'mg','plus')}>+</button>}{score.mgScore}{<button onClick={() => updateScore(score, 'mg','minus')}>-</button>}
                  </h2>
                  <button onClick={() => deleteScore(score)}>Delete Score</button>
                </div>
              ))
            }
          </div>
      <button onClick={() => { signOut(); setShowSignIn(false); }}>Sign Out</button>
      </div>
      : isAuthenticated
          ? <h3>Hello, {user.username} you are not authorized to enter data</h3>
          : null
      }
      </div>
  );
}

function App() {
  return (
    <Authenticator.Provider>
      <Scoreboard />
    </Authenticator.Provider>
  );
}

export default App;
