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
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 shadow-sm mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
                <div className="bg-amber-100 p-2 rounded-lg shrink-0 text-amber-700 mt-0.5">
                    <Shield className="w-5 h-5" />
                </div>
                <div>
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-amber-950">
                            Aviso de Renovación de Seguro ({targetIns.name})
                        </span>
                        <span className="text-[10px] bg-amber-200 text-amber-800 font-bold px-1.5 py-0.5 rounded">
                            {daysLeft <= 0 ? 'Vencido' : `Vence en ${daysLeft} días`}
                        </span>
                    </div>
                    <p className="text-xs text-amber-900 mt-0.5">
                        Tu póliza con <strong>{targetIns.company}</strong> vence el {new Date(targetIns.expirationDate).toLocaleDateString('es-ES')}. Revisa el precio de renovación antes de que se autorrenueve automáticamente.
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                {onNavigateToInsurances && (
                    <button
                        onClick={onNavigateToInsurances}
                        className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1 transition shadow-sm"
                    >
                        <span>Ver Seguros</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                )}
                <button
                    onClick={() => handleDismiss(targetIns.id)}
                    className="text-amber-700 hover:bg-amber-100 p-1.5 rounded-lg text-xs"
                    title="Descartar por ahora"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};

export default InsuranceRenewalAlert;
