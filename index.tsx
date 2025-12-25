import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// VK Bridge integration
declare const vkBridge: any;

if (typeof vkBridge !== 'undefined' && vkBridge.supports("VKWebAppInit")) {
  vkBridge.send("VKWebAppInit");

  // Listener for Safe Areas
  vkBridge.subscribe((e: any) => {
    if (e.detail && e.detail.type === 'VKWebAppUpdateConfig') {
      const { insets } = e.detail.data;
      if (insets) {
        const root = document.documentElement;
        root.style.setProperty('--safe-area-inset-top', `${insets.top}px`);
        root.style.setProperty('--safe-area-inset-bottom', `${insets.bottom}px`);
        root.style.setProperty('--safe-area-inset-left', `${insets.left}px`);
        root.style.setProperty('--safe-area-inset-right', `${insets.right}px`);
      }
    }
  });
}

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