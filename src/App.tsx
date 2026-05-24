import { FinanceProvider } from './contexts/FinanceContext';
import AppLayout from './components/layout/AppLayout';
import Dashboard from './components/dashboard/Dashboard';
import { DateSelectionProvider } from './contexts/DateSelectionContext';
import { AppSettingsProvider } from './contexts/AppSettingsContext';
import DropboxAuthHandler from './components/auth/DropboxAuthHandler';
import DropboxStartupChecker from './components/auth/DropboxStartupChecker';
import { ToastProvider } from './contexts/ToastContext';
import AppUpdateChecker from './components/common/AppUpdateChecker';

function App() {
  return (
    <ToastProvider>
      <AppSettingsProvider>
        <DropboxAuthHandler />
        <DropboxStartupChecker />
        <AppUpdateChecker />
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
