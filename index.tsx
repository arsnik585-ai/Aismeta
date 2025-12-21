import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// В средах песочниц (как AI Studio) Service Worker часто вызывает ошибки Origin Mismatch или Invalid URL.
// Отключаем его регистрацию для обеспечения стабильной работы основного функционала приложения.
/*
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
*/

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