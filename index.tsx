import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { ThemeProvider } from './contexts/ThemeContext';
import SquareCallback from './components/SquareCallback';
import { isSquareCallbackRoute } from './utils/isSquareCallbackRoute';
import { BrowserRouter } from 'react-router-dom';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ThemeProvider><BrowserRouter>
      {isSquareCallbackRoute() ? <SquareCallback /> : <App />}
    </BrowserRouter></ThemeProvider>
  </React.StrictMode>
);
