import { useEffect } from 'react';
import { App as CapApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { FinanceProvider } from './contexts/FinanceContext';
import AppLayout from './components/layout/AppLayout';
import Dashboard from './components/dashboard/Dashboard';
import { DateSelectionProvider } from './contexts/DateSelectionContext';
import { AppSettingsProvider, useAppSettings } from './contexts/AppSettingsContext';
import DropboxAuthHandler from './components/auth/DropboxAuthHandler';
import GoogleDriveAuthHandler from './components/auth/GoogleDriveAuthHandler';
import CloudStartupChecker from './components/auth/CloudStartupChecker';
import { ToastProvider } from './contexts/ToastContext';
import AppUpdateChecker from './components/common/AppUpdateChecker';
import AndroidApkCleanup from './components/common/AndroidApkCleanup';
import PrivacyDisclaimerModal from './components/common/PrivacyDisclaimerModal';
import AppLockScreen from './components/common/AppLockScreen';
import ErrorBoundary from './components/common/ErrorBoundary';

function AppContent() {
  const { isAuthenticated } = useAppSettings();

  return (
    <>
      <AppLockScreen />
      {isAuthenticated && (
        <>
          <DropboxAuthHandler />
          <GoogleDriveAuthHandler />
          <CloudStartupChecker />
          <AppUpdateChecker />
          <AndroidApkCleanup />
          <FinanceProvider>
            <DateSelectionProvider>
              <AppLayout>
                <Dashboard />
              </AppLayout>
            </DateSelectionProvider>
          </FinanceProvider>
        </>
      )}
    </>
  );
}

function App() {
  useEffect(() => {
    let activeListener: any = null;

    const setupListener = async () => {
      if (Capacitor.isNativePlatform()) {
        activeListener = await CapApp.addListener('backButton', () => {
          const backEvent = new CustomEvent('app-back-pressed', { bubbles: true, cancelable: true });
          document.dispatchEvent(backEvent);
          if (!backEvent.defaultPrevented) {
            if (window.confirm('¿Deseas salir de la aplicación?')) {
              CapApp.exitApp();
            }
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
      <ErrorBoundary>
        <PrivacyDisclaimerModal />
        <AppSettingsProvider>
          <AppContent />
        </AppSettingsProvider>
      </ErrorBoundary>
    </ToastProvider>
  )
}

export default App;
