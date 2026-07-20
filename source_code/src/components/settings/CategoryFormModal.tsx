import React, { useState, useEffect } from 'react';
import { 
    X, 
    Check, 
    Type, 
    Palette, 
    Layers,
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
import type { Category } from '../../types/finance';
import ModalPortal from '../common/ModalPortal';

interface CategoryFormModalProps {
    category?: Category;
    onClose: () => void;
    onSave: (category: Omit<Category, 'id'> | Category) => Promise<void>;
    initialType?: 'income' | 'expense';
}

const CATEGORY_ICONS = [
    { name: 'shopping-cart', Icon: ShoppingCart },
    { name: 'car', Icon: Car },
    { name: 'home', Icon: Home },
    { name: 'zap', Icon: Zap },
    { name: 'coffee', Icon: Coffee },
    { name: 'hammer', Icon: Hammer },
    { name: 'heart', Icon: Heart },
    { name: 'credit-card', Icon: CreditCard },
    { name: 'more-horizontal', Icon: MoreHorizontal },
    { name: 'briefcase', Icon: Briefcase },
    { name: 'trending-up', Icon: TrendingUp },
    { name: 'gift', Icon: Gift },
    { name: 'smartphone', Icon: Smartphone },
    { name: 'utensils', Icon: Utensils },
    { name: 'plane', Icon: Plane },
    { name: 'music', Icon: Music },
    { name: 'film', Icon: Film },
    { name: 'gamepad', Icon: Gamepad },
    { name: 'book', Icon: Book },
    { name: 'graduation-cap', Icon: GraduationCap },
    { name: 'dumbbell', Icon: Dumbbell },
    { name: 'shopping-bag', Icon: ShoppingBag },
    { name: 'piggy-bank', Icon: PiggyBank },
    { name: 'dollar-sign', Icon: DollarSign },
    { name: 'wallet', Icon: Wallet }
];

const PRESET_COLORS = [
    '#e67e22', // Orange
    '#3498db', // Blue
    '#9b59b6', // Purple
    '#f1c40f', // Yellow
    '#e74c3c', // Red
    '#2ecc71', // Green
    '#1abc9c', // Teal
    '#34495e', // Dark Blue
    '#ff7979', // Salmon
    '#686de0', // Indigo
    '#4834d4', // Deep Blue
    '#be2edd', // Magenta
    '#f0932b', // Light Orange
    '#eb4d4b', // Light Red
    '#6ab04c', // Light Green
    '#22a6b3'  // Cyan
];

const CategoryFormModal: React.FC<CategoryFormModalProps> = ({ category, onClose, onSave, initialType = 'expense' }) => {
    const [name, setName] = useState(category?.name || '');
    const [type, setType] = useState<'income' | 'expense'>(category?.type || initialType);
    const [color, setColor] = useState(category?.color || PRESET_COLORS[0]);
    const [icon, setIcon] = useState(category?.icon || 'more-horizontal');
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            setError('El nombre de la categoría es obligatorio');
            return;
        }

        try {
            const data = {
                ...(category as Category),
                name: name.trim(),
                type,
                color,
                icon
            };
            await onSave(data);
            onClose();
        } catch (err: any) {
            setError(err.message);
        }
    };

    return (
        <ModalPortal><div className="modal-overlay" onClick={onClose}>
            <div className="modal-container glass-panel" style={{ padding: '2rem', maxWidth: '450px' }} onClick={e => e.stopPropagation()}>
                <button 
                    onClick={onClose}
                    style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}
                >
                    <X size={24} />
                </button>

                <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Layers color={color} />
                    {category ? 'Editar Categoría' : 'Nueva Categoría'}
                </h2>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* Name */}
                    <div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontSize: '0.9rem', opacity: 0.7 }}>
                            <Type size={16} /> Nombre
                        </label>
                        <input 
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Ej. Restaurantes, Viajes..."
                            className="form-input"
                            autoFocus
                        />
                    </div>

                    {/* Type Selector */}
                    <div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontSize: '0.9rem', opacity: 0.7 }}>
                            Tipo de Categoría
                        </label>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button 
                                type="button"
                                onClick={() => setType('expense')}
                                style={{
                                    flex: 1,
                                    padding: '0.75rem',
                                    borderRadius: '0.75rem',
                                    border: '1px solid',
                                    borderColor: type === 'expense' ? '#ff4757' : 'rgba(255,255,255,0.1)',
                                    background: type === 'expense' ? 'rgba(255,71,87,0.1)' : 'none',
                                    color: type === 'expense' ? '#ff4757' : 'var(--text-muted)',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                }}
                            >
                                Gasto
                            </button>
                            <button 
                                type="button"
                                onClick={() => setType('income')}
                                style={{
                                    flex: 1,
                                    padding: '0.75rem',
                                    borderRadius: '0.75rem',
                                    border: '1px solid',
                                    borderColor: type === 'income' ? '#2ed573' : 'rgba(255,255,255,0.1)',
                                    background: type === 'income' ? 'rgba(46,213,115,0.1)' : 'none',
                                    color: type === 'income' ? '#2ed573' : 'var(--text-muted)',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                }}
                            >
                                Ingreso
                            </button>
                        </div>
                    </div>

                    {/* Color Picker */}
                    <div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontSize: '0.9rem', opacity: 0.7 }}>
                            <Palette size={16} /> Color Identificativo
                        </label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '0.5rem' }}>
                            {PRESET_COLORS.map(c => (
                                <button
                                    key={c}
                                    type="button"
                                    onClick={() => setColor(c)}
                                    style={{
                                        width: '100%',
                                        aspectRatio: '1',
                                        borderRadius: '50%',
                                        background: c,
                                        border: color === c ? '2px solid white' : '2px solid transparent',
                                        cursor: 'pointer',
                                        padding: 0,
                                        boxShadow: color === c ? `0 0 10px ${c}` : 'none'
                                    }}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Icon Selector */}
                    <div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontSize: '0.9rem', opacity: 0.7 }}>
                            Icono
                        </label>
                        <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: 'repeat(5, 1fr)', 
                            gap: '0.5rem',
                            maxHeight: '150px',
                            overflowY: 'auto',
                            padding: '0.5rem',
                            background: 'rgba(255,255,255,0.02)',
                            borderRadius: '0.75rem'
                        }}>
                            {CATEGORY_ICONS.map(({ name: n, Icon }) => (
                                <button
                                    key={n}
                                    type="button"
                                    onClick={() => setIcon(n)}
                                    style={{
                                        padding: '0.75rem',
                                        borderRadius: '0.5rem',
                                        background: icon === n ? 'rgba(255,255,255,0.1)' : 'none',
                                        border: 'none',
                                        color: icon === n ? 'white' : 'rgba(255,255,255,0.3)',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                >
                                    <Icon size={20} />
                                </button>
                            ))}
                        </div>
                    </div>

                    {error && (
                        <div style={{ color: '#ff4757', fontSize: '0.85rem', textAlign: 'center' }}>
                            {error}
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                        <button 
                            type="button"
                            onClick={onClose}
                            style={{ 
                                flex: 1, 
                                background: 'transparent',
                                border: '1px solid rgba(255, 255, 255, 0.15)',
                                color: 'rgba(255, 255, 255, 0.8)',
                                borderRadius: '1rem',
                                padding: '0.8rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                            }}
                            className="hover-fade"
                        >
                            Cancelar
                        </button>
                        <button 
                            type="submit"
                            style={{ 
                                flex: 2, 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                gap: '0.5rem',
                                background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '1rem',
                                padding: '0.8rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                boxShadow: '0 4px 15px rgba(99, 102, 241, 0.3)',
                                transition: 'all 0.2s ease'
                            }}
                            className="btn-primary hover-fade active-scale"
                        >
                            <Check size={20} />
                            {category ? 'Actualizar' : 'Crear Categoría'}
                        </button>
                    </div>
                </form>
            </div>
        </div></ModalPortal>
    );
};

export default CategoryFormModal;
