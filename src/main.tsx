import React from 'react';
import { createRoot } from 'react-dom/client';
import App from '../App';
import './index.css';
import { LanguageProvider } from './contexts/LanguageContext';

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <LanguageProvider>
        <App />
      </LanguageProvider>
    </React.StrictMode>
  );
}
