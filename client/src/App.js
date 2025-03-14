import './App.css';
import { Route, Routes } from 'react-router';
import Home from './pages/Home';
import Stock from './pages/Stock';

function App() {
  return (
    <div className="app">
      <div className="container">
        <Routes>
          <Route path='/' element={<Home />} />
          <Route path='/stock/:stock_name' element={<Stock />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;
