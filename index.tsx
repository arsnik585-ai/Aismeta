import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Регистрация Service Worker упрощена для избежания ошибок в песочницах
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Используем простой относительный путь, чтобы избежать ошибок URL и Origin
    navigator.serviceWorker.register('./sw.js')
      .then(reg => {
        console.log('[PWA] Service Worker registered:', reg.scope);
      })
      .catch(err => {
        // Игнорируем ошибки регистрации в среде разработки/песочнице
        console.debug('[PWA] Service Worker registration skipped (normal for this environment)');
      });
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