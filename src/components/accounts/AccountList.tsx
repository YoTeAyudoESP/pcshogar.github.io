import React, { useState } from 'react';
import { useFinance } from '../../contexts/FinanceContext';
import type { Account } from '../../types/finance';
import { Edit2, Trash2 } from 'lucide-react';
import DeleteAccountDialog from './DeleteAccountDialog';

interface AccountListProps {
    onEdit?: (account: Account) => void;
    filterType?: 'bank' | 'cash';
}

const AccountList: React.FC<AccountListProps> = ({ onEdit, filterType }) => {
    const { accounts } = useFinance();
    const [accountToDelete, setAccountToDelete] = useState<Account | null>(null);

    const handleDeleteClick = (acc: Account) => {
        setAccountToDelete(acc);
    };

    const displayAccounts = filterType ? accounts.filter(a => a.type === filterType) : accounts;

    return (
        <div className="glass-panel" style={{ padding: 'var(--space-md)' }}>
            <h3 style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>{filterType === 'cash' ? 'Carteras de Efectivo' : 'Mis Cuentas'}</h3>
            {displayAccounts.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>No hay {filterType === 'cash' ? 'carteras' : 'cuentas'} configuradas.</p>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {displayAccounts.map(acc => (
                        <div key={acc.id} style={{
                            background: 'rgba(25, 27, 34, 0.4)',
                            padding: '1rem 1.25rem',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--panel-bg-2)',
                            borderLeft: `5px solid ${acc.color || (acc.type === 'bank' ? 'var(--color-primary)' : 'var(--color-secondary)')}`,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            transition: 'all 0.2s ease',
                        }}>
                            <div>
                                <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>{acc.name}</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '0.2rem' }}>{acc.type === 'bank' ? 'Banco' : 'Efectivo'}</div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                                <div style={{ fontWeight: 700, fontSize: '1.1rem' }} className="currency">
                                    {acc.currency === 'EUR' ? '€' : '$'}{acc.balance.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    {onEdit && (
                                        <button onClick={() => onEdit(acc)} style={{
                                            background: 'var(--panel-bg-2)', border: 'none', color: 'rgba(var(--color-rgb-light),0.6)', cursor: 'pointer', padding: '0.5rem', borderRadius: '0.5rem', display: 'flex', alignItems: 'center'
                                        }}>
                                            <Edit2 size={16} />
                                        </button>
                                    )}
                                    <button onClick={() => handleDeleteClick(acc)} style={{
                                        background: 'rgba(239, 68, 68, 0.1)', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.5rem', borderRadius: '0.5rem', display: 'flex', alignItems: 'center'
                                    }}>
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}

                    {accountToDelete && (
                        <DeleteAccountDialog 
                            account={accountToDelete} 
                            onClose={() => setAccountToDelete(null)} 
                        />
                    )}
                </div>
            )}
        </div>
    );
};

export default AccountList;
