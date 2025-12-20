/**
 * Renderer Process Entry Point
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './styles/index.css';
import { useProjectStore, useSpecStore, useBugStore } from './stores';

// Export stores for debugging (dev only)
if (import.meta.env.DEV) {
  (window as unknown as { __stores: unknown }).__stores = {
    projectStore: useProjectStore,
    specStore: useSpecStore,
    bugStore: useBugStore,
  };
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
