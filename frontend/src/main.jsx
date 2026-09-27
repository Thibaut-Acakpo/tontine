import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './auth.jsx';
import { ThemeProvider } from './components/ThemeProvider.jsx';
import { CoinField, CursorGlow } from './components/Fx.jsx';
import { ToastContainer } from './components/ui.jsx';
import { InstallPrompt } from './components/InstallPrompt.jsx';
import './i18n.js';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <div className="boot" aria-hidden="true"><div>TONTINE · CHARGEMENT…</div></div>
    <CoinField /><CursorGlow />
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <App />
          <ToastContainer />
          <InstallPrompt />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>,
);