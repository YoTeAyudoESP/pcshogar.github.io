import React, { useState } from 'react';
import type { Vehicle } from '../../types/finance';
import { useFinance } from '../../contexts/FinanceContext';
import VehicleForm from './VehicleForm';
import { Car, Plus, Wrench, Gauge, Calendar, Shield, Trash2, Edit, AlertTriangle, CheckCircle } from 'lucide-react';

const VehicleList: React.FC = () => {
    const { vehicles, deleteVehicle, updateVehicle, insurances } = useFinance();
    const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | undefined>(undefined);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [updatingKmVehicleId, setUpdatingKmVehicleId] = useState<string | null>(null);
    const [newKmInput, setNewKmInput] = useState<number>(0);

    const handleEdit = (vehicle: Vehicle) => {
        setSelectedVehicle(vehicle);
        setIsFormOpen(true);
    };

    const handleAddNew = () => {
        setSelectedVehicle(undefined);
        setIsFormOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('¿Estás seguro de eliminar este vehículo?')) {
            await deleteVehicle(id);
        }
    };

    const handleQuickKmUpdate = async (vehicle: Vehicle) => {
        if (newKmInput < vehicle.currentKm) {
            alert('El nuevo kilometraje no puede ser inferior al actual.');
            return;
        }
        await updateVehicle({
            ...vehicle,
            currentKm: Number(newKmInput)
        });
        setUpdatingKmVehicleId(null);
    };

    const getFuelTypeName = (type: Vehicle['fuelType']) => {
        switch (type) {
            case 'gasoline': return 'Gasolina';
            case 'diesel': return 'Diésel';
            case 'hybrid': return 'Híbrido';
            case 'electric': return 'Eléctrico';
            case 'motorcycle': return 'Motocicleta';
            default: return type;
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
                        <Car size={22} style={{ color: '#818cf8' }} /> Mis Vehículos
                    </h2>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                        Control preventivo de mantenimientos, kilometraje, neumáticos y vinculación con seguros.
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
                    <span>Añadir Vehículo</span>
                </button>
            </div>

            {/* Lista o Estado Vacío */}
            {vehicles.length === 0 ? (
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
                        <Car size={36} />
                    </div>
                    <div>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#ffffff' }}>No hay vehículos registrados</h3>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '420px', margin: '0.5rem auto 0 auto', lineHeight: '1.5' }}>
                            Añade tu coche o moto con el botón superior para llevar el control de los km, próximos mantenimientos y fechas de ITV o seguro.
                        </p>
                    </div>
                </div>
            ) : (
                <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', 
                    gap: '1.25rem' 
                }}>
                    {vehicles.map((vh) => {
                        const linkedInsurance = insurances.find(i => i.id === vh.insuranceId);

                        // Cálculo Mantenimiento
                        const kmSinceLast = vh.currentKm - (vh.lastMaintenanceKm || 0);
                        const kmRemaining = (vh.maintenanceIntervalKm || 15000) - kmSinceLast;

                        const lastDate = vh.lastMaintenanceDate ? new Date(vh.lastMaintenanceDate) : new Date();
                        const nextDueDate = new Date(lastDate);
                        nextDueDate.setMonth(nextDueDate.getMonth() + (vh.maintenanceIntervalMonths || 12));
                        const daysRemaining = Math.ceil((nextDueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

                        const isKmUrgent = kmRemaining <= 1000;
                        const isTimeUrgent = daysRemaining <= 30;
                        const isMaintenanceOverdue = kmRemaining <= 0 || daysRemaining <= 0;

                        // Neumáticos
                        const tireKmUsed = vh.currentKm - (vh.tireInstallationKm || 0);
                        const tireKmLeft = (vh.tireEstimatedKm || 40000) - tireKmUsed;

                        return (
                            <div 
                                key={vh.id} 
                                className="glass-panel" 
                                style={{ 
                                    padding: '1.25rem', 
                                    borderRadius: '16px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                    borderLeft: `4px solid ${isMaintenanceOverdue ? '#f43f5e' : (isKmUrgent || isTimeUrgent) ? '#f59e0b' : '#6366f1'}`,
                                    background: 'rgba(255, 255, 255, 0.02)',
                                    gap: '1rem'
                                }}
                            >
                                <div>
                                    {/* Cabecera Tarjeta */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                                <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#ffffff' }}>{vh.name}</h4>
                                                {vh.licensePlate && (
                                                    <span style={{ 
                                                        background: 'rgba(255, 255, 255, 0.08)', 
                                                        border: '1px solid rgba(255, 255, 255, 0.15)',
                                                        color: '#e2e8f0', 
                                                        fontSize: '0.7rem', 
                                                        fontFamily: 'monospace', 
                                                        fontWeight: 700, 
                                                        padding: '2px 6px', 
                                                        borderRadius: '6px' 
                                                    }}>
                                                        {vh.licensePlate}
                                                    </span>
                                                )}
                                            </div>
                                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                                                {vh.brand} {vh.model} ({vh.year}) • <span>{getFuelTypeName(vh.fuelType)}</span>
                                            </p>
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.3rem' }}>
                                            <button
                                                onClick={() => handleEdit(vh)}
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
                                                onClick={() => handleDelete(vh.id)}
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

                                    {/* Kilometraje Actual y Acción rápida */}
                                    <div style={{ 
                                        background: 'rgba(99, 102, 241, 0.08)', 
                                        border: '1px solid rgba(99, 102, 241, 0.18)',
                                        borderRadius: '12px', 
                                        padding: '0.75rem 1rem', 
                                        marginBottom: '1rem',
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        justifyContent: 'space-between'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                            <Gauge size={20} style={{ color: '#818cf8' }} />
                                            <div>
                                                <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 700, color: 'var(--text-muted)', display: 'block' }}>Kilometraje Actual</span>
                                                <span style={{ fontSize: '1rem', fontWeight: 800, color: '#ffffff' }}>
                                                    {vh.currentKm.toLocaleString('es-ES')} km
                                                </span>
                                            </div>
                                        </div>
                                        {updatingKmVehicleId === vh.id ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                <input
                                                    type="number"
                                                    style={{ 
                                                        width: '90px', 
                                                        padding: '4px 8px', 
                                                        fontSize: '0.75rem', 
                                                        background: 'rgba(0,0,0,0.3)', 
                                                        border: '1px solid #6366f1', 
                                                        borderRadius: '6px',
                                                        color: 'white'
                                                    }}
                                                    value={newKmInput}
                                                    onChange={(e) => setNewKmInput(Number(e.target.value))}
                                                />
                                                <button
                                                    onClick={() => handleQuickKmUpdate(vh)}
                                                    style={{ 
                                                        background: '#6366f1', 
                                                        color: 'white', 
                                                        border: 'none', 
                                                        fontSize: '0.7rem', 
                                                        padding: '4px 8px', 
                                                        borderRadius: '6px', 
                                                        fontWeight: 700,
                                                        cursor: 'pointer' 
                                                    }}
                                                >
                                                    OK
                                                </button>
                                                <button
                                                    onClick={() => setUpdatingKmVehicleId(null)}
                                                    style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '0.8rem', cursor: 'pointer' }}
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => {
                                                    setUpdatingKmVehicleId(vh.id);
                                                    setNewKmInput(vh.currentKm);
                                                }}
                                                style={{ 
                                                    fontSize: '0.75rem', 
                                                    color: '#818cf8', 
                                                    background: 'rgba(99, 102, 241, 0.12)', 
                                                    border: '1px solid rgba(99, 102, 241, 0.25)', 
                                                    fontWeight: 600, 
                                                    padding: '4px 10px', 
                                                    borderRadius: '8px', 
                                                    cursor: 'pointer' 
                                                }}
                                            >
                                                Actualizar km
                                            </button>
                                        )}
                                    </div>

                                    {/* Mantenimiento */}
                                    <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '0.75rem', marginBottom: '0.75rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.4rem' }}>
                                            <span style={{ fontWeight: 700, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                <Wrench size={14} style={{ color: 'var(--text-muted)' }} /> Próximo Mantenimiento
                                            </span>
                                            {isMaintenanceOverdue ? (
                                                <span style={{ background: 'rgba(244, 63, 94, 0.15)', color: '#f43f5e', border: '1px solid rgba(244, 63, 94, 0.3)', fontSize: '0.65rem', fontWeight: 700, padding: '2px 6px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                                    <AlertTriangle size={12} /> Pendiente
                                                </span>
                                            ) : isKmUrgent || isTimeUrgent ? (
                                                <span style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.3)', fontSize: '0.65rem', fontWeight: 700, padding: '2px 6px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                                    <AlertTriangle size={12} /> Próximo pronto
                                                </span>
                                            ) : (
                                                <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)', fontSize: '0.65rem', fontWeight: 700, padding: '2px 6px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                                    <CheckCircle size={12} /> En regla
                                                </span>
                                            )}
                                        </div>
                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                                            Faltan <strong style={{ color: kmRemaining < 1000 ? '#f43f5e' : '#ffffff' }}>{kmRemaining.toLocaleString('es-ES')} km</strong> o{' '}
                                            <strong style={{ color: daysRemaining < 30 ? '#f43f5e' : '#ffffff' }}>{daysRemaining} días</strong> (lo que ocurra antes).
                                        </p>
                                    </div>

                                    {/* Neumáticos e ITV */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.75rem', borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '0.75rem' }}>
                                        <div>
                                            <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.65rem', fontWeight: 600 }}>Neumáticos</span>
                                            <span style={{ fontWeight: 600, color: '#ffffff' }}>
                                                {tireKmLeft > 0 ? `Quedan ~${tireKmLeft.toLocaleString('es-ES')} km` : 'Revisar desgaste'}
                                            </span>
                                        </div>
                                        <div>
                                            <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.65rem', fontWeight: 600 }}>Próxima ITV</span>
                                            <span style={{ fontWeight: 600, color: '#ffffff' }}>
                                                {vh.nextItvDate ? new Date(vh.nextItvDate).toLocaleDateString('es-ES') : 'Sin fecha'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Footer con Seguro Vinculado */}
                                <div style={{ 
                                    background: 'rgba(0, 0, 0, 0.2)', 
                                    borderTop: '1px solid rgba(255, 255, 255, 0.06)', 
                                    padding: '0.6rem 0.85rem', 
                                    borderRadius: '10px',
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'space-between', 
                                    fontSize: '0.75rem', 
                                    color: 'var(--text-muted)' 
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                        <Shield size={14} style={{ color: '#818cf8' }} />
                                        <span>Seguro:</span>
                                        <strong style={{ color: '#ffffff', fontWeight: 600 }}>
                                            {linkedInsurance ? linkedInsurance.name : 'No vinculado'}
                                        </strong>
                                    </div>
                                    {linkedInsurance && (
                                        <span style={{ fontSize: '0.65rem', background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                                            {linkedInsurance.company}
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {isFormOpen && (
                <VehicleForm
                    vehicle={selectedVehicle}
                    onClose={() => setIsFormOpen(false)}
                />
            )}
        </div>
    );
};

export default VehicleList;
