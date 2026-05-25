import { useEffect } from 'react';
import { App as CapApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
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
  useEffect(() => {
    let activeListener: any = null;

    const setupListener = async () => {
      if (Capacitor.isNativePlatform()) {
        activeListener = await CapApp.addListener('backButton', () => {
          if (window.confirm('¿Deseas salir de la aplicación?')) {
            CapApp.exitApp();
          }
        });
      }
    };

    setupListener();

    return () => {
      if (activeListener) {
        activeListener.remove();
      }
    };
  }, []);

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
