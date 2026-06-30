import React, { useState, useEffect } from 'react';
import { useFinance } from '../../contexts/FinanceContext';
import { X, Check, Calendar, CreditCard, DollarSign, Info, Landmark, Percent } from 'lucide-react';
import type { Loan } from '../../types/finance';
import { formatMoney } from '../../utils/financeCalculations';
import { v4 as uuidv4 } from 'uuid';
import { getCurrencySymbol } from '../../utils/financeCalculations';
import { useTranslation } from '../../hooks/useTranslation';

interface LoanFormProps {
    editingLoan?: Loan;
    onCancelEdit?: () => void;
    onClose?: () => void;
}

const LoanForm: React.FC<LoanFormProps> = ({ editingLoan, onCancelEdit, onClose }) => {
    const { t } = useTranslation();
    const { addLoan, updateLoan, accounts, addRecurringExpense } = useFinance();
    
    // Mode
    const [mode, setMode] = useState<'basic' | 'advanced'>('basic');
    
    // General
    const [name, setName] = useState('');
    const [totalAmount, setTotalAmount] = useState('');
    const [currentDebt, setCurrentDebt] = useState(''); // Solo Basic
    const [color, setColor] = useState('#f59e0b');
    
    // Intereses (Advanced)
    const [tin, setTin] = useState('');
    const [tae, setTae] = useState('');
    const [earlyAmortizationFee, setEarlyAmortizationFee] = useState('');
    
    // Cuotas y Fechas
    const [monthlyPayment, setMonthlyPayment] = useState('');
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [estimatedEndDate, setEstimatedEndDate] = useState('');
    const [durationMonths, setDurationMonths] = useState('');
    const [firstInstallment, setFirstInstallment] = useState('');
    const [lastInstallment, setLastInstallment] = useState('');
    
    // Vinculos
    const [linkedAccountId, setLinkedAccountId] = useState(accounts.find(a => a.isMain)?.id || accounts[0]?.id || '');
    const [autoCreateExpense, setAutoCreateExpense] = useState(true);

    const [activeTab, setActiveTab] = useState(0);
    const [error, setError] = useState<string | null>(null);

    const calculateMonths = (start: string, end: string) => {
        if (!start || !end) return '';
        const d1 = new Date(start);
        const d2 = new Date(end);
        let diff = (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth());
        return diff > 0 ? diff.toString() : '';
    };

    useEffect(() => {
        if (editingLoan) {
            setMode(editingLoan.mode || 'basic');
            setName(editingLoan.name || '');
            setTotalAmount((editingLoan.totalAmount ?? 0).toString());
            setCurrentDebt((editingLoan.currentDebt ?? 0).toString());
            setTin(editingLoan.tin !== undefined ? editingLoan.tin.toString() : '');
            setTae(editingLoan.tae !== undefined ? editingLoan.tae.toString() : '');
            setEarlyAmortizationFee(editingLoan.earlyAmortizationFee !== undefined ? editingLoan.earlyAmortizationFee.toString() : '');
            setMonthlyPayment((editingLoan.monthlyPayment ?? 0).toString());
            
            const sDate = new Date(editingLoan.startDate || Date.now()).toISOString().split('T')[0];
            const eDate = editingLoan.estimatedEndDate ? new Date(editingLoan.estimatedEndDate).toISOString().split('T')[0] : '';
            
            setStartDate(sDate);
            setEstimatedEndDate(eDate);
            setDurationMonths(calculateMonths(sDate, eDate));
            
            setFirstInstallment(editingLoan.firstInstallmentAmount !== undefined ? editingLoan.firstInstallmentAmount.toString() : '');
            setLastInstallment(editingLoan.lastInstallmentAmount !== undefined ? editingLoan.lastInstallmentAmount.toString() : '');
            setLinkedAccountId(editingLoan.linkedAccountId || '');
            setColor(editingLoan.color || '#f59e0b');
        } else {
            setMode('basic');
            setName('');
            setTotalAmount('');
            setCurrentDebt('');
            setTin('');
            setTae('');
            setEarlyAmortizationFee('');
            setMonthlyPayment('');
            
            const today = new Date().toISOString().split('T')[0];
            setStartDate(today);
            setEstimatedEndDate('');
            setDurationMonths('');
            
            setFirstInstallment('');
            setLastInstallment('');
            setLinkedAccountId(accounts.find(a => a.isMain)?.id || accounts[0]?.id || '');
            setColor('#f59e0b');
        }
    }, [editingLoan, accounts]);

    const handleStartDateChange = (val: string) => {
        setStartDate(val);
        const m = parseInt(durationMonths, 10);
        if (!isNaN(m) && m > 0 && val) {
            const date = new Date(val);
            date.setMonth(date.getMonth() + m);
            setEstimatedEndDate(date.toISOString().split('T')[0]);
        }
    };

    const handleEndDateChange = (val: string) => {
        setEstimatedEndDate(val);
        setDurationMonths(calculateMonths(startDate, val));
    };

    const handleMonthsChange = (val: string) => {
        setDurationMonths(val);
        const m = parseInt(val, 10);
        if (!isNaN(m) && m > 0 && startDate) {
            const date = new Date(startDate);
            date.setMonth(date.getMonth() + m);
            setEstimatedEndDate(date.toISOString().split('T')[0]);
        } else if (val === '') {
            setEstimatedEndDate('');
        }
    };
    
    const handleNext = () => {
        setError(null);
        if (activeTab === 0) {
            if (!name.trim()) {
                setError('Debes indicar un nombre para el préstamo.');
                return;
            }
            if (!totalAmount || parseFloat(totalAmount) <= 0) {
                setError('Debes indicar un importe válido mayor que 0.');
                return;
            }
        } else if (activeTab === 1 && mode === 'advanced') {
            if (!tin || parseFloat(tin) <= 0) {
                setError('En un préstamo bancario debes indicar un TIN válido mayor que 0.');
                return;
            }
        }
        
        setActiveTab(mode === 'basic' && activeTab === 0 ? 2 : activeTab + 1);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        
        // Tab 0 validations
        if (!name.trim() || !totalAmount || parseFloat(totalAmount) <= 0) {
            setActiveTab(0);
            setError('Revisa el nombre y el importe (Pestaña General).');
            return;
        }
        
        // Tab 1 validations
        if (mode === 'advanced' && (!tin || parseFloat(tin) <= 0)) {
            setActiveTab(1);
            setError('Revisa el TIN (Pestaña Intereses).');
            return;
        }
        
        // Tab 2 validations
        if (!startDate) {
            setError('Debes indicar una fecha de inicio.');
            return;
        }
        
        if (mode === 'advanced' && !estimatedEndDate) {
            setError('En un préstamo avanzado, debes indicar el plazo o fecha fin estimada.');
            return;
        }

        if (!monthlyPayment || parseFloat(monthlyPayment) <= 0) {
            setError('Debes indicar la cuota mensual a pagar.');
            return;
        }

        const total = parseFloat(totalAmount) || 0;
        let current = parseFloat(currentDebt) || total;
        if (mode === 'advanced') {
            current = total; // Debt calculation is dynamic in advanced mode, we set initial remaining to total
        }
        
        const monthly = parseFloat(monthlyPayment) || 0;
        const first = firstInstallment ? parseFloat(firstInstallment) : undefined;
        const last = lastInstallment ? parseFloat(lastInstallment) : undefined;

        const loanData: Partial<Loan> = {
            name,
            totalAmount: total,
            currentDebt: current,
            remainingAmount: current,
            monthlyPayment: monthly,
            monthlyInstallment: monthly,
            firstInstallmentAmount: first,
            lastInstallmentAmount: last,
            startDate: new Date(startDate).getTime(),
            estimatedEndDate: estimatedEndDate ? new Date(estimatedEndDate).getTime() : undefined,
            linkedAccountId,
            currency: 'EUR' as const,
            status: (current <= 0 ? 'paid' : 'active'),
            isPaid: current <= 0,
            color,
            mode,
            updatedAt: Date.now()
        };

        if (mode === 'advanced') {
            loanData.tin = parseFloat(tin) || 0;
            loanData.tae = parseFloat(tae) || undefined;
            loanData.earlyAmortizationFee = parseFloat(earlyAmortizationFee) || 0;
        }

        if (editingLoan) {
            await updateLoan({ ...editingLoan, ...loanData } as Loan);
            if (onCancelEdit) onCancelEdit();
        } else {
            if (autoCreateExpense && current > 0 && monthly > 0) {
                const loanId = uuidv4();
                const recId = uuidv4();
                const payDay = new Date(startDate).getDate();

                const recurringExpenseData = {
                    id: recId,
                    description: `Cuota Préstamo: ${name}`,
                    amount: monthly,
                    currency: 'EUR' as const,
                    frequency: 'monthly' as const,
                    paymentDay: payDay,
                    active: true,
                    sourceAccountId: linkedAccountId,
                    categoryId: 'cat_loans'
                };
                
                await addRecurringExpense(recurringExpenseData);
                await addLoan({ ...loanData, id: loanId, linkedRecurringExpenseId: recId } as Loan);
            } else {
                await addLoan({ ...loanData, id: uuidv4() } as Loan);
            }
        }
        if (onClose) onClose();
    };

    const labelStyle = { display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'rgba(var(--color-rgb-light), 0.7)', marginBottom: '0.4rem' };
    const inputStyle = { width: '100%', padding: '0.8rem', borderRadius: '0.75rem', border: '1px solid var(--panel-border)', background: 'var(--panel-bg-3)', color: 'var(--text-main)', fontSize: '0.95rem' };

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
            backdropFilter: 'blur(4px)'
        }}>
            <div style={{
                background: '#121212', // Opaco
                borderRadius: '1.5rem',
                width: '100%',
                maxWidth: '600px',
                padding: '2rem',
                boxShadow: '0 20px 50px rgba(0,0,0,0.4)',
                border: '1px solid var(--panel-border)',
                position: 'relative',
                maxHeight: '90vh',
                overflowY: 'auto'
            }}>
                <button 
                    type="button" 
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: '1rem',
                        right: '1rem',
                        background: 'transparent',
                        border: 'none',
                        color: 'rgba(var(--color-rgb-light), 0.5)',
                        cursor: 'pointer'
                    }}
                >
                    <X size={24} />
                </button>

                <h2 style={{ margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <CreditCard size={24} color={color} />
                    {editingLoan ? 'Editar Préstamo' : 'Nuevo Préstamo'}
                </h2>

                {/* Mode Selector */}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', background: 'var(--panel-bg-2)', padding: '0.4rem', borderRadius: '1rem' }}>
                    <button 
                        type="button"
                        onClick={() => setMode('basic')}
                        style={{
                            flex: 1, padding: '0.6rem', borderRadius: '0.75rem', border: 'none', cursor: 'pointer', fontWeight: 600,
                            background: mode === 'basic' ? 'var(--panel-bg)' : 'transparent',
                            color: mode === 'basic' ? 'var(--text-main)' : 'rgba(var(--color-rgb-light), 0.5)',
                            boxShadow: mode === 'basic' ? '0 4px 10px rgba(0,0,0,0.1)' : 'none',
                            transition: 'all 0.2s'
                        }}
                    >
                        Básico
                    </button>
                    <button 
                        type="button"
                        onClick={() => setMode('advanced')}
                        style={{
                            flex: 1, padding: '0.6rem', borderRadius: '0.75rem', border: 'none', cursor: 'pointer', fontWeight: 600,
                            background: mode === 'advanced' ? 'var(--panel-bg)' : 'transparent',
                            color: mode === 'advanced' ? 'var(--text-main)' : 'rgba(var(--color-rgb-light), 0.5)',
                            boxShadow: mode === 'advanced' ? '0 4px 10px rgba(0,0,0,0.1)' : 'none',
                            transition: 'all 0.2s'
                        }}
                    >
                        Bancario (Avanzado)
                    </button>
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', borderBottom: '2px solid var(--panel-border)', marginBottom: '1.5rem' }}>
                    <div 
                        onClick={() => setActiveTab(0)}
                        style={{ padding: '0.5rem 1rem', cursor: 'pointer', borderBottom: activeTab === 0 ? `2px solid ${color}` : '2px solid transparent', color: activeTab === 0 ? color : 'rgba(var(--color-rgb-light), 0.5)', fontWeight: 600, marginBottom: '-2px' }}
                    >
                        General
                    </div>
                    {mode === 'advanced' && (
                        <div 
                            onClick={() => setActiveTab(1)}
                            style={{ padding: '0.5rem 1rem', cursor: 'pointer', borderBottom: activeTab === 1 ? `2px solid ${color}` : '2px solid transparent', color: activeTab === 1 ? color : 'rgba(var(--color-rgb-light), 0.5)', fontWeight: 600, marginBottom: '-2px' }}
                        >
                            Intereses
                        </div>
                    )}
                    <div 
                        onClick={() => setActiveTab(2)}
                        style={{ padding: '0.5rem 1rem', cursor: 'pointer', borderBottom: activeTab === 2 ? `2px solid ${color}` : '2px solid transparent', color: activeTab === 2 ? color : 'rgba(var(--color-rgb-light), 0.5)', fontWeight: 600, marginBottom: '-2px' }}
                    >
                        Cuotas
                    </div>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    
                    {/* TAB 0: General */}
                    {activeTab === 0 && (
                        <>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <div style={{ flex: 2 }}>
                                    <label style={labelStyle}>Nombre del Préstamo</label>
                                    <input style={inputStyle} value={name} onChange={e => setName(e.target.value)} placeholder="Hipoteca, Préstamo Coche..." required />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={labelStyle}>Color Distintivo</label>
                                    <input type="color" style={{ ...inputStyle, padding: '0.2rem', height: '42px', cursor: 'pointer' }} value={color} onChange={e => setColor(e.target.value)} />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: mode === 'basic' ? '1fr 1fr' : '1fr', gap: '1rem' }}>
                                <div>
                                    <label style={labelStyle}><DollarSign size={14} /> Importe {mode === 'advanced' ? 'Inicial (Capital)' : 'Total'}</label>
                                    <input type="number" step="0.01" style={inputStyle} value={totalAmount} onChange={e => setTotalAmount(e.target.value)} placeholder="0.00" required />
                                </div>
                                {mode === 'basic' && (
                                    <div>
                                        <label style={labelStyle}><DollarSign size={14} /> Deuda Actual ({getCurrencySymbol()})</label>
                                        <input type="number" step="0.01" style={inputStyle} value={currentDebt} onChange={e => setCurrentDebt(e.target.value)} placeholder="Opcional" />
                                    </div>
                                )}
                            </div>
                            
                            {mode === 'advanced' && (
                                <div style={{ background: 'rgba(var(--color-info-rgb), 0.1)', padding: '1rem', borderRadius: '1rem', border: '1px solid rgba(var(--color-info-rgb), 0.2)', color: 'var(--color-info)', fontSize: '0.85rem', display: 'flex', gap: '0.5rem' }}>
                                    <Info size={20} style={{ flexShrink: 0 }} />
                                    <span>En el modo avanzado, la deuda actual se calcula automáticamente según las fechas y el TIN usando el sistema de amortización francés.</span>
                                </div>
                            )}

                            <div>
                                <label style={labelStyle}><CreditCard size={14} /> Cuenta Bancaria Vinculada</label>
                                <select style={inputStyle} value={linkedAccountId} onChange={e => setLinkedAccountId(e.target.value)}>
                                    {accounts.map(acc => (
                                        <option key={acc.id} value={acc.id}>{acc.name} ({formatMoney(acc.balance)})</option>
                                    ))}
                                </select>
                            </div>
                        </>
                    )}

                    {/* TAB 1: Intereses (Solo Advanced) */}
                    {activeTab === 1 && mode === 'advanced' && (
                        <>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={labelStyle}><Percent size={14} /> TIN (%)</label>
                                    <input type="number" step="0.01" style={inputStyle} value={tin} onChange={e => setTin(e.target.value)} placeholder="Ej: 5.50" required={mode === 'advanced'} />
                                    <span style={{ fontSize: '0.75rem', color: 'rgba(var(--color-rgb-light), 0.5)' }}>Se usa para el cálculo</span>
                                </div>
                                <div>
                                    <label style={labelStyle}><Percent size={14} /> TAE (%)</label>
                                    <input type="number" step="0.01" style={inputStyle} value={tae} onChange={e => setTae(e.target.value)} placeholder="Opcional" />
                                </div>
                            </div>
                            
                            <div>
                                <label style={labelStyle}><Landmark size={14} /> Comisión Cancelación Anticipada (%)</label>
                                <input type="number" step="0.01" style={inputStyle} value={earlyAmortizationFee} onChange={e => setEarlyAmortizationFee(e.target.value)} placeholder="Ej: 1.00" />
                            </div>
                        </>
                    )}

                    {/* TAB 2: Cuotas y Fechas */}
                    {activeTab === 2 && (
                        <>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                                <div>
                                    <label style={labelStyle}><Calendar size={14} /> Fecha Inicio</label>
                                    <input type="date" style={inputStyle} value={startDate} onChange={e => handleStartDateChange(e.target.value)} required />
                                </div>
                                <div>
                                    <label style={labelStyle}><Calendar size={14} /> Plazo (Meses)</label>
                                    <input type="number" min="1" style={inputStyle} value={durationMonths} onChange={e => handleMonthsChange(e.target.value)} placeholder="Ej: 24" required={mode === 'advanced'} />
                                </div>
                                <div>
                                    <label style={labelStyle}><Calendar size={14} /> Fecha Fin</label>
                                    <input type="date" style={inputStyle} value={estimatedEndDate} onChange={e => handleEndDateChange(e.target.value)} required={mode === 'advanced'} />
                                </div>
                            </div>

                            <div style={{ background: `rgba(245, 158, 11, 0.05)`, padding: '1rem', borderRadius: '1rem', border: `1px solid rgba(245, 158, 11, 0.1)` }}>
                                <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', color: color, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Info size={16} /> Detalles de Cuotas
                                </h4>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label style={{ ...labelStyle, fontSize: '0.75rem' }}>Cuota Normal</label>
                                        <input type="number" step="0.01" style={{ ...inputStyle, padding: '0.5rem' }} value={monthlyPayment} onChange={e => setMonthlyPayment(e.target.value)} placeholder="0.00" />
                                    </div>
                                    <div>
                                        <label style={{ ...labelStyle, fontSize: '0.75rem' }}>1ª Cuota (Opcional)</label>
                                        <input type="number" step="0.01" style={{ ...inputStyle, padding: '0.5rem' }} value={firstInstallment} onChange={e => setFirstInstallment(e.target.value)} placeholder="-" />
                                    </div>
                                    <div>
                                        <label style={{ ...labelStyle, fontSize: '0.75rem' }}>Última Cuota (Opcional)</label>
                                        <input type="number" step="0.01" style={{ ...inputStyle, padding: '0.5rem' }} value={lastInstallment} onChange={e => setLastInstallment(e.target.value)} placeholder="-" />
                                    </div>
                                </div>
                            </div>
                            
                            {!editingLoan && (
                                <div style={{ 
                                    background: 'rgba(245, 158, 11, 0.05)', 
                                    padding: '1rem', 
                                    borderRadius: '12px',
                                    border: '1px solid rgba(245, 158, 11, 0.1)',
                                }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', color: 'var(--text-main)', fontSize: '0.95rem', fontWeight: 600 }}>
                                        <input 
                                            type="checkbox" 
                                            style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: color }}
                                            checked={autoCreateExpense}
                                            onChange={e => setAutoCreateExpense(e.target.checked)}
                                        />
                                        Crear Gasto Fijo automático
                                    </label>
                                </div>
                            )}
                        </>
                    )}

                    {error && (
                        <div style={{ padding: '0.75rem', background: 'rgba(231, 76, 60, 0.1)', color: '#e74c3c', borderRadius: '0.75rem', border: '1px solid rgba(231, 76, 60, 0.2)', fontSize: '0.9rem', textAlign: 'center', marginTop: '0.5rem' }}>
                            {error}
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                        {activeTab > 0 && (
                            <button type="button" onClick={() => setActiveTab(mode === 'basic' && activeTab === 2 ? 0 : activeTab - 1)} style={{
                                flex: 1, padding: '1rem', borderRadius: '1rem', border: '1px solid var(--panel-bg-3)', background: 'var(--panel-bg-2)', color: 'var(--text-main)', fontWeight: 600, cursor: 'pointer'
                            }}>Atrás</button>
                        )}
                        
                        {activeTab === 2 ? (
                            <button type="submit" style={{
                                flex: 2, padding: '1rem', borderRadius: '1rem', border: 'none', background: `linear-gradient(135deg, ${color}, #d97706)`, color: '#fff', fontWeight: 700, cursor: 'pointer', boxShadow: `0 4px 15px ${color}40`
                            }}>
                                {editingLoan ? 'Guardar Cambios' : 'Registrar Préstamo'}
                            </button>
                        ) : (
                            <button type="button" onClick={handleNext} style={{
                                flex: 2, padding: '1rem', borderRadius: '1rem', border: 'none', background: `linear-gradient(135deg, ${color}, #d97706)`, color: '#fff', fontWeight: 700, cursor: 'pointer', boxShadow: `0 4px 15px ${color}40`
                            }}>
                                Siguiente
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
};

export default LoanForm;
