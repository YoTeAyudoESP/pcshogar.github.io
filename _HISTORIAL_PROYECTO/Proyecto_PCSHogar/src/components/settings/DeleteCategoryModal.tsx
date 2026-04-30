import React, { useState } from 'react';
import { useFinance } from '../../contexts/FinanceContext';
import { Category } from '../../types/finance';
import { AlertTriangle, Trash2, ArrowRightLeft, X } from 'lucide-react';

interface DeleteCategoryModalProps {
    category: Category;
    usageCount: number;
    onClose: () => void;
}

const DeleteCategoryModal: React.FC<DeleteCategoryModalProps> = ({ category, usageCount, onClose }) => {
    const { categories, deleteCategory } = useFinance();
    const [reassignToId, setReassignToId] = useState<string>('');
    const [step, setStep] = useState<'decision' | 'reassign'>('decision');

    const otherCategories = categories.filter(c => c.id !== category.id && c.type === category.type);

    const handleDeleteDirectly = async () => {
        if (window.confirm(`¿Estás seguro? Los ${usageCount} registros que usan esta categoría se quedarán sin una categoría válida (seguirán mostrando el nombre antiguo pero no estarán vinculados).`)) {
            await deleteCategory(category.id);
            onClose();
        }
    };

    const handleReassignAndDelete = async () => {
        if (!reassignToId) return;
        await deleteCategory(category.id, reassignToId);
        onClose();
    };

    const modalStyle: React.CSSProperties = {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.8)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem'
    };

    const contentStyle: React.CSSProperties = {
        background: '#1a1a1a',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '1.5rem',
        padding: '2rem',
        maxWidth: '500px',
        width: '100%',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
    };

    return (
        <div style={modalStyle} onClick={onClose}>
            <div style={contentStyle} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#ef4444' }}>
                        <AlertTriangle size={24} />
                        <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Eliminar Categoría</h3>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}>
                        <X size={24} />
                    </button>
                </div>

                <p style={{ opacity: 0.8, marginBottom: '2rem', lineHeight: '1.5' }}>
                    La categoría <strong>"{category.name}"</strong> está siendo utilizada en <strong>{usageCount}</strong> {usageCount === 1 ? 'registro' : 'registros'}.
                    ¿Cómo deseas proceder?
                </p>

                {step === 'decision' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <button
                            onClick={() => setStep('reassign')}
                            disabled={otherCategories.length === 0}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '1rem',
                                padding: '1.25rem',
                                borderRadius: '1rem',
                                border: '1px solid rgba(255,255,255,0.1)',
                                background: 'rgba(255,255,255,0.05)',
                                color: 'white',
                                textAlign: 'left',
                                cursor: otherCategories.length > 0 ? 'pointer' : 'not-allowed',
                                transition: 'all 0.2s',
                                opacity: otherCategories.length > 0 ? 1 : 0.5
                            }}
                        >
                            <div style={{ background: 'var(--color-primary)', padding: '0.5rem', borderRadius: '0.5rem' }}>
                                <ArrowRightLeft size={20} />
                            </div>
                            <div>
                                <div style={{ fontWeight: 600 }}>Reasignar y eliminar</div>
                                <div style={{ fontSize: '0.85rem', opacity: 0.6 }}>Mover los registros a otra categoría existente.</div>
                            </div>
                        </button>

                        <button
                            onClick={handleDeleteDirectly}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '1rem',
                                padding: '1.25rem',
                                borderRadius: '1rem',
                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                background: 'rgba(239, 68, 68, 0.05)',
                                color: '#ef4444',
                                textAlign: 'left',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            <div style={{ background: '#ef4444', padding: '0.5rem', borderRadius: '0.5rem', color: 'white' }}>
                                <Trash2 size={20} />
                            </div>
                            <div>
                                <div style={{ fontWeight: 600 }}>Eliminar igualmente</div>
                                <div style={{ fontSize: '0.85rem', opacity: 0.8 }}>Los registros mantendrán el nombre pero perderán el vínculo.</div>
                            </div>
                        </button>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.75rem', fontSize: '0.9rem', opacity: 0.7 }}>Selecciona la nueva categoría</label>
                            <select 
                                value={reassignToId} 
                                onChange={e => setReassignToId(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '1rem',
                                    borderRadius: '0.75rem',
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    color: 'white',
                                    fontSize: '1rem',
                                    outline: 'none'
                                }}
                            >
                                <option value="">Seleccionar...</option>
                                {otherCategories.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button 
                                onClick={() => setStep('decision')}
                                style={{ 
                                    flex: 1, 
                                    padding: '1rem', 
                                    borderRadius: '0.75rem', 
                                    border: '1px solid rgba(255,255,255,0.1)', 
                                    background: 'transparent', 
                                    color: 'white', 
                                    cursor: 'pointer' 
                                }}
                            >
                                Volver
                            </button>
                            <button 
                                onClick={handleReassignAndDelete}
                                disabled={!reassignToId}
                                style={{ 
                                    flex: 1, 
                                    padding: '1rem', 
                                    borderRadius: '0.75rem', 
                                    border: 'none', 
                                    background: 'var(--color-primary)', 
                                    color: 'white', 
                                    fontWeight: 600,
                                    cursor: reassignToId ? 'pointer' : 'not-allowed',
                                    opacity: reassignToId ? 1 : 0.5 
                                }}
                            >
                                Confirmar Reasignación
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DeleteCategoryModal;
