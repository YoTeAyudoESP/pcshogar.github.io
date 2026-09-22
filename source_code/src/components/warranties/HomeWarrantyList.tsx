import React, { useState } from 'react';
import type { HomeWarranty } from '../../types/finance';
import { useFinance } from '../../contexts/FinanceContext';
import HomeWarrantyForm from './HomeWarrantyForm';
import InvoiceViewerModal from './InvoiceViewerModal';
import { ShieldCheck, Plus, Calendar, FileText, Trash2, Edit, AlertTriangle, CheckCircle, Store, Tag } from 'lucide-react';

const HomeWarrantyList: React.FC = () => {
    const { warranties = [], deleteWarranty } = useFinance();
    const [selectedWarranty, setSelectedWarranty] = useState<HomeWarranty | undefined>(undefined);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [viewingInvoiceWarranty, setViewingInvoiceWarranty] = useState<HomeWarranty | null>(null);
    const [categoryFilter, setCategoryFilter] = useState<string>('all');

    const handleEdit = (w: HomeWarranty) => {
        setSelectedWarranty(w);
        setIsFormOpen(true);
    };

    const handleAddNew = () => {
        setSelectedWarranty(undefined);
        setIsFormOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('¿Estás seguro de eliminar esta garantía hogar?')) {
            await deleteWarranty(id);
        }
    };

    const filteredWarranties = warranties.filter(w => {
        if (categoryFilter === 'all') return true;
        return w.category === categoryFilter;
    });

    const getCategoryLabel = (cat: HomeWarranty['category']) => {
        switch (cat) {
            case 'appliance': return 'Electrodoméstico';
            case 'tech': return 'Tecnología';
            case 'furniture': return 'Mueble';
            case 'home_improvement': return 'Reforma / Clima';
            default: return 'Otro';
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Header */}
            <div className="glass-panel" style={{
                padding: '1.25rem 1.5rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem',
                borderRadius: '16px'
            }}>
                <div>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <ShieldCheck size={22} style={{ color: '#10b981' }} /> Garantías Hogar y Electrodomésticos
                    </h2>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                        Control de cobertura de fabricante, tickets de compra y vencimiento de garantías.
                    </p>
                </div>
                <button
                    onClick={handleAddNew}
                    style={{
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        color: 'white',
                        border: 'none',
                        padding: '0.65rem 1.25rem',
                        borderRadius: '12px',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
                        transition: 'all 0.2s ease'
                    }}
                >
                    <Plus size={16} />
                    <span>Añadir Garantía</span>
                </button>
            </div>

            {/* Filtro por Categorías */}
            {warranties.length > 0 && (
                <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
                    {[
                        { id: 'all', label: 'Todas' },
                        { id: 'appliance', label: 'Electrodomésticos' },
                        { id: 'tech', label: 'Tecnología' },
                        { id: 'furniture', label: 'Muebles' },
                        { id: 'home_improvement', label: 'Reformas / Clima' },
                        { id: 'other', label: 'Otros' }
                    ].map(c => (
                        <button
                            key={c.id}
                            onClick={() => setCategoryFilter(c.id)}
                            style={{
                                padding: '0.4rem 0.85rem',
                                borderRadius: '8px',
                                fontSize: '0.75rem',
                                fontWeight: categoryFilter === c.id ? 700 : 500,
                                background: categoryFilter === c.id ? '#10b981' : 'rgba(255, 255, 255, 0.05)',
                                color: categoryFilter === c.id ? '#ffffff' : 'var(--text-muted)',
                                border: 'none',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            {c.label}
                        </button>
                    ))}
                </div>
            )}

            {/* Empty state or list */}
            {filteredWarranties.length === 0 ? (
                <div className="glass-panel" style={{
                    padding: '3.5rem 1.5rem',
                    textAlign: 'center',
                    borderRadius: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '1rem'
                }}>
                    <div style={{
                        background: 'rgba(16, 185, 129, 0.1)',
                        padding: '1rem',
                        borderRadius: '50%',
                        color: '#10b981'
                    }}>
                        <ShieldCheck size={36} />
                    </div>
                    <div>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#ffffff' }}>
                            {warranties.length === 0 ? 'No hay garantías registradas' : 'No hay garantías en esta categoría'}
                        </h3>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '420px', margin: '0.5rem auto 0 auto', lineHeight: '1.5' }}>
                            Guarda los datos de tus electrodomésticos y dispositivos junto a su factura o ticket para reclamaciones o reparaciones sin sorpresas.
                        </p>
                    </div>
                </div>
            ) : (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                    gap: '1.25rem'
                }}>
                    {filteredWarranties.map((w) => {
                        const now = Date.now();
                        const daysLeft = Math.ceil((w.expirationDate - now) / (1000 * 60 * 60 * 24));
                        const isExpired = daysLeft <= 0;
                        const isExpiringSoon = daysLeft > 0 && daysLeft <= 60;

                        return (
                            <div
                                key={w.id}
                                className="glass-panel"
                                style={{
                                    padding: '1.25rem',
                                    borderRadius: '16px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                    borderLeft: `4px solid ${isExpired ? '#f43f5e' : isExpiringSoon ? '#f59e0b' : '#10b981'}`,
                                    background: 'rgba(255, 255, 255, 0.02)',
                                    gap: '1rem'
                                }}
                            >
                                <div>
                                    {/* Card Header */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.6rem' }}>
                                        <div>
                                            <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 700, color: '#10b981', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                                <Tag size={10} /> {getCategoryLabel(w.category)}
                                            </span>
                                            <h4 style={{ margin: '2px 0 0 0', fontSize: '1.05rem', fontWeight: 800, color: '#ffffff' }}>{w.name}</h4>
                                            {(w.brand || w.model) && (
                                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                                                    {w.brand} {w.model} {w.serialNumber && `(S/N: ${w.serialNumber})`}
                                                </p>
                                            )}
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.3rem' }}>
                                            <button
                                                onClick={() => handleEdit(w)}
                                                style={{
                                                    background: 'rgba(255,255,255,0.05)',
                                                    border: 'none',
                                                    color: 'var(--text-muted)',
                                                    padding: '0.4rem',
                                                    borderRadius: '8px',
                                                    cursor: 'pointer'
                                                }}
                                                title="Editar"
                                            >
                                                <Edit size={14} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(w.id)}
                                                style={{
                                                    background: 'rgba(244, 63, 94, 0.1)',
                                                    border: 'none',
                                                    color: '#f43f5e',
                                                    padding: '0.4rem',
                                                    borderRadius: '8px',
                                                    cursor: 'pointer'
                                                }}
                                                title="Eliminar"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Warranty status banner */}
                                    <div style={{
                                        background: isExpired ? 'rgba(244, 63, 94, 0.08)' : isExpiringSoon ? 'rgba(245, 158, 11, 0.08)' : 'rgba(16, 185, 129, 0.08)',
                                        border: `1px solid ${isExpired ? 'rgba(244, 63, 94, 0.2)' : isExpiringSoon ? 'rgba(245, 158, 11, 0.2)' : 'rgba(16, 185, 129, 0.2)'}`,
                                        borderRadius: '12px',
                                        padding: '0.65rem 0.85rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        marginBottom: '0.75rem'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            {isExpired ? (
                                                <AlertTriangle size={18} style={{ color: '#f43f5e' }} />
                                            ) : isExpiringSoon ? (
                                                <AlertTriangle size={18} style={{ color: '#f59e0b' }} />
                                            ) : (
                                                <CheckCircle size={18} style={{ color: '#10b981' }} />
                                            )}
                                            <div>
                                                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: isExpired ? '#f43f5e' : isExpiringSoon ? '#f59e0b' : '#10b981', display: 'block' }}>
                                                    {isExpired ? 'Garantía Expirada' : isExpiringSoon ? 'Expira Próximamente' : 'En Garantía'}
                                                </span>
                                                <span style={{ fontSize: '0.75rem', color: '#ffffff', fontWeight: 600 }}>
                                                    {isExpired ? `Venció el ${new Date(w.expirationDate).toLocaleDateString('es-ES')}` : `Quedan ${daysLeft} días (${new Date(w.expirationDate).toLocaleDateString('es-ES')})`}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Additional info */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                        <div>
                                            <span style={{ display: 'block', fontSize: '0.65rem' }}>Compra</span>
                                            <strong style={{ color: '#ffffff' }}>{new Date(w.purchaseDate).toLocaleDateString('es-ES')}</strong>
                                        </div>
                                        {w.price && (
                                            <div>
                                                <span style={{ display: 'block', fontSize: '0.65rem' }}>Precio</span>
                                                <strong style={{ color: '#ffffff' }}>{w.price.toFixed(2)} €</strong>
                                            </div>
                                        )}
                                        {w.storeName && (
                                            <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <Store size={12} /> Tienda: <strong style={{ color: '#ffffff' }}>{w.storeName}</strong>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Attachment button */}
                                {w.invoiceAttachment ? (
                                    <button
                                        onClick={() => setViewingInvoiceWarranty(w)}
                                        style={{
                                            width: '100%',
                                            padding: '0.55rem',
                                            borderRadius: '10px',
                                            border: '1px solid rgba(16, 185, 129, 0.3)',
                                            background: 'rgba(16, 185, 129, 0.12)',
                                            color: '#10b981',
                                            fontSize: '0.8rem',
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '0.4rem',
                                            transition: 'all 0.2s ease'
                                        }}
                                    >
                                        <FileText size={14} /> 📄 Ver Factura / Ticket
                                    </button>
                                ) : (
                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', display: 'block' }}>
                                        Sin factura adjunta
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {isFormOpen && (
                <HomeWarrantyForm
                    warranty={selectedWarranty}
                    onClose={() => setIsFormOpen(false)}
                />
            )}

            {viewingInvoiceWarranty && viewingInvoiceWarranty.invoiceAttachment && (
                <InvoiceViewerModal
                    title={viewingInvoiceWarranty.name}
                    invoiceDataUrl={viewingInvoiceWarranty.invoiceAttachment}
                    onClose={() => setViewingInvoiceWarranty(null)}
                />
            )}
        </div>
    );
};

export default HomeWarrantyList;
