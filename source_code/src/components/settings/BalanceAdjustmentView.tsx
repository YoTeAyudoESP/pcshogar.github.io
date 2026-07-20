import React, { useState, useMemo } from 'react';
import { useFinance } from '../../contexts/FinanceContext';
import { useDateSelection } from '../../contexts/DateSelectionContext';
import { 
    Calendar, 
    RefreshCw, 
    AlertTriangle, 
    Edit3, 
    Trash2, 
    History, 
    EyeOff, 
    Eye, 
    RotateCcw,
    TrendingDown,
    TrendingUp,
    Monitor
} from 'lucide-react';
import type { MonthClosing, MonthOverride } from '../../types/finance';
import ModalPortal from '../common/ModalPortal';

const BalanceAdjustmentView: React.FC = () => {
    const { 
        overrides, closings, incomes,
        setMonthOverride, deleteMonthOverride,
        updateMonthClosing, reverseMonthClosing, refreshFinance,
        ignoreMonthClosing, deleteIncome, editMonthClosingAmount
    } = useFinance();
    const { selectedYear: defaultYear, selectedMonth: defaultMonth } = useDateSelection();

    const [year, setYear] = useState(defaultYear);
    const [month, setMonth] = useState(defaultMonth);
    const [amount, setAmount] = useState('');
    const [showIgnored, setShowIgnored] = useState(false);
    const [editingClosing, setEditingClosing] = useState<MonthClosing | null>(null);
    const [dismissedUntil, setDismissedUntil] = useState<number>(0);

    React.useEffect(() => {
        try {
            const saved = localStorage.getItem('balanceDiscrepancyDismissed');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed.untilDate) setDismissedUntil(parsed.untilDate);
            }
        } catch (e) {}
    }, []);

    const handleRestoreAlert = () => {
        localStorage.removeItem('balanceDiscrepancyDismissed');
        setDismissedUntil(0);
    };

    // Derived data
    const activeAdjustments = useMemo(() => {
        return [...overrides].sort((a, b) => {
            if (a.year !== b.year) return b.year - a.year;
            return b.month - a.month;
        });
    }, [overrides]);

    const activeRemnants = useMemo(() => {
        return incomes.filter(inc => inc.type === 'rollover');
    }, [incomes]);

    const historyClosings = useMemo(() => {
        return closings
            .filter(c => c.status === 'processed')
            .sort((a, b) => (b.year * 12 + b.month) - (a.year * 12 + a.month));
    }, [closings]);

    const ignoredClosings = useMemo(() => {
        return closings
            .filter(c => c.status === 'ignored')
            .sort((a, b) => (b.year * 12 + b.month) - (a.year * 12 + a.month));
    }, [closings]);

    const handleApplyOverride = async () => {
        const val = parseFloat(amount);
        if (isNaN(val)) return;
        await setMonthOverride(year, month, val);
        setAmount('');
    };

    const handleRestoreIgnored = async (closing: MonthClosing) => {
        await updateMonthClosing({
            ...closing,
            status: 'pending'
        });
    };

    const handleDeleteClosing = async (id: string) => {
        if (window.confirm('¿Estás seguro de que deseas deshacer este cierre? Se revertirán los movimientos generados y tendrás que decidir de nuevo.')) {
            await reverseMonthClosing(id);
        }
    };

    const handleIgnoreClosing = async (id: string) => {
        if (window.confirm('¿Deseas ignorar este cierre? Se revertirán los movimientos generados (remanentes) y el mes dejará de tenerse en cuenta para cálculos futuros.')) {
            await ignoreMonthClosing(id);
        }
    };

    const handleDeleteRemnant = async (id: string) => {
        if (window.confirm('¿Estás seguro de que deseas eliminar este remanente activo? Esto modificará el saldo disponible del mes de destino y de la cuenta asociada.')) {
            await deleteIncome(id);
        }
    };

    const getMonthName = (m: number) => {
        return new Date(2024, m).toLocaleString('es-ES', { month: 'long' });
    };

    const formatCurrency = (val: number) => {
        const isNegative = val < 0;
        const [integerPart, decimalPart] = Math.abs(val).toFixed(2).split('.');
        const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        return `${isNegative ? '-' : ''}${formattedInteger},${decimalPart}€`;
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* 1. Header with Form */}
            <div className="glass-panel" style={{ padding: '1.5rem', background: 'rgba(255, 255, 255, 0.03)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                    <Calendar size={24} className="color-primary" />
                    <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Ajustes de Saldo</h3>
                </div>
                
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                    Si detectas un error en el cálculo automático, puedes forzar un importe disponible manualmente o gestionar los remanentes acumulados.
                </p>

                <div style={{ 
                    background: 'rgba(236, 72, 153, 0.1)', 
                    border: '1px solid rgba(236, 72, 153, 0.2)', 
                    padding: '1rem', 
                    borderRadius: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    marginBottom: '2rem'
                }}>
                    <Monitor size={20} color="#ec4899" />
                    <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Este ajuste sobrescribirá la lógica del programa. Úsalo con precaución.</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', opacity: 0.7 }}>Año</label>
                        <input 
                            type="number" 
                            value={year} 
                            onChange={e => setYear(parseInt(e.target.value))}
                            className="form-input"
                            style={{ width: '100%' }}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', opacity: 0.7 }}>Mes a Ajustar</label>
                        <select 
                            value={month} 
                            onChange={e => setMonth(parseInt(e.target.value))}
                            className="form-input"
                            style={{ width: '100%' }}
                        >
                            {Array.from({ length: 12 }, (_, i) => (
                                <option key={i} value={i}>{getMonthName(i)}</option>
                            ))}
                        </select>
                    </div>
                    <div style={{ flex: 2 }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', opacity: 0.7 }}>Importe Disponible</label>
                        <div style={{ position: 'relative' }}>
                            <input 
                                type="number" 
                                step="0.01"
                                placeholder="0.00"
                                value={amount}
                                onChange={e => setAmount(e.target.value)}
                                className="form-input"
                                style={{ width: '100%', fontSize: '1.5rem', textAlign: 'center', fontWeight: 700 }}
                            />
                            <span style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', fontWeight: 700, opacity: 0.5 }}>€</span>
                        </div>
                    </div>
                </div>

                <button 
                    onClick={handleApplyOverride}
                    className="btn btn-primary"
                    style={{ width: '100%', padding: '1rem', borderRadius: '0.5rem' }}
                >
                    Aplicar Ajuste
                </button>
            </div>

            {/* 1.5. Discrepancy Alert Status */}
            <div>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', opacity: 0.8 }}>Estado del Cuadre de Saldos</h3>
                <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <AlertTriangle size={24} color="#f59e0b" />
                        <div>
                            <h4 style={{ margin: 0, color: '#f59e0b', fontSize: '1.05rem' }}>Alertas de Descuadre</h4>
                            <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>
                                Si hay diferencias entre tu dinero real y el dinero asignado, el sistema te avisa en el Dashboard.
                            </p>
                        </div>
                    </div>
                    {Date.now() < dismissedUntil ? (
                        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <strong style={{ display: 'block', marginBottom: '4px' }}>Tienes una alerta oculta actualmente.</strong>
                                <span style={{ fontSize: '0.85rem', opacity: 0.6 }}>Estará oculta hasta: {new Date(dismissedUntil).toLocaleDateString()}</span>
                            </div>
                            <button 
                                onClick={handleRestoreAlert}
                                style={{ background: '#f59e0b', color: 'black', border: 'none', padding: '0.6rem 1.2rem', borderRadius: '0.5rem', fontWeight: 600, cursor: 'pointer' }}
                            >
                                Restaurar en Dashboard
                            </button>
                        </div>
                    ) : (
                        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '0.5rem' }}>
                            <span style={{ fontSize: '0.9rem', opacity: 0.8 }}>No tienes ninguna alerta de descuadre oculta. Si hay descuadre, lo verás en tu Dashboard.</span>
                        </div>
                    )}
                </div>
            </div>

            {/* 2. Active Adjustments List */}
            <div>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', opacity: 0.8 }}>Ajustes Activos</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {activeAdjustments.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '2rem', opacity: 0.3 }}>No hay ajustes manuales activos</div>
                    ) : (
                        activeAdjustments.map(adj => (
                            <div key={adj.id} className="glass-panel" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h4 style={{ margin: 0, textTransform: 'capitalize' }}>{getMonthName(adj.month)} de {adj.year}</h4>
                                    <span style={{ fontSize: '0.8rem', opacity: 0.5 }}>Base calc.: -- €</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                                    <div style={{ color: '#818cf8', fontWeight: 700, fontSize: '1.1rem', whiteSpace: 'nowrap' }}>
                                        {formatCurrency(adj.amount)}
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button onClick={() => { setYear(adj.year); setMonth(adj.month); setAmount(adj.amount.toString()); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                            <Edit3 size={18} />
                                        </button>
                                        <button onClick={() => deleteMonthOverride(adj.id)} style={{ background: 'none', border: 'none', color: '#ff4757', cursor: 'pointer' }}>
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* 3. History of Closings */}
            <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                    <History size={20} className="color-primary" />
                    <h3 style={{ margin: 0, fontSize: '1.1rem', opacity: 0.8 }}>Gestión de Remanentes / Déficits</h3>
                </div>
                <p style={{ fontSize: '0.85rem', opacity: 0.6, marginBottom: '1.5rem' }}>
                    Aquí puedes ver y eliminar los arrastres de saldo entre meses. Si un mes tiene un remanente incorrecto, bórralo aquí.
                </p>

                <h4 style={{ fontSize: '0.9rem', marginBottom: '1rem', opacity: 0.7 }}>Historial de Cierres y Remanentes</h4>
                <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                        <thead style={{ background: 'rgba(255,255,255,0.02)' }}>
                            <tr>
                                <th style={{ textAlign: 'left', padding: '1rem' }}>Mes Cerrado</th>
                                <th style={{ textAlign: 'left', padding: '1rem' }}>Acción Tomada</th>
                                <th style={{ textAlign: 'right', padding: '1rem' }}>Importe</th>
                                <th style={{ textAlign: 'center', padding: '1rem' }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {historyClosings.length === 0 ? (
                                <tr><td colSpan={4} style={{ padding: '2rem', textAlign: 'center', opacity: 0.3 }}>No hay historial de cierres</td></tr>
                            ) : (
                                historyClosings.map(c => (
                                    <tr key={c.id} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                        <td style={{ padding: '1rem', textTransform: 'capitalize' }}>{getMonthName(c.month)} {c.year}</td>
                                        <td style={{ padding: '1rem' }}>Procesado</td>
                                        <td style={{ padding: '1rem', textAlign: 'right', color: c.finalBalance >= 0 ? '#2ed573' : '#ff4757', fontWeight: 600, whiteSpace: 'nowrap' }}>
                                            {formatCurrency(c.finalBalance)}
                                        </td>
                                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                                            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                                                <button 
                                                    onClick={() => setEditingClosing(c)} 
                                                    title="Editar Importe"
                                                    style={{ background: 'none', border: 'none', color: '#818cf8', cursor: 'pointer' }}
                                                >
                                                    <Edit3 size={16} />
                                                </button>
                                                <button 
                                                    onClick={() => handleIgnoreClosing(c.id)} 
                                                    title="Ignorar Cierre"
                                                    style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer' }}
                                                >
                                                    <EyeOff size={16} />
                                                </button>
                                                <button 
                                                    onClick={() => handleDeleteClosing(c.id)} 
                                                    title="Deshacer y Borrar"
                                                    style={{ background: 'none', border: 'none', color: '#ff4757', cursor: 'pointer' }}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div style={{ marginTop: '2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                        <RotateCcw size={18} className="color-primary" />
                        <h4 style={{ margin: 0, fontSize: '0.9rem', opacity: 0.7 }}>Remanentes Activos (Ingresos)</h4>
                    </div>
                    <p style={{ fontSize: '0.8rem', opacity: 0.5, marginBottom: '1rem' }}>
                        Lista de todos los movimientos de remanente registrados en el sistema.
                    </p>
                    <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                            <thead style={{ background: 'rgba(255,255,255,0.02)' }}>
                                <tr>
                                    <th style={{ textAlign: 'left', padding: '0.75rem' }}>Origen</th>
                                    <th style={{ textAlign: 'left', padding: '0.75rem' }}>Destino</th>
                                    <th style={{ textAlign: 'right', padding: '0.75rem' }}>Importe</th>
                                    <th style={{ textAlign: 'center', padding: '0.75rem' }}>Estado</th>
                                    <th style={{ textAlign: 'center', padding: '0.75rem' }}>Acción</th>
                                </tr>
                            </thead>
                            <tbody>
                                {activeRemnants.length === 0 ? (
                                    <tr><td colSpan={5} style={{ padding: '2rem', textAlign: 'center', opacity: 0.3 }}>No hay remanentes activos</td></tr>
                                ) : (
                                    activeRemnants.map(rem => (
                                        <tr key={rem.id} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                            <td style={{ padding: '0.75rem' }}>--</td>
                                            <td style={{ padding: '0.75rem' }}>{rem.budgetMonth !== undefined ? `${rem.budgetMonth + 1}/${rem.budgetYear}` : '--'}</td>
                                            <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600, whiteSpace: 'nowrap' }}>{formatCurrency(rem.amount)}</td>
                                            <td style={{ padding: '0.75rem', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>Vinculado</td>
                                            <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                                                <button 
                                                    onClick={() => handleDeleteRemnant(rem.id)}
                                                    style={{ background: 'none', border: 'none', color: '#ff4757', cursor: 'pointer' }}
                                                    title="Eliminar Remanente"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* 4. Ignored Months (Collapsible) */}
            <div style={{ 
                marginTop: '1rem', 
                borderTop: '1px solid rgba(255,255,255,0.05)',
                paddingTop: '2rem'
            }}>
                <button 
                    onClick={() => setShowIgnored(!showIgnored)}
                    style={{ 
                        background: 'rgba(255, 255, 255, 0.03)', 
                        border: '1px solid rgba(255, 255, 255, 0.05)', 
                        color: 'var(--text-muted)', 
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.5rem',
                        fontSize: '0.9rem',
                        width: '100%',
                        padding: '1rem',
                        borderRadius: '0.75rem',
                        transition: 'all 0.2s'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <EyeOff size={18} style={{ opacity: 0.5 }} />
                        <span style={{ fontWeight: 600 }}>Cierres Ignorados</span>
                        <span style={{ 
                            background: 'rgba(255,255,255,0.1)', 
                            padding: '2px 8px', 
                            borderRadius: '100px', 
                            fontSize: '0.75rem' 
                        }}>{ignoredClosings.length}</span>
                    </div>
                    {showIgnored ? <TrendingUp size={16} style={{ transform: 'rotate(180deg)' }} /> : <TrendingDown size={16} />}
                </button>

                {showIgnored && (
                    <div style={{ 
                        marginTop: '1rem', 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: '0.5rem',
                        padding: '0 0.5rem'
                    }}>
                        {ignoredClosings.length === 0 ? (
                            <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.3, fontSize: '0.85rem' }}>No hay meses ignorados</div>
                        ) : (
                            ignoredClosings.map(c => (
                                <div key={c.id} className="glass-panel" style={{ 
                                    padding: '0.75rem 1rem', 
                                    display: 'flex', 
                                    justifyContent: 'space-between', 
                                    alignItems: 'center',
                                    background: 'rgba(255,255,255,0.01)'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)' }} />
                                        <span style={{ textTransform: 'capitalize', fontWeight: 500 }}>{getMonthName(c.month)} de {c.year}</span>
                                    </div>
                                    <button 
                                        onClick={() => handleRestoreIgnored(c)}
                                        style={{ 
                                            background: 'rgba(99, 102, 241, 0.1)', 
                                            border: '1px solid rgba(99, 102, 241, 0.2)', 
                                            color: '#818cf8', 
                                            fontSize: '0.75rem', 
                                            fontWeight: 700, 
                                            cursor: 'pointer',
                                            padding: '0.4rem 0.8rem',
                                            borderRadius: '0.5rem'
                                        }}
                                    >
                                        RESTAURAR
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

            {editingClosing && (
                <ModalPortal><div className="modal-overlay" onClick={() => setEditingClosing(null)}>
                    <div className="modal-container glass-panel" style={{ padding: '2rem', maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.5rem', color: 'white' }}>
                            Editar Importe de Cierre
                        </h3>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                            Modifica el importe del cierre de {getMonthName(editingClosing.month)} de {editingClosing.year}. Esto actualizará el remanente arrastrado al mes siguiente.
                        </p>
                        
                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Importe (€)</label>
                            <input 
                                type="number" 
                                step="0.01" 
                                defaultValue={editingClosing.finalBalance}
                                id="editClosingAmountInput"
                                style={{
                                    width: '100%',
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '12px',
                                    padding: '0.8rem',
                                    color: 'white',
                                    fontSize: '1.1rem',
                                    fontWeight: 700
                                }}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button 
                                onClick={async () => {
                                    const input = document.getElementById('editClosingAmountInput') as HTMLInputElement;
                                    const val = parseFloat(input?.value);
                                    if (!isNaN(val)) {
                                        await editMonthClosingAmount(editingClosing.id, val);
                                        setEditingClosing(null);
                                    }
                                }}
                                className="btn btn-primary"
                                style={{ flex: 1, padding: '0.75rem', borderRadius: '12px', fontWeight: 800 }}
                            >
                                Guardar
                            </button>
                            <button 
                                onClick={() => setEditingClosing(null)}
                                style={{ 
                                    flex: 1, background: 'none', border: '1px solid rgba(255,255,255,0.1)', 
                                    padding: '0.75rem', borderRadius: '12px', fontSize: '0.9rem', cursor: 'pointer', color: 'var(--text-muted)'
                                }}
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div></ModalPortal>
            )}
        </div>
    );
};

export default BalanceAdjustmentView;
