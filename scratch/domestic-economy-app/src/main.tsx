import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import './services/syncService'

import { LanguageProvider } from './contexts/LanguageContext.tsx'
import { ThemeProvider } from './contexts/ThemeContext.tsx'

import { incomeDB } from './services/db';

incomeDB.initializeChangesTracking().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ThemeProvider>
        <LanguageProvider>
          <App />
        </LanguageProvider>
      </ThemeProvider>
    </StrictMode>,
  )
});
