import React, { useState } from 'react';
import type { Insurance } from '../../types/finance';
import { useFinance } from '../../contexts/FinanceContext';
import { Save, X, Shield, Phone, FileText, Calendar, DollarSign, Car, RefreshCw } from 'lucide-react';
import ModalPortal from '../common/ModalPortal';

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

    const [annualPremium, setAnnualPremium] = useState<number | ''>(insurance?.annualPremium ?? '');
    const [paymentFrequency, setPaymentFrequency] = useState<Insurance['paymentFrequency']>(insurance?.paymentFrequency || 'yearly');

    const [linkedExpenseIds, setLinkedExpenseIds] = useState<string[]>(
        insurance?.linkedRecurringExpenseIds || (insurance?.recurringExpenseId ? [insurance.recurringExpenseId] : [])
    );
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

    const handleToggleRecurring = (id: string) => {
        setLinkedExpenseIds(prev => 
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        let finalLinkedIds = [...linkedExpenseIds];

        // Si el usuario marcó crear un nuevo Gasto Fijo automáticamente
        if (createNewRecurring) {
            const premiumNum = Number(annualPremium) || 0;
            const monthlyPayment = paymentFrequency === 'yearly' ? premiumNum / 12 : (paymentFrequency === 'semi-annually' ? premiumNum / 6 : (paymentFrequency === 'quarterly' ? premiumNum / 4 : premiumNum));
            const newRecId = await addRecurringExpense({
                description: `Seguro: ${name.trim()}`,
                amount: Math.round(monthlyPayment * 100) / 100,
                currency: 'EUR',
                frequency: paymentFrequency,
                paymentDay: 1,
                active: true,
                categoryId: 'cat_housing'
            });
            if (newRecId && !finalLinkedIds.includes(newRecId)) {
                finalLinkedIds.push(newRecId);
            }
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
            annualPremium: annualPremium !== '' ? Number(annualPremium) : 0,
            paymentFrequency,
            recurringExpenseId: finalLinkedIds[0] || undefined,
            linkedRecurringExpenseIds: finalLinkedIds.length > 0 ? finalLinkedIds : undefined,
            needsDateReview: false,
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
                            <Shield size={22} style={{ color: '#818cf8' }} />
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                                {insurance ? 'Editar Seguro' : 'Nuevo Seguro'}
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
                        {/* Datos Generales */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.85rem' }}>
                            <div>
                                <label style={labelStyle}>Nombre / Identificador *</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Ej. Seguro Coche, Seguro Hogar"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    style={inputStyle}
                                />
                            </div>
                            <div>
                                <label style={labelStyle}>Compañía Aseguradora</label>
                                <input
                                    type="text"
                                    placeholder="Ej. Mapfre, Línea Directa, Allianz"
                                    value={company}
                                    onChange={(e) => setCompany(e.target.value)}
                                    style={inputStyle}
                                />
                            </div>
                            <div>
                                <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <FileText size={14} style={{ color: 'var(--text-muted)' }} /> Número de Póliza
                                </label>
                                <input
                                    type="text"
                                    placeholder="Ej. POL-987654321"
                                    value={policyNumber}
                                    onChange={(e) => setPolicyNumber(e.target.value)}
                                    style={inputStyle}
                                />
                            </div>
                            <div>
                                <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Phone size={14} style={{ color: '#10b981' }} /> Teléfono de Asistencia / Grúa
                                </label>
                                <input
                                    type="text"
                                    placeholder="Ej. 900 123 456"
                                    value={contactPhone}
                                    onChange={(e) => setContactPhone(e.target.value)}
                                    style={inputStyle}
                                />
                            </div>
                            <div>
                                <label style={labelStyle}>Tipo de Seguro</label>
                                <select
                                    value={type}
                                    onChange={(e) => setType(e.target.value as any)}
                                    style={{ ...inputStyle, color: '#ffffff', background: '#0f172a' }}
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
                                <label style={labelStyle}>Franquicia (€)</label>
                                <input
                                    type="number"
                                    min="0"
                                    placeholder="Ej. 150 (dejar en blanco si no tiene)"
                                    value={deductible}
                                    onChange={(e) => setDeductible(e.target.value === '' ? '' : Number(e.target.value))}
                                    style={inputStyle}
                                />
                            </div>
                        </div>

                        {/* Vencimientos y Avisos */}
                        <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '1rem' }}>
                            <span style={sectionTitleStyle}>
                                <Calendar size={16} /> Vencimiento y Renovación
                            </span>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.85rem' }}>
                                <div>
                                    <label style={labelStyle}>Fecha Vencimiento Póliza *</label>
                                    <input
                                        type="date"
                                        required
                                        value={expirationDate}
                                        onChange={(e) => handleExpirationChange(e.target.value)}
                                        style={inputStyle}
                                    />
                                </div>
                                <div>
                                    <label style={labelStyle}>Inicio Avisos (60 días antes) *</label>
                                    <input
                                        type="date"
                                        required
                                        value={renewalDate}
                                        onChange={(e) => setRenewalDate(e.target.value)}
                                        style={inputStyle}
                                    />
                                </div>
                            </div>
                            <p style={{
                                fontSize: '0.7rem',
                                color: 'var(--text-muted)',
                                background: 'rgba(99, 102, 241, 0.05)',
                                border: '1px solid rgba(99, 102, 241, 0.15)',
                                padding: '0.6rem 0.85rem',
                                borderRadius: '8px',
                                marginTop: '0.75rem',
                                marginBottom: 0,
                                lineHeight: '1.4'
                            }}>
                                ℹ️ <strong>Diferencia entre Fechas:</strong> La <em>Fecha de Vencimiento de la Póliza</em> es el fin contractual (usada para calcular los 60 días de preaviso para cancelar/cambiar de seguro). La <em>Fecha de Cobro Bancario</em> se configura independientemente en el <strong>Gasto Fijo vinculado</strong> para reflejar exactamente el día en que tu banco te cargará la cuota.
                            </p>
                        </div>

                        {/* Prima y Vinculación Financiera */}
                        <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '1rem' }}>
                            <span style={sectionTitleStyle}>
                                <DollarSign size={16} /> Prima y Vinculación Financiera
                            </span>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.85rem' }}>
                                <div>
                                    <label style={labelStyle}>Prima Anual Total (€)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        placeholder="Ej. 350.00"
                                        value={annualPremium}
                                        onChange={(e) => setAnnualPremium(e.target.value === '' ? '' : Number(e.target.value))}
                                        style={{ ...inputStyle, fontSize: '1rem', fontWeight: 800, color: '#818cf8' }}
                                    />
                                </div>
                                <div>
                                    <label style={labelStyle}>Frecuencia de Pago</label>
                                    <select
                                        value={paymentFrequency}
                                        onChange={(e) => setPaymentFrequency(e.target.value as any)}
                                        style={{ ...inputStyle, color: '#ffffff', background: '#0f172a' }}
                                    >
                                        <option value="yearly">Anual</option>
                                        <option value="semi-annually">Semestral</option>
                                        <option value="quarterly">Trimestral</option>
                                        <option value="monthly">Mensual</option>
                                    </select>
                                </div>

                                <div style={{ gridColumn: '1 / -1' }}>
                                    <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <RefreshCw size={14} style={{ color: '#818cf8' }} /> Vincular a Gastos Fijos (puedes seleccionar varios para cuotas fraccionadas)
                                    </label>
                                    <div style={{
                                        maxHeight: '140px',
                                        overflowY: 'auto',
                                        background: 'rgba(15, 23, 42, 0.6)',
                                        border: '1px solid rgba(255, 255, 255, 0.12)',
                                        borderRadius: '10px',
                                        padding: '0.5rem',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '0.35rem',
                                        opacity: createNewRecurring ? 0.4 : 1,
                                        pointerEvents: createNewRecurring ? 'none' : 'auto'
                                    }}>
                                        {recurringExpenses.length === 0 ? (
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', padding: '0.25rem' }}>No hay gastos fijos registrados.</span>
                                        ) : (
                                            recurringExpenses.map(re => {
                                                const isChecked = linkedExpenseIds.includes(re.id);
                                                return (
                                                    <label 
                                                        key={re.id}
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '0.5rem',
                                                            fontSize: '0.75rem',
                                                            color: isChecked ? '#ffffff' : '#94a3b8',
                                                            background: isChecked ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                                                            padding: '0.3rem 0.5rem',
                                                            borderRadius: '6px',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={isChecked}
                                                            onChange={() => handleToggleRecurring(re.id)}
                                                        />
                                                        <span style={{ fontWeight: isChecked ? 600 : 400 }}>
                                                            {re.description} ({re.amount} € / {re.frequency})
                                                        </span>
                                                    </label>
                                                );
                                            })
                                        )}
                                    </div>
                                    <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <input
                                            type="checkbox"
                                            id="createNewRec"
                                            checked={createNewRecurring}
                                            onChange={(e) => {
                                                setCreateNewRecurring(e.target.checked);
                                                if (e.target.checked) setLinkedExpenseIds([]);
                                            }}
                                            style={{ cursor: 'pointer' }}
                                        />
                                        <label htmlFor="createNewRec" style={{ fontSize: '0.75rem', color: '#e2e8f0', cursor: 'pointer' }}>
                                            Crear automáticamente un nuevo Gasto Fijo adicional con esta cuota
                                        </label>
                                    </div>
                                </div>

                                {type === 'vehicle' && (
                                    <div style={{ gridColumn: '1 / -1' }}>
                                        <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <Car size={14} style={{ color: '#818cf8' }} /> Vehículo Vinculado
                                        </label>
                                        <select
                                            value={vehicleId}
                                            onChange={(e) => setVehicleId(e.target.value)}
                                            style={{ ...inputStyle, color: '#ffffff', background: '#0f172a' }}
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
                            <label style={labelStyle}>Notas / Observaciones</label>
                            <textarea
                                rows={2}
                                placeholder="Ej. Cobertura de cristales, vehículo sustitutivo..."
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
                                <span>Guardar Seguro</span>
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </ModalPortal>
    );
};

export default InsuranceForm;
