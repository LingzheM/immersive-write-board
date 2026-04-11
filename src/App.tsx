import React from 'react';
import './App.css';

const App: React.FC = () => (
  <>
    <canvas
      id="container"
      style={{ position: 'fixed', inset: 0, display: 'block' }}
    />
    <div style={{ position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 8, zIndex: 10 }}>
      <button id="btn-rain">Rain</button>
      <button id="btn-storm">Storm</button>
      <button id="btn-drizzle">Drizzle</button>
      <button id="btn-fallout">Fallout</button>
      <button id="btn-sun">Sun</button>
    </div>
  </>
);

export default App;
