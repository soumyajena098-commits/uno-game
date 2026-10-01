import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { FullscreenProvider } from './context/FullscreenContext.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <FullscreenProvider>
        <App />
      </FullscreenProvider>
    </BrowserRouter>
  </React.StrictMode>
);
