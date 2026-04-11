import React from 'react';
import './App.css';

const App: React.FC = () => (
  <>
    <canvas id="container" className="app-canvas" />
    <nav className="slideshow__nav">
      <a id="btn-rain" className="nav-item nav-item--current" href="#">
        <i className="icon icon--rainy" />
        <span>Rain</span>
      </a>
      <a id="btn-sun" className="nav-item" href="#">
        <i className="icon icon--sun" />
        <span>Sun</span>
      </a>
    </nav>
  </>
);

export default App;
