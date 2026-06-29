import React, { useState, useMemo } from 'react';
import { useFinance } from '../../contexts/FinanceContext';
import { useIncome } from '../../contexts/IncomeContext';
import { Category } from '../../types/finance';
import { 
    Edit2, 
    Trash2, 
    Plus, 
    Tag,
    ShoppingCart,
    Car,
    Home,
    Zap,
    Coffee,
    Hammer,
    Heart,
    CreditCard,
    MoreHorizontal,
    Briefcase,
    Gift,
    TrendingUp,
    RotateCcw,
    PlusCircle
} from 'lucide-react';
import CategoryForm from './CategoryForm';
import DeleteCategoryModal from './DeleteCategoryModal';

const ICON_MAP: Record<string, any> = {
    'shopping-cart': ShoppingCart,
    'car': Car,
    'home': Home,
    'zap': Zap,
    'coffee': Coffee,
    'hammer': Hammer,
    'heart': Heart,
    'credit-card': CreditCard,
    'briefcase': Briefcase,
    'gift': Gift,
    'trending-up': TrendingUp,
    'rotate-ccw': RotateCcw,
    'plus-circle': PlusCircle,
    'more-horizontal': MoreHorizontal,
};

const CategoryList: React.FC = () => {
    const { categories, expenses, recurringExpenses, loans, deleteCategory } = useFinance();
    const { extraIncomes } = useIncome();
    const [editingCategory, setEditingCategory] = useState<Category | undefined>(undefined);
    const [showForm, setShowForm] = useState(false);
    const [deletingCategory, setDeletingCategory] = useState<{ cat: Category; count: number } | undefined>(undefined);

    const usageCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        
        // Count in expenses
        expenses.forEach(e => {
            if (e.categoryId) counts[e.categoryId] = (counts[e.categoryId] || 0) + 1;
        });

        // Count in recurring
        recurringExpenses.forEach(r => {
            if (r.categoryId) counts[r.categoryId] = (counts[r.categoryId] || 0) + 1;
        });

        // Count in loans
        loans.forEach((l: any) => {
            if (l.categoryId) counts[l.categoryId] = (counts[l.categoryId] || 0) + 1;
        });

        // Count in extra incomes
        extraIncomes.forEach((i: any) => {
            if (i.categoryId) counts[i.categoryId] = (counts[i.categoryId] || 0) + 1;
            // Legacy field 'category' check if it was ID
            else if ((i as any).category) counts[(i as any).category] = (counts[(i as any).category] || 0) + 1;
        });

        return counts;
    }, [expenses, recurringExpenses, loans, extraIncomes]);

    const incomeCategories = useMemo(() => categories.filter(c => c.type === 'income'), [categories]);
    const expenseCategories = useMemo(() => categories.filter(c => c.type === 'expense'), [categories]);

    const handleDeleteClick = (cat: Category) => {
        const count = usageCounts[cat.id] || 0;
        if (count > 0) {
            setDeletingCategory({ cat, count });
        } else {
            if (window.confirm(`¿Estás seguro de que quieres eliminar la categoría "${cat.name}"?`)) {
                deleteCategory(cat.id);
            }
        }
    };

    const renderCategoryItem = (cat: Category) => {
        const Icon = ICON_MAP[cat.icon || 'tag'] || Tag;
        const count = usageCounts[cat.id] || 0;

        return (
            <div 
                key={cat.id} 
                className="glass-panel" 
                style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between', 
                    padding: '1rem', 
                    borderRadius: '1rem',
                    border: '1px solid rgba(255,255,255,0.05)',
                    background: 'rgba(255,255,255,0.02)',
                    transition: 'all 0.3s ease'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ 
                        width: '40px', 
                        height: '40px', 
                        borderRadius: '0.75rem', 
                        background: `${cat.color || '#636e72'}20`, 
                        color: cat.color || '#636e72',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <Icon size={20} />
                    </div>
                    <div>
                        <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{cat.name}</div>
                        <div style={{ fontSize: '0.75rem', opacity: 0.5 }}>
                            {count} {count === 1 ? 'registro' : 'registros'}
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button 
                        onClick={() => { setEditingCategory(cat); setShowForm(true); }}
                        style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '0.5rem', color: 'rgba(255,255,255,0.6)', cursor: 'pointer' }}
                        title="Editar"
                    >
                        <Edit2 size={16} />
                    </button>
                    <button 
                        onClick={() => handleDeleteClick(cat)}
                        style={{ padding: '0.5rem', background: 'rgba(239, 68, 68, 0.1)', border: 'none', borderRadius: '0.5rem', color: '#ef4444', cursor: 'pointer' }}
                        title="Eliminar"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600 }}>Tus Categorías</h3>
                {!showForm && (
                    <button 
                        onClick={() => { setEditingCategory(undefined); setShowForm(true); }}
                        style={{ 
                            background: 'var(--color-primary)', 
                            color: 'white', 
                            border: 'none', 
                            padding: '0.6rem 1.2rem', 
                            borderRadius: '0.75rem', 
                            fontWeight: 600, 
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}
                    >
                        <Plus size={18} /> Nueva Categoría
                    </button>
                )}
            </div>

            {showForm ? (
                <CategoryForm 
                    editingCategory={editingCategory} 
                    onClose={() => { setShowForm(false); setEditingCategory(undefined); }} 
                    onCancelEdit={() => { setShowForm(false); setEditingCategory(undefined); }}
                />
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                    {/* Expense Categories */}
                    <div>
                        <h4 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-primary)', opacity: 0.8 }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-primary)' }}></span>
                            Gastos
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {expenseCategories.map(renderCategoryItem)}
                        </div>
                    </div>

                    {/* Income Categories */}
                    <div>
                        <h4 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-secondary, #10b981)', opacity: 0.8 }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-secondary, #10b981)' }}></span>
                            Ingresos
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {incomeCategories.map(renderCategoryItem)}
                        </div>
                    </div>
                </div>
            )}

            {deletingCategory && (
                <DeleteCategoryModal 
                    category={deletingCategory.cat} 
                    usageCount={deletingCategory.count} 
                    onClose={() => setDeletingCategory(undefined)} 
                />
            )}
        </div>
    );
};

export default CategoryList;
