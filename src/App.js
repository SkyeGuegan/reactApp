import React, { useState, useEffect } from 'react';
import './App.css';
import { API } from 'aws-amplify';
import { AmplifySignOut, AmplifyAuthenticator, AmplifySignIn  } from '@aws-amplify/ui-react';
import { listScores } from './graphql/queries';
import { createScore as createScoreMutation, deleteScore as deleteScoreMutation, updateScore as updateScoreMutation } from './graphql/mutations';
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
  
    async function deleteScore({ id }) {
      const newScoresArray = scores.filter(score => score.id !== id);
      setScores(newScoresArray);
      console.log(id);
      await API.graphql({ query: deleteScoreMutation, variables: { input:  {id}  }});
    }

    /*async function deleteNote({ id }) {
      const newNotesArray = notes.filter(note => note.id !== id);
      setNotes(newNotesArray);
      await API.graphql({ query: deleteNoteMutation, variables: { input: { id } }});
    }*/

    /*async function updateScore(score, pScore) {
      console.log(score);
      console.log(pScore);
      //const newScoresArray = scores.map(score => (score.game === game)?score.pScore+1:null);
      //const newScoresArray = scores.map(score => score.pScore+1);
      const newScoresArray = scores.filter(score => score.game !== score.game);
      console.log(newScoresArray);
      setScores(newScoresArray);
      await API.graphql({ query: updateScoreMutation, variables: { input: score}});
    }*/

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
                <div key={score.id || score.game}>
                  <h2>
                  {score.id}
                  {score.game} 
                  {score.sgScore}{/*<button onClick={() => updateScore(score, 'sgScore')}>Add Score</button>*/}
                  {score.niScore} 
                  {score.mgScore}</h2>
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