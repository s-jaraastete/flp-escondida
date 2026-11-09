import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './app/App';
import './styles/index.css';
import { applyTextSize, readTextSize } from './features/a11y/TextSize';

applyTextSize(readTextSize());

// Enlaces antiguos con "#" (/#/web/...): se convierten a la ruta limpia equivalente (/web/...).
if (window.location.hash.startsWith('#/')) {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  window.history.replaceState(null, '', base + window.location.hash.slice(1));
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// App instalable y disponible sin señal (solo en el build publicado; en desarrollo interferiría con la recarga en caliente).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {
      /* sin service worker la app sigue funcionando en línea */
    });
  });
}
