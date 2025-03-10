import React, { useState } from 'react'

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
    {
      id: 4,
      symbol: 'APPL',
      identifier: 'Apple',
      open: 752,
      dayhigh: 777,
      daylow: 745
    },{
      id: 5,
      symbol: 'APPL',
      identifier: 'Apple',
      open: 752,
      dayhigh: 777,
      daylow: 745
    },{
      id: 6,
      symbol: 'APPL',
      identifier: 'Apple',
      open: 752,
      dayhigh: 777,
      daylow: 745
    },{
      id: 7,
      symbol: 'APPL',
      identifier: 'Apple',
      open: 752,
      dayhigh: 777,
      daylow: 745
    },{
      id: 8,
      symbol: 'APPL',
      identifier: 'Apple',
      open: 752,
      dayhigh: 777,
      daylow: 745
    },{
      id: 9,
      symbol: 'APPL',
      identifier: 'Apple',
      open: 752,
      dayhigh: 777,
      daylow: 745
    },
  ];

  let [searchStock,setSearchStock] = useState("");

  let handleChange = (e) => {
    setSearchStock(()=>{return e.target.value});
  }

  return (
    <div className='home'>
      <form>
        <input onChange={handleChange} name='stockName' autoComplete='true' placeholder='Enter Stock Name' required />
        <div className="liststock">
          {stock && stock.map((ele) => {
            if(searchStock!=="" && !ele.identifier.toLowerCase().startsWith(searchStock.toLowerCase())) return;
            return (
              <div className="stockInfo" key={ele.id}>
                <div className="name">
                  <p>{ele.identifier}</p>
                </div>
                <div className="info">
                  <p>{ele.open}</p>
                </div>
              </div>)
          })}
        </div>
      </form>
    </div>
  )
}
export default Home
