import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Service Worker Registration for PWA / Offline functionality
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Using simple relative path to avoid "Invalid URL" errors in sandboxed/proxied environments
    navigator.serviceWorker.register('./sw.js', { scope: './' })
      .then(reg => {
        console.log('[PWA] Service Worker registered successfully');
        
        // Автоматическое обновление при обнаружении нового воркера
        reg.onupdatefound = () => {
          const installingWorker = reg.installing;
          if (installingWorker) {
            installingWorker.onstatechange = () => {
              if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('[PWA] New content is available; please refresh.');
              }
            };
          }
        };
      })
      .catch(err => {
        // Log warning but don't break the app experience. 
        console.warn('[PWA] Service Worker registration skipped or failed:', err.message);
      });
  });

  // Гарантируем, что воркер берет управление немедленно
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    console.log('[PWA] Service Worker controller changed');
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);