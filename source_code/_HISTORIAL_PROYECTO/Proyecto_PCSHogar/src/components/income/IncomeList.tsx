import React from 'react';
import { useIncome } from '../../contexts/IncomeContext';
import { useFinance } from '../../contexts/FinanceContext';
import { Pencil, Trash2 } from 'lucide-react';

const IncomeList: React.FC<{ onEdit?: (income: any) => void }> = ({ onEdit }) => {
    const { fixedIncomes, extraIncomes, deleteIncome } = useIncome();
    const { categories } = useFinance();

    const getCategoryName = (id?: string) => {
        if (!id) return 'Sin categoría';
        return categories.find(c => c.id === id)?.name || 'Sin categoría';
    };

    const formatDate = (ts?: number) => ts ? new Date(ts).toLocaleDateString() : 'Indefinido';

    const listItemStyle = {
        background: 'rgba(255,255,255,0.03)',
        borderRadius: 'var(--radius-sm)',
        padding: '1rem',
        marginBottom: '0.5rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
    };

    return (
        <div style={{ display: 'grid', gap: 'var(--space-md)', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
            {/* Fixed Incomes Column */}
            <div>
                <h3 style={{ marginBottom: '1rem', color: 'var(--color-primary-light)' }}>Ingresos Fijos</h3>
                <div className="glass-panel" style={{ padding: 'var(--space-sm)' }}>
                    {fixedIncomes.length === 0 ? (
                        <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>No hay ingresos fijos.</p>
                    ) : (
                        fixedIncomes.map(income => (
                            <div key={income.id} style={listItemStyle}>
                                <div style={{ minWidth: 0, flex: 1 }}>
                                    <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{income.name}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {income.frequency === 'weekly' ? 'Semanal' : income.frequency === 'monthly' ? 'Mensual' : 'Anual'} • Expira: {formatDate(income.expirationDate)}
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '1rem' }}>
                                    <div style={{ fontWeight: 700, color: 'var(--color-success)', whiteSpace: 'nowrap' }}>
                                        {income.amount.toFixed(2)}{income.currency === 'EUR' ? '€' : '$'}
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', justifyContent: 'flex-end' }}>
                                        <button
                                            onClick={() => onEdit?.(income)}
                                            style={{
                                                background: 'rgba(255,255,255,0.05)',
                                                border: 'none',
                                                padding: '0.4rem',
                                                borderRadius: 'var(--radius-sm)',
                                                color: 'var(--color-primary-light)',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center'
                                            }}
                                            title="Editar"
                                        >
                                            <Pencil size={14} />
                                        </button>
                                        <button
                                            onClick={() => {
                                                if(confirm('¿Estás seguro de eliminar este ingreso fijo?')) deleteIncome(income.id)
                                            }}
                                            style={{
                                                background: 'rgba(255,255,255,0.05)',
                                                border: 'none',
                                                padding: '0.4rem',
                                                borderRadius: 'var(--radius-sm)',
                                                color: 'var(--hue-danger)',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center'
                                            }}
                                            title="Eliminar"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Extra Incomes Column */}
            <div>
                <h3 style={{ marginBottom: '1rem', color: 'var(--color-secondary)' }}>Ingresos Extra</h3>
                <div className="glass-panel" style={{ padding: 'var(--space-sm)' }}>
                    {extraIncomes.length === 0 ? (
                        <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>No hay ingresos extra.</p>
                    ) : (
                        extraIncomes.map(income => (
                            <div key={income.id} style={listItemStyle}>
                                <div style={{ minWidth: 0, flex: 1 }}>
                                    <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{income.name}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {formatDate(income.receivedDate)} • {getCategoryName(income.categoryId)}
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '1rem' }}>
                                    <div style={{ fontWeight: 700, color: 'var(--color-success)', whiteSpace: 'nowrap' }}>
                                        {income.amount.toFixed(2)}{income.currency === 'EUR' ? '€' : '$'}
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', justifyContent: 'flex-end' }}>
                                        <button
                                            onClick={() => onEdit?.(income)}
                                            style={{
                                                background: 'rgba(255,255,255,0.05)',
                                                border: 'none',
                                                padding: '0.4rem',
                                                borderRadius: 'var(--radius-sm)',
                                                color: 'var(--color-secondary)',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center'
                                            }}
                                            title="Editar"
                                        >
                                            <Pencil size={14} />
                                        </button>
                                        <button
                                            onClick={() => {
                                                if(confirm('¿Estás seguro de eliminar este ingreso?')) deleteIncome(income.id)
                                            }}
                                            style={{
                                                background: 'rgba(255,255,255,0.05)',
                                                border: 'none',
                                                padding: '0.4rem',
                                                borderRadius: 'var(--radius-sm)',
                                                color: 'var(--hue-danger)',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center'
                                            }}
                                            title="Eliminar"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default IncomeList;
