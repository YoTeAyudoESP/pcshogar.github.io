import React, { useState } from 'react';
import { useFinance } from '../../contexts/FinanceContext';
import { AlertCircle, Trash2, ArrowUpRight, ArrowDownLeft, CalendarX } from 'lucide-react';
import { formatMoney } from '../../utils/financeCalculations';

interface DeletePendingItemModalProps {
    item: any;
    onClose: () => void;
}

const DeletePendingItemModal: React.FC<DeletePendingItemModalProps> = ({ item, onClose }) => {
    const { deleteExpense, deleteIncome, deleteRecurringExpense, updateIncome, updateRecurringExpense } = useFinance();
    const [isDeleting, setIsDeleting] = useState(false);

    const isExpense = item.actionType === 'expense' || item.actionType === 'refund' || item.recurringExpenseId;
    const isRecurring = !!item.frequency || item.type === 'fixed';
    const currentPeriod = item.period || `${new Date().getFullYear()}-${(new Date().getMonth() + 1).toString().padStart(2, '0')}`;

    const handleOmitMonth = async () => {
        setIsDeleting(true);
        try {
            const ignored = item.ignoredPeriods || [];
            if (!ignored.includes(currentPeriod)) {
                const newIgnored = [...ignored, currentPeriod];
                if (isExpense) {
                    await updateRecurringExpense({ ...item, ignoredPeriods: newIgnored });
                } else {
                    await updateIncome({ ...item, ignoredPeriods: newIgnored });
                }
            }
            onClose();
        } catch (error) {
            console.error("Error omitting item", error);
            alert("Error al omitir el movimiento.");
        } finally {
            setIsDeleting(false);
        }
    };

    const handleDeletePermanent = async () => {
        setIsDeleting(true);
        try {
            if (isExpense) {
                if (item.frequency) {
                    await deleteRecurringExpense(item.id);
                } else {
                    await deleteExpense(item.id);
                }
            } else {
                await deleteIncome(item.id);
            }
            onClose();
        } catch (error) {
            console.error("Error deleting pending item", error);
            alert("Hubo un error al eliminar el movimiento.");
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: '#ef4444' }}>
                    <Trash2 size={24} />
                    <h2 style={{ margin: 0, fontSize: '1.5rem' }}>
                        Eliminar {isExpense ? 'Gasto Pendiente' : 'Ingreso Pendiente'}
                    </h2>
                </div>

                <div style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    padding: '1.25rem',
                    borderRadius: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem'
                }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'white' }}>
                        {item.description || item.name}
                    </div>
                    <div style={{ 
                        fontSize: '1.3rem', 
                        fontWeight: 800, 
                        color: isExpense ? '#f43f5e' : '#10b981',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                    }}>
                        {isExpense ? <ArrowUpRight size={18} /> : <ArrowDownLeft size={18} />}
                        {formatMoney(Math.abs(item.amount))}
                    </div>
                </div>

                <div style={{ 
                    background: 'rgba(239, 68, 68, 0.1)', 
                    border: '1px solid rgba(239, 68, 68, 0.2)', 
                    padding: '1.25rem', 
                    borderRadius: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    color: '#f87171'
                }}>
                    <AlertCircle size={24} style={{ flexShrink: 0 }} />
                    <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: 1.5 }}>
                        {isRecurring 
                            ? 'Este apunte es un movimiento fijo recurrente. Puedes omitirlo únicamente para este mes o eliminar la plantilla completa para siempre.' 
                            : '¿Estás seguro de que quieres eliminar este movimiento pendiente? Esta acción no se puede deshacer.'}
                    </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
                    {isRecurring && (
                        <button 
                            onClick={handleOmitMonth}
                            disabled={isDeleting}
                            style={{
                                padding: '0.85rem 1rem',
                                background: 'rgba(59, 130, 246, 0.15)',
                                color: '#60a5fa',
                                border: '1px solid rgba(59, 130, 246, 0.3)',
                                borderRadius: '0.75rem',
                                cursor: isDeleting ? 'not-allowed' : 'pointer',
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem',
                                opacity: isDeleting ? 0.7 : 1
                            }}
                        >
                            <CalendarX size={18} />
                            Omitir solo este mes ({currentPeriod})
                        </button>
                    )}
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button 
                            onClick={onClose}
                            disabled={isDeleting}
                            style={{
                                flex: 1,
                                padding: '0.85rem',
                                background: 'rgba(255,255,255,0.05)',
                                color: 'white',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '0.75rem',
                                cursor: isDeleting ? 'not-allowed' : 'pointer',
                                fontWeight: 600,
                                opacity: isDeleting ? 0.7 : 1
                            }}
                        >
                            Cancelar
                        </button>
                        <button 
                            onClick={handleDeletePermanent}
                            disabled={isDeleting}
                            style={{
                                flex: 1,
                                padding: '0.85rem',
                                background: '#ef4444',
                                color: 'white',
                                border: 'none',
                                borderRadius: '0.75rem',
                                cursor: isDeleting ? 'not-allowed' : 'pointer',
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem',
                                opacity: isDeleting ? 0.7 : 1
                            }}
                        >
                            {isDeleting ? 'Eliminando...' : isRecurring ? 'Eliminar plantilla permanente' : 'Eliminar'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DeletePendingItemModal;
