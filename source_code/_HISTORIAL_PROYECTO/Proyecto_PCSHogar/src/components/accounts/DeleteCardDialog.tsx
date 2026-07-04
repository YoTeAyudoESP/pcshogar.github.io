import React, { useState } from 'react';
import { useFinance } from '../../contexts/FinanceContext';
import type { CreditCard } from '../../types/finance';
import { AlertCircle, Trash2, Info } from 'lucide-react';

interface DeleteCardDialogProps {
    card: CreditCard;
    onClose: () => void;
}

const DeleteCardDialog: React.FC<DeleteCardDialogProps> = ({ card, onClose }) => {
    const { deleteCard } = useFinance();
    const [isDeleting, setIsDeleting] = useState(false);

    // We block if it's credit and has debt (> 0)
    const hasDebt = card.type === 'credit' && card.currentBalance > 0;

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            await deleteCard(card.id);
            onClose();
        } catch (error) {
            console.error("Error deleting card", error);
            alert("Hubo un error al eliminar la tarjeta.");
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
                border: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.5rem'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: hasDebt ? '#f59e0b' : '#ef4444' }}>
                    {hasDebt ? <AlertCircle size={24} /> : <Trash2 size={24} />}
                    <h2 style={{ margin: 0, fontSize: '1.5rem' }}>
                        {hasDebt ? 'Borrado Restringido' : 'Eliminar Tarjeta'}
                    </h2>
                </div>

                <p style={{ margin: 0, opacity: 0.8, lineHeight: 1.5 }}>
                    {hasDebt 
                        ? `No se puede eliminar la tarjeta ${card.name} mientras tenga pagos pendientes.`
                        : `¿Estás seguro de que quieres eliminar la tarjeta ${card.name}? Esta acción no se puede deshacer.`
                    }
                </p>

                {hasDebt && (
                    <div style={{ 
                        background: 'rgba(239, 68, 68, 0.1)', 
                        border: '1px solid rgba(239, 68, 68, 0.2)', 
                        padding: '1.25rem', 
                        borderRadius: '1rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.75rem'
                    }}>
                        <div style={{ display: 'flex', gap: '0.75rem', color: '#f87171' }}>
                            <AlertCircle size={20} />
                            <span style={{ fontWeight: 600 }}>Deuda Pendiente: {card.currentBalance.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</span>
                        </div>
                        <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.8 }}>
                            Para poder eliminar esta tarjeta de crédito, primero debes liquidar su saldo mediante el cierre de mes o un pago manual.
                        </p>
                    </div>
                )}

                {!hasDebt && card.type === 'debit' && (
                    <div style={{ 
                        background: 'rgba(59, 130, 246, 0.1)', 
                        border: '1px solid rgba(59, 130, 246, 0.2)', 
                        padding: '1rem', 
                        borderRadius: '1rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        fontSize: '0.9rem',
                        color: '#60a5fa'
                    }}>
                        <Info size={18} />
                        <span>Al ser una tarjeta de débito, los pagos ya han sido descontados de tu cuenta bancaria.</span>
                    </div>
                )}

                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                    <button 
                        onClick={onClose}
                        disabled={isDeleting}
                        style={{
                            flex: 1,
                            padding: '1rem',
                            borderRadius: '0.75rem',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            background: 'transparent',
                            color: 'white',
                            cursor: 'pointer',
                            fontWeight: 600
                        }}
                    >Cancelar</button>
                    
                    {!hasDebt && (
                        <button 
                            onClick={handleDelete}
                            disabled={isDeleting}
                            style={{
                                flex: 1.5,
                                padding: '1rem',
                                borderRadius: '1rem',
                                border: 'none',
                                background: '#ef4444',
                                color: 'white',
                                fontWeight: 700,
                                cursor: isDeleting ? 'not-allowed' : 'pointer',
                                opacity: isDeleting ? 0.6 : 1
                            }}
                        >
                            {isDeleting ? 'Eliminando...' : 'Eliminar Tarjeta'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DeleteCardDialog;
