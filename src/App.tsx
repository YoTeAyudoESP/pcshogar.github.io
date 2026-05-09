import { FinanceProvider } from './contexts/FinanceContext';
import AppLayout from './components/layout/AppLayout';
import Dashboard from './components/dashboard/Dashboard';
import { DateSelectionProvider } from './contexts/DateSelectionContext';
import { AppSettingsProvider } from './contexts/AppSettingsContext';
import DropboxAuthHandler from './components/auth/DropboxAuthHandler';

function App() {
  return (
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
  )
}

export default App
