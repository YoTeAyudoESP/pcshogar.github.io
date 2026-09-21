import React, { useState } from 'react';
import { useFinance } from '../../contexts/FinanceContext';
import { Wrench, AlertTriangle, X, ArrowRight } from 'lucide-react';

interface VehicleMaintenanceAlertProps {
    onNavigateToVehicles?: () => void;
}

const VehicleMaintenanceAlert: React.FC<VehicleMaintenanceAlertProps> = ({ onNavigateToVehicles }) => {
    const { vehicles } = useFinance();
    const [dismissedIds, setDismissedIds] = useState<string[]>([]);

    const now = Date.now();
    const urgentVehicles = vehicles.filter(vh => {
        if (dismissedIds.includes(vh.id)) return false;
        
        const kmSinceLast = vh.currentKm - (vh.lastMaintenanceKm || 0);
        const kmRemaining = (vh.maintenanceIntervalKm || 15000) - kmSinceLast;

        const lastDate = vh.lastMaintenanceDate ? new Date(vh.lastMaintenanceDate) : new Date();
        const nextDueDate = new Date(lastDate);
        nextDueDate.setMonth(nextDueDate.getMonth() + (vh.maintenanceIntervalMonths || 12));
        const daysRemaining = Math.ceil((nextDueDate.getTime() - now) / (1000 * 60 * 60 * 24));

        return kmRemaining <= 1000 || daysRemaining <= 30;
    });

    if (urgentVehicles.length === 0) return null;

    const targetVh = urgentVehicles[0];
    const kmSinceLast = targetVh.currentKm - (targetVh.lastMaintenanceKm || 0);
    const kmRemaining = (targetVh.maintenanceIntervalKm || 15000) - kmSinceLast;

    const handleDismiss = (id: string) => {
        setDismissedIds(prev => [...prev, id]);
    };

    return (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 shadow-sm mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
                <div className="bg-indigo-100 p-2 rounded-lg shrink-0 text-indigo-700 mt-0.5">
                    <Wrench className="w-5 h-5" />
                </div>
                <div>
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-indigo-950">
                            Mantenimiento Preventivo ({targetVh.name})
                        </span>
                        <span className="text-[10px] bg-indigo-200 text-indigo-800 font-bold px-1.5 py-0.5 rounded">
                            {kmRemaining <= 0 ? 'Pendiente' : `Próximo (~${kmRemaining} km)`}
                        </span>
                    </div>
                    <p className="text-xs text-indigo-900 mt-0.5">
                        Tu vehículo <strong>{targetVh.name} ({targetVh.licensePlate || `${targetVh.brand} ${targetVh.model}`})</strong> se encuentra cercano o dentro de la ventana de revisión programada.
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                {onNavigateToVehicles && (
                    <button
                        onClick={onNavigateToVehicles}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1 transition shadow-sm"
                    >
                        <span>Ver Vehículo</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                )}
                <button
                    onClick={() => handleDismiss(targetVh.id)}
                    className="text-indigo-700 hover:bg-indigo-100 p-1.5 rounded-lg text-xs"
                    title="Descartar por ahora"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};

export default VehicleMaintenanceAlert;
