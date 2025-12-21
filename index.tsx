import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Регистрация Service Worker с защитой от ошибок окружения
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Используем относительный путь и обрабатываем ошибки (например, если файл не найден на сервере)
    navigator.serviceWorker.register('./sw.js', { scope: './' })
      .then(reg => {
        console.log('[PWA] Service Worker registered successfully with scope:', reg.scope);
      })
      .catch(err => {
        // В некоторых песочницах (iframe/cross-origin) регистрация SW запрещена или файл может отсутствовать
        console.warn('[PWA] Service Worker registration skipped or failed:', err.message);
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