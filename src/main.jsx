import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './theme.css';
import App from './App.jsx';

// 1. App boot: Vite loads index.html, finds <div id="root">, and React mounts the app there.
createRoot(document.getElementById('root')).render(
  // 1A. StrictMode runs extra development checks so React can warn about unsafe patterns early.
  <StrictMode>
    {/* 1B. App.jsx takes over from here and builds the provider, shell, navigation, and active module. */}
    <App />
  </StrictMode>
);
