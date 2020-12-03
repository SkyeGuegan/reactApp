import React, { useState, useEffect } from 'react';
import './App.css';
import { Auth, API } from 'aws-amplify';
import { withAuthenticator, AmplifySignOut, AmplifyAuthenticator, AmplifySignIn  } from '@aws-amplify/ui-react';
import { listNotes } from './graphql/queries';
import { createNote as createNoteMutation, deleteNote as deleteNoteMutation } from './graphql/mutations';

import { AuthState, onAuthUIStateChange } from '@aws-amplify/ui-components';
import TableComponent from './tableComponent';

const initialFormState = { name: '', description: '' }

function App() {
    const [authState, setAuthState] = React.useState();
    const [user, setUser] = React.useState();
    const [showSignIn, setShowSignIn] = React.useState(0);

    React.useEffect(() => {
        return onAuthUIStateChange((nextAuthState, authData) => {
            setAuthState(nextAuthState);
            setUser(authData)
        });
    }, []);

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
      <div> <AmplifyAuthenticator>
        <AmplifySignIn></AmplifySignIn>
      </AmplifyAuthenticator>
      </div>
      }
      {(authState === AuthState.SignedIn && user)?
      <AmplifySignOut onClick={handleClick}/>
      :null
      }
      
    </div>
  );
}

export default App;