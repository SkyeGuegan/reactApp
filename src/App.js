import React, { useState, useEffect } from 'react';
import './App.css';
import { API } from 'aws-amplify';
import { withAuthenticator, AmplifySignOut } from '@aws-amplify/ui-react';
import { listNotes } from './graphql/queries';
import { createNote as createNoteMutation, deleteNote as deleteNoteMutation } from './graphql/mutations';

import Table from 'react-bootstrap/Table';
import 'bootstrap/dist/css/bootstrap.min.css';

const initialFormState = { name: '', description: '' }

function App() {
  const [notes, setNotes] = useState([]);
  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    fetchNotes();
  }, []);

  async function fetchNotes() {
    const apiData = await API.graphql({ query: listNotes });
    setNotes(apiData.data.listNotes.items);
  }

  async function createNote() {
    if (!formData.name || !formData.description) return;
    await API.graphql({ query: createNoteMutation, variables: { input: formData } });
    setNotes([ ...notes, formData ]);
    setFormData(initialFormState);
  }

  async function deleteNote({ id }) {
    const newNotesArray = notes.filter(note => note.id !== id);
    setNotes(newNotesArray);
    await API.graphql({ query: deleteNoteMutation, variables: { input: { id } }});
  }

  return (
    <div className="App">
      {/*
      <h1>My Notes App</h1>
      <div className="App">
      </div>
      <input
        onChange={e => setFormData({ ...formData, 'name': e.target.value})}
        placeholder="Note name"
        value={formData.name}
      />
      <input
        onChange={e => setFormData({ ...formData, 'description': e.target.value})}
        placeholder="Note description"
        value={formData.description}
      />
      <button onClick={createNote}>Create Note</button>
      <div style={{marginBottom: 30}}>
        {
          notes.map(note => (
            <div key={note.id || note.name}>
              <h2>{note.name}</h2>
              <p>{note.description}</p>
              <button onClick={() => deleteNote(note)}>Delete note</button>
            </div>
          ))
        }
      </div>
      */}
      <header className="App-header">
      <h1>The Scoreboard</h1>
      </header>
      <div style={{padding: "10px"}}>
      <Table striped bordered>
        <thead>
    <tr>
      <th>Game</th>
      <th>SG</th>
      <th>NI</th>
      <th>MG</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Settlers of Catan</td>
      <td>3</td>
      <td>0</td>
      <td>0</td>
    </tr>
    <tr>
      <td>Puerto Rico</td>
      <td>0</td>
      <td>0</td>
      <td>1</td>
    </tr>
    <tr>
      <td>Dominion</td>
      <td>0</td>
      <td>1</td>
      <td>1</td>
    </tr>
    <tr>
      <td>Formula D</td>
      <td>0</td>
      <td>1</td>
      <td>0</td>
    </tr>
    <tr>
      <td>Small World</td>
      <td>1</td>
      <td>0</td>
      <td>1.5</td>
    </tr><tr>
      <td>Ticket To Ride</td>
      <td>1</td>
      <td>0</td>
      <td>0</td>
    </tr>
    <tr style={{backgroundColor: "#282c34", color: "white"}}>
      <td>Total Wins</td>
      <td>5</td>
      <td>2</td>
      <td>3.5</td>
    </tr>
  </tbody>
</Table>
</div>


      <AmplifySignOut />
    </div>
  );
}

export default withAuthenticator(App);