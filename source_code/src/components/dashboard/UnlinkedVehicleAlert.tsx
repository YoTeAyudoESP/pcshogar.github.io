import React, { useState } from 'react';
import { useFinance } from '../../contexts/FinanceContext';
import { Car, ShieldCheck, X, Plus } from 'lucide-react';

interface UnlinkedVehicleAlertProps {
    onNavigateToVehicles: () => void;
}

const UnlinkedVehicleAlert: React.FC<UnlinkedVehicleAlertProps> = ({ onNavigateToVehicles }) => {
    const { insurances, vehicles } = useFinance();
    const [dismissed, setDismissed] = useState(() => {
        try {
            return localStorage.getItem('pcshogar_unlinked_vehicle_alert_dismissed') === 'true';
        } catch {
            return false;
        }
    });

    if (dismissed) return null;

    // Detectar seguros que sean de vehículo o cuyo nombre indique vehículo
    const vehicleInsurances = insurances.filter(ins => 
        ins.type === 'vehicle' || 
        !!ins.vehicleId || 
        ins.name.toLowerCase().includes('coche') || 
        ins.name.toLowerCase().includes('moto') || 
        ins.name.toLowerCase().includes('vehiculo') || 
        ins.name.toLowerCase().includes('vehículo') ||
        ins.name.toLowerCase().includes('auto')
    );

    if (vehicleInsurances.length === 0) return null;

    // Si existen seguros de vehículo y no hay vehículos o hay seguros sin vehículo asociado
    const hasUnlinkedVehicle = vehicles.length === 0 || vehicleInsurances.some(ins => !ins.vehicleId);

    if (!hasUnlinkedVehicle) return null;

    const handleDismiss = () => {
        setDismissed(true);
        try {
            localStorage.setItem('pcshogar_unlinked_vehicle_alert_dismissed', 'true');
        } catch (e) {
            console.error(e);
        }
    };

    const insuranceNames = vehicleInsurances.map(i => i.name).join(', ');

    return (
        <div style={{
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.12) 0%, rgba(99, 102, 241, 0.06) 100%)',
            border: '1px solid rgba(59, 130, 246, 0.25)',
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
                title="Descartar recomendación"
            >
                <X size={16} />
            </button>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem', flex: 1, minWidth: '280px' }}>
                <div style={{
                    background: 'rgba(59, 130, 246, 0.18)',
                    color: '#60a5fa',
                    padding: '0.75rem',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                }}>
                    <Car size={24} />
                </div>
                <div>
                    <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <ShieldCheck size={16} style={{ color: '#60a5fa' }} />
                        Seguro de vehículo detectado sin vehículo registrado
                    </h4>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#cbd5e1', lineHeight: '1.4' }}>
                        Hemos detectado que tienes seguro(s) de vehículo (<strong>{insuranceNames}</strong>), pero aún no has dado de alta tu vehículo en <strong>Mis Vehículos</strong>. Te aconsejamos registrarlo para llevar el control preventivo de revisiones por km o tiempo, ITV y neumáticos junto a tu seguro.
                    </p>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                <button
                    onClick={onNavigateToVehicles}
                    style={{
                        background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
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
                        boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
                    }}
                >
                    <Plus size={16} />
                    <span>+ Registrar Vehículo</span>
                </button>
            </div>
        </div>
    );
};

export default UnlinkedVehicleAlert;
