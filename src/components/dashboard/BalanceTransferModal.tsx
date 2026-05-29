import React, { useState } from 'react';
import { useFinance } from '../../contexts/FinanceContext';
import { useDateSelection } from '../../contexts/DateSelectionContext';
import { X, ArrowRightLeft, Info, AlertTriangle } from 'lucide-react';
import { formatMoney, calculateAvailableBalanceForMonth } from '../../utils/financeCalculations';
import { useToast } from '../../contexts/ToastContext';

interface BalanceTransferModalProps {
    onClose: () => void;
}

const BalanceTransferModal: React.FC<BalanceTransferModalProps> = ({ onClose }) => {
    const { 
        accounts, cards, savings, fixedIncomes, extraIncomes, 
        expenses, allocations, recurringExpenses, overrides, 
        performTransfer, adjustSavings 
    } = useFinance();
    const { selectedMonth, selectedYear } = useDateSelection();
    const { showToast } = useToast();

    const [activeTab, setActiveTab] = useState<'accounts' | 'savings'>('accounts');

    // Exclude debit/credit cards and only get bank accounts (bank, cash) and virtual cards
    const transferAccounts = accounts.filter(a => a.type === 'bank' || a.type === 'cash');
    const transferCards = cards.filter(c => c.type === 'virtual');

    // Aggregate list for selection and display
    const transferItems = [
        ...transferAccounts.map(a => ({ id: a.id, name: a.name, balance: a.balance, type: a.type })),
        ...transferCards.map(c => ({ id: c.id, name: c.name, balance: c.currentBalance, type: 'virtual' }))
    ];

    const totalBalance = transferItems.reduce((sum, item) => sum + item.balance, 0);

    const { availableToSpend } = calculateAvailableBalanceForMonth(selectedYear, selectedMonth, {
        fixedIncomes, extraIncomes, expenses, allocations,
        savings, recurringExpenses, overrides, cards
    });

    const [fromId, setFromId] = useState('');
    const [toId, setToId] = useState('');
    const [amount, setAmount] = useState('');
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);

    const parsedAmount = parseFloat(amount);
    const remaining = isNaN(parsedAmount) ? availableToSpend : availableToSpend - parsedAmount;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (activeTab === 'accounts') {
            if (!fromId || !toId || !amount) return;

            const transferAmount = parseFloat(amount);
            if (isNaN(transferAmount) || transferAmount <= 0) {
                showToast('El importe debe ser un número positivo', 'error');
                return;
            }

            const sourceItem = transferItems.find(item => item.id === fromId);
            if (!sourceItem || sourceItem.balance < transferAmount) {
                showToast('Fondos insuficientes en el origen seleccionado', 'error');
                return;
            }

            setLoading(true);
            try {
                await performTransfer(fromId, toId, transferAmount, notes);
                showToast('Traspaso realizado con éxito', 'success');
                onClose();
            } catch (err) {
                console.error(err);
                showToast('Error al realizar el traspaso', 'error');
            } finally {
                setLoading(false);
            }
        } else {
            if (!toId || !amount) return;

            const transferAmount = parseFloat(amount);
            if (isNaN(transferAmount) || transferAmount <= 0) {
                showToast('El importe debe ser un número positivo', 'error');
                return;
            }

            if (transferAmount > availableToSpend) {
                showToast('El importe no puede superar al disponible actual del mes', 'error');
                return;
            }

            setLoading(true);
            try {
                // Virtual saving allocation (no accountId, isVirtual = true)
                await adjustSavings(toId, transferAmount, undefined, true);
                showToast('Ahorro asignado con éxito', 'success');
                onClose();
            } catch (err) {
                console.error(err);
                showToast('Error al realizar el ahorro', 'error');
            } finally {
                setLoading(false);
            }
        }
    };

    const inputStyle: React.CSSProperties = {
        background: '#1e2029',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '12px',
        padding: '0.8rem',
        color: 'white',
        width: '100%',
        fontSize: '1rem',
        outline: 'none',
        marginTop: '0.5rem',
        boxSizing: 'border-box'
    };

    const labelStyle: React.CSSProperties = {
        color: 'rgba(255,255,255,0.6)',
        fontSize: '0.9rem',
        fontWeight: 600
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-container glass-panel" style={{ 
                padding: '2rem',
                maxWidth: '480px',
                width: '95%',
                maxHeight: '90vh',
                overflowY: 'auto'
            }} onClick={e => e.stopPropagation()}>
                
                {/* Close Button */}
                <button onClick={onClose} style={{
                    position: 'absolute',
                    top: '1.5rem',
                    right: '1.5rem',
                    background: 'rgba(255,255,255,0.05)',
                    border: 'none',
                    color: 'white',
                    padding: '8px',
                    borderRadius: '50%',
                    cursor: 'pointer',
                    display: 'flex'
                }}>
                    <X size={20} />
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                    <div style={{
                        background: 'rgba(99, 102, 241, 0.1)',
                        padding: '10px',
                        borderRadius: '12px',
                        color: 'var(--color-primary)'
                    }}>
                        <ArrowRightLeft size={24} />
                    </div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, color: 'white' }}>Traspaso Rápido</h2>
                </div>

                {/* Tabs Switcher */}
                <div style={{ 
                    display: 'flex', 
                    gap: '4px', 
                    background: 'rgba(255,255,255,0.05)', 
                    padding: '4px', 
                    borderRadius: '12px', 
                    marginBottom: '1.5rem' 
                }}>
                    <button
                        type="button"
                        onClick={() => {
                            setActiveTab('accounts');
                            setToId('');
                            setAmount('');
                        }}
                        style={{
                            flex: 1,
                            padding: '0.65rem',
                            borderRadius: '8px',
                            border: 'none',
                            background: activeTab === 'accounts' ? '#6366f1' : 'transparent',
                            color: 'white',
                            fontWeight: 700,
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        Entre Cuentas
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setActiveTab('savings');
                            setToId('');
                            setAmount('');
                        }}
                        style={{
                            flex: 1,
                            padding: '0.65rem',
                            borderRadius: '8px',
                            border: 'none',
                            background: activeTab === 'savings' ? '#6366f1' : 'transparent',
                            color: 'white',
                            fontWeight: 700,
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        Ahorro en Huchas
                    </button>
                </div>

                {/* Top Summary Panel */}
                {activeTab === 'accounts' ? (
                    <div style={{
                        background: 'rgba(25, 27, 34, 0.6)',
                        padding: '1.25rem',
                        borderRadius: '16px',
                        border: '1px solid rgba(255,255,255,0.05)',
                        marginBottom: '1.5rem',
                        textAlign: 'center'
                    }}>
                        <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.25rem' }}>
                            Total Disponible Físico
                        </div>
                        <div style={{ fontSize: '2rem', fontWeight: 900, color: '#38bdf8' }}>
                            {formatMoney(totalBalance)}
                        </div>
                        <div style={{ 
                            fontSize: '0.75rem', 
                            color: 'rgba(255,255,255,0.4)', 
                            marginTop: '0.5rem',
                            lineHeight: '1.4'
                        }}>
                            Cuentas bancarias y tarjetas monedero (Huchas y crédito excluidos)
                        </div>
                    </div>
                ) : (
                    <div style={{
                        background: 'rgba(25, 27, 34, 0.6)',
                        padding: '1.25rem',
                        borderRadius: '16px',
                        border: '1px solid rgba(255,255,255,0.05)',
                        marginBottom: '1.5rem',
                        textAlign: 'center'
                    }}>
                        <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.25rem' }}>
                            Disponible del Mes para Ahorrar
                        </div>
                        <div style={{ fontSize: '2rem', fontWeight: 900, color: availableToSpend >= 0 ? '#10b981' : '#f43f5e' }}>
                            {formatMoney(availableToSpend)}
                        </div>
                        <div style={{ 
                            fontSize: '0.75rem', 
                            color: 'rgba(255,255,255,0.4)', 
                            marginTop: '0.5rem',
                            lineHeight: '1.4'
                        }}>
                            Asignación virtual desde tu disponible mensual actual
                        </div>
                    </div>
                )}

                {/* Items List (Cuentas or Huchas) */}
                <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '0.5rem',
                    marginBottom: '1.75rem',
                    maxHeight: '160px',
                    overflowY: 'auto',
                    paddingRight: '4px'
                }} className="custom-scrollbar">
                    {activeTab === 'accounts' ? (
                        transferItems.map(item => (
                            <div key={item.id} style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '0.6rem 0.8rem',
                                background: 'rgba(255,255,255,0.02)',
                                borderRadius: '8px',
                                border: '1px solid rgba(255,255,255,0.03)'
                            }}>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#fff' }}>{item.name}</span>
                                    <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>
                                        {item.type === 'bank' ? 'Banco' : item.type === 'cash' ? 'Efectivo' : 'Tarjeta Monedero'}
                                    </span>
                                </div>
                                <span style={{ 
                                    fontWeight: 700, 
                                    color: item.type === 'virtual' ? '#10B981' : '#38bdf8', 
                                    fontSize: '0.95rem' 
                                }}>
                                    {formatMoney(item.balance)}
                                </span>
                            </div>
                        ))
                    ) : (
                        savings.map(goal => (
                            <div key={goal.id} style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '0.6rem 0.8rem',
                                background: 'rgba(255,255,255,0.02)',
                                borderRadius: '8px',
                                border: '1px solid rgba(255,255,255,0.03)'
                            }}>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#fff' }}>{goal.name}</span>
                                    <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>
                                        Hucha virtual
                                    </span>
                                </div>
                                <span style={{ 
                                    fontWeight: 700, 
                                    color: '#10B981', 
                                    fontSize: '0.95rem' 
                                }}>
                                    {formatMoney(goal.currentAmount)}
                                </span>
                            </div>
                        ))
                    )}
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {activeTab === 'accounts' ? (
                        <>
                            <div>
                                <label style={labelStyle}>Origen</label>
                                <select 
                                    style={inputStyle} 
                                    value={fromId} 
                                    onChange={e => {
                                        setFromId(e.target.value);
                                        if (e.target.value === toId) setToId('');
                                    }}
                                    required
                                >
                                    <option value="">Seleccione origen...</option>
                                    {transferItems.map(item => (
                                        <option key={item.id} value={item.id}>
                                            {item.name} ({formatMoney(item.balance)})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label style={labelStyle}>Destino</label>
                                <select 
                                    style={inputStyle} 
                                    value={toId} 
                                    onChange={e => setToId(e.target.value)}
                                    required
                                    disabled={!fromId}
                                >
                                    <option value="">Seleccione destino...</option>
                                    {transferItems
                                        .filter(item => item.id !== fromId)
                                        .map(item => (
                                            <option key={item.id} value={item.id}>
                                                {item.name} ({formatMoney(item.balance)})
                                            </option>
                                        ))
                                    }
                                </select>
                            </div>
                        </>
                    ) : (
                        <div>
                            <label style={labelStyle}>Seleccionar Hucha Destino</label>
                            <select 
                                style={inputStyle} 
                                value={toId} 
                                onChange={e => setToId(e.target.value)}
                                required
                            >
                                <option value="">Seleccione hucha...</option>
                                {savings.map(goal => (
                                    <option key={goal.id} value={goal.id}>
                                        {goal.name} ({formatMoney(goal.currentAmount)})
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div>
                        <label style={labelStyle}>Importe (€)</label>
                        <input 
                            type="number" 
                            step="0.01" 
                            style={inputStyle} 
                            placeholder="0.00" 
                            value={amount} 
                            onChange={e => setAmount(e.target.value)} 
                            required 
                        />
                    </div>

                    {activeTab === 'savings' && !isNaN(parsedAmount) && parsedAmount > 0 && (
                        <div style={{ 
                            marginTop: '-0.75rem', 
                            fontSize: '0.85rem', 
                            fontWeight: 600,
                            color: remaining >= 0 ? '#10b981' : '#f43f5e' 
                        }}>
                            {remaining >= 0 
                                ? `Disponible restante si aceptas: ${formatMoney(remaining)}` 
                                : '¡Atención! Superas el disponible actual del mes'
                            }
                        </div>
                    )}

                    {activeTab === 'accounts' ? (
                        <>
                            <div>
                                <label style={labelStyle}>Concepto / Notas</label>
                                <input 
                                    type="text" 
                                    style={inputStyle} 
                                    placeholder="Ej. Recarga monedero" 
                                    value={notes} 
                                    onChange={e => setNotes(e.target.value)} 
                                />
                            </div>

                            {/* Information Banner Accounts */}
                            <div style={{
                                background: 'rgba(99, 102, 241, 0.05)',
                                border: '1px solid rgba(99, 102, 241, 0.15)',
                                borderRadius: '10px',
                                padding: '0.75rem',
                                display: 'flex',
                                gap: '0.5rem',
                                alignItems: 'flex-start'
                            }}>
                                <Info size={16} style={{ color: 'var(--color-primary)', marginTop: '2px', flexShrink: 0 }} />
                                <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)', lineHeight: '1.4' }}>
                                    Este traspaso es directo e interno. No afectará a tus ingresos o gastos del mes ni a tu disponible mensual.
                                </span>
                            </div>
                        </>
                    ) : (
                        /* Information Banner Savings */
                        <div style={{
                            background: 'rgba(245, 158, 11, 0.05)',
                            border: '1px solid rgba(245, 158, 11, 0.15)',
                            borderRadius: '10px',
                            padding: '0.75rem',
                            display: 'flex',
                            gap: '0.5rem',
                            alignItems: 'flex-start'
                        }}>
                            <AlertTriangle size={16} style={{ color: '#fbbf24', marginTop: '2px', flexShrink: 0 }} />
                            <span style={{ fontSize: '0.78rem', color: '#fbbf24', lineHeight: '1.4' }}>
                                Esta asignación es virtual. Reducirá tu disponible mensual del mes seleccionado, pero no moverá dinero real de tus cuentas.
                            </span>
                        </div>
                    )}

                    <button 
                        type="submit" 
                        disabled={loading}
                        style={{
                            padding: '1.1rem',
                            borderRadius: '14px',
                            border: 'none',
                            background: activeTab === 'accounts' 
                                ? 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)'
                                : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                            color: 'white',
                            fontWeight: 700,
                            fontSize: '1.1rem',
                            cursor: 'pointer',
                            marginTop: '0.5rem',
                            boxShadow: activeTab === 'accounts'
                                ? '0 4px 15px rgba(99, 102, 241, 0.3)'
                                : '0 4px 15px rgba(16, 185, 129, 0.3)',
                            opacity: loading ? 0.7 : 1
                        }}
                    >
                        {loading ? 'Procesando...' : activeTab === 'accounts' ? 'Confirmar Traspaso' : 'Confirmar Ahorro'}
                    </button>
                </form>

            </div>
        </div>
    );
};

export default BalanceTransferModal;
