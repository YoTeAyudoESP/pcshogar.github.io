import React, { useState } from 'react';
import type { Vehicle } from '../../types/finance';
import { useFinance } from '../../contexts/FinanceContext';
import VehicleForm from './VehicleForm';
import { Car, Plus, Wrench, Gauge, Calendar, Shield, Trash2, Edit, AlertTriangle, CheckCircle, Info } from 'lucide-react';

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
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                <div>
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <Car className="w-6 h-6 text-indigo-600" /> Mis Vehículos
                    </h2>
                    <p className="text-xs text-gray-500 mt-1">
                        Control preventivo de mantenimientos, kilometraje, neumáticos y vinculación con seguros.
                    </p>
                </div>
                <button
                    onClick={handleAddNew}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg flex items-center space-x-2 transition shadow-sm"
                >
                    <Plus className="w-4 h-4" />
                    <span>Añadir Vehículo</span>
                </button>
            </div>

            {vehicles.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
                    <Car className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <h3 className="text-base font-semibold text-gray-700">No hay vehículos registrados</h3>
                    <p className="text-xs text-gray-500 max-w-md mx-auto mt-1 mb-4">
                        Añade tu coche o moto para llevar el control de los km, próximos mantenimientos y fechas de ITV o seguro.
                    </p>
                    <button
                        onClick={handleAddNew}
                        className="inline-flex items-center space-x-2 text-sm font-medium text-indigo-600 bg-indigo-50 px-4 py-2 rounded-lg hover:bg-indigo-100 transition"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Registrar Primer Vehículo</span>
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                            <div key={vh.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col justify-between">
                                <div className="p-5">
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-lg text-gray-900">{vh.name}</span>
                                                {vh.licensePlate && (
                                                    <span className="bg-gray-100 text-gray-700 text-xs font-mono font-bold px-2 py-0.5 rounded border border-gray-300">
                                                        {vh.licensePlate}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-500 mt-0.5">
                                                {vh.brand} {vh.model} ({vh.year}) • <span className="capitalize">{getFuelTypeName(vh.fuelType)}</span>
                                            </p>
                                        </div>
                                        <div className="flex items-center space-x-1">
                                            <button
                                                onClick={() => handleEdit(vh)}
                                                className="p-1.5 text-gray-400 hover:text-indigo-600 rounded-lg hover:bg-gray-50"
                                                title="Editar"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(vh.id)}
                                                className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg hover:bg-gray-50"
                                                title="Eliminar"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Kilometraje Actual y Acción rápida */}
                                    <div className="bg-indigo-50/60 rounded-lg p-3 mb-4 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Gauge className="w-5 h-5 text-indigo-600" />
                                            <div>
                                                <span className="text-[10px] text-gray-500 uppercase font-semibold block">Kilometraje Actual</span>
                                                <span className="text-base font-extrabold text-indigo-950">
                                                    {vh.currentKm.toLocaleString('es-ES')} km
                                                </span>
                                            </div>
                                        </div>
                                        {updatingKmVehicleId === vh.id ? (
                                            <div className="flex items-center gap-1.5">
                                                <input
                                                    type="number"
                                                    className="w-24 px-2 py-1 text-xs border border-indigo-300 rounded"
                                                    value={newKmInput}
                                                    onChange={(e) => setNewKmInput(Number(e.target.value))}
                                                />
                                                <button
                                                    onClick={() => handleQuickKmUpdate(vh)}
                                                    className="bg-indigo-600 text-white text-xs px-2 py-1 rounded font-medium"
                                                >
                                                    OK
                                                </button>
                                                <button
                                                    onClick={() => setUpdatingKmVehicleId(null)}
                                                    className="text-gray-400 text-xs hover:text-gray-600"
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
                                                className="text-xs text-indigo-700 bg-white hover:bg-indigo-100 font-medium px-2.5 py-1 rounded border border-indigo-200 transition"
                                            >
                                                Actualizar km
                                            </button>
                                        )}
                                    </div>

                                    {/* Mantenimiento */}
                                    <div className="border-t border-gray-100 pt-3 mb-3">
                                        <div className="flex items-center justify-between text-xs mb-1.5">
                                            <span className="font-semibold text-gray-700 flex items-center gap-1">
                                                <Wrench className="w-3.5 h-3.5 text-gray-500" /> Próximo Mantenimiento
                                            </span>
                                            {isMaintenanceOverdue ? (
                                                <span className="bg-rose-100 text-rose-700 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                                                    <AlertTriangle className="w-3 h-3" /> Mantenimiento pendiente
                                                </span>
                                            ) : isKmUrgent || isTimeUrgent ? (
                                                <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                                                    <AlertTriangle className="w-3 h-3" /> Próximo pronto
                                                </span>
                                            ) : (
                                                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-semibold px-2 py-0.5 rounded flex items-center gap-1">
                                                    <CheckCircle className="w-3 h-3" /> En regla
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-600">
                                            Faltan <strong className={kmRemaining < 1000 ? 'text-rose-600' : 'text-gray-900'}>{kmRemaining.toLocaleString('es-ES')} km</strong> o{' '}
                                            <strong className={daysRemaining < 30 ? 'text-rose-600' : 'text-gray-900'}>{daysRemaining} días</strong> (lo que ocurra antes).
                                        </p>
                                    </div>

                                    {/* Neumáticos e ITV */}
                                    <div className="grid grid-cols-2 gap-2 text-xs border-t border-gray-100 pt-3">
                                        <div>
                                            <span className="text-gray-400 block text-[10px] font-medium">Neumáticos</span>
                                            <span className="font-medium text-gray-800">
                                                {tireKmLeft > 0 ? `Quedan ~${tireKmLeft.toLocaleString('es-ES')} km` : 'Revisar desgaste'}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-gray-400 block text-[10px] font-medium">Próxima ITV</span>
                                            <span className="font-medium text-gray-800">
                                                {vh.nextItvDate ? new Date(vh.nextItvDate).toLocaleDateString('es-ES') : 'Sin fecha'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Footer con Seguro Vinculado */}
                                <div className="bg-gray-50 border-t border-gray-100 px-5 py-2.5 flex items-center justify-between text-xs text-gray-600">
                                    <div className="flex items-center gap-1.5">
                                        <Shield className="w-4 h-4 text-indigo-500" />
                                        <span>Seguro:</span>
                                        <strong className="text-gray-800 font-medium">
                                            {linkedInsurance ? linkedInsurance.name : 'No vinculado'}
                                        </strong>
                                    </div>
                                    {linkedInsurance && (
                                        <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-medium">
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
