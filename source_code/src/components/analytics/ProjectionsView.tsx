import React, { useState, useMemo } from 'react';
import { useFinance } from '../../contexts/FinanceContext';
import { formatMoney, isRecurringActiveInMonth } from '../../utils/financeCalculations';
import { TrendingUp, Info, Plus, Trash2, Calendar, PiggyBank, Wallet, Sparkles } from 'lucide-react';

interface ExtraEvent {
    id: string;
    name: string;
    amount: number;
    month: number; // 0-11
}

const MONTH_NAMES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const ProjectionsView: React.FC = () => {
    const { 
        accounts, fixedIncomes, recurringExpenses, savings, incomes, expenses 
    } = useFinance();

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const remainingMonthsCount = 11 - currentMonth; // Months from currentMonth+1 to Dec

    // User inputs
    const [monthlyVariableBudget, setMonthlyVariableBudget] = useState<number>(400);
    const [extraEvents, setExtraEvents] = useState<ExtraEvent[]>([]);
    const [newEventName, setNewEventName] = useState('');
    const [newEventAmount, setNewEventAmount] = useState('');
    const [newEventMonth, setNewEventMonth] = useState(currentMonth < 11 ? currentMonth + 1 : 11);
    const [newEventType, setNewEventType] = useState<'expense' | 'income'>('expense');

    // 1. Current real bank balance sum
    const currentBankBalance = useMemo(() => {
        return accounts.reduce((acc, a) => acc + (a.balance || 0), 0);
    }, [accounts]);

    // 2. Current total in Huchas
    const currentHuchasTotal = useMemo(() => {
        return savings.reduce((acc, s) => acc + (s.currentAmount || 0), 0);
    }, [savings]);

    // 3. Estimate remaining fixed incomes from next month to December
    const futureFixedIncomesTotal = useMemo(() => {
        let total = 0;
        const activeFixed = fixedIncomes.filter(f => f.active);
        for (let m = currentMonth + 1; m <= 11; m++) {
            for (const f of activeFixed) {
                if (isRecurringActiveInMonth(f.frequency, f.paymentMonth, m, currentYear, f.createdAt || 0)) {
                    total += f.amount || 0;
                }
            }
        }
        return total;
    }, [fixedIncomes, currentMonth, currentYear]);

    // 4. Estimate remaining fixed expenses from next month to December
    const futureFixedExpensesTotal = useMemo(() => {
        let total = 0;
        const activeRec = recurringExpenses.filter(r => r.active);
        for (let m = currentMonth + 1; m <= 11; m++) {
            for (const r of activeRec) {
                if (isRecurringActiveInMonth(r.frequency, r.paymentMonth, m, currentYear, r.updatedAt || 0)) {
                    total += r.amount || 0;
                }
            }
        }
        return total;
    }, [recurringExpenses, currentMonth, currentYear]);

    // 5. Estimate remaining auto-savings to Huchas
    const futureHuchaAutoSavingsTotal = useMemo(() => {
        let total = 0;
        for (const s of savings) {
            let monthlyHuchaTotal = 0;
            if (s.incomeSources && s.incomeSources.length > 0) {
                monthlyHuchaTotal = s.incomeSources.reduce((sum, src) => sum + (src.monthlyAmount || 0), 0);
            } else if (s.monthlySavingAmount && s.monthlySavingAmount > 0) {
                monthlyHuchaTotal = s.monthlySavingAmount;
            }

            if (monthlyHuchaTotal > 0) {
                total += monthlyHuchaTotal * Math.max(0, remainingMonthsCount);
            }
        }
        return total;
    }, [savings, remainingMonthsCount]);

    // 6. Extra events sum
    const extraEventsNetSum = useMemo(() => {
        return extraEvents.reduce((acc, e) => acc + e.amount, 0);
    }, [extraEvents]);

    // Total estimated variable expenses until Dec
    const estimatedVariableTotal = monthlyVariableBudget * Math.max(0, remainingMonthsCount);

    // Projected net free money at 31 Dec
    const projectedFreeMoneyDec31 = currentBankBalance + futureFixedIncomesTotal - futureFixedExpensesTotal - futureHuchaAutoSavingsTotal - estimatedVariableTotal + extraEventsNetSum;

    // Projected total Huchas at 31 Dec
    const projectedHuchasDec31 = currentHuchasTotal + futureHuchaAutoSavingsTotal;

    const handleAddExtraEvent = (e: React.FormEvent) => {
        e.preventDefault();
        const amt = parseFloat(newEventAmount);
        if (!newEventName.trim() || isNaN(amt) || amt <= 0) return;
        
        const finalAmt = newEventType === 'expense' ? -Math.abs(amt) : Math.abs(amt);
        setExtraEvents(prev => [...prev, {
            id: Date.now().toString(),
            name: newEventName.trim(),
            amount: finalAmt,
            month: newEventMonth
        }]);
        setNewEventName('');
        setNewEventAmount('');
    };

    const handleRemoveExtraEvent = (id: string) => {
        setExtraEvents(prev => prev.filter(e => e.id !== id));
    };

    return (
        <div style={{
            background: 'rgba(23, 25, 35, 0.8)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '1.25rem',
            padding: '1.75rem',
            color: 'white',
            backdropFilter: 'blur(12px)',
            marginBottom: '2rem'
        }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <div style={{ padding: '0.6rem', borderRadius: '0.75rem', background: 'rgba(129, 140, 248, 0.15)', color: '#818cf8' }}>
                    <Sparkles size={24} />
                </div>
                <div>
                    <h2 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0 }}>Simulador de Proyección a Fin de Año</h2>
                    <p style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.5)', margin: 0 }}>
                        Estimación hipotética al 31 de Diciembre de {currentYear}
                    </p>
                </div>
            </div>

            {/* Disclaimer Banner */}
            <div style={{
                background: 'rgba(59, 130, 246, 0.1)',
                border: '1px solid rgba(59, 130, 246, 0.25)',
                borderRadius: '0.75rem',
                padding: '0.85rem 1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                fontSize: '0.82rem',
                color: '#93c5fd',
                marginBottom: '1.5rem'
            }}>
                <Info size={18} style={{ flexShrink: 0 }} />
                <span>Esta herramienta es un simulador interactivo para planificar escenarios futuros. <strong>No altera tu contabilidad real.</strong></span>
            </div>

            {/* Results Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: '1.25rem',
                marginBottom: '2rem'
            }}>
                {/* Result 1: Projected Available */}
                <div style={{
                    background: projectedFreeMoneyDec31 >= 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    border: `1px solid ${projectedFreeMoneyDec31 >= 0 ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                    borderRadius: '1rem',
                    padding: '1.25rem'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', marginBottom: '0.4rem' }}>
                        <Wallet size={16} /> Disponible Estimado (31 Dic)
                    </div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 800, color: projectedFreeMoneyDec31 >= 0 ? '#10b981' : '#ef4444' }}>
                        {formatMoney(projectedFreeMoneyDec31)}
                    </div>
                    <div style={{ fontSize: '0.75rem', opacity: 0.6, marginTop: '0.4rem' }}>
                        Dinero líquido en banco tras fijos, variables y eventos
                    </div>
                </div>

                {/* Result 2: Projected Huchas */}
                <div style={{
                    background: 'rgba(99, 102, 241, 0.1)',
                    border: '1px solid rgba(99, 102, 241, 0.3)',
                    borderRadius: '1rem',
                    padding: '1.25rem'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', marginBottom: '0.4rem' }}>
                        <PiggyBank size={16} /> Total Huchas Estimado (31 Dic)
                    </div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#818cf8' }}>
                        {formatMoney(projectedHuchasDec31)}
                    </div>
                    <div style={{ fontSize: '0.75rem', opacity: 0.6, marginTop: '0.4rem' }}>
                        Patrimonio acumulado en todas tus huchas
                    </div>
                </div>
            </div>

            {/* Interactive Control Panel */}
            <div style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '1rem',
                padding: '1.25rem',
                marginBottom: '1.5rem'
            }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginTop: 0, marginBottom: '1rem', color: 'white' }}>
                    Parámetros de Ajuste del Simulador
                </h3>

                {/* Slider / Variable Budget Input */}
                <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem', fontSize: '0.88rem' }}>
                        <span>Gasto Variable Estimado al Mes (Supermercado, ocio...):</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <input 
                                type="number" 
                                min="0"
                                step="10"
                                value={monthlyVariableBudget || ''}
                                onChange={e => setMonthlyVariableBudget(Math.max(0, Number(e.target.value)))}
                                style={{
                                    width: '105px',
                                    padding: '0.4rem 0.6rem',
                                    borderRadius: '0.5rem',
                                    border: '1px solid rgba(251, 191, 36, 0.4)',
                                    background: 'rgba(251, 191, 36, 0.1)',
                                    color: '#fbbf24',
                                    fontWeight: 700,
                                    fontSize: '1rem',
                                    textAlign: 'right'
                                }}
                            />
                            <span style={{ color: '#fbbf24', fontWeight: 700 }}>€ / mes</span>
                        </div>
                    </div>
                    <input 
                        type="range" 
                        min="0" 
                        max="3000" 
                        step="25"
                        value={monthlyVariableBudget}
                        onChange={e => setMonthlyVariableBudget(Number(e.target.value))}
                        style={{ width: '100%', cursor: 'pointer', accentColor: '#fbbf24' }}
                    />
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.4rem' }}>
                        Estimación total para {remainingMonthsCount} meses restantes: {formatMoney(estimatedVariableTotal)}
                    </div>
                </div>

                {/* Add Custom Extra Event Form */}
                <form onSubmit={handleAddExtraEvent} style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr)) auto',
                    gap: '0.75rem',
                    alignItems: 'end',
                    background: 'rgba(0,0,0,0.2)',
                    padding: '0.85rem',
                    borderRadius: '0.75rem'
                }}>
                    <div>
                        <label style={{ fontSize: '0.75rem', opacity: 0.6, display: 'block', marginBottom: '0.2rem' }}>Concepto</label>
                        <input 
                            type="text"
                            placeholder="Ej. Vacaciones, Paga extra..."
                            value={newEventName}
                            onChange={e => setNewEventName(e.target.value)}
                            style={{ width: '100%', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'white', fontSize: '0.85rem' }}
                        />
                    </div>
                    <div>
                        <label style={{ fontSize: '0.75rem', opacity: 0.6, display: 'block', marginBottom: '0.2rem' }}>Tipo</label>
                        <select 
                            value={newEventType}
                            onChange={e => setNewEventType(e.target.value as any)}
                            style={{ width: '100%', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'white', fontSize: '0.85rem' }}
                        >
                            <option value="expense" style={{ background: '#1e2029' }}>Gasto Extra (-)</option>
                            <option value="income" style={{ background: '#1e2029' }}>Ingreso Extra (+)</option>
                        </select>
                    </div>
                    <div>
                        <label style={{ fontSize: '0.75rem', opacity: 0.6, display: 'block', marginBottom: '0.2rem' }}>Importe (€)</label>
                        <input 
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={newEventAmount}
                            onChange={e => setNewEventAmount(e.target.value)}
                            style={{ width: '100%', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'white', fontSize: '0.85rem' }}
                        />
                    </div>
                    <div>
                        <label style={{ fontSize: '0.75rem', opacity: 0.6, display: 'block', marginBottom: '0.2rem' }}>Mes Previsto</label>
                        <select 
                            value={newEventMonth}
                            onChange={e => setNewEventMonth(Number(e.target.value))}
                            style={{ width: '100%', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'white', fontSize: '0.85rem' }}
                        >
                            {MONTH_NAMES.slice(currentMonth).map((name, idx) => (
                                <option key={name} value={currentMonth + idx} style={{ background: '#1e2029' }}>{name}</option>
                            ))}
                        </select>
                    </div>
                    <button type="submit" style={{
                        padding: '0.55rem 1rem',
                        borderRadius: '0.5rem',
                        background: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        fontSize: '0.85rem'
                    }}>
                        <Plus size={16} /> Añadir
                    </button>
                </form>

                {/* Extra Events List */}
                {extraEvents.length > 0 && (
                    <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>Eventos Extra Personalizados:</div>
                        {extraEvents.map(ev => (
                            <div key={ev.id} style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                background: 'rgba(255,255,255,0.04)',
                                padding: '0.6rem 0.85rem',
                                borderRadius: '0.5rem',
                                fontSize: '0.85rem'
                            }}>
                                <span><strong>{ev.name}</strong> ({MONTH_NAMES[ev.month]})</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <span style={{ fontWeight: 700, color: ev.amount >= 0 ? '#10b981' : '#ef4444' }}>
                                        {ev.amount >= 0 ? `+${formatMoney(ev.amount)}` : formatMoney(ev.amount)}
                                    </span>
                                    <button onClick={() => handleRemoveExtraEvent(ev.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', opacity: 0.8 }}>
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Breakdown Summary */}
            <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                <div>• Saldo actual en bancos: <strong>{formatMoney(currentBankBalance)}</strong></div>
                <div>• Ingresos fijos futuros: <strong>+{formatMoney(futureFixedIncomesTotal)}</strong></div>
                <div>• Gastos fijos futuros: <strong>-{formatMoney(futureFixedExpensesTotal)}</strong></div>
                <div>• Ahorro futuro a huchas: <strong>-{formatMoney(futureHuchaAutoSavingsTotal)}</strong></div>
            </div>
        </div>
    );
};

export default ProjectionsView;
