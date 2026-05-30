import React from 'react';
import { useFinance } from '../../contexts/FinanceContext';
import type { Account } from '../../types/finance';
import { formatCurrency } from '../../utils/formatters';

interface AccountListProps {
    onEdit?: (account: Account) => void;
}

const AccountList: React.FC<AccountListProps> = ({ onEdit }) => {
    const { accounts, deleteAccount } = useFinance();

    return (
        <div className="glass-panel" style={{ padding: 'var(--space-md)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0, color: 'var(--text-muted)' }}>Mis Cuentas</h3>
            </div>
            {accounts.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>No hay cuentas configuradas.</p>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {accounts.map(acc => (
                        <div key={acc.id} className="glass-panel" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    {acc.color && <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: acc.color }} />}
                                    {acc.name}
                                </div>
                                <div style={{ fontSize: '1.25rem', color: 'var(--color-primary)', fontWeight: 700 }}>
                                    {formatCurrency(acc.balance, acc.currency)}
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                {onEdit && (
                                    <button onClick={() => onEdit(acc)} className="btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
                                        Editar
                                    </button>
                                )}
                                <button onClick={() => deleteAccount(acc.id!)} className="btn-icon" style={{ color: 'var(--hue-danger)' }}>
                                    Eliminar
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AccountList;
