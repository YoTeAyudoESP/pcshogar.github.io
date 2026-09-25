import React, { useState } from 'react';
import type { Insurance } from '../../types/finance';
import { useFinance } from '../../contexts/FinanceContext';
import InsuranceForm from './InsuranceForm';
import ModalPortal from '../common/ModalPortal';
import { 
    Shield, Plus, Phone, Calendar, DollarSign, Car, Home, Heart, Activity, 
    AlertTriangle, CheckCircle, Edit, Trash2, Clock, Link2, X, RefreshCw 
} from 'lucide-react';

const formatFrequencyEs = (freq?: string) => {
    switch (freq) {
        case 'yearly': return 'Anual';
        case 'monthly': return 'Mensual';
        case 'quarterly': return 'Trimestral';
        case 'semi-annually': return 'Semestral';
        default: return freq || 'Anual';
    }
};

const InsuranceList: React.FC = () => {
    const { insurances, deleteInsurance, mergeInsurances, recurringExpenses, vehicles } = useFinance();
    const [selectedInsurance, setSelectedInsurance] = useState<Insurance | undefined>(undefined);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);

    // Merge modal state
    const [targetInsuranceId, setTargetInsuranceId] = useState<string>('');
    const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([]);

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

    const handleOpenMergeModal = () => {
        if (insurances.length >= 2) {
            setTargetInsuranceId(insurances[0].id);
            setSelectedSourceIds([]);
            setIsMergeModalOpen(true);
        }
    };

    const handleToggleSourceId = (id: string) => {
        setSelectedSourceIds(prev => 
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    const handleConfirmMerge = async () => {
        if (!targetInsuranceId || selectedSourceIds.length === 0) return;
        await mergeInsurances(targetInsuranceId, selectedSourceIds);
        setIsMergeModalOpen(false);
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
                        Control unificado de pólizas, vehículos, hogar, cuotas fraccionadas y avisos de renovación.
                    </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    {insurances.length > 1 && (
                        <button
                            onClick={handleOpenMergeModal}
                            style={{
                                background: 'rgba(99, 102, 241, 0.15)',
                                color: '#a5b4fc',
                                border: '1px solid rgba(99, 102, 241, 0.3)',
                                padding: '0.65rem 1rem',
                                borderRadius: '12px',
                                fontWeight: 700,
                                fontSize: '0.85rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            <Link2 size={16} />
                            <span>Unificar Pólizas</span>
                        </button>
                    )}
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
                        const linkedIds = ins.linkedRecurringExpenseIds && ins.linkedRecurringExpenseIds.length > 0
                            ? ins.linkedRecurringExpenseIds
                            : (ins.recurringExpenseId ? [ins.recurringExpenseId] : []);
                        
                        const linkedRecs = recurringExpenses.filter(r => linkedIds.includes(r.id));
                        const linkedVehicle = vehicles.find(v => v.id === ins.vehicleId);

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
                                    borderLeft: `4px solid ${isExpired ? '#f43f5e' : isRenewalNoticeActive ? '#f59e0b' : ins.needsDateReview ? '#3b82f6' : '#10b981'}`,
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
                                                Compañía: <strong style={{ color: '#ffffff' }}>{ins.company || 'Sin especificar'}</strong>
                                                {ins.policyNumber && ` • Póliza: ${ins.policyNumber}`}
                                            </p>
                                            {linkedVehicle && (
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '4px', fontSize: '0.7rem', color: '#60a5fa', background: 'rgba(96, 165, 250, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                                                    <Car size={12} /> {linkedVehicle.name} ({linkedVehicle.licensePlate || linkedVehicle.brand})
                                                </span>
                                            )}
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

                                    {/* Ins. Date Review Warning if applicable */}
                                    {ins.needsDateReview && (
                                        <div style={{
                                            background: 'rgba(59, 130, 246, 0.12)',
                                            border: '1px solid rgba(59, 130, 246, 0.25)',
                                            borderRadius: '10px',
                                            padding: '0.5rem 0.75rem',
                                            marginBottom: '0.75rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem',
                                            fontSize: '0.75rem',
                                            color: '#93c5fd'
                                        }}>
                                            <Clock size={16} style={{ color: '#60a5fa', flexShrink: 0 }} />
                                            <span>
                                                <strong>Fecha estimada por gasto fijo.</strong> Por favor edita y confirma la fecha exacta de renovación.
                                            </span>
                                        </div>
                                    )}

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

                                {/* Desglose de Cuotas / Gastos Fijos Vinculados */}
                                {linkedRecs.length > 0 && (
                                    <div style={{
                                        background: 'rgba(15, 23, 42, 0.4)',
                                        border: '1px solid rgba(255, 255, 255, 0.06)',
                                        borderRadius: '10px',
                                        padding: '0.6rem 0.85rem',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '0.4rem'
                                    }}>
                                        <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#a5b4fc', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <RefreshCw size={12} /> Cuotas Fraccionadas Vinculadas ({linkedRecs.length})
                                        </span>
                                        {linkedRecs.map(rec => (
                                            <div key={rec.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '3px' }}>
                                                <span style={{ color: '#cbd5e1' }}>{rec.description}</span>
                                                <strong style={{ color: '#10b981' }}>{rec.amount} € <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>({formatFrequencyEs(rec.frequency)})</span></strong>
                                            </div>
                                        ))}
                                    </div>
                                )}

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
                                        <span style={{ fontSize: '0.65rem' }}>({formatFrequencyEs(ins.paymentFrequency)})</span>
                                    </div>
                                    {linkedRecs.length > 0 ? (
                                        <span style={{ fontSize: '0.65rem', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.25)', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                                            ✓ {linkedRecs.length} {linkedRecs.length === 1 ? 'Gasto Fijo' : 'Gastos Fijos'}
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

            {/* Modal para Unificar Pólizas Duplicadas */}
            {isMergeModalOpen && (
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
                        zIndex: 99999
                    }}>
                        <div className="glass-panel" style={{
                            background: '#1e293b',
                            border: '1px solid rgba(255, 255, 255, 0.12)',
                            borderRadius: '20px',
                            width: '100%',
                            maxWidth: '520px',
                            padding: '1.5rem',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#ffffff', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Link2 size={20} style={{ color: '#818cf8' }} /> Unificar Pólizas Duplicadas
                                </h3>
                                <button onClick={() => setIsMergeModalOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                    <X size={18} />
                                </button>
                            </div>

                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem', lineHeight: '1.4' }}>
                                Selecciona cuál será tu póliza principal y qué pólizas duplicadas quieres fusionar en ella. Se conservarán todos los gastos fijos vinculados sin alterar tus cálculos mensuales.
                            </p>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#a5b4fc', marginBottom: '4px' }}>
                                        Póliza Principal (a conservar):
                                    </label>
                                    <select
                                        value={targetInsuranceId}
                                        onChange={(e) => {
                                            setTargetInsuranceId(e.target.value);
                                            setSelectedSourceIds(prev => prev.filter(id => id !== e.target.value));
                                        }}
                                        style={{ width: '100%', padding: '0.65rem', background: '#0f172a', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', color: '#ffffff', fontSize: '0.85rem' }}
                                    >
                                        {insurances.map(ins => (
                                            <option key={ins.id} value={ins.id}>
                                                {ins.name} ({ins.company || 'Sin compañía'}) - {ins.annualPremium} €
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#a5b4fc', marginBottom: '6px' }}>
                                        Pólizas a fusionar y eliminar:
                                    </label>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '160px', overflowY: 'auto' }}>
                                        {insurances.filter(ins => ins.id !== targetInsuranceId).map(ins => {
                                            const isSelected = selectedSourceIds.includes(ins.id);
                                            return (
                                                <label 
                                                    key={ins.id}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '0.5rem',
                                                        fontSize: '0.8rem',
                                                        color: isSelected ? '#ffffff' : '#94a3b8',
                                                        background: isSelected ? 'rgba(244, 63, 94, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                                                        padding: '0.4rem 0.6rem',
                                                        borderRadius: '8px',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    <input 
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => handleToggleSourceId(ins.id)}
                                                    />
                                                    <span>{ins.name} ({ins.company || 'Sin comp'})</span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                                    <button
                                        onClick={() => setIsMergeModalOpen(false)}
                                        style={{ padding: '0.6rem 1rem', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#ffffff', cursor: 'pointer' }}
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        disabled={selectedSourceIds.length === 0}
                                        onClick={handleConfirmMerge}
                                        style={{
                                            padding: '0.6rem 1rem',
                                            borderRadius: '10px',
                                            background: selectedSourceIds.length === 0 ? 'rgba(99, 102, 241, 0.3)' : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                                            border: 'none',
                                            color: '#ffffff',
                                            fontWeight: 700,
                                            cursor: selectedSourceIds.length === 0 ? 'not-allowed' : 'pointer'
                                        }}
                                    >
                                        Unificar Pólizas
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </ModalPortal>
            )}
        </div>
    );
};

export default InsuranceList;
