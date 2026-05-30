import React, { useState } from 'react';
import { useFinance } from '../../contexts/FinanceContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { Trash2, Plus, Tag, Pencil } from 'lucide-react';
import { useIncome } from '../../contexts/IncomeContext';

const CategoryManager: React.FC = () => {
    const { categories, incomeCategories, addCategory, updateCategory, deleteCategory, expenses, recurringExpenses } = useFinance();
    const { extraIncomes } = useIncome();
    const { t } = useLanguage();

    const [showForm, setShowForm] = useState(false);
    const [editingCategory, setEditingCategory] = useState<any>(null);
    const [name, setName] = useState('');
    const [type, setType] = useState<'expense' | 'income'>('expense');
    const [color, setColor] = useState('#3498db');

    const colors = [
        '#e67e22', '#3498db', '#9b59b6', '#f1c40f', '#e74c3c',
        '#2ecc71', '#ff7979', '#16a085', '#95a5a6', '#f39c12',
        '#d35400', '#c0392b', '#bdc3c7', '#7f8c8d', '#2c3e50'
    ];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name) return;

        if (editingCategory) {
            await updateCategory({
                ...editingCategory,
                name,
                type,
                color,
                icon: type === 'expense' ? 'tag' : 'trending-up'
            });
        } else {
            await addCategory({
                name,
                type,
                color,
                icon: type === 'expense' ? 'tag' : 'trending-up'
            });
        }

        setName('');
        setEditingCategory(null);
        setShowForm(false);
    };

    const handleEdit = (cat: any) => {
        setEditingCategory(cat);
        setName(cat.name);
        setType(cat.type);
        setColor(cat.color || '#3498db');
        setShowForm(true);
    };

    const isProtected = (id: string) => id === 'cat_other' || id === 'inc_other';

    const renderCategoryList = (list: any[], title: string) => (
        <div className="glass-card" style={{ padding: '1.5rem', flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <Tag size={20} className="text-primary" />
                <h3 style={{ margin: 0 }}>{title}</h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {list.map(cat => (
                    <div key={cat.id} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '0.75rem',
                        background: 'var(--bg-surface-elevated)',
                        borderRadius: 'var(--radius-md)',
                        border: 'var(--card-border)',
                        borderLeft: `4px solid ${cat.color || 'var(--color-primary)'}`
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{
                                width: '12px',
                                height: '12px',
                                borderRadius: '50%',
                                background: cat.color || 'var(--color-primary)'
                            }} />
                            <span style={{ fontWeight: 500 }}>{cat.name}</span>
                        </div>

                        {!isProtected(cat.id) && (
                            <div style={{ display: 'flex', gap: '0.25rem' }}>
                                <button
                                    className="btn-icon"
                                    onClick={() => handleEdit(cat)}
                                    style={{ color: 'var(--color-primary)', opacity: 0.7 }}
                                >
                                    <Pencil size={16} />
                                </button>
                                <button
                                    className="btn-icon"
                                    onClick={() => {
                                        const isUsed = expenses.some(e => e.categoryId === cat.id) ||
                                            recurringExpenses.some(r => r.categoryId === cat.id) ||
                                            extraIncomes.some(i => i.category === cat.id);

                                        const msg = isUsed
                                            ? `Esta categoría está en uso. Si la eliminas, todos los movimientos asociados pasarán a "Otros". ¿Deseas continuar?`
                                            : (t('common.confirmDelete') || '¿Estás seguro de eliminar esta categoría?');

                                        if (window.confirm(msg)) {
                                            deleteCategory(cat.id);
                                        }
                                    }}
                                    style={{ color: 'var(--hue-danger)', opacity: 0.7 }}
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        )}
                        {isProtected(cat.id) && (
                            <span style={{ fontSize: '0.7rem', opacity: 0.4, fontStyle: 'italic' }}>Sistema</span>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn-primary" onClick={() => setShowForm(true)}>
                    <Plus size={18} />
                    {t('common.add') || 'Añadir'} Categoría
                </button>
            </div>

            {showForm && (
                <div className="modal-overlay" style={{ zIndex: 1100 }}>
                    <div className="modal-content glass-panel" style={{ maxWidth: '400px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3 style={{ margin: 0 }}>{editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}</h3>
                            <button className="btn-icon" onClick={() => {
                                setShowForm(false);
                                setEditingCategory(null);
                                setName('');
                            }}>
                                <Plus size={20} style={{ transform: 'rotate(45deg)' }} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Nombre</label>
                                <input
                                    className="form-input"
                                    style={{ width: '100%' }}
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    placeholder="Ej: Suscripciones"
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Tipo</label>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button
                                        type="button"
                                        className={type === 'expense' ? 'btn-primary' : 'btn-secondary'}
                                        style={{ flex: 1 }}
                                        onClick={() => setType('expense')}
                                    >
                                        Gasto
                                    </button>
                                    <button
                                        type="button"
                                        className={type === 'income' ? 'btn-primary' : 'btn-secondary'}
                                        style={{ flex: 1 }}
                                        onClick={() => setType('income')}
                                    >
                                        Ingreso
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Color</label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                    {colors.map(c => (
                                        <button
                                            key={c}
                                            type="button"
                                            onClick={() => setColor(c)}
                                            style={{
                                                width: '28px',
                                                height: '28px',
                                                borderRadius: '50%',
                                                background: c,
                                                border: color === c ? '2px solid white' : 'none',
                                                cursor: 'pointer',
                                                boxShadow: color === c ? '0 0 0 2px var(--color-primary)' : 'none'
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                <button type="button" className="btn-secondary" style={{ flex: 1 }} onClick={() => {
                                    setShowForm(false);
                                    setEditingCategory(null);
                                    setName('');
                                }}>
                                    Cancelar
                                </button>
                                <button type="submit" className="btn-primary" style={{ flex: 1 }}>
                                    Guardar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                {renderCategoryList(categories, 'Categorías de Gasto')}
                {renderCategoryList(incomeCategories, 'Categorías de Ingreso')}
            </div>
        </div>
    );
};

export default CategoryManager;
