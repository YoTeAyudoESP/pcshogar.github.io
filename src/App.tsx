import { FinanceProvider } from './contexts/FinanceContext';
import AppLayout from './components/layout/AppLayout';
import Dashboard from './components/dashboard/Dashboard';
import { DateSelectionProvider } from './contexts/DateSelectionContext';
import { AppSettingsProvider } from './contexts/AppSettingsContext';
import DropboxAuthHandler from './components/auth/DropboxAuthHandler';
import { ToastProvider } from './contexts/ToastContext';

function App() {
  return (
    <ToastProvider>
      <AppSettingsProvider>
        <DropboxAuthHandler />
        <FinanceProvider>
          <DateSelectionProvider>
            <AppLayout>
              <Dashboard />
            </AppLayout>
          </DateSelectionProvider>
        </FinanceProvider>
      </AppSettingsProvider>
    </ToastProvider>
  )
}

export default App
