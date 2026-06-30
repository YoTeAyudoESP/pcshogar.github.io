import React, { useState } from 'react';
import { 
    Plus, 
    ArrowUpCircle, 
    ArrowDownCircle, 
    Edit2, 
    Trash2, 
    Info, 
    Check, 
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
    TrendingUp,
    Gift,
    Smartphone,
    Utensils,
    Plane,
    Music,
    Film,
    Gamepad,
    Book,
    GraduationCap,
    Dumbbell,
    ShoppingBag,
    PiggyBank,
    DollarSign,
    Wallet
} from 'lucide-react';
import { useFinance } from '../../contexts/FinanceContext';
import type { Category } from '../../types/finance';
import CategoryFormModal from './CategoryFormModal';
import DeleteCategoryModal from './DeleteCategoryModal';

const CATEGORY_ICONS_MAP: Record<string, any> = {
    'shopping-cart': ShoppingCart,
    'car': Car,
    'home': Home,
    'zap': Zap,
    'coffee': Coffee,
    'hammer': Hammer,
    'heart': Heart,
    'credit-card': CreditCard,
    'more-horizontal': MoreHorizontal,
    'briefcase': Briefcase,
    'trending-up': TrendingUp,
    'gift': Gift,
    'smartphone': Smartphone,
    'utensils': Utensils,
    'plane': Plane,
    'music': Music,
    'film': Film,
    'gamepad': Gamepad,
    'book': Book,
    'graduation-cap': GraduationCap,
    'dumbbell': Dumbbell,
    'shopping-bag': ShoppingBag,
    'piggy-bank': PiggyBank,
    'dollar-sign': DollarSign,
    'wallet': Wallet
};

const CategoryManagementView: React.FC = () => {
    const { 
        categories, expenses, recurringExpenses,
        fixedIncomes, extraIncomes,
        addCategory, updateCategory, deleteCategory 
    } = useFinance();

    const [activeTab, setActiveTab] = useState<'expense' | 'income'>('expense');
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [showFormModal, setShowFormModal] = useState(false);
    const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);

    // List categories for the active tab
    const filteredCategories = categories
        .filter(c => c.type === activeTab)
        .sort((a, b) => a.name.localeCompare(b.name));

    const calculateUsage = (id: string) => {
        const expCount = expenses.filter(e => e.categoryId === id).length;
        const recCount = recurringExpenses.filter(r => r.categoryId === id).length;
        
        // Income usage (handling both possible field names)
        const fixedCount = fixedIncomes.filter(i => i.categoryId === id).length;
        const extraCount = extraIncomes.filter(i => {
            // @ts-ignore
            return i.categoryId === id || i.category === id;
        }).length;

        return expCount + recCount + fixedCount + extraCount;
    };

    const handleSaveCategory = async (catData: Omit<Category, 'id'> | Category) => {
        try {
            if ('id' in catData) {
                await updateCategory(catData as Category);
            } else {
                await addCategory(catData);
            }
        } catch (error) {
            console.error("Failed to save category", error);
        }
    };

    const handleDeleteConfirm = async (reassignToId?: string) => {
        if (!deletingCategory) return;
        try {
            await deleteCategory(deletingCategory.id, reassignToId);
            setDeletingCategory(null);
        } catch (error) {
            console.error("Failed to delete category", error);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Header and Add Button */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button 
                        onClick={() => setActiveTab('expense')}
                        style={{
                            padding: '0.6rem 1.25rem',
                            borderRadius: '2rem',
                            border: 'none',
                            background: activeTab === 'expense' ? 'rgba(255, 71, 87, 0.15)' : 'var(--panel-bg-2)',
                            color: activeTab === 'expense' ? '#ff4757' : 'var(--text-muted)',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            cursor: 'pointer',
                            fontSize: '0.9rem'
                        }}
                    >
                        <ArrowDownCircle size={18} /> Gastos
                    </button>
                    <button 
                        onClick={() => setActiveTab('income')}
                        style={{
                            padding: '0.6rem 1.25rem',
                            borderRadius: '2rem',
                            border: 'none',
                            background: activeTab === 'income' ? 'rgba(46, 213, 115, 0.15)' : 'var(--panel-bg-2)',
                            color: activeTab === 'income' ? '#2ed573' : 'var(--text-muted)',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            cursor: 'pointer',
                            fontSize: '0.9rem'
                        }}
                    >
                        <ArrowUpCircle size={18} /> Ingresos
                    </button>
                </div>
                {/* Add Category button hidden from top to avoid overlapping on mobile */}
                <div style={{ width: '40px' }} /> 
            </div>

            {/* Hint / Info */}
            <div style={{ 
                background: 'rgba(var(--color-rgb-light), 0.03)', 
                borderLeft: `4px solid ${activeTab === 'expense' ? '#ff4757' : '#2ed573'}`,
                padding: '1rem',
                borderRadius: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                fontSize: '0.85rem',
                opacity: 0.8
            }}>
                <Info size={18} className="color-primary" />
                <span>
                    Estás gestionando las categorías de {activeTab === 'expense' ? 'gastos (compras, facturas, préstamos)' : 'ingresos (salarios, dividendos, otros)'}.
                </span>
            </div>

            {/* List */}
            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
                gap: '1rem',
                paddingBottom: '100px' // Space for FAB
            }}>
                {filteredCategories.length === 0 ? (
                    <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '4rem', opacity: 0.3 }}>
                        No hay categorías definidas de este tipo
                    </div>
                ) : (
                    filteredCategories.map(cat => {
                        const Icon = CATEGORY_ICONS_MAP[cat.icon || 'more-horizontal'] || MoreHorizontal;
                        const usageCount = calculateUsage(cat.id);
                        
                        return (
                            <div key={cat.id} className="glass-panel" style={{ 
                                padding: '1rem',
                                borderLeft: `4px solid ${cat.color}`,
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <div style={{ 
                                        width: '40px', 
                                        height: '40px', 
                                        borderRadius: '10px', 
                                        background: `${cat.color}20`,
                                        color: cat.color,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        <Icon size={20} />
                                    </div>
                                    <div>
                                        <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>{cat.name}</h4>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', opacity: 0.5, fontSize: '0.75rem' }}>
                                            <Check size={12} /> {usageCount} apuntes vinculados
                                        </div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button 
                                        onClick={() => { setEditingCategory(cat); setShowFormModal(true); }}
                                        style={{ 
                                            background: 'none', border: 'none', 
                                            color: 'rgba(var(--color-rgb-light),0.4)', cursor: 'pointer',
                                            padding: '8px', borderRadius: '50%',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                                        }}
                                        className="hover-fade"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button 
                                        onClick={() => setDeletingCategory(cat)}
                                        style={{ 
                                            background: 'none', border: 'none', 
                                            color: '#ff475750', cursor: 'pointer',
                                            padding: '8px', borderRadius: '50%',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                                        }}
                                        className="hover-fade"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Modals */}
            {showFormModal && (
                <CategoryFormModal 
                    category={editingCategory || undefined}
                    initialType={activeTab}
                    onClose={() => setShowFormModal(false)}
                    onSave={handleSaveCategory}
                />
            )}

            {deletingCategory && (
                <DeleteCategoryModal 
                    category={deletingCategory}
                    onClose={() => setDeletingCategory(null)}
                    onConfirm={handleDeleteConfirm}
                />
            )}

            {/* Floating Action Button (FAB) for adding categories */}
            <button 
                onClick={() => { setEditingCategory(null); setShowFormModal(true); }}
                style={{
                    position: 'fixed',
                    bottom: '2rem',
                    right: '2rem',
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                    color: 'var(--text-main)',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 8px 25px rgba(99, 102, 241, 0.5)',
                    cursor: 'pointer',
                    zIndex: 2100, // Above everything
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
                className="hover-fade active-scale"
                title="Añadir Categoría"
            >
                <Plus size={32} strokeWidth={2.5} />
            </button>
        </div>
    );
};

export default CategoryManagementView;
