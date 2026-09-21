import React, { useState } from 'react';
import type { Insurance } from '../../types/finance';
import { useFinance } from '../../contexts/FinanceContext';
import { Save, X, Shield, Phone, FileText, Calendar, DollarSign, Car, RefreshCw } from 'lucide-react';

interface InsuranceFormProps {
    insurance?: Insurance;
    onClose: () => void;
}

const InsuranceForm: React.FC<InsuranceFormProps> = ({ insurance, onClose }) => {
    const { addInsurance, updateInsurance, recurringExpenses, addRecurringExpense, vehicles } = useFinance();

    const [name, setName] = useState(insurance?.name || '');
    const [company, setCompany] = useState(insurance?.company || '');
    const [policyNumber, setPolicyNumber] = useState(insurance?.policyNumber || '');
    const [contactPhone, setContactPhone] = useState(insurance?.contactPhone || '');
    const [type, setType] = useState<Insurance['type']>(insurance?.type || 'home');
    const [deductible, setDeductible] = useState<number | ''>(insurance?.deductible ?? '');
    
    const [expirationDate, setExpirationDate] = useState<string>(
        insurance?.expirationDate ? new Date(insurance.expirationDate).toISOString().split('T')[0] : new Date(Date.now() + 365*24*60*60*1000).toISOString().split('T')[0]
    );
    const [renewalDate, setRenewalDate] = useState<string>(
        insurance?.renewalDate ? new Date(insurance.renewalDate).toISOString().split('T')[0] : new Date(Date.now() + 305*24*60*60*1000).toISOString().split('T')[0]
    );

    const [annualPremium, setAnnualPremium] = useState<number>(insurance?.annualPremium || 0);
    const [paymentFrequency, setPaymentFrequency] = useState<Insurance['paymentFrequency']>(insurance?.paymentFrequency || 'yearly');
    
    const [recurringExpenseId, setRecurringExpenseId] = useState<string>(insurance?.recurringExpenseId || '');
    const [createNewRecurring, setCreateNewRecurring] = useState<boolean>(false);
    const [vehicleId, setVehicleId] = useState<string>(insurance?.vehicleId || '');
    const [notes, setNotes] = useState(insurance?.notes || '');

    // Al cambiar la fecha de vencimiento, auto-calcular la fecha de aviso a 60 días antes
    const handleExpirationChange = (dateStr: string) => {
        setExpirationDate(dateStr);
        if (dateStr) {
            const expTime = new Date(dateStr).getTime();
            const sixtyDaysBefore = new Date(expTime - 60 * 24 * 60 * 60 * 1000);
            setRenewalDate(sixtyDaysBefore.toISOString().split('T')[0]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        let finalRecurringId = recurringExpenseId;

        // Si el usuario marcó crear un nuevo Gasto Fijo automáticamente
        if (createNewRecurring && !finalRecurringId) {
            const monthlyPayment = paymentFrequency === 'yearly' ? annualPremium / 12 : (paymentFrequency === 'semi-annually' ? annualPremium / 6 : (paymentFrequency === 'quarterly' ? annualPremium / 4 : annualPremium));
            const newRecId = await addRecurringExpense({
                description: `Seguro: ${name.trim()}`,
                amount: Math.round(monthlyPayment * 100) / 100,
                currency: 'EUR',
                frequency: paymentFrequency,
                paymentDay: 1,
                active: true,
                categoryId: 'cat_housing'
            });
            finalRecurringId = newRecId;
        }

        const insuranceData = {
            name: name.trim(),
            company: company.trim(),
            policyNumber: policyNumber.trim(),
            contactPhone: contactPhone.trim(),
            type,
            deductible: deductible !== '' ? Number(deductible) : undefined,
            expirationDate: new Date(expirationDate).getTime(),
            renewalDate: new Date(renewalDate).getTime(),
            annualPremium: Number(annualPremium) || 0,
            paymentFrequency,
            recurringExpenseId: finalRecurringId || undefined,
            vehicleId: vehicleId || undefined,
            status: 'active' as const,
            notes: notes.trim()
        };

        if (insurance) {
            await updateInsurance({
                ...insurance,
                ...insuranceData
            });
        } else {
            await addInsurance(insuranceData);
        }
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 my-8 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center pb-4 border-b border-gray-100 mb-4">
                    <div className="flex items-center space-x-2">
                        <Shield className="w-6 h-6 text-indigo-600" />
                        <h2 className="text-xl font-bold text-gray-800">
                            {insurance ? 'Editar Seguro' : 'Nuevo Seguro'}
                        </h2>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg text-gray-500">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Datos Generales */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Nombre / Identificador *</label>
                            <input
                                type="text"
                                required
                                placeholder="Ej. Seguro Coche, Seguro Hogar"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Compañía Aseguradora</label>
                            <input
                                type="text"
                                placeholder="Ej. Mapfre, Línea Directa, Allianz"
                                value={company}
                                onChange={(e) => setCompany(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center gap-1">
                                <FileText className="w-3.5 h-3.5 text-gray-400" /> Número de Póliza
                            </label>
                            <input
                                type="text"
                                placeholder="Ej. POL-987654321"
                                value={policyNumber}
                                onChange={(e) => setPolicyNumber(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center gap-1">
                                <Phone className="w-3.5 h-3.5 text-emerald-600" /> Teléfono de Asistencia / Grúa
                            </label>
                            <input
                                type="text"
                                placeholder="Ej. 900 123 456"
                                value={contactPhone}
                                onChange={(e) => setContactPhone(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Tipo de Seguro</label>
                            <select
                                value={type}
                                onChange={(e) => setType(e.target.value as any)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                            >
                                <option value="vehicle">Vehículo (Coche/Moto)</option>
                                <option value="home">Hogar / Vivienda</option>
                                <option value="life">Vida</option>
                                <option value="health">Salud / Médico</option>
                                <option value="pet">Mascotas</option>
                                <option value="death">Decesos</option>
                                <option value="other">Otro</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Franquicia (€)</label>
                            <input
                                type="number"
                                min="0"
                                placeholder="Ej. 150, 200 (dejar en blanco si no tiene)"
                                value={deductible}
                                onChange={(e) => setDeductible(e.target.value === '' ? '' : Number(e.target.value))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                            />
                        </div>
                    </div>

                    {/* Vencimientos y Avisos */}
                    <div className="border-t pt-4 border-gray-100">
                        <h3 className="text-sm font-semibold text-indigo-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                            <Calendar className="w-4 h-4" /> Fechas de Vencimiento y Renovación
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Fecha Vencimiento Póliza *</label>
                                <input
                                    type="date"
                                    required
                                    value={expirationDate}
                                    onChange={(e) => handleExpirationChange(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Fecha Inicio Avisos (60 días antes) *</label>
                                <input
                                    type="date"
                                    required
                                    value={renewalDate}
                                    onChange={(e) => setRenewalDate(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Importe y Gastos Fijos */}
                    <div className="border-t pt-4 border-gray-100">
                        <h3 className="text-sm font-semibold text-indigo-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                            <DollarSign className="w-4 h-4" /> Prima y Vinculación Financiera
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Prima Anual Total (€)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={annualPremium}
                                    onChange={(e) => setAnnualPremium(Number(e.target.value))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm font-semibold text-indigo-950"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Frecuencia de Pago</label>
                                <select
                                    value={paymentFrequency}
                                    onChange={(e) => setPaymentFrequency(e.target.value as any)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                                >
                                    <option value="yearly">Anual</option>
                                    <option value="semi-annually">Semestral</option>
                                    <option value="quarterly">Trimestral</option>
                                    <option value="monthly">Mensual</option>
                                </select>
                            </div>

                            <div className="sm:col-span-2">
                                <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center gap-1">
                                    <RefreshCw className="w-3.5 h-3.5 text-indigo-500" /> Vincular a Gasto Fijo / Recurrente
                                </label>
                                <select
                                    disabled={createNewRecurring}
                                    value={recurringExpenseId}
                                    onChange={(e) => setRecurringExpenseId(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm disabled:opacity-50"
                                >
                                    <option value="">-- Sin vincular a gasto fijo --</option>
                                    {recurringExpenses.map(re => (
                                        <option key={re.id} value={re.id}>
                                            {re.description} ({re.amount} € / {re.frequency})
                                        </option>
                                    ))}
                                </select>
                                <div className="mt-2 flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="createNewRec"
                                        checked={createNewRecurring}
                                        onChange={(e) => {
                                            setCreateNewRecurring(e.target.checked);
                                            if (e.target.checked) setRecurringExpenseId('');
                                        }}
                                        className="rounded text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <label htmlFor="createNewRec" className="text-xs text-gray-700">
                                        Crear automáticamente un nuevo Gasto Fijo con esta cuota
                                    </label>
                                </div>
                            </div>

                            {type === 'vehicle' && (
                                <div className="sm:col-span-2">
                                    <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center gap-1">
                                        <Car className="w-3.5 h-3.5 text-indigo-500" /> Vehículo Vinculado
                                    </label>
                                    <select
                                        value={vehicleId}
                                        onChange={(e) => setVehicleId(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                                    >
                                        <option value="">-- Seleccionar vehículo --</option>
                                        {vehicles.map(v => (
                                            <option key={v.id} value={v.id}>
                                                {v.name} ({v.licensePlate || `${v.brand} ${v.model}`})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Observaciones */}
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Notas / Observaciones</label>
                        <textarea
                            rows={2}
                            placeholder="Ej. Cobertura de cristales, vehículo sustitutivo, condicionado especial..."
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
                            <span>Guardar Seguro</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default InsuranceForm;
