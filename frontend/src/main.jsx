import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { Buffer } from 'buffer';
import './styles/Global.css';
window.Buffer = Buffer;

import process from 'process';
window.process = process;

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);