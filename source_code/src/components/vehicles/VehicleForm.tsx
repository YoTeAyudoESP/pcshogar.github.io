import React, { useState } from 'react';
import type { Vehicle, Insurance } from '../../types/finance';
import { useFinance } from '../../contexts/FinanceContext';
import { Save, X, Car, Info, Calendar, Gauge, Shield, Wrench } from 'lucide-react';

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

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 my-8 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center pb-4 border-b border-gray-100 mb-4">
                    <div className="flex items-center space-x-2">
                        <Car className="w-6 h-6 text-indigo-600" />
                        <h2 className="text-xl font-bold text-gray-800">
                            {vehicle ? 'Editar Vehículo' : 'Nuevo Vehículo'}
                        </h2>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg text-gray-500">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Sección 1: Datos Principales */}
                    <div>
                        <h3 className="text-sm font-semibold text-indigo-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                            <Car className="w-4 h-4" /> Datos Principales del Vehículo
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Nombre / Identificador *</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Ej. Coche Principal, Moto Trabajo"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Matrícula</label>
                                <input
                                    type="text"
                                    placeholder="Ej. 1234ABC"
                                    value={licensePlate}
                                    onChange={(e) => setLicensePlate(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm uppercase"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Marca</label>
                                <input
                                    type="text"
                                    placeholder="Ej. Seat, Toyota, Yamaha"
                                    value={brand}
                                    onChange={(e) => setBrand(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Modelo</label>
                                <input
                                    type="text"
                                    placeholder="Ej. León 1.6 TDI, MT-07"
                                    value={model}
                                    onChange={(e) => setModel(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Año de Matriculación</label>
                                <input
                                    type="number"
                                    min="1950"
                                    max={new Date().getFullYear() + 1}
                                    value={year}
                                    onChange={(e) => setYear(Number(e.target.value))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Tipo de Energía / Motor</label>
                                <select
                                    value={fuelType}
                                    onChange={(e) => setFuelType(e.target.value as any)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                                >
                                    <option value="gasoline">Gasolina</option>
                                    <option value="diesel">Diésel</option>
                                    <option value="hybrid">Híbrido</option>
                                    <option value="electric">Eléctrico</option>
                                    <option value="motorcycle">Motocicleta / Ciclomotor</option>
                                </select>
                            </div>
                            <div className="sm:col-span-2">
                                <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center gap-1">
                                    <Gauge className="w-3.5 h-3.5 text-indigo-500" /> Kilometraje Actual del Vehículo (km)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    value={currentKm}
                                    onChange={(e) => setCurrentKm(Number(e.target.value))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm font-semibold text-indigo-900"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Botón de Recomendados por defecto */}
                    <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="flex items-start gap-2 text-xs text-indigo-900">
                            <Info className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
                            <div>
                                <span className="font-semibold block">Sugerencia inteligente de mantenimiento:</span>
                                ¿Quieres aplicar los intervalos habituales recomendados por el sector para este tipo de vehículo?
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={applyRecommendedPresets}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium px-3 py-1.5 rounded-md transition shadow-sm shrink-0 flex items-center gap-1"
                        >
                            ⚡ Usar recomendado
                        </button>
                    </div>

                    {/* Disclaimer legal sutil */}
                    <p className="text-[11px] text-gray-500 italic bg-gray-50 p-2.5 rounded-md border border-gray-200">
                        ℹ️ <strong>Nota informativa:</strong> Los valores sugeridos son estimaciones orientativas del sector automotriz. Le aconsejamos verificar siempre el manual del fabricante de su vehículo o consultar con su taller para ajustar los parámetros a la realidad de su modelo específico.
                    </p>

                    {/* Sección 2: Control de Mantenimientos */}
                    <div className="border-t pt-4 border-gray-100">
                        <h3 className="text-sm font-semibold text-indigo-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                            <Wrench className="w-4 h-4" /> Intervalos de Mantenimiento y Revisión
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Km en Último Mantenimiento</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={lastMaintenanceKm}
                                    onChange={(e) => setLastMaintenanceKm(Number(e.target.value))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Fecha Último Mantenimiento</label>
                                <input
                                    type="date"
                                    value={lastMaintenanceDate}
                                    onChange={(e) => setLastMaintenanceDate(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Intervalo por Distancia (km)</label>
                                <input
                                    type="number"
                                    min="1000"
                                    step="500"
                                    value={maintenanceIntervalKm}
                                    onChange={(e) => setMaintenanceIntervalKm(Number(e.target.value))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Intervalo por Tiempo (Meses)</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="60"
                                    value={maintenanceIntervalMonths}
                                    onChange={(e) => setMaintenanceIntervalMonths(Number(e.target.value))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Sección 3: Neumáticos e ITV */}
                    <div className="border-t pt-4 border-gray-100">
                        <h3 className="text-sm font-semibold text-indigo-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                            <Gauge className="w-4 h-4" /> Control de Neumáticos e ITV
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Marca Neumáticos</label>
                                <input
                                    type="text"
                                    placeholder="Ej. Michelin, Continental, Bridgestone"
                                    value={tireBrand}
                                    onChange={(e) => setTireBrand(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Modelo Neumáticos</label>
                                <input
                                    type="text"
                                    placeholder="Ej. Primacy 4, EcoContact"
                                    value={tireModel}
                                    onChange={(e) => setTireModel(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Km al Montar Neumáticos</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={tireInstallationKm}
                                    onChange={(e) => setTireInstallationKm(Number(e.target.value))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Duración Estimada Neumáticos (km)</label>
                                <input
                                    type="number"
                                    min="5000"
                                    step="1000"
                                    value={tireEstimatedKm}
                                    onChange={(e) => setTireEstimatedKm(Number(e.target.value))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center gap-1">
                                    <Calendar className="w-3.5 h-3.5 text-indigo-500" /> Fecha Próxima ITV
                                </label>
                                <input
                                    type="date"
                                    value={nextItvDate}
                                    onChange={(e) => setNextItvDate(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center gap-1">
                                    <Shield className="w-3.5 h-3.5 text-indigo-500" /> Seguro Vinculado
                                </label>
                                <select
                                    value={insuranceId}
                                    onChange={(e) => setInsuranceId(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
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

                    {/* Notas adicionales */}
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Notas / Observaciones</label>
                        <textarea
                            rows={2}
                            placeholder="Ej. Tamaño de neumáticos 205/55 R16, historial de averías..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                        />
                    </div>

                    {/* Botones de acción */}
                    <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 flex items-center space-x-2"
                        >
                            <Save className="w-4 h-4" />
                            <span>Guardar Vehículo</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default VehicleForm;
