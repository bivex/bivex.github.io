import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';

// Enable React DevTools in development
if (process.env.NODE_ENV === 'development') {
  const script = document.createElement('script');
  script.src = 'https://unpkg.com/react-devtools@4.28.0/standalone.js';
  document.head.appendChild(script);
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
); 