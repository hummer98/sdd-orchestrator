/**
 * Remote UI Application Entry Point
 *
 * This is the main entry point for the Remote UI React application.
 * It initializes React and renders the App component to the DOM.
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/index.css';

// Get the root element
const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found. Check if index.html has <div id="root"></div>');
}

// Create React root and render the app
const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
