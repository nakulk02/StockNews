import React, {useState} from 'react'


function Stock() {
  const [stock,setStock] = useState({
    id:"",
    symbol:"",
    identifier:"",
    open:"",
    dayhigh:"",
    daylow:""
  })

  
  return (
    <div className='stock'>
      <div className="stockInfo">
        <p>Stock</p>
        <p>Price</p>
      </div>
      <div className="summary">
        <p>Summary</p>
      </div>
    </div>
  )
}

export default Stock
