import React, { useState, useMemo } from 'react';
import { 
    AlertTriangle, 
    Trash2, 
    X, 
    ArrowRightLeft,
    CheckCircle2,
    Info
} from 'lucide-react';
import { useFinance } from '../../contexts/FinanceContext';
import type { Category } from '../../types/finance';

interface DeleteCategoryModalProps {
    category: Category;
    onClose: () => void;
    onConfirm: (reassignToId?: string) => Promise<void>;
}

const DeleteCategoryModal: React.FC<DeleteCategoryModalProps> = ({ category, onClose, onConfirm }) => {
    const { expenses, recurringExpenses, categories, extraIncomes, fixedIncomes } = useFinance();
    
    const [reassignToId, setReassignToId] = useState<string>('');
    const [isDeleting, setIsDeleting] = useState(false);

    // Calculate usage
    const usage = useMemo(() => {
        const expCount = expenses.filter(e => e.categoryId === category.id).length;
        const recCount = recurringExpenses.filter(r => r.categoryId === category.id).length;
        
        // Income usage (handling both possible field names)
        const fixedCount = fixedIncomes.filter(i => i.categoryId === category.id).length;
        const extraCount = extraIncomes.filter(i => {
            // @ts-ignore
            return i.categoryId === category.id || i.category === category.id;
        }).length;

        return {
            total: expCount + recCount + fixedCount + extraCount,
            expenses: expCount,
            recurring: recCount,
            incomes: fixedCount + extraCount
        };
    }, [category.id, expenses, recurringExpenses, fixedIncomes, extraIncomes]);

    const otherCategories = useMemo(() => {
        return categories.filter(c => c.id !== category.id && c.type === category.type);
    }, [categories, category.id, category.type]);

    const handleConfirm = async () => {
        setIsDeleting(true);
        try {
            await onConfirm(reassignToId || undefined);
            onClose();
        } catch (error) {
            console.error("Failed to delete category", error);
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-container glass-panel" style={{ padding: '2rem', maxWidth: '500px', border: '1px solid rgba(255, 71, 87, 0.2)' }} onClick={e => e.stopPropagation()}>
                <button 
                    onClick={onClose}
                    style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: 'rgba(var(--color-rgb-light),0.4)', cursor: 'pointer' }}
                >
                    <X size={24} />
                </button>

                <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                    <div style={{ 
                        width: '64px', 
                        height: '64px', 
                        borderRadius: '50%', 
                        background: 'rgba(255, 71, 87, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 1rem'
                    }}>
                        <AlertTriangle size={36} color="#ff4757" />
                    </div>
                    <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Eliminar Categoría</h2>
                    <p style={{ opacity: 0.7 }}>
                        Estás a punto de eliminar <strong style={{color: category.color}}>{category.name}</strong>
                    </p>
                </div>

                {usage.total > 0 ? (
                    <div style={{ marginBottom: '2rem' }}>
                        <div style={{ 
                            background: 'rgba(255,165,0,0.1)', 
                            border: '1px solid rgba(255,165,0,0.2)', 
                            padding: '1rem',
                            borderRadius: '1rem',
                            marginBottom: '1.5rem'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#ffa502', fontWeight: 600, marginBottom: '0.5rem' }}>
                                <Info size={18} />
                                Categoría en uso
                            </div>
                            <p style={{ fontSize: '0.9rem', marginBottom: '0.5rem', opacity: 0.9 }}>
                                Hay <strong>{usage.total}</strong> apuntes financieros vinculados a esta categoría:
                            </p>
                            <ul style={{ fontSize: '0.85rem', paddingLeft: '1.5rem', opacity: 0.8 }}>
                                {usage.expenses > 0 && <li>{usage.expenses} gastos realizados</li>}
                                {usage.incomes > 0 && <li>{usage.incomes} ingresos registrados</li>}
                                {usage.recurring > 0 && <li>{usage.recurring} gastos recurrentes</li>}
                            </ul>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ position: 'relative' }}>
                                <label style={{ fontSize: '0.85rem', display: 'block', marginBottom: '0.5rem', opacity: 0.7 }}>
                                    <ArrowRightLeft size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                                    Reasignar movimientos a...
                                </label>
                                <select 
                                    className="form-input"
                                    value={reassignToId}
                                    onChange={(e) => setReassignToId(e.target.value)}
                                    style={{ width: '100%', padding: '0.75rem' }}
                                >
                                    <option value="">No reasignar (Mantener ID huérfana)</option>
                                    {otherCategories.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>

                            {!reassignToId && (
                                <p style={{ fontSize: '0.8rem', color: '#ff7f50', fontStyle: 'italic' }}>
                                    Nota: Los apuntes mantendrán la referencia a "{category.name}" aunque la categoría sea borrada de la configuración.
                                </p>
                            )}
                        </div>
                    </div>
                ) : (
                    <div style={{ 
                        background: 'rgba(46,213,115,0.1)', 
                        border: '1px solid rgba(46,213,115,0.2)', 
                        padding: '1.5rem',
                        borderRadius: '1rem',
                        marginBottom: '2rem',
                        textAlign: 'center'
                    }}>
                        <CheckCircle2 size={24} color="#2ed573" style={{ marginBottom: '0.5rem' }} />
                        <p style={{ fontSize: '0.9rem', opacity: 0.9, margin: 0 }}>
                            Esta categoría no está siendo usada en ningún apunte financiero. Puedes borrarla con seguridad.
                        </p>
                    </div>
                )}

                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button 
                        onClick={onClose}
                        className="btn"
                        style={{ flex: 1, background: 'var(--panel-bg-2)' }}
                        disabled={isDeleting}
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={handleConfirm}
                        className="btn"
                        style={{ 
                            flex: 2, 
                            background: '#ff4757', 
                            color: 'var(--text-main)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                            opacity: isDeleting ? 0.7 : 1
                        }}
                        disabled={isDeleting}
                    >
                        <Trash2 size={20} />
                        {reassignToId ? 'Reasignar y Eliminar' : 'Eliminar Categoría'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DeleteCategoryModal;
