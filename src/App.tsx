// src/App.tsx
import React from 'react';
import { RainGlassLayer } from './layers/RainGlassLayer';
import './App.css';

const App: React.FC = () => {
  return (
    <main className="app-canvas">
      {/* WebGL 全屏雨滴折射层（Task 1: 静态水滴验收）*/}
      <RainGlassLayer />
    </main>
  );
};

export default App;
