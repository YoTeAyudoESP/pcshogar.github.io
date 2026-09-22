import React, { useState } from 'react';
import type { HomeWarranty } from '../../types/finance';
import { useFinance } from '../../contexts/FinanceContext';
import { Save, X, ShieldCheck, Upload, Trash2, Calendar, FileText } from 'lucide-react';
import ModalPortal from '../common/ModalPortal';

interface HomeWarrantyFormProps {
    warranty?: HomeWarranty;
    onClose: () => void;
}

const HomeWarrantyForm: React.FC<HomeWarrantyFormProps> = ({ warranty, onClose }) => {
    const { addWarranty, updateWarranty } = useFinance();

    const [name, setName] = useState(warranty?.name || '');
    const [category, setCategory] = useState<HomeWarranty['category']>(warranty?.category || 'appliance');
    const [brand, setBrand] = useState(warranty?.brand || '');
    const [model, setModel] = useState(warranty?.model || '');
    const [serialNumber, setSerialNumber] = useState(warranty?.serialNumber || '');
    const [storeName, setStoreName] = useState(warranty?.storeName || '');
    
    const [purchaseDate, setPurchaseDate] = useState<string>(
        warranty?.purchaseDate ? new Date(warranty.purchaseDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
    );
    const [warrantyMonths, setWarrantyMonths] = useState<number | ''>(warranty?.warrantyMonths ?? 36);
    const [price, setPrice] = useState<number | ''>(warranty?.price ?? '');
    const [invoiceAttachment, setInvoiceAttachment] = useState<string | undefined>(warranty?.invoiceAttachment);
    const [notes, setNotes] = useState(warranty?.notes || '');

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 10 * 1024 * 1024) {
            alert('El archivo no debe superar los 10 MB.');
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            setInvoiceAttachment(reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        const monthsNum = warrantyMonths !== '' ? Number(warrantyMonths) : 36;
        const pDate = new Date(purchaseDate).getTime();
        const expDate = pDate + (monthsNum * 30.4375 * 24 * 60 * 60 * 1000);

        const warrantyData = {
            name: name.trim(),
            category,
            brand: brand.trim(),
            model: model.trim(),
            serialNumber: serialNumber.trim(),
            storeName: storeName.trim(),
            purchaseDate: pDate,
            warrantyMonths: monthsNum,
            expirationDate: expDate,
            price: price !== '' ? Number(price) : undefined,
            invoiceAttachment,
            notes: notes.trim()
        };

        if (warranty) {
            await updateWarranty({
                ...warranty,
                ...warrantyData
            });
        } else {
            await addWarranty(warrantyData);
        }
        onClose();
    };

    const inputStyle: React.CSSProperties = {
        width: '100%',
        padding: '0.65rem 0.85rem',
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: '10px',
        color: '#ffffff',
        fontSize: '0.85rem',
        outline: 'none'
    };

    const labelStyle: React.CSSProperties = {
        display: 'block',
        fontSize: '0.75rem',
        fontWeight: 600,
        color: 'var(--text-muted)',
        marginBottom: '4px'
    };

    return (
        <ModalPortal>
            <div style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(15, 23, 42, 0.75)',
                backdropFilter: 'blur(8px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '1rem',
                zIndex: 99999,
                overflowY: 'auto'
            }}>
                <div className="glass-panel" style={{
                    background: '#1e293b',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '20px',
                    width: '100%',
                    maxWidth: '640px',
                    maxHeight: '90vh',
                    overflowY: 'auto',
                    padding: '1.5rem',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                }}>
                    {/* Header Modal */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        paddingBottom: '1rem',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                        marginBottom: '1.25rem'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <ShieldCheck size={22} style={{ color: '#10b981' }} />
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                                {warranty ? 'Editar Garantía Hogar' : 'Nueva Garantía Hogar'}
                            </h2>
                        </div>
                        <button
                            onClick={onClose}
                            style={{
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: 'none',
                                color: 'var(--text-muted)',
                                padding: '0.4rem',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center'
                            }}
                        >
                            <X size={18} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.85rem' }}>
                            <div>
                                <label style={labelStyle}>Producto / Dispositivo *</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Ej. Lavadora, Televisor 55, Frigorífico"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    style={inputStyle}
                                />
                            </div>
                            <div>
                                <label style={labelStyle}>Categoría</label>
                                <select
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value as any)}
                                    style={{ ...inputStyle, color: '#ffffff', background: '#0f172a' }}
                                >
                                    <option value="appliance">Electrodoméstico</option>
                                    <option value="tech">Tecnología / Electrónica</option>
                                    <option value="furniture">Muebles / Hogar</option>
                                    <option value="home_improvement">Reformas / Climatización</option>
                                    <option value="other">Otro</option>
                                </select>
                            </div>
                            <div>
                                <label style={labelStyle}>Marca</label>
                                <input
                                    type="text"
                                    placeholder="Ej. Bosch, Samsung, LG"
                                    value={brand}
                                    onChange={(e) => setBrand(e.target.value)}
                                    style={inputStyle}
                                />
                            </div>
                            <div>
                                <label style={labelStyle}>Modelo</label>
                                <input
                                    type="text"
                                    placeholder="Ej. Series 6, OLED55"
                                    value={model}
                                    onChange={(e) => setModel(e.target.value)}
                                    style={inputStyle}
                                />
                            </div>
                            <div>
                                <label style={labelStyle}>Número de Serie (S/N)</label>
                                <input
                                    type="text"
                                    placeholder="Ej. SN-9876543210"
                                    value={serialNumber}
                                    onChange={(e) => setSerialNumber(e.target.value)}
                                    style={inputStyle}
                                />
                            </div>
                            <div>
                                <label style={labelStyle}>Establecimiento / Tienda</label>
                                <input
                                    type="text"
                                    placeholder="Ej. MediaMarkt, El Corte Inglés, Amazon"
                                    value={storeName}
                                    onChange={(e) => setStoreName(e.target.value)}
                                    style={inputStyle}
                                />
                            </div>
                        </div>

                        {/* Fecha de compra y duración */}
                        <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '1rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.85rem' }}>
                                <div>
                                    <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <Calendar size={14} style={{ color: '#10b981' }} /> Fecha de Compra *
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        value={purchaseDate}
                                        onChange={(e) => setPurchaseDate(e.target.value)}
                                        style={inputStyle}
                                    />
                                </div>
                                <div>
                                    <label style={labelStyle}>Duración Garantía (Meses) *</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="240"
                                        placeholder="Ej. 36 (3 años)"
                                        value={warrantyMonths}
                                        onChange={(e) => setWarrantyMonths(e.target.value === '' ? '' : Number(e.target.value))}
                                        style={inputStyle}
                                    />
                                </div>
                                <div>
                                    <label style={labelStyle}>Precio de Compra (€)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        placeholder="Ej. 499.00"
                                        value={price}
                                        onChange={(e) => setPrice(e.target.value === '' ? '' : Number(e.target.value))}
                                        style={inputStyle}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Factura / Ticket */}
                        <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '1rem' }}>
                            <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <FileText size={14} style={{ color: '#10b981' }} /> Adjuntar Factura / Ticket (Imagen o PDF)
                            </label>
                            
                            {invoiceAttachment ? (
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    background: 'rgba(16, 185, 129, 0.1)',
                                    border: '1px solid rgba(16, 185, 129, 0.3)',
                                    padding: '0.65rem 0.85rem',
                                    borderRadius: '10px'
                                }}>
                                    <span style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 600 }}>
                                        📄 Factura adjuntada correctamente
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setInvoiceAttachment(undefined)}
                                        style={{
                                            background: 'rgba(244, 63, 94, 0.15)',
                                            color: '#f43f5e',
                                            border: 'none',
                                            padding: '0.3rem 0.6rem',
                                            borderRadius: '6px',
                                            fontSize: '0.75rem',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.2rem'
                                        }}
                                    >
                                        <Trash2 size={12} /> Quitar
                                    </button>
                                </div>
                            ) : (
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type="file"
                                        accept="image/*,application/pdf"
                                        onChange={handleFileUpload}
                                        style={{
                                            position: 'absolute',
                                            inset: 0,
                                            opacity: 0,
                                            width: '100%',
                                            height: '100%',
                                            cursor: 'pointer'
                                        }}
                                    />
                                    <div style={{
                                        border: '1px dashed rgba(255, 255, 255, 0.2)',
                                        borderRadius: '10px',
                                        padding: '1rem',
                                        textAlign: 'center',
                                        background: 'rgba(255, 255, 255, 0.02)',
                                        color: 'var(--text-muted)',
                                        fontSize: '0.8rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '0.5rem'
                                    }}>
                                        <Upload size={16} style={{ color: '#10b981' }} />
                                        <span>Haz clic para seleccionar imagen o PDF de la factura (máx. 10 MB)</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Observaciones */}
                        <div>
                            <label style={labelStyle}>Notas / Observaciones</label>
                            <textarea
                                rows={2}
                                placeholder="Ej. Garantía ampliada 5 años contratada con la tienda..."
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                style={{ ...inputStyle, resize: 'vertical' }}
                            />
                        </div>

                        {/* Botones */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'flex-end',
                            gap: '0.75rem',
                            paddingTop: '1rem',
                            borderTop: '1px solid rgba(255, 255, 255, 0.08)'
                        }}>
                            <button
                                type="button"
                                onClick={onClose}
                                style={{
                                    padding: '0.65rem 1.25rem',
                                    borderRadius: '10px',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    color: '#ffffff',
                                    fontSize: '0.85rem',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                }}
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                style={{
                                    padding: '0.65rem 1.25rem',
                                    borderRadius: '10px',
                                    border: 'none',
                                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                    color: 'white',
                                    fontSize: '0.85rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.4rem',
                                    boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)'
                                }}
                            >
                                <Save size={16} />
                                <span>Guardar Garantía</span>
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </ModalPortal>
    );
};

export default HomeWarrantyForm;
