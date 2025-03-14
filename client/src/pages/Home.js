import React, { useState } from 'react';
import {Link} from "react-router-dom";
import {Grid,TextField,Button} from "@mui/material";

function Home() {

  let stock = [
    {
      id: 1,
      symbol: 'Nifty 50',
      identifier: 'Nifty 50',
      open: 173,
      dayhigh: 175,
      daylow: 171,
    },
    {
      id: 2,
      symbol: 'Sunpharma',
      identifier: 'Sunpharmaeqn',
      open: 752,
      dayhigh: 777,
      daylow: 745
    },
    {
      id: 3,
      symbol: 'APPL',
      identifier: 'Apple',
      open: 752,
      dayhigh: 777,
      daylow: 745
    },
    {id: 4,
      symbol: 'TSLA',
      identifier: 'Tesla',
      open: 752,
      dayhigh: 777,
      daylow: 745}
  ];

  let [searchStock,setSearchStock] = useState("");

  let handleChange = (e) => {
    setSearchStock(()=>{return e.target.value});
  }



  return (
    <div className='home'>
      <Grid container sx={{width:"50%"}}>
      <Grid item xs={12}>
        <TextField sx={{"width":"100%"}} id="outlined-basic" onChange={handleChange} name='stockName' label="Outlined" variant="outlined" />
      </Grid>
          {stock && stock.map((ele) => {
            if(searchStock!=="" && !ele.identifier.toLowerCase().startsWith(searchStock.toLowerCase())) return;
            return (
              <Grid item xs={12}>
                <Link to={`/stock/${ele.symbol}`}>
              <Button variant="outlined" sx={{"width":"100%"}} key={ele.symbol}>
                <Grid item xs={6} sx={{display:"flex",justifyContent:"left"}}>
                <div className="name">
                  <p>{ele.identifier}</p>
                </div>
                </Grid>
                <Grid item xs={6} sx={{display:"flex",justifyContent:"right"}}>
                <div className="info">
                  <p>{ele.open}</p>
                </div>
                </Grid>
          </Button>
                </Link>
          </Grid>
              )
            })}
            </Grid>
    </div>
  )
}
export default Home
