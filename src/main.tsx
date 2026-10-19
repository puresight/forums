import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { log } from './lib/observability/logger';
import './index.css';

log('info', 'storage', 'App boot', {
  context: { online: navigator.onLine },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
