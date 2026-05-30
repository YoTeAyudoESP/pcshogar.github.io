import React, { useState } from 'react';
import { useIncome } from '../../contexts/IncomeContext';
import { useFinance } from '../../contexts/FinanceContext';
import { useDateSelection } from '../../contexts/DateSelectionContext';
import { formatCurrency } from '../../utils/formatters';
import { Plus, Trash2, Check, Edit2, X } from 'lucide-react';
import IncomeForm from './IncomeForm';
import type { Income } from '../../types/income';

const IncomeList: React.FC<{ showFixed?: boolean, onlyFixed?: boolean }> = ({ showFixed = true, onlyFixed = false }) => {
    const { fixedIncomes, extraIncomes, deleteIncome, confirmFixedIncome } = useIncome();
    const { selectedMonth, selectedYear } = useDateSelection();
    const { accounts, refreshFinance } = useFinance();
    const [editingIncome, setEditingIncome] = useState<Income | null>(null);
    const [confirmingId, setConfirmingId] = useState<string | null>(null);
    const [confirmingExtraId, setConfirmingExtraId] = useState<string | null>(null);
    const [customDate, setCustomDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedAccountId, setSelectedAccountId] = useState(accounts[0]?.id || '');
    const [useNextMonth, setUseNextMonth] = useState(false);

    const { updateIncome } = useIncome();

    const formatDate = (ts?: number) => ts ? new Date(ts).toLocaleDateString() : 'Indefinido';

    const filteredExtra = extraIncomes
        .filter(inc => {
            if (inc.status === 'pending') return false;
            // Use budget month/year if available, otherwise fallback to receivedDate
            const m = inc.budgetMonth !== undefined ? inc.budgetMonth : new Date(inc.receivedDate).getMonth();
            const y = inc.budgetYear !== undefined ? inc.budgetYear : new Date(inc.receivedDate).getFullYear();
            return m === selectedMonth && y === selectedYear;
        })
        .sort((a, b) => a.receivedDate - b.receivedDate);


    return (
        <div style={{ display: 'grid', gap: 'var(--space-md)', gridTemplateColumns: showFixed ? 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))' : '1fr' }}>
            {/* Fixed Incomes Column */}
            {showFixed && (
                <div>
                    <h3 style={{ marginBottom: '1rem', color: 'var(--color-primary-light)' }}>Ingresos Fijos</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {fixedIncomes.length === 0 ? (
                            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>No hay ingresos fijos.</p>
                        ) : (
                            fixedIncomes.map(income => (
                                <div key={income.id} className="glass-panel" style={{ background: 'var(--bg-surface-elevated)', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <div style={{ fontWeight: 600 }}>{income.name}</div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                {income.frequency === 'weekly' ? 'Semanal' : income.frequency === 'monthly' ? 'Mensual' : 'Anual'} • Expira: {formatDate(income.expirationDate)}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <div style={{
                                                color: income.amount < 0 ? 'var(--hue-danger)' : 'var(--color-success)',
                                                fontWeight: 700,
                                                fontSize: '1.1rem',
                                                marginRight: '0.5rem'
                                            }}>
                                                {income.amount < 0 ? '-' : '+'}{formatCurrency(Math.abs(income.amount), income.currency)}
                                            </div>
                                            <button
                                                onClick={() => {
                                                    if (confirmingId === income.id) {
                                                        setConfirmingId(null);
                                                    } else {
                                                        setConfirmingId(income.id);
                                                        setSelectedAccountId(income.linkedAccountId || accounts[0]?.id || '');
                                                    }
                                                }}
                                                className="btn-icon"
                                                style={{ color: confirmingId === income.id ? 'var(--btn-primary-text)' : 'var(--color-success)', background: confirmingId === income.id ? 'var(--color-success)' : 'var(--alert-success-bg)' }}
                                                title="Confirmar recepción"
                                            >
                                                {confirmingId === income.id ? <X size={16} /> : <Check size={16} />}
                                            </button>
                                            <button onClick={() => setEditingIncome(income)} className="btn-icon" style={{ color: 'var(--color-primary)' }}>
                                                <Edit2 size={16} />
                                            </button>
                                            <button onClick={async () => {
                                                if (window.confirm('¿Seguro que quieres borrar este ingreso?')) {
                                                    await deleteIncome(income.id!);
                                                    await refreshFinance();
                                                }
                                            }} className="btn-icon" style={{ color: 'var(--hue-danger)' }}>
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>

                                    {confirmingId === income.id && (
                                        <div style={{ background: 'var(--bg-surface)', border: 'var(--card-border)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '0.5rem', alignItems: 'end' }}>
                                                <div>
                                                    <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.2rem', display: 'block' }}>Fecha de cobro</label>
                                                    <input
                                                        type="date"
                                                        value={customDate}
                                                        onChange={e => setCustomDate(e.target.value)}
                                                        style={{ background: 'rgba(0,0,0,0.2)', border: 'none', color: 'white', padding: '0.4rem', borderRadius: '4px', width: '100%' }}
                                                    />
                                                </div>
                                                <div>
                                                    <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.2rem', display: 'block' }}>Cuenta / Destino</label>
                                                    <select
                                                        value={selectedAccountId}
                                                        onChange={e => setSelectedAccountId(e.target.value)}
                                                        style={{ background: 'rgba(0,0,0,0.2)', border: 'none', color: 'white', padding: '0.4rem', borderRadius: '4px', width: '100%' }}
                                                    >
                                                        {accounts.map(acc => (
                                                            <option key={acc.id} value={acc.id} style={{ background: '#333' }}>
                                                                {acc.type === 'cash' ? '💵' : '🏦'} {acc.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <button
                                                    onClick={async () => {
                                                        const accId = selectedAccountId || income.linkedAccountId || accounts[0]?.id;
                                                        if (accId) {
                                                            let bMonth = undefined;
                                                            let bYear = undefined;
                                                            if (useNextMonth) {
                                                                const d = new Date(selectedYear, selectedMonth + 1, 1);
                                                                bMonth = d.getMonth();
                                                                bYear = d.getFullYear();
                                                            }
                                                            await confirmFixedIncome(income.id, selectedMonth, selectedYear, accId, {
                                                                dateOverride: new Date(customDate).getTime(),
                                                                budgetMonth: bMonth,
                                                                budgetYear: bYear
                                                            });
                                                            await refreshFinance();
                                                            setConfirmingId(null);
                                                            setUseNextMonth(false);
                                                        }
                                                    }}
                                                    className="btn-primary"
                                                    style={{ padding: '0.4rem 0.8rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, height: '2.1rem' }}
                                                >
                                                    Confirmar
                                                </button>
                                            </div>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={useNextMonth}
                                                    onChange={e => setUseNextMonth(e.target.checked)}
                                                />
                                                Asignar liquidez al mes siguiente
                                            </label>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* Pending Incomes Column */}
            {!onlyFixed && (
                <div>
                    <h3 style={{ marginBottom: '1rem', color: 'var(--hue-warning)' }}>Ingresos Pendientes</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {extraIncomes.filter(inc => inc.status === 'pending').length === 0 ? (
                            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>No hay ingresos pendientes.</p>
                        ) : (
                            extraIncomes.filter(inc => inc.status === 'pending').map(income => (
                                <div key={income.id} className="glass-panel" style={{ background: 'var(--bg-surface-elevated)', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <div style={{ fontWeight: 600 }}>{income.name}</div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                Esperado: {new Date(income.receivedDate).toLocaleDateString()}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <div style={{ fontWeight: 700, color: 'var(--hue-warning)', marginRight: '0.5rem' }}>
                                                {formatCurrency(income.amount, income.currency)}
                                            </div>
                                            <button
                                                onClick={() => {
                                                    if (confirmingExtraId === income.id) {
                                                        setConfirmingExtraId(null);
                                                    } else {
                                                        setConfirmingExtraId(income.id!);
                                                        setSelectedAccountId(income.linkedAccountId || accounts[0]?.id || '');
                                                    }
                                                }}
                                                className="btn-icon"
                                                style={{ background: confirmingExtraId === income.id ? 'var(--text-muted)' : 'var(--color-success)', color: 'white' }}
                                                title="Confirmar Recepción"
                                            >
                                                {confirmingExtraId === income.id ? <X size={16} /> : <Check size={16} />}
                                            </button>
                                            <button onClick={() => setEditingIncome(income)} className="btn-icon">
                                                <Edit2 size={16} />
                                            </button>
                                            <button onClick={async () => {
                                                if (window.confirm('¿Borrar ingreso pendiente?')) {
                                                    await deleteIncome(income.id!);
                                                    await refreshFinance();
                                                }
                                            }} className="btn-icon" style={{ color: 'var(--hue-danger)' }}>
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>

                                    {confirmingExtraId === income.id && (
                                        <div style={{ background: 'var(--bg-surface)', border: 'var(--card-border)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '0.5rem', alignItems: 'end' }}>
                                                <div>
                                                    <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.2rem', display: 'block' }}>Fecha de cobro</label>
                                                    <input
                                                        type="date"
                                                        value={customDate}
                                                        onChange={e => setCustomDate(e.target.value)}
                                                        style={{ background: 'rgba(0,0,0,0.2)', border: 'none', color: 'white', padding: '0.4rem', borderRadius: '4px', width: '100%' }}
                                                    />
                                                </div>
                                                <div>
                                                    <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.2rem', display: 'block' }}>Cuenta / Destino</label>
                                                    <select
                                                        value={selectedAccountId}
                                                        onChange={e => setSelectedAccountId(e.target.value)}
                                                        style={{ background: 'rgba(0,0,0,0.2)', border: 'none', color: 'white', padding: '0.4rem', borderRadius: '4px', width: '100%' }}
                                                    >
                                                        {accounts.map(acc => (
                                                            <option key={acc.id} value={acc.id} style={{ background: '#333' }}>
                                                                {acc.type === 'cash' ? '💵' : '🏦'} {acc.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <button
                                                    onClick={async () => {
                                                        const updatedIncome: any = {
                                                            ...income,
                                                            status: 'received',
                                                            linkedAccountId: selectedAccountId,
                                                            receivedDate: new Date(customDate).getTime(),
                                                            effectiveDate: new Date(customDate).getTime()
                                                        };
                                                        await updateIncome(updatedIncome);
                                                        await refreshFinance();
                                                        setConfirmingExtraId(null);

                                                    }}
                                                    className="btn-primary"
                                                    style={{ padding: '0.4rem 0.8rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, height: '2.1rem' }}
                                                >
                                                    Confirmar
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* Realized Incomes Column */}
            {!onlyFixed && (
                <div style={{ marginTop: showFixed ? '0' : '2rem' }}>
                    <h3 style={{ marginBottom: '1rem', color: 'var(--color-secondary)' }}>Ingresos Cobrados</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {filteredExtra.length === 0 ? (
                            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>No hay ingresos registrados para este mes.</p>
                        ) : (
                            filteredExtra.map(income => {
                                const isConfirmedFixed = income.category === 'Ingreso Fijo Confirmado';
                                return (
                                    <div key={income.id} className="glass-panel" style={{ background: 'var(--bg-surface-elevated)', padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                                            <div style={{
                                                width: '40px', height: '40px', borderRadius: '12px',
                                                background: isConfirmedFixed ? 'var(--alert-success-bg)' : 'var(--alert-success-bg)',
                                                color: isConfirmedFixed ? 'var(--color-primary)' : 'var(--color-success)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                border: isConfirmedFixed ? '1px solid var(--color-primary)' : '1px solid var(--color-success)'
                                            }}>
                                                <Plus size={20} />
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <div style={{ fontWeight: 600 }}>{income.name}</div>
                                                    <span style={{
                                                        fontSize: '0.65rem',
                                                        padding: '2px 6px',
                                                        borderRadius: '4px',
                                                        background: isConfirmedFixed ? 'var(--alert-success-bg)' : 'var(--alert-success-bg)',
                                                        color: isConfirmedFixed ? 'var(--color-primary)' : 'var(--color-success)',
                                                        textTransform: 'uppercase',
                                                        fontWeight: 700,
                                                        border: isConfirmedFixed ? '1px solid var(--color-primary)' : '1px solid var(--color-success)'
                                                    }}>
                                                        {isConfirmedFixed ? 'Fijo' : 'Extra'}
                                                    </span>
                                                </div>
                                                <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>
                                                    {new Date(income.receivedDate).toLocaleDateString()}
                                                    {income.budgetMonth !== undefined && ` • Presupuesto: ${new Date(0, income.budgetMonth).toLocaleString('es', { month: 'short' })}`}
                                                </div>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            <div style={{
                                                color: income.amount < 0 ? 'var(--hue-danger)' : 'var(--color-success)',
                                                fontWeight: 700,
                                                fontSize: '1.1rem'
                                            }}>
                                                {income.amount < 0 ? '-' : '+'}{formatCurrency(Math.abs(income.amount), income.currency)}
                                            </div>
                                            <div style={{ display: 'flex', gap: '0.25rem' }}>
                                                <button onClick={() => setEditingIncome(income)} className="btn-icon" style={{ color: 'var(--color-primary)' }}>
                                                    <Edit2 size={16} />
                                                </button>
                                                <button onClick={async () => {
                                                    if (window.confirm('¿Eliminar este ingreso y revertir el saldo?')) {
                                                        await deleteIncome(income.id!);
                                                        await refreshFinance();
                                                    }
                                                }} className="btn-icon" style={{ color: 'var(--hue-danger)' }}>
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}

            {editingIncome && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
                    <div className="glass-panel" style={{ maxWidth: '600px', width: '100%', position: 'relative', padding: '2rem', maxHeight: '90vh', overflowY: 'auto' }}>
                        <button
                            onClick={() => setEditingIncome(null)}
                            style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', zIndex: 10 }}
                            title="Cerrar"
                        >
                            <X size={24} />
                        </button>
                        <h3 style={{ marginBottom: '1.5rem', textAlign: 'center' }}>Editar Ingreso</h3>
                        <IncomeForm incomeToEdit={editingIncome} onClose={() => setEditingIncome(null)} />
                    </div>
                </div>
            )}
        </div>
    );
};

export default IncomeList;
