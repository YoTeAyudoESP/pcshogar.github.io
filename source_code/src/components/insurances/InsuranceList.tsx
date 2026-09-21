import React, { useState } from 'react';
import type { Insurance } from '../../types/finance';
import { useFinance } from '../../contexts/FinanceContext';
import InsuranceForm from './InsuranceForm';
import { Shield, Plus, Phone, Calendar, DollarSign, Car, Home, Heart, Activity, AlertTriangle, CheckCircle, Edit, Trash2, Clock } from 'lucide-react';

const InsuranceList: React.FC = () => {
    const { insurances, deleteInsurance, recurringExpenses, vehicles } = useFinance();
    const [selectedInsurance, setSelectedInsurance] = useState<Insurance | undefined>(undefined);
    const [isFormOpen, setIsFormOpen] = useState(false);

    const handleEdit = (insurance: Insurance) => {
        setSelectedInsurance(insurance);
        setIsFormOpen(true);
    };

    const handleAddNew = () => {
        setSelectedInsurance(undefined);
        setIsFormOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('¿Estás seguro de eliminar este seguro?')) {
            await deleteInsurance(id);
        }
    };

    const getInsuranceTypeName = (type: Insurance['type']) => {
        switch (type) {
            case 'vehicle': return 'Vehículo';
            case 'home': return 'Hogar';
            case 'life': return 'Vida';
            case 'health': return 'Salud';
            case 'pet': return 'Mascotas';
            case 'death': return 'Decesos';
            default: return 'Otro';
        }
    };

    const getInsuranceTypeIcon = (type: Insurance['type']) => {
        switch (type) {
            case 'vehicle': return <Car size={16} style={{ color: '#60a5fa' }} />;
            case 'home': return <Home size={16} style={{ color: '#c084fc' }} />;
            case 'life': return <Heart size={16} style={{ color: '#f43f5e' }} />;
            case 'health': return <Activity size={16} style={{ color: '#34d399' }} />;
            default: return <Shield size={16} style={{ color: '#818cf8' }} />;
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Cabecera de Sección */}
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
                        <Shield size={22} style={{ color: '#818cf8' }} /> Mis Seguros
                    </h2>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                        Control unificado de pólizas, pólizas de vehículos, hogar y avisos de renovación anticipados.
                    </p>
                </div>
                <button
                    onClick={handleAddNew}
                    style={{
                        background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
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
                        boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)',
                        transition: 'all 0.2s ease'
                    }}
                >
                    <Plus size={16} />
                    <span>Añadir Seguro</span>
                </button>
            </div>

            {/* Lista o Estado Vacío */}
            {insurances.length === 0 ? (
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
                        background: 'rgba(99, 102, 241, 0.1)', 
                        padding: '1rem', 
                        borderRadius: '50%',
                        color: '#818cf8'
                    }}>
                        <Shield size={36} />
                    </div>
                    <div>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#ffffff' }}>No hay seguros registrados</h3>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '420px', margin: '0.5rem auto 0 auto', lineHeight: '1.5' }}>
                            Registra tus pólizas para tener a mano el teléfono de asistencia de la compañía y recibir avisos 2 meses antes de la autorrenovación.
                        </p>
                    </div>
                    <button
                        onClick={handleAddNew}
                        style={{
                            background: 'rgba(99, 102, 241, 0.15)',
                            border: '1px solid rgba(99, 102, 241, 0.3)',
                            color: '#818cf8',
                            padding: '0.6rem 1.2rem',
                            borderRadius: '10px',
                            fontWeight: 600,
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            marginTop: '0.5rem'
                        }}
                    >
                        <Plus size={16} />
                        <span>Registrar Primer Seguro</span>
                    </button>
                </div>
            ) : (
                <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', 
                    gap: '1.25rem' 
                }}>
                    {insurances.map((ins) => {
                        const linkedRec = recurringExpenses.find(r => r.id === ins.recurringExpenseId);

                        const now = Date.now();
                        const daysLeftExpiration = Math.ceil((ins.expirationDate - now) / (1000 * 60 * 60 * 24));
                        const isRenewalNoticeActive = daysLeftExpiration <= 60 && daysLeftExpiration > 0;
                        const isExpired = daysLeftExpiration <= 0;

                        return (
                            <div 
                                key={ins.id} 
                                className="glass-panel" 
                                style={{ 
                                    padding: '1.25rem', 
                                    borderRadius: '16px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                    borderLeft: `4px solid ${isExpired ? '#f43f5e' : isRenewalNoticeActive ? '#f59e0b' : '#10b981'}`,
                                    background: 'rgba(255, 255, 255, 0.02)',
                                    gap: '1rem'
                                }}
                            >
                                <div>
                                    {/* Cabecera Tarjeta */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                                {getInsuranceTypeIcon(ins.type)}
                                                <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#ffffff' }}>{ins.name}</h4>
                                                <span style={{ 
                                                    background: 'rgba(255, 255, 255, 0.08)', 
                                                    color: 'var(--text-muted)', 
                                                    fontSize: '0.7rem', 
                                                    fontWeight: 600, 
                                                    padding: '2px 6px', 
                                                    borderRadius: '6px' 
                                                }}>
                                                    {getInsuranceTypeName(ins.type)}
                                                </span>
                                            </div>
                                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                                                Compañía: <strong style={{ color: '#ffffff' }}>{ins.company}</strong>
                                                {ins.policyNumber && ` • Póliza: ${ins.policyNumber}`}
                                            </p>
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.3rem' }}>
                                            <button
                                                onClick={() => handleEdit(ins)}
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
                                                onClick={() => handleDelete(ins.id)}
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

                                    {/* Estado de Vencimiento / Alerta */}
                                    <div style={{ 
                                        borderRadius: '12px', 
                                        padding: '0.75rem 1rem', 
                                        marginBottom: '0.85rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.6rem',
                                        background: isExpired ? 'rgba(244, 63, 94, 0.12)' : isRenewalNoticeActive ? 'rgba(245, 158, 11, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                                        border: `1px solid ${isExpired ? 'rgba(244, 63, 94, 0.25)' : isRenewalNoticeActive ? 'rgba(245, 158, 11, 0.25)' : 'rgba(16, 185, 129, 0.25)'}`
                                    }}>
                                        {isExpired ? (
                                            <AlertTriangle size={18} style={{ color: '#f43f5e', flexShrink: 0 }} />
                                        ) : isRenewalNoticeActive ? (
                                            <Clock size={18} style={{ color: '#f59e0b', flexShrink: 0 }} />
                                        ) : (
                                            <CheckCircle size={18} style={{ color: '#10b981', flexShrink: 0 }} />
                                        )}
                                        <div>
                                            <span style={{ 
                                                fontSize: '0.65rem', 
                                                textTransform: 'uppercase', 
                                                fontWeight: 800, 
                                                display: 'block',
                                                color: isExpired ? '#f43f5e' : isRenewalNoticeActive ? '#f59e0b' : '#10b981'
                                            }}>
                                                {isExpired ? 'Póliza Vencida' : isRenewalNoticeActive ? 'Período de Renovación (Aviso a 60 días)' : 'Seguro en Vigor'}
                                            </span>
                                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#ffffff' }}>
                                                Vence el {new Date(ins.expirationDate).toLocaleDateString('es-ES')} ({isExpired ? 'Caducado' : `Quedan ${daysLeftExpiration} días`})
                                            </span>
                                        </div>
                                    </div>

                                    {/* Asistencia y Franquicia */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.75rem', borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '0.75rem' }}>
                                        <div>
                                            <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.65rem', fontWeight: 600 }}>Asistencia 24h</span>
                                            <span style={{ fontWeight: 600, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <Phone size={12} style={{ color: '#10b981' }} />
                                                {ins.contactPhone || 'No especificado'}
                                            </span>
                                        </div>
                                        <div>
                                            <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.65rem', fontWeight: 600 }}>Franquicia</span>
                                            <span style={{ fontWeight: 600, color: '#ffffff' }}>
                                                {ins.deductible !== undefined ? `${ins.deductible} €` : 'Sin franquicia'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Footer con Prima Anual y Vinculación */}
                                <div style={{ 
                                    background: 'rgba(0, 0, 0, 0.2)', 
                                    borderTop: '1px solid rgba(255, 255, 255, 0.06)', 
                                    padding: '0.6rem 0.85rem', 
                                    borderRadius: '10px',
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'space-between', 
                                    fontSize: '0.75rem' 
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)' }}>
                                        <DollarSign size={14} style={{ color: '#818cf8' }} />
                                        <span>Prima:</span>
                                        <strong style={{ color: '#ffffff', fontWeight: 700 }}>{ins.annualPremium} €/año</strong>
                                        <span style={{ fontSize: '0.65rem' }}>({ins.paymentFrequency})</span>
                                    </div>
                                    {linkedRec ? (
                                        <span style={{ fontSize: '0.65rem', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.25)', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                                            ✓ Gasto Fijo
                                        </span>
                                    ) : (
                                        <span style={{ fontSize: '0.65rem', background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-muted)', padding: '2px 6px', borderRadius: '4px' }}>
                                            Sin vínculo fijo
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {isFormOpen && (
                <InsuranceForm
                    insurance={selectedInsurance}
                    onClose={() => setIsFormOpen(false)}
                />
            )}
        </div>
    );
};

export default InsuranceList;
