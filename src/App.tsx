import React from 'react';
import './App.css';

declare global {
  interface Window {
    switchToMist?: () => void;
    switchToSpringRain?: () => void;
  }
}

const App: React.FC = () => (
  <>
    <div className="slideshow" />
    <canvas id="container" className="app-canvas" />
    <div className="mist-overlay" />
    <nav className="slideshow__nav">
      <a id="btn-rain" className="nav-item" href="#"
        onClick={(e) => { e.preventDefault(); window.switchToSpringRain?.(); }}>
        <i className="icon icon--rainy" />
        <span>Spring Rain</span>
      </a>
      <a id="btn-mist" className="nav-item" href="#"
        onClick={(e) => { e.preventDefault(); window.switchToMist?.(); }}>
        <i className="icon icon--mist" />
        <span>Mist</span>
      </a>
    </nav>
  </>
);

export default App;
