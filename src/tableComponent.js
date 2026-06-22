import React from 'react';
import Spinner from 'react-bootstrap/Spinner';
import './App.css';

import Table from 'react-bootstrap/Table';
import 'bootstrap/dist/css/bootstrap.min.css';

function tableComponent(props) {

  function gameRow(score){
    let sgWeight="normal"; 
    let niWeight="normal";
    let mgWeight="normal";
    
      if(score.sgScore>=score.niScore&&score.sgScore>=score.mgScore){
        sgWeight = "bold";
      }
      if(score.niScore>=score.sgScore&&score.niScore>=score.mgScore){
        niWeight = "bold";
      }
      if(score.mgScore>=score.niScore&&score.mgScore>=score.sgScore){
        mgWeight= "bold";
      }   
      return(
        <tr key={score.game}>
        <td>{score.game}</td>
        <td style={{fontWeight:sgWeight}}>{score.sgScore}</td>
        <td style={{fontWeight:niWeight}}>{score.niScore}</td>
        <td style={{fontWeight:mgWeight}}>{score.mgScore}</td>
        </tr>
      )
  }

  function totalRow(){
    let sgTotal = 0;
    let niTotal = 0;
    let mgTotal = 0;
    let sgWeight="normal"; 
    let niWeight="normal";
    let mgWeight="normal";
    let sgColor="white"; 
    let niColor="white";
    let mgColor="white";
    props.scores.forEach(score => {
      sgTotal = score.sgScore + sgTotal;
      niTotal = score.niScore + niTotal;
      mgTotal = score.mgScore + mgTotal;})
      if(sgTotal>=niTotal&&sgTotal>=mgTotal){
        sgWeight = "bold";
        sgColor = "gold";
      }
      if(niTotal>=sgTotal&&niTotal>=mgTotal){
        niWeight = "bold";
        niColor = "gold";
      }
      if(mgTotal>=niTotal&&mgTotal>=sgTotal){
        mgWeight= "bold";
        mgColor = "gold";
      }  
    return(
      <tr style={{backgroundColor: "#282c34", color: "white"}}>
      <td>Total Wins</td>
      <td style={{fontWeight:sgWeight, color:sgColor}}>{sgTotal}</td>
      <td style={{fontWeight:niWeight, color:niColor}}>{niTotal}</td>
      <td style={{fontWeight:mgWeight, color:mgColor}}>{mgTotal}</td>
      </tr>
    )
  }
  
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

{props.scores.map(score => (gameRow(score)))}
  {totalRow()}
</tbody>
</Table>
</div>
)

}

export default tableComponent;