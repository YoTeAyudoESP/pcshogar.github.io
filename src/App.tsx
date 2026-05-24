import { FinanceProvider } from './contexts/FinanceContext';
import AppLayout from './components/layout/AppLayout';
import Dashboard from './components/dashboard/Dashboard';
import { DateSelectionProvider } from './contexts/DateSelectionContext';
import { AppSettingsProvider } from './contexts/AppSettingsContext';
import DropboxAuthHandler from './components/auth/DropboxAuthHandler';
import DropboxStartupChecker from './components/auth/DropboxStartupChecker';
import { ToastProvider } from './contexts/ToastContext';
import AppUpdateChecker from './components/common/AppUpdateChecker';
import PrivacyDisclaimerModal from './components/common/PrivacyDisclaimerModal';

function App() {
  return (
    <ToastProvider>
      <PrivacyDisclaimerModal />
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
