import React, { useState, useEffect} from 'react';
import './App.css';
import { API } from 'aws-amplify';
import { AmplifySignOut, AmplifyAuthenticator, AmplifySignIn  } from '@aws-amplify/ui-react';
import { listScores } from './graphql/queries';
import { createScore as createScoreMutation, deleteScore as deleteScoreMutation, updateScore as updateScoreMutation } from './graphql/mutations';
import { AuthState, onAuthUIStateChange } from '@aws-amplify/ui-components';
import TableComponent from './tableComponent';
import Amplify from 'aws-amplify';
import config from './aws-exports';
Amplify.configure(config);

const initialFormState = { game: '', sgScore: '', niScore: '', mgScore: '' }

function App() {
    const [authState, setAuthState] = React.useState();
    const [user, setUser] = React.useState();
    const [showSignIn, setShowSignIn] = React.useState(0);
    const [scores, setScores] = useState([]);
    const [formData, setFormData] = useState(initialFormState);
    const [loadingScores, setLoadingScores] = useState([1]);

    React.useEffect(() => {
        return onAuthUIStateChange((nextAuthState, authData) => {
            setAuthState(nextAuthState);
            setUser(authData)
        });
    }, []);

    useEffect(() => {
      fetchScores();
    }, [formData]);

    async function fetchScores() {
      const apiData = await API.graphql({ query: listScores });
      setScores(apiData.data.listScores.items);
      setLoadingScores(0);
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
      await API.graphql({ query: deleteScoreMutation, variables: { input:  {id}  }});
    }

    async function updateScore(updateScore,player,action) {
      console.log(scores);
      let updatedScoreMap = new Map()
      updatedScoreMap['id']=updateScore.id;
      updatedScoreMap['game']=updateScore.game;
      updatedScoreMap['sgScore']=updateScore.sgScore;
      updatedScoreMap['niScore']=updateScore.niScore;
      updatedScoreMap['mgScore']=updateScore.mgScore;      
      if(action==='plus'){
        if(player==="sg"){
          updatedScoreMap['sgScore']=updateScore.sgScore+1;
        }else if(player === "ni"){
          updatedScoreMap['niScore']=updateScore.niScore+1;
        }else{
          updatedScoreMap['mgScore']=updateScore.mgScore+1;
        }
      }else{
        if(player==="sg"){
          updatedScoreMap['sgScore']=updateScore.sgScore-1;
        }else if(player === "ni"){
          updatedScoreMap['niScore']=updateScore.niScore-1;
        }else{
          updatedScoreMap['mgScore']=updateScore.mgScore-1;
        }
      }
      const newScoresArray = scores.filter(score => score.id !== updateScore.id);
      await API.graphql({ query: updateScoreMutation, variables: { input: updatedScoreMap }});
      setScores([ ...newScoresArray,updatedScoreMap ]);
      console.log(newScoresArray);
    }

    function handleClick(){
      if(showSignIn===1){
        setShowSignIn(0)
      }else{
      setShowSignIn(1)
      }
    }

    scores.sort(function(a, b) {
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
      scores = {scores}
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