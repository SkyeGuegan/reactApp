import React from 'react';
import Spinner from 'react-bootstrap/Spinner';
import './App.css';
//import { Link } from 'react-router-dom';

import Table from 'react-bootstrap/Table';
import 'bootstrap/dist/css/bootstrap.min.css';

function tableComponent(props) {

  //console.log(props.scores)
  //const scoreData = props.scores
  //console.log(props.scores.length());
  //console.log(props.loading);
  //console.log(scoreData);
  //console.log(scoreData[0]);
  
return(
  (props.loading)?
  <Spinner animation="border" role="status">
  <span className="sr-only">Loading...</span>
</Spinner>
:<div style={{padding: "10px"}}>
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
{props.scores.map(score => (
  <tr>
  <td>{score.game}</td>
  <td>{score.sgScore}</td>
  <td>{score.niScore}</td>
  <td>{score.mgScore}</td>
  </tr>
  ))}
  
{/*
<tr>
<td><a href={"https://www.catan.com/#start"}>Settlers of Catan</a></td>
<td>3</td>
<td>0</td>
<td>0</td>
</tr>
<tr>
<td><a href={"https://boardgamegeek.com/boardgame/3076/puerto-rico"}>Puerto Rico</a></td>
<td>0</td>
<td>0</td>
<td>1</td>
</tr>
<tr>
<td><a href={"https://dominionstrategy.com/"}>Dominion</a></td>
<td>0</td>
<td>1</td>
<td>1</td>
</tr>
<tr>
<td><a href={"https://www.tabletopgaming.co.uk/reviews/formula-d-review/"}>Formula D</a></td>
<td>0</td>
<td>1</td>
<td>0</td>
</tr>
<tr>
<td><a href={"https://www.daysofwonder.com/smallworld/en/"}>Small World</a></td>
<td>1</td>
<td>0</td>
<td>1.5</td>
</tr><tr>
<td><a href={"https://www.daysofwonder.com/tickettoride/en/usa/"}>Ticket To Ride</a></td>
<td>1</td>
<td>0</td>
<td>0</td>
</tr>
<tr style={{backgroundColor: "#282c34", color: "white"}}>
<td>Total Wins</td>
<td>5</td>
<td>2</td>
<td>3.5</td>
</tr>*/}
</tbody>
</Table>
</div>
)

}

export default tableComponent;