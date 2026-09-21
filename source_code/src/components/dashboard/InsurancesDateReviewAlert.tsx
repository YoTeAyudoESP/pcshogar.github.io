import React, { useState } from 'react';
import { useFinance } from '../../contexts/FinanceContext';
import { ShieldCheck, Calendar, X, ExternalLink } from 'lucide-react';

interface InsurancesDateReviewAlertProps {
    onNavigateToInsurances: () => void;
}

const InsurancesDateReviewAlert: React.FC<InsurancesDateReviewAlertProps> = ({ onNavigateToInsurances }) => {
    const { insurances } = useFinance();
    const [dismissed, setDismissed] = useState(() => {
        try {
            return localStorage.getItem('pcshogar_date_review_alert_dismissed') === 'true';
        } catch {
            return false;
        }
    });

    if (dismissed) return null;

    const pendingReviewInsurances = insurances.filter(i => i.needsDateReview === true);

    if (pendingReviewInsurances.length === 0) return null;

    const handleDismiss = () => {
        setDismissed(true);
        try {
            localStorage.setItem('pcshogar_date_review_alert_dismissed', 'true');
        } catch (e) {
            console.error(e);
        }
    };

    const insuranceNames = pendingReviewInsurances.map(i => i.name).join(', ');

    return (
        <div style={{
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(217, 119, 6, 0.06) 100%)',
            border: '1px solid rgba(245, 158, 11, 0.25)',
            borderRadius: '16px',
            padding: '1.25rem',
            marginBottom: '1.5rem',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)'
        }}>
            <button
                onClick={handleDismiss}
                style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    background: 'transparent',
                    border: 'none',
                    color: 'rgba(255, 255, 255, 0.4)',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center'
                }}
                title="Descartar aviso"
            >
                <X size={16} />
            </button>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem', flex: 1, minWidth: '280px' }}>
                <div style={{
                    background: 'rgba(245, 158, 11, 0.18)',
                    color: '#f59e0b',
                    padding: '0.75rem',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                }}>
                    <Calendar size={24} />
                </div>
                <div>
                    <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <ShieldCheck size={16} style={{ color: '#f59e0b' }} />
                        Revisa la fecha de vencimiento de tus seguros
                    </h4>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#cbd5e1', lineHeight: '1.4' }}>
                        Se han detectado seguros migrados automáticamente (<strong>{insuranceNames}</strong>). Te aconsejamos comprobar la fecha de vencimiento real de tu póliza para que los avisos a 60 días te lleguen en tu fecha exacta.
                    </p>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                <button
                    onClick={onNavigateToInsurances}
                    style={{
                        background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                        color: 'white',
                        border: 'none',
                        padding: '0.65rem 1.15rem',
                        borderRadius: '10px',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)'
                    }}
                >
                    <ExternalLink size={15} />
                    <span>Revisar Fechas</span>
                </button>
            </div>
        </div>
    );
};

export default InsurancesDateReviewAlert;
