import React, { useState, useEffect } from 'react';
import './App.css';
import { API } from 'aws-amplify';
import { AmplifySignOut, AmplifyAuthenticator, AmplifySignIn  } from '@aws-amplify/ui-react';
import { listScores } from './graphql/queries';
import { createScore as createScoreMutation, deleteScore as deleteScoreMutation } from './graphql/mutations';

import { AuthState, onAuthUIStateChange } from '@aws-amplify/ui-components';
import TableComponent from './tableComponent';

const initialFormState = { game: '', sgScore: '', niScore: '', mgScore: '' }

function App() {
    const [authState, setAuthState] = React.useState();
    const [user, setUser] = React.useState();
    const [showSignIn, setShowSignIn] = React.useState(0);
    const [scores, setScores] = useState([]);
    const [formData, setFormData] = useState(initialFormState);

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
      const apiData = await API.graphql({ query: listScores });
      setScores(apiData.data.listScores.items);
    }

    async function createScore() {
      if (!formData.game || !formData.sgScore || !formData.niScore || !formData.mgScore) return;
      await API.graphql({ query: createScoreMutation, variables: { input: formData } });
      setScores([ ...scores, formData ]);
      setFormData(initialFormState);
    }
  
    async function deleteScore({ game }) {
      console.log(game)
      const newScoresArray = scores.filter(score => score.game !== game);
      setScores(newScoresArray);
      await API.graphql({ query: deleteScoreMutation, variables: { input: { game } }});
    }

    function handleClick(){
      if(showSignIn===1){
        setShowSignIn(0)
      }else{
      setShowSignIn(1)
      }
    }

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
      <TableComponent />

      </div>
      :
      <div> 
      <AmplifyAuthenticator>
        <AmplifySignIn></AmplifySignIn>
      </AmplifyAuthenticator>
      </div>
      }
      {(authState === AuthState.SignedIn && user)?
      <div> 
           <input
            onChange={e => setFormData({ ...formData, 'game': e.target.value})}
            placeholder="Name of the Game"
            value={formData.game}
          />
          <input
            onChange={e => setFormData({ ...formData, 'sgScore': e.target.value})}
            placeholder="SG's score"
            value={formData.sgScore}
          />
          <input
            onChange={e => setFormData({ ...formData, niScore: e.target.value})}
            placeholder="NI's score"
            value={formData.niScore}
          />
          <input
            onChange={e => setFormData({ ...formData, mgScore: e.target.value})}
            placeholder="MG's score"
            value={formData.mgScore}
          />
          <button onClick={createScore}>Create Score</button>
          <div style={{marginBottom: 30}}>
            {
              scores.map(score => (
                <div key={score.game}>
                  <h2>{score.game} {score.sgScore} {score.niScore} {score.mgScore}</h2>
                  <button onClick={() => deleteScore(score)}>Delete Score</button>
                </div>
              ))
            }
          </div>
      <AmplifySignOut onClick={handleClick}/>
      </div>
      :null
      }

    </div>
  );
}

export default App;