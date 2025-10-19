import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import { WebSocketProvider } from './WebSocketProvider';
import { CardThemeProvider } from './contexts/CardThemeContext';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <CardThemeProvider>
        <WebSocketProvider>
          <App />
        </WebSocketProvider>
      </CardThemeProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
