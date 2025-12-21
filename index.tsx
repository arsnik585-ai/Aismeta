import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Service Worker is completely disabled to avoid Origin Mismatch and Invalid URL errors in the sandbox.
// The app remains offline-first through IndexedDB storage.

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