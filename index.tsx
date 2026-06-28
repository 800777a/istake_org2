
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './i18n'; // Import i18n configuration
import { LanguageProvider } from './src/contexts/LanguageContext';

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
