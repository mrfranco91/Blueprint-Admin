import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
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
    <BrowserRouter>
      {isSquareCallbackRoute() ? <SquareCallback /> : <App />}
    </BrowserRouter>
  </React.StrictMode>
);
