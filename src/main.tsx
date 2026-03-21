import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/index.css';
import './styles/reveal-overrides.css';
import './styles/animations/core-animations.css';
import './styles/animations/advanced-effects.css';
import 'reveal.js/dist/reveal.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
