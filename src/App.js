import React, { useState, useEffect} from 'react';
import './App.css';
import { API } from 'aws-amplify';
import { AmplifySignOut, AmplifyAuthenticator, AmplifySignIn  } from '@aws-amplify/ui-react';
import { listScores } from './graphql/queries';
import { createScore as createScoreMutation, deleteScore as deleteScoreMutation, updateScore as updateScoreMutation } from './graphql/mutations';
import { AuthState, onAuthUIStateChange } from '@aws-amplify/ui-components';
import TableComponent from './tableComponent';
import Amplify, { Auth } from 'aws-amplify';
import awsconfig from './aws-exports';

Amplify.configure(awsconfig);
Auth.configure(awsconfig);

const initialFormState = { game: '', sgScore: '', niScore: '', mgScore: '' }

function App() {
    const [authState, setAuthState] = React.useState();
    const [user, setUser] = React.useState();
    const [showSignIn, setShowSignIn] = React.useState(0);
    const [scores, setScores] = useState([]);
    const [formData, setFormData] = useState(initialFormState);
    const [loadingScores, setLoadingScores] = useState(true);

    React.useEffect(() => {
        return onAuthUIStateChange((nextAuthState, authData) => {
            setAuthState(nextAuthState);
            setUser(authData)
        });
    }, []);

    useEffect(() => {
      fetchScores();
    }, []);

    async function fetchScores() {
      try {
        const apiData = await API.graphql({ query: listScores });
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
        const result = await API.graphql({ query: createScoreMutation, variables: { input }, authMode: 'AMAZON_COGNITO_USER_POOLS' });
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
        await API.graphql({ query: deleteScoreMutation, variables: { input:  {id}  }, authMode: 'AMAZON_COGNITO_USER_POOLS' });
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
        await API.graphql({ query: updateScoreMutation, variables: { input }, authMode: 'AMAZON_COGNITO_USER_POOLS' });
        setScores(scores.map(s => (s.id === score.id ? { ...s, ...input } : s)));
      } catch (err) {
        console.error('Failed to update score', err);
      }
    }

    function handleClick(){
      if(showSignIn===1){
        setShowSignIn(0)
      }else{
      setShowSignIn(1)
      }
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
      {(authState === AuthState.SignedIn && user)?<h3>Hello, {user.username}</h3>
      :<button onClick={handleClick}>{(showSignIn===1)?"Back To Table":"Sign IN"}</button>
      }
      </header>
      {(showSignIn===0 || (authState === AuthState.SignedIn && user))?
      <div>
      <TableComponent
      scores = {sortedScores}
      loading = {loadingScores}
      />
      </div>
      :
      <div> 
      <AmplifyAuthenticator>
        <AmplifySignIn></AmplifySignIn>
      </AmplifyAuthenticator>
      </div>
      }
      {(authState === AuthState.SignedIn && user && user.username ==="sguegan")?
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
      <AmplifySignOut onClick={handleClick}/>
      </div>
      :(authState === AuthState.SignedIn && user)? <h3>Hello, {user.username} you are not authorized to enter data</h3>
          :null
      }
      </div>
  );
}

export default App;