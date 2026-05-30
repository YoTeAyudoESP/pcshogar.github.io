import { useEffect } from 'react';
import { IncomeProvider } from './contexts/IncomeContext';
import { FinanceProvider } from './contexts/FinanceContext';
import AppLayout from './components/layout/AppLayout';
import Dashboard from './components/dashboard/Dashboard';
import { MonthClosingProvider } from './contexts/MonthClosingContext';
import { DateSelectionProvider } from './contexts/DateSelectionContext';
import { initSync } from './services/syncService';
import GlobalNotification from './components/shared/GlobalNotification';

function App() {
  useEffect(() => {
    // Check for updates on startup
    initSync();
  }, []);

  return (
    <IncomeProvider>
      <FinanceProvider>
        <MonthClosingProvider>
          <DateSelectionProvider>
            <AppLayout>
              <GlobalNotification />
              <Dashboard />
            </AppLayout>
          </DateSelectionProvider>
        </MonthClosingProvider>
      </FinanceProvider>
    </IncomeProvider>
  )
}

export default App
