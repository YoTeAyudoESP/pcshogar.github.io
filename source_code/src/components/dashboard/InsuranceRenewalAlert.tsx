import React, { useState } from 'react';
import { useFinance } from '../../contexts/FinanceContext';
import { Shield, Clock, X, ArrowRight } from 'lucide-react';

interface InsuranceRenewalAlertProps {
    onNavigateToInsurances?: () => void;
}

const InsuranceRenewalAlert: React.FC<InsuranceRenewalAlertProps> = ({ onNavigateToInsurances }) => {
    const { insurances } = useFinance();
    const [dismissedIds, setDismissedIds] = useState<string[]>([]);

    const now = Date.now();
    // Encuentra seguros que vencen en los próximos 60 días
    const upcomingRenewals = insurances.filter(ins => {
        if (dismissedIds.includes(ins.id)) return false;
        const daysLeft = Math.ceil((ins.expirationDate - now) / (1000 * 60 * 60 * 24));
        return daysLeft <= 60 && daysLeft >= -15; // Vence en 60 días o venció hace menos de 15 días
    });

    if (upcomingRenewals.length === 0) return null;

    const targetIns = upcomingRenewals[0];
    const daysLeft = Math.ceil((targetIns.expirationDate - now) / (1000 * 60 * 60 * 24));

    const handleDismiss = (id: string) => {
        setDismissedIds(prev => [...prev, id]);
    };

    return (
        <div 
            className="glass-panel" 
            style={{ 
                padding: '1rem 1.25rem', 
                borderRadius: '16px', 
                marginBottom: '1.25rem', 
                background: 'rgba(245, 158, 11, 0.08)',
                border: '1px solid rgba(245, 158, 11, 0.25)',
                borderLeft: '4px solid #f59e0b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.75rem'
            }}
        >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', flex: 1, minWidth: '260px' }}>
                <div style={{ 
                    background: 'rgba(245, 158, 11, 0.15)', 
                    border: '1px solid rgba(245, 158, 11, 0.3)', 
                    padding: '0.5rem', 
                    borderRadius: '10px', 
                    color: '#f59e0b', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    flexShrink: 0
                }}>
                    <Shield size={20} />
                </div>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#ffffff' }}>
                            Aviso de Renovación de Seguro ({targetIns.name})
                        </span>
                        <span style={{ 
                            fontSize: '0.65rem', 
                            background: daysLeft <= 0 ? 'rgba(244, 63, 94, 0.2)' : 'rgba(245, 158, 11, 0.2)', 
                            color: daysLeft <= 0 ? '#f43f5e' : '#f59e0b', 
                            border: daysLeft <= 0 ? '1px solid rgba(244, 63, 94, 0.3)' : '1px solid rgba(245, 158, 11, 0.3)',
                            fontWeight: 700, 
                            padding: '2px 8px', 
                            borderRadius: '6px' 
                        }}>
                            {daysLeft <= 0 ? 'Vencido' : `Vence en ${daysLeft} días`}
                        </span>
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '4px 0 0 0', lineHeight: '1.4' }}>
                        Tu póliza con <strong style={{ color: '#ffffff' }}>{targetIns.company}</strong> vence el {new Date(targetIns.expirationDate).toLocaleDateString('es-ES')}. Revisa el precio de renovación antes de que se autorrenueve automáticamente.
                    </p>
                </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {onNavigateToInsurances && (
                    <button
                        onClick={onNavigateToInsurances}
                        style={{
                            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                            color: 'white',
                            border: 'none',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            padding: '0.5rem 0.9rem',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            boxShadow: '0 4px 12px rgba(245, 158, 11, 0.25)'
                        }}
                    >
                        <span>Ver Seguros</span>
                        <ArrowRight size={14} />
                    </button>
                )}
                <button
                    onClick={() => handleDismiss(targetIns.id)}
                    style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: 'var(--text-muted)',
                        padding: '0.5rem',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                    title="Descartar por ahora"
                >
                    <X size={16} />
                </button>
            </div>
        </div>
    );
};

export default InsuranceRenewalAlert;
