import { IncomeProvider } from './contexts/IncomeContext';
import { FinanceProvider } from './contexts/FinanceContext';
import AppLayout from './components/layout/AppLayout';
import Dashboard from './components/dashboard/Dashboard';
import { DateSelectionProvider } from './contexts/DateSelectionContext';

function App() {
  return (
    <IncomeProvider>
      <FinanceProvider>
        <DateSelectionProvider>
          <AppLayout>
            <Dashboard />
          </AppLayout>
        </DateSelectionProvider>
      </FinanceProvider>
    </IncomeProvider>
  )
}

export default App
