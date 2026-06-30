import React, { useState } from 'react';
import { useFinance } from '../../contexts/FinanceContext';
import type { Account } from '../../types/finance';
import { AlertTriangle, ArrowRightLeft, Trash2, Info } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';

interface DeleteAccountDialogProps {
    account: Account;
    onClose: () => void;
}

const DeleteAccountDialog: React.FC<DeleteAccountDialogProps> = ({ account, onClose }) => {
    const { t } = useTranslation();
    const { accounts, cards, performTransfer, deleteAccount } = useFinance();
    const [targetAccountId, setTargetAccountId] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    const linkedCards = cards.filter(c => c.linkedAccountId === account.id);
    const hasBalance = account.balance > 0;
    const otherAccounts = accounts.filter(a => a.id !== account.id);

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            if (hasBalance && targetAccountId) {
                await performTransfer(
                    account.id, 
                    targetAccountId, 
                    account.balance, 
                    `Traspaso por cierre de cuenta ${account.name}`
                );
            }
            await deleteAccount(account.id);
            onClose();
        } catch (error) {
            console.error("Error deleting account", error);
            alert("Hubo un error al eliminar la cuenta.");
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem'
        }}>
            <div className="glass-panel" style={{
                width: '100%',
                maxWidth: '500px',
                padding: '2rem',
                borderRadius: '1.5rem',
                background: 'rgba(30, 32, 47, 0.98)',
                border: '1px solid var(--panel-bg-3)',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.5rem'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: '#ef4444' }}>
                    <Trash2 size={24} />
                    <h2 style={{ margin: 0, fontSize: '1.5rem' }}>Eliminar Cuenta</h2>
                </div>

                <p style={{ margin: 0, opacity: 0.8, lineHeight: 1.5 }}>
                    Estás a punto de eliminar la cuenta <strong>{account.name}</strong>. Esta acción no se puede deshacer.
                </p>

                {hasBalance && (
                    <div style={{ 
                        background: 'rgba(245, 158, 11, 0.1)', 
                        border: '1px solid rgba(245, 158, 11, 0.2)', 
                        padding: '1.25rem', 
                        borderRadius: '1rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1rem'
                    }}>
                        <div style={{ display: 'flex', gap: '0.75rem', color: '#f59e0b' }}>
                            <AlertTriangle size={20} />
                            <span style={{ fontWeight: 600 }}>Saldo Pendiente: {account.balance.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</span>
                        </div>
                        <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.8 }}>
                            La cuenta aún tiene saldo. Selecciona dónde quieres traspasar el dinero antes de borrarla:
                        </p>
                        <select 
                            style={{
                                width: '100%',
                                padding: '0.8rem',
                                borderRadius: '0.75rem',
                                background: 'var(--panel-bg-2)',
                                border: '1px solid var(--panel-bg-3)',
                                color: 'var(--text-main)',
                                outline: 'none'
                            }}
                            value={targetAccountId}
                            onChange={(e) => setTargetAccountId(e.target.value)}
                        >
                            <option value="">Seleccionar cuenta de destino...</option>
                            {otherAccounts.map(acc => (
                                <option key={acc.id} value={acc.id}>{acc.name} ({acc.type === 'cash' ? 'Efectivo' : 'Banco'})</option>
                            ))}
                        </select>
                    </div>
                )}

                {linkedCards.length > 0 && (
                    <div style={{ 
                        background: 'rgba(59, 130, 246, 0.1)', 
                        border: '1px solid rgba(59, 130, 246, 0.2)', 
                        padding: '1.25rem', 
                        borderRadius: '1rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.75rem'
                    }}>
                        <div style={{ display: 'flex', gap: '0.75rem', color: '#3b82f6' }}>
                            <Info size={20} />
                            <span style={{ fontWeight: 600 }}>Tarjetas Vinculadas</span>
                        </div>
                        <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.8 }}>
                            Esta cuenta tiene {linkedCards.length} {linkedCards.length === 1 ? 'tarjeta vinculada' : 'tarjetas vinculadas'}:
                        </p>
                        <ul style={{ margin: 0, paddingLeft: '1.5rem', fontSize: '0.85rem', opacity: 0.7 }}>
                            {linkedCards.map(c => <li key={c.id}>{c.name}</li>)}
                        </ul>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'rgba(var(--color-rgb-light), 0.5)', fontStyle: 'italic' }}>
                            Nota: Deberás desvincularlas o eliminarlas manualmente. Los pagos futuros con estas tarjetas podrían fallar.
                        </p>
                    </div>
                )}

                <div style={{ 
                    padding: '1rem', 
                    background: 'rgba(239, 68, 68, 0.05)', 
                    border: '1px solid rgba(239, 68, 68, 0.1)', 
                    borderRadius: '0.75rem',
                    fontSize: '0.8rem',
                    color: '#f87171',
                    textAlign: 'center'
                }}>
                    <strong>Aviso de Responsabilidad:</strong> La app no se hace responsable de pagos realizados con tarjetas vinculadas a cuentas inexistentes.
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                    <button 
                        onClick={onClose}
                        disabled={isDeleting}
                        style={{
                            flex: 1,
                            padding: '1rem',
                            borderRadius: '0.75rem',
                            border: '1px solid var(--panel-bg-3)',
                            background: 'transparent',
                            color: 'var(--text-main)',
                            cursor: 'pointer',
                            fontWeight: 600
                        }}
                    >{t('Cancelar')}</button>
                    <button 
                        onClick={handleDelete}
                        disabled={isDeleting || (hasBalance && !targetAccountId)}
                        style={{
                            flex: 2,
                            padding: '1rem',
                            borderRadius: '1rem',
                            border: 'none',
                            background: '#ef4444',
                            color: 'var(--text-main)',
                            fontWeight: 700,
                            cursor: (isDeleting || (hasBalance && !targetAccountId)) ? 'not-allowed' : 'pointer',
                            opacity: (isDeleting || (hasBalance && !targetAccountId)) ? 0.5 : 1
                        }}
                    >
                        {isDeleting ? 'Eliminando...' : (hasBalance ? 'Traspasar y Eliminar' : 'Eliminar Cuenta')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DeleteAccountDialog;
