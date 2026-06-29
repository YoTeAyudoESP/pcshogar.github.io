import React, { useState, useEffect } from 'react';
import { useFinance } from '../../contexts/FinanceContext';
import { Category } from '../../types/finance';
import { 
    Tag, 
    Palette, 
    Type, 
    Check, 
    X,
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

interface CategoryFormProps {
    editingCategory?: Category;
    onClose: () => void;
    onCancelEdit?: () => void;
}

const ICONS = [
    { id: 'shopping-cart', icon: ShoppingCart },
    { id: 'car', icon: Car },
    { id: 'home', icon: Home },
    { id: 'zap', icon: Zap },
    { id: 'coffee', icon: Coffee },
    { id: 'hammer', icon: Hammer },
    { id: 'heart', icon: Heart },
    { id: 'credit-card', icon: CreditCard },
    { id: 'briefcase', icon: Briefcase },
    { id: 'gift', icon: Gift },
    { id: 'trending-up', icon: TrendingUp },
    { id: 'rotate-ccw', icon: RotateCcw },
    { id: 'plus-circle', icon: PlusCircle },
    { id: 'more-horizontal', icon: MoreHorizontal },
];

const COLORS = [
    '#e67e22', '#3498db', '#9b59b6', '#f1c40f', '#e74c3c', 
    '#2ecc71', '#ff7979', '#1abc9c', '#95a5a6', '#27ae60',
    '#f39c12', '#2980b9', '#e84393', '#00cec9', '#636e72'
];

const CategoryForm: React.FC<CategoryFormProps> = ({ editingCategory, onClose, onCancelEdit }) => {
    const { addCategory, updateCategory } = useFinance();
    const [name, setName] = useState('');
    const [type, setType] = useState<'income' | 'expense'>('expense');
    const [color, setColor] = useState(COLORS[0]);
    const [iconId, setIconId] = useState('shopping-cart');

    useEffect(() => {
        if (editingCategory) {
            setName(editingCategory.name);
            setType(editingCategory.type);
            setColor(editingCategory.color || COLORS[0]);
            setIconId(editingCategory.icon || 'shopping-cart');
        } else {
            setName('');
            setType('expense');
            setColor(COLORS[0]);
            setIconId('shopping-cart');
        }
    }, [editingCategory]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name) return;

        if (editingCategory) {
            await updateCategory({
                ...editingCategory,
                name,
                type,
                color,
                icon: iconId
            });
        } else {
            await addCategory({
                name,
                type,
                color,
                icon: iconId
            });
        }
        onClose();
    };

    const inputStyle = {
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '0.75rem',
        padding: '0.8rem 1rem',
        color: 'white',
        width: '100%',
        fontSize: '1rem',
        outline: 'none',
        transition: 'all 0.2s ease',
    };

    return (
        <form onSubmit={handleSubmit} className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {editingCategory ? <Check size={20} /> : <PlusCircle size={20} />}
                    {editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}
                </h3>
                {(editingCategory || onCancelEdit) && (
                    <button 
                        type="button" 
                        onClick={onCancelEdit || onClose}
                        style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}
                    >
                        <X size={20} />
                    </button>
                )}
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(255,255,255,0.05)', padding: '0.25rem', borderRadius: '0.75rem' }}>
                <button
                    type="button"
                    onClick={() => setType('expense')}
                    style={{
                        flex: 1,
                        padding: '0.6rem',
                        borderRadius: '0.6rem',
                        border: 'none',
                        background: type === 'expense' ? 'var(--color-primary)' : 'transparent',
                        color: 'white',
                        cursor: 'pointer',
                        fontWeight: 600,
                        transition: 'all 0.2s'
                    }}
                >
                    Gasto
                </button>
                <button
                    type="button"
                    onClick={() => setType('income')}
                    style={{
                        flex: 1,
                        padding: '0.6rem',
                        borderRadius: '0.6rem',
                        border: 'none',
                        background: type === 'income' ? 'var(--color-secondary, #10b981)' : 'transparent',
                        color: 'white',
                        cursor: 'pointer',
                        fontWeight: 600,
                        transition: 'all 0.2s'
                    }}
                >
                    Ingreso
                </button>
            </div>

            <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', opacity: 0.7 }}>Nombre</label>
                <input 
                    style={inputStyle} 
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                    placeholder="Escribe el nombre..." 
                    autoFocus 
                    required 
                />
            </div>

            <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', opacity: 0.7 }}>Icono</label>
                <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(7, 1fr)', 
                    gap: '0.5rem',
                    maxHeight: '120px',
                    overflowY: 'auto',
                    padding: '0.5rem',
                    background: 'rgba(255,255,255,0.02)',
                    borderRadius: '0.75rem'
                }}>
                    {ICONS.map(({ id, icon: Icon }) => (
                        <button
                            key={id}
                            type="button"
                            onClick={() => setIconId(id)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '0.5rem',
                                borderRadius: '0.5rem',
                                border: '1px solid',
                                borderColor: iconId === id ? color : 'transparent',
                                background: iconId === id ? `${color}20` : 'transparent',
                                color: iconId === id ? color : 'rgba(255,255,255,0.4)',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            <Icon size={20} />
                        </button>
                    ))}
                </div>
            </div>

            <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', opacity: 0.7 }}>Color</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {COLORS.map(c => (
                        <button
                            key={c}
                            type="button"
                            onClick={() => setColor(c)}
                            style={{
                                width: '2rem',
                                height: '2rem',
                                borderRadius: '50%',
                                border: color === c ? '2px solid white' : '2px solid transparent',
                                background: c,
                                cursor: 'pointer',
                                transition: 'transform 0.1s',
                                transform: color === c ? 'scale(1.1)' : 'scale(1)'
                            }}
                        />
                    ))}
                </div>
            </div>

            <button
                type="submit"
                className="button-primary"
                style={{
                    width: '100%',
                    padding: '1rem',
                    borderRadius: '0.75rem',
                    border: 'none',
                    background: type === 'expense' ? 'var(--color-primary)' : 'var(--color-secondary, #10b981)',
                    color: 'white',
                    fontWeight: 700,
                    fontSize: '1rem',
                    cursor: 'pointer',
                    marginTop: '0.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem'
                }}
            >
                {editingCategory ? 'Guardar Cambios' : 'Crear Categoría'}
            </button>
        </form>
    );
};

export default CategoryForm;
