import React, { useState } from 'react';
import { useFinance } from '../../contexts/FinanceContext';
import IncomeForm from '../income/IncomeForm';
import IncomeList from '../income/IncomeList';
import ExpenseForm from '../expenses/ExpenseForm';
import ExpenseList from '../expenses/ExpenseList';
import FinanceSummary from './FinanceSummary';
import SettingsView from '../settings/SettingsView';
import ExpenseCategoryChart from '../analytics/ExpenseCategoryChart';
import YearlyFinancialChart from '../analytics/YearlyFinancialChart';
import LoansChart from '../analytics/LoansChart';
import DateSelector from '../common/DateSelector';
import { LayoutDashboard, Settings as SettingsIcon, PlusCircle, MinusCircle } from 'lucide-react';
import type { Income } from '../../types/income';

const Dashboard: React.FC = () => {
    const [currentView, setCurrentView] = useState<'dashboard' | 'settings'>('dashboard');
    const [showIncomeForm, setShowIncomeForm] = useState(false);
    const [showExpenseForm, setShowExpenseForm] = useState(false);
    const [editingIncome, setEditingIncome] = useState<Income | null>(null);
    const { importData } = useFinance();
    const fileInputRef = React.useRef<HTMLInputElement>(null);


    const handleRestore = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const json = JSON.parse(e.target?.result as string);
                await importData(json);
                alert("Base de datos restaurada con éxito.");
            } catch (err) {
                console.error("Error al restaurar la base de datos", err);
                alert("Error al cargar el archivo JSON. Asegúrate de que sea un respaldo válido.");
            }
        };
        reader.readAsText(file);
    };

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1rem' }}>
            {/* Hidden File Input */}
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleRestore} 
                accept=".json" 
                style={{ display: 'none' }} 
            />

            {/* Header / Navigation */}
            <header style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '2rem',
                padding: '1rem',
                background: 'rgba(255,255,255,0.03)',
                borderRadius: 'var(--radius-lg)',
                backdropFilter: 'blur(10px)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <img 
                        src="logo.png" 
                        alt="Logo" 
                        style={{ width: '40px', height: '40px', objectFit: 'contain' }}
                        onError={(e) => (e.currentTarget.style.display = 'none')} 
                    />
                    <h1 style={{
                        fontSize: '1.5rem',
                        fontWeight: 700,
                        background: 'linear-gradient(to right, var(--color-primary), var(--color-secondary))',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        margin: 0
                    }}>
                        PCS Hogar v0.8.3
                    </h1>

                    <button
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                            fontSize: '0.8rem',
                            padding: '0.4rem 0.8rem',
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: 'var(--radius-sm)',
                            color: 'var(--text-muted)',
                            cursor: 'pointer'
                        }}
                    >
                        Restaurar BD
                    </button>
                </div>

                <nav style={{ display: 'flex', gap: '1rem' }}>

                    <button
                        onClick={() => setCurrentView('dashboard')}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.75rem 1rem',
                            background: currentView === 'dashboard' ? 'rgba(255,255,255,0.1)' : 'transparent',
                            border: 'none',
                            borderRadius: 'var(--radius-md)',
                            color: currentView === 'dashboard' ? 'white' : 'var(--text-muted)',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            fontWeight: 500
                        }}
                    >
                        <LayoutDashboard size={18} />
                        Dashboard
                    </button>
                    <button
                        onClick={() => setCurrentView('settings')}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.75rem 1rem',
                            background: currentView === 'settings' ? 'rgba(255,255,255,0.1)' : 'transparent',
                            border: 'none',
                            borderRadius: 'var(--radius-md)',
                            color: currentView === 'settings' ? 'white' : 'var(--text-muted)',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            fontWeight: 500
                        }}
                    >
                        <SettingsIcon size={18} />
                        Configuración
                    </button>
                </nav>
            </header>

            {/* Content Area */}
            {currentView === 'dashboard' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    <DateSelector />
                    <FinanceSummary />

                    {/* Charts Section */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>
                        <YearlyFinancialChart />
                        <ExpenseCategoryChart />
                        <LoansChart />
                    </div>

                    {/* Quick Actions (Transactions) */}
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                        <button
                            onClick={() => { setShowIncomeForm(!showIncomeForm); setShowExpenseForm(false); }}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '0.5rem',
                                padding: '1rem 2rem', background: 'var(--color-secondary)',
                                border: 'none', borderRadius: 'var(--radius-lg)',
                                color: 'white', fontWeight: 600, cursor: 'pointer',
                                boxShadow: '0 4px 12px rgba(46, 204, 113, 0.2)'
                            }}
                        >
                            <PlusCircle size={20} />
                            Ingreso
                        </button>
                        <button
                            onClick={() => { setShowExpenseForm(!showExpenseForm); setShowIncomeForm(false); }}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '0.5rem',
                                padding: '1rem 2rem', background: 'var(--color-accent)',
                                border: 'none', borderRadius: 'var(--radius-lg)',
                                color: 'white', fontWeight: 600, cursor: 'pointer',
                                boxShadow: '0 4px 12px rgba(231, 76, 60, 0.2)'
                            }}
                        >
                            <MinusCircle size={20} />
                            Gasto
                        </button>
                    </div>

                    {(showIncomeForm || editingIncome) && (
                        <div className="glass-panel" style={{ padding: 'var(--space-md)', animation: 'fadeIn 0.3s ease' }}>
                            <IncomeForm 
                                initialData={editingIncome} 
                                onClose={() => { 
                                    setShowIncomeForm(false); 
                                    setEditingIncome(null); 
                                }} 
                            />
                        </div>
                    )}

                    {showExpenseForm && (
                        <div className="glass-panel" style={{ padding: 'var(--space-md)', animation: 'fadeIn 0.3s ease' }}>
                            <ExpenseForm />
                        </div>
                    )}

                    {/* Recent Transactions area - Simplified for now */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                        <div>
                            <h3 style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>Últimos Ingresos</h3>
                            <IncomeList onEdit={(income) => {
                                setEditingIncome(income);
                                setShowIncomeForm(false);
                                setShowExpenseForm(false);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                            }} />
                        </div>
                        <div>
                            <h3 style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>Últimos Gastos</h3>
                            <ExpenseList />
                        </div>
                    </div>
                </div>
            ) : (
                <SettingsView />
            )}
        </div>
    );
};

export default Dashboard;
