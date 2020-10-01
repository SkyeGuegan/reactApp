import React from 'react';
import './App.css';

import Table from 'react-bootstrap/Table';
import 'bootstrap/dist/css/bootstrap.min.css';

function tableComponent() {

return(
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
)

}

export default tableComponent;