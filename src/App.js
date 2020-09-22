import React from 'react';
import logo from './logo.svg';
import './App.css';
// { withAuthenticator, AmplifySignOut } from '@aws-amplify/ui-react'

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Skye's Website</h1>
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Hiiiiiiiiiiiiiii
        </p>
      </header>
      {//<AmplifySignOut />
      }
    </div>
  );
}

export default App;
//export default withAuthenticator(App);
