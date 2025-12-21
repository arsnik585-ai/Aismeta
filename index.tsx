import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Регистрация Service Worker с защитой от ошибок окружения и кросс-доменных ограничений
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // В некоторых средах песочниц (например, AI Studio) SW может не регистрироваться из-за несовпадения origin
    // Мы проверяем текущий origin и пытаемся зарегистрировать файл только если он доступен
    const swUrl = new URL('./sw.js', import.meta.url);
    
    if (swUrl.origin === window.location.origin) {
      navigator.serviceWorker.register('./sw.js', { scope: './' })
        .then(reg => {
          console.log('[PWA] Service Worker registered successfully:', reg.scope);
        })
        .catch(err => {
          console.warn('[PWA] Service Worker registration failed (expected in some sandboxes):', err.message);
        });
    } else {
      console.warn('[PWA] Service Worker origin mismatch. Registration skipped to prevent security errors.');
    }
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