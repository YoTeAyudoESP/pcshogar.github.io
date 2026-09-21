import React, { useState } from 'react';
import type { Vehicle } from '../../types/finance';
import { useFinance } from '../../contexts/FinanceContext';
import { Save, X, Car, Info, Calendar, Gauge, Shield, Wrench } from 'lucide-react';
import ModalPortal from '../common/ModalPortal';

interface VehicleFormProps {
    vehicle?: Vehicle;
    onClose: () => void;
}

const VehicleForm: React.FC<VehicleFormProps> = ({ vehicle, onClose }) => {
    const { addVehicle, updateVehicle, insurances } = useFinance();

    const [name, setName] = useState(vehicle?.name || '');
    const [brand, setBrand] = useState(vehicle?.brand || '');
    const [model, setModel] = useState(vehicle?.model || '');
    const [year, setYear] = useState<number>(vehicle?.year || new Date().getFullYear());
    const [licensePlate, setLicensePlate] = useState(vehicle?.licensePlate || '');
    const [fuelType, setFuelType] = useState<Vehicle['fuelType']>(vehicle?.fuelType || 'gasoline');
    const [currentKm, setCurrentKm] = useState<number>(vehicle?.currentKm || 0);
    
    // Mantenimiento
    const [lastMaintenanceKm, setLastMaintenanceKm] = useState<number>(vehicle?.lastMaintenanceKm || 0);
    const [lastMaintenanceDate, setLastMaintenanceDate] = useState<string>(
        vehicle?.lastMaintenanceDate ? new Date(vehicle.lastMaintenanceDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
    );
    const [maintenanceIntervalKm, setMaintenanceIntervalKm] = useState<number>(vehicle?.maintenanceIntervalKm || 15000);
    const [maintenanceIntervalMonths, setMaintenanceIntervalMonths] = useState<number>(vehicle?.maintenanceIntervalMonths || 12);

    // Neumáticos
    const [tireBrand, setTireBrand] = useState(vehicle?.tireBrand || '');
    const [tireModel, setTireModel] = useState(vehicle?.tireModel || '');
    const [tireInstallationKm, setTireInstallationKm] = useState<number>(vehicle?.tireInstallationKm || 0);
    const [tireEstimatedKm, setTireEstimatedKm] = useState<number>(vehicle?.tireEstimatedKm || 40000);

    // ITV y Seguro
    const [nextItvDate, setNextItvDate] = useState<string>(
        vehicle?.nextItvDate ? new Date(vehicle.nextItvDate).toISOString().split('T')[0] : ''
    );
    const [insuranceId, setInsuranceId] = useState(vehicle?.insuranceId || '');
    const [notes, setNotes] = useState(vehicle?.notes || '');

    const applyRecommendedPresets = () => {
        if (fuelType === 'motorcycle') {
            setMaintenanceIntervalKm(6000);
            setMaintenanceIntervalMonths(12);
            setTireEstimatedKm(15000);
        } else if (fuelType === 'electric') {
            setMaintenanceIntervalKm(25000);
            setMaintenanceIntervalMonths(24);
            setTireEstimatedKm(35000);
        } else if (fuelType === 'hybrid') {
            setMaintenanceIntervalKm(15000);
            setMaintenanceIntervalMonths(12);
            setTireEstimatedKm(40000);
        } else {
            // Gasolina / Diésel estándar
            setMaintenanceIntervalKm(15000);
            setMaintenanceIntervalMonths(12);
            setTireEstimatedKm(40000);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        const vehicleData = {
            name: name.trim(),
            brand: brand.trim(),
            model: model.trim(),
            year: Number(year) || new Date().getFullYear(),
            licensePlate: licensePlate.trim().toUpperCase(),
            fuelType,
            currentKm: Number(currentKm) || 0,
            lastMaintenanceKm: Number(lastMaintenanceKm) || 0,
            lastMaintenanceDate: lastMaintenanceDate ? new Date(lastMaintenanceDate).getTime() : Date.now(),
            maintenanceIntervalKm: Number(maintenanceIntervalKm) || 15000,
            maintenanceIntervalMonths: Number(maintenanceIntervalMonths) || 12,
            tireBrand: tireBrand.trim(),
            tireModel: tireModel.trim(),
            tireInstallationKm: Number(tireInstallationKm) || 0,
            tireEstimatedKm: Number(tireEstimatedKm) || 40000,
            nextItvDate: nextItvDate ? new Date(nextItvDate).getTime() : undefined,
            insuranceId: insuranceId || undefined,
            notes: notes.trim()
        };

        if (vehicle) {
            await updateVehicle({
                ...vehicle,
                ...vehicleData
            });
        } else {
            await addVehicle(vehicleData);
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

    const sectionTitleStyle: React.CSSProperties = {
        fontSize: '0.8rem',
        fontWeight: 800,
        color: '#818cf8',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        marginBottom: '0.85rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.4rem'
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
                            <Car size={22} style={{ color: '#818cf8' }} />
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                                {vehicle ? 'Editar Vehículo' : 'Nuevo Vehículo'}
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
                        {/* Sección 1: Datos Principales */}
                        <div>
                            <span style={sectionTitleStyle}>
                                <Car size={16} /> Datos Principales del Vehículo
                            </span>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.85rem' }}>
                                <div>
                                    <label style={labelStyle}>Nombre / Identificador *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Ej. Coche Principal, Moto Trabajo"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        style={inputStyle}
                                    />
                                </div>
                                <div>
                                    <label style={labelStyle}>Matrícula</label>
                                    <input
                                        type="text"
                                        placeholder="Ej. 1234ABC"
                                        value={licensePlate}
                                        onChange={(e) => setLicensePlate(e.target.value)}
                                        style={{ ...inputStyle, textTransform: 'uppercase' }}
                                    />
                                </div>
                                <div>
                                    <label style={labelStyle}>Marca</label>
                                    <input
                                        type="text"
                                        placeholder="Ej. Seat, Toyota, Yamaha"
                                        value={brand}
                                        onChange={(e) => setBrand(e.target.value)}
                                        style={inputStyle}
                                    />
                                </div>
                                <div>
                                    <label style={labelStyle}>Modelo</label>
                                    <input
                                        type="text"
                                        placeholder="Ej. León 1.6 TDI, MT-07"
                                        value={model}
                                        onChange={(e) => setModel(e.target.value)}
                                        style={inputStyle}
                                    />
                                </div>
                                <div>
                                    <label style={labelStyle}>Año de Matriculación</label>
                                    <input
                                        type="number"
                                        min="1950"
                                        max={new Date().getFullYear() + 1}
                                        value={year}
                                        onChange={(e) => setYear(Number(e.target.value))}
                                        style={inputStyle}
                                    />
                                </div>
                                <div>
                                    <label style={labelStyle}>Tipo de Energía / Motor</label>
                                    <select
                                        value={fuelType}
                                        onChange={(e) => setFuelType(e.target.value as any)}
                                        style={{ ...inputStyle, color: '#ffffff', background: '#0f172a' }}
                                    >
                                        <option value="gasoline">Gasolina</option>
                                        <option value="diesel">Diésel</option>
                                        <option value="hybrid">Híbrido</option>
                                        <option value="electric">Eléctrico</option>
                                        <option value="motorcycle">Motocicleta / Ciclomotor</option>
                                    </select>
                                </div>
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <Gauge size={14} style={{ color: '#818cf8' }} /> Kilometraje Actual del Vehículo (km)
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={currentKm}
                                        onChange={(e) => setCurrentKm(Number(e.target.value))}
                                        style={{ ...inputStyle, fontSize: '1rem', fontWeight: 800, color: '#818cf8', borderColor: 'rgba(99, 102, 241, 0.4)' }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Preset recomendado */}
                        <div style={{
                            background: 'rgba(99, 102, 241, 0.08)',
                            border: '1px solid rgba(99, 102, 241, 0.2)',
                            borderRadius: '12px',
                            padding: '0.85rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '0.75rem'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.75rem', color: '#e2e8f0', flex: 1 }}>
                                <Info size={16} style={{ color: '#818cf8', marginTop: '2px', flexShrink: 0 }} />
                                <div>
                                    <strong style={{ color: '#ffffff', display: 'block' }}>Sugerencia inteligente:</strong>
                                    Aplica automáticamente intervalos habituales del sector para este tipo de vehículo.
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={applyRecommendedPresets}
                                style={{
                                    background: '#6366f1',
                                    color: 'white',
                                    border: 'none',
                                    padding: '0.4rem 0.85rem',
                                    borderRadius: '8px',
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.3rem'
                                }}
                            >
                                ⚡ Usar recomendado
                            </button>
                        </div>

                        {/* Nota sutil */}
                        <p style={{
                            fontSize: '0.7rem',
                            color: 'var(--text-muted)',
                            background: 'rgba(255, 255, 255, 0.02)',
                            padding: '0.6rem 0.85rem',
                            borderRadius: '8px',
                            border: '1px solid rgba(255, 255, 255, 0.05)',
                            margin: 0,
                            lineHeight: '1.4'
                        }}>
                            ℹ️ <strong>Nota informativa:</strong> Los valores sugeridos son estimaciones orientativas del sector automotriz. Le aconsejamos verificar siempre el manual del fabricante de su vehículo o consultar con su taller para ajustar los parámetros a la realidad de su modelo específico.
                        </p>

                        {/* Sección 2: Mantenimiento */}
                        <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '1rem' }}>
                            <span style={sectionTitleStyle}>
                                <Wrench size={16} /> Mantenimientos y Revisiones
                            </span>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.85rem' }}>
                                <div>
                                    <label style={labelStyle}>Km en Último Mantenimiento</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={lastMaintenanceKm}
                                        onChange={(e) => setLastMaintenanceKm(Number(e.target.value))}
                                        style={inputStyle}
                                    />
                                </div>
                                <div>
                                    <label style={labelStyle}>Fecha Último Mantenimiento</label>
                                    <input
                                        type="date"
                                        value={lastMaintenanceDate}
                                        onChange={(e) => setLastMaintenanceDate(e.target.value)}
                                        style={inputStyle}
                                    />
                                </div>
                                <div>
                                    <label style={labelStyle}>Intervalo por Distancia (km)</label>
                                    <input
                                        type="number"
                                        min="1000"
                                        step="500"
                                        value={maintenanceIntervalKm}
                                        onChange={(e) => setMaintenanceIntervalKm(Number(e.target.value))}
                                        style={inputStyle}
                                    />
                                </div>
                                <div>
                                    <label style={labelStyle}>Intervalo por Tiempo (Meses)</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="60"
                                        value={maintenanceIntervalMonths}
                                        onChange={(e) => setMaintenanceIntervalMonths(Number(e.target.value))}
                                        style={inputStyle}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Sección 3: Neumáticos e ITV */}
                        <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '1rem' }}>
                            <span style={sectionTitleStyle}>
                                <Gauge size={16} /> Neumáticos, ITV y Seguro
                            </span>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.85rem' }}>
                                <div>
                                    <label style={labelStyle}>Marca Neumáticos</label>
                                    <input
                                        type="text"
                                        placeholder="Ej. Michelin, Continental"
                                        value={tireBrand}
                                        onChange={(e) => setTireBrand(e.target.value)}
                                        style={inputStyle}
                                    />
                                </div>
                                <div>
                                    <label style={labelStyle}>Modelo Neumáticos</label>
                                    <input
                                        type="text"
                                        placeholder="Ej. Primacy 4"
                                        value={tireModel}
                                        onChange={(e) => setTireModel(e.target.value)}
                                        style={inputStyle}
                                    />
                                </div>
                                <div>
                                    <label style={labelStyle}>Km al Montar Neumáticos</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={tireInstallationKm}
                                        onChange={(e) => setTireInstallationKm(Number(e.target.value))}
                                        style={inputStyle}
                                    />
                                </div>
                                <div>
                                    <label style={labelStyle}>Duración Estimada (km)</label>
                                    <input
                                        type="number"
                                        min="5000"
                                        step="1000"
                                        value={tireEstimatedKm}
                                        onChange={(e) => setTireEstimatedKm(Number(e.target.value))}
                                        style={inputStyle}
                                    />
                                </div>
                                <div>
                                    <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <Calendar size={14} style={{ color: '#818cf8' }} /> Próxima ITV
                                    </label>
                                    <input
                                        type="date"
                                        value={nextItvDate}
                                        onChange={(e) => setNextItvDate(e.target.value)}
                                        style={inputStyle}
                                    />
                                </div>
                                <div>
                                    <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <Shield size={14} style={{ color: '#818cf8' }} /> Seguro Vinculado
                                    </label>
                                    <select
                                        value={insuranceId}
                                        onChange={(e) => setInsuranceId(e.target.value)}
                                        style={{ ...inputStyle, color: '#ffffff', background: '#0f172a' }}
                                    >
                                        <option value="">-- Sin seguro vinculado --</option>
                                        {insurances.map(ins => (
                                            <option key={ins.id} value={ins.id}>
                                                {ins.name} ({ins.company})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Observaciones */}
                        <div>
                            <label style={labelStyle}>Notas / Observaciones</label>
                            <textarea
                                rows={2}
                                placeholder="Ej. Neumáticos 205/55 R16..."
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                style={{ ...inputStyle, resize: 'vertical' }}
                            />
                        </div>

                        {/* Botones de acción */}
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
                                    background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                                    color: 'white',
                                    fontSize: '0.85rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.4rem',
                                    boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)'
                                }}
                            >
                                <Save size={16} />
                                <span>Guardar Vehículo</span>
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </ModalPortal>
    );
};

export default VehicleForm;
