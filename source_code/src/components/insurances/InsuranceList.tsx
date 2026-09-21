import React, { useState } from 'react';
import type { Insurance } from '../../types/finance';
import { useFinance } from '../../contexts/FinanceContext';
import InsuranceForm from './InsuranceForm';
import { Shield, Plus, Phone, Calendar, DollarSign, Car, Home, Heart, Activity, AlertTriangle, CheckCircle, Edit, Trash2, FileText, Clock } from 'lucide-react';

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
            case 'vehicle': return <Car className="w-4 h-4 text-blue-600" />;
            case 'home': return <Home className="w-4 h-4 text-purple-600" />;
            case 'life': return <Heart className="w-4 h-4 text-rose-600" />;
            case 'health': return <Activity className="w-4 h-4 text-emerald-600" />;
            default: return <Shield className="w-4 h-4 text-indigo-600" />;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                <div>
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <Shield className="w-6 h-6 text-indigo-600" /> Mis Seguros
                    </h2>
                    <p className="text-xs text-gray-500 mt-1">
                        Control unificado de pólizas, pólizas de vehículos, hogar y avisos de renovación anticipados.
                    </p>
                </div>
                <button
                    onClick={handleAddNew}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg flex items-center space-x-2 transition shadow-sm"
                >
                    <Plus className="w-4 h-4" />
                    <span>Añadir Seguro</span>
                </button>
            </div>

            {insurances.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
                    <Shield className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <h3 className="text-base font-semibold text-gray-700">No hay seguros registrados</h3>
                    <p className="text-xs text-gray-500 max-w-md mx-auto mt-1 mb-4">
                        Registra tus pólizas para tener a mano el teléfono de asistencia de la compañía y recibir avisos 2 meses antes de la autorrenovación.
                    </p>
                    <button
                        onClick={handleAddNew}
                        className="inline-flex items-center space-x-2 text-sm font-medium text-indigo-600 bg-indigo-50 px-4 py-2 rounded-lg hover:bg-indigo-100 transition"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Registrar Primer Seguro</span>
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {insurances.map((ins) => {
                        const linkedRec = recurringExpenses.find(r => r.id === ins.recurringExpenseId);
                        const linkedVehicle = vehicles.find(v => v.id === ins.vehicleId);

                        const now = Date.now();
                        const daysLeftExpiration = Math.ceil((ins.expirationDate - now) / (1000 * 60 * 60 * 24));
                        const isRenewalNoticeActive = daysLeftExpiration <= 60 && daysLeftExpiration > 0;
                        const isExpired = daysLeftExpiration <= 0;

                        return (
                            <div key={ins.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col justify-between">
                                <div className="p-5">
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                {getInsuranceTypeIcon(ins.type)}
                                                <span className="font-bold text-lg text-gray-900">{ins.name}</span>
                                                <span className="bg-gray-100 text-gray-600 text-[10px] font-semibold px-2 py-0.5 rounded">
                                                    {getInsuranceTypeName(ins.type)}
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-0.5 font-medium">
                                                Compañía: <strong className="text-gray-800">{ins.company}</strong>
                                                {ins.policyNumber && ` • Póliza: ${ins.policyNumber}`}
                                            </p>
                                        </div>
                                        <div className="flex items-center space-x-1">
                                            <button
                                                onClick={() => handleEdit(ins)}
                                                className="p-1.5 text-gray-400 hover:text-indigo-600 rounded-lg hover:bg-gray-50"
                                                title="Editar"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(ins.id)}
                                                className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg hover:bg-gray-50"
                                                title="Eliminar"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Estado de Vencimiento / Alerta */}
                                    <div className={`rounded-lg p-3 mb-4 flex items-center justify-between border ${
                                        isExpired ? 'bg-rose-50 border-rose-200 text-rose-900' :
                                        isRenewalNoticeActive ? 'bg-amber-50 border-amber-200 text-amber-900' :
                                        'bg-emerald-50 border-emerald-200 text-emerald-900'
                                    }`}>
                                        <div className="flex items-center gap-2">
                                            {isExpired ? (
                                                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                                            ) : isRenewalNoticeActive ? (
                                                <Clock className="w-5 h-5 text-amber-600 shrink-0" />
                                            ) : (
                                                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                                            )}
                                            <div>
                                                <span className="text-[10px] uppercase font-bold block">
                                                    {isExpired ? 'Póliza Vencida' : isRenewalNoticeActive ? 'Período de Renovación (Aviso a 60 días)' : 'Seguro en Vigor'}
                                                </span>
                                                <span className="text-xs font-semibold">
                                                    Vence el {new Date(ins.expirationDate).toLocaleDateString('es-ES')} ({isExpired ? 'Caducado' : `Quedan ${daysLeftExpiration} días`})
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Datos de Asistencia y Franquicia */}
                                    <div className="grid grid-cols-2 gap-2 text-xs border-t border-gray-100 pt-3">
                                        <div>
                                            <span className="text-gray-400 block text-[10px] font-medium flex items-center gap-1">
                                                <Phone className="w-3 h-3 text-emerald-600" /> Asistencia / Grúa
                                            </span>
                                            <span className="font-semibold text-gray-800">
                                                {ins.contactPhone || 'No especificado'}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-gray-400 block text-[10px] font-medium">Franquicia</span>
                                            <span className="font-semibold text-gray-800">
                                                {ins.deductible !== undefined ? `${ins.deductible} €` : 'Sin franquicia'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Footer con Prima Anual y Vinculación */}
                                <div className="bg-gray-50 border-t border-gray-100 px-5 py-2.5 flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-1 text-gray-600">
                                        <DollarSign className="w-3.5 h-3.5 text-gray-400" />
                                        <span>Prima:</span>
                                        <strong className="text-gray-900 font-bold">{ins.annualPremium} €/año</strong>
                                        <span className="text-[10px] text-gray-500 capitalize">({ins.paymentFrequency})</span>
                                    </div>
                                    {linkedRec ? (
                                        <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded">
                                            ✓ Vinculado a Gastos Fijos
                                        </span>
                                    ) : (
                                        <span className="text-[10px] bg-gray-200 text-gray-600 font-medium px-2 py-0.5 rounded">
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
