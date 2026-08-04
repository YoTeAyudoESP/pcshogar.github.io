import React, { useState, useMemo } from 'react';
import { X, Calculator, ArrowRight, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { formatMoney, round2 } from '../../utils/financeCalculations';
import ModalPortal from '../common/ModalPortal';

interface LoanSimulatorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConvertToRealLoan?: (simulatedData: {
        name: string;
        amount: number;
        tin: number;
        tae?: number;
        months: number;
        monthlyQuota: number;
    }) => void;
}

const LoanSimulatorModal: React.FC<LoanSimulatorModalProps> = ({ isOpen, onClose, onConvertToRealLoan }) => {
    // Input state
    const [amount, setAmount] = useState<number | ''>(3000);
    const [tin, setTin] = useState<number | ''>(7.5);
    const [tae, setTae] = useState<number | ''>('');
    const [months, setMonths] = useState<number | ''>(24);
    const [simulationMode, setSimulationMode] = useState<'loan' | 'card_finance'>('loan');
    const [calculationType, setCalculationType] = useState<'quota' | 'amount'>('quota');
    const [desiredQuota, setDesiredQuota] = useState<number | ''>(150);

    // UI state
    const [showSchedule, setShowSchedule] = useState(false);
    const [showValidationErrors, setShowValidationErrors] = useState(false);

    // Calculations
    const simulationResult = useMemo(() => {
        const pTin = Number(tin);
        if (isNaN(pTin) || pTin < 0) return null;

        if (calculationType === 'quota') {
            const pAmount = Number(amount);
            const pMonths = Number(months);
            if (!pAmount || pAmount <= 0 || !pMonths || pMonths <= 0) return null;

            const r = (pTin / 100) / 12;
            let monthlyPayment = 0;
            if (r === 0) {
                monthlyPayment = pAmount / pMonths;
            } else {
                monthlyPayment = pAmount * (r / (1 - Math.pow(1 + r, -pMonths)));
            }

            const totalPayable = monthlyPayment * pMonths;
            const totalInterests = totalPayable - pAmount;

            // Generate schedule
            const schedule = [];
            let remaining = pAmount;
            for (let i = 1; i <= pMonths; i++) {
                const interestComp = remaining * r;
                const capitalComp = monthlyPayment - interestComp;
                remaining = Math.max(0, remaining - capitalComp);
                schedule.push({
                    month: i,
                    payment: monthlyPayment,
                    capital: capitalComp,
                    interest: interestComp,
                    remaining
                });
            }

            return {
                principal: pAmount,
                months: pMonths,
                monthlyPayment: round2(monthlyPayment),
                totalInterests: round2(totalInterests),
                totalPayable: round2(totalPayable),
                schedule
            };
        } else {
            // Calculate max principal based on desired quota
            const pQuota = Number(desiredQuota);
            const pMonths = Number(months);
            if (!pQuota || pQuota <= 0 || !pMonths || pMonths <= 0) return null;

            const r = (pTin / 100) / 12;
            let pAmount = 0;
            if (r === 0) {
                pAmount = pQuota * pMonths;
            } else {
                pAmount = pQuota * ((1 - Math.pow(1 + r, -pMonths)) / r);
            }

            const totalPayable = pQuota * pMonths;
            const totalInterests = totalPayable - pAmount;

            return {
                principal: round2(pAmount),
                months: pMonths,
                monthlyPayment: round2(pQuota),
                totalInterests: round2(totalInterests),
                totalPayable: round2(totalPayable),
                schedule: []
            };
        }
    }, [amount, tin, months, calculationType, desiredQuota]);

    // Validation checks
    const hasAmountError = calculationType === 'quota' && (!amount || Number(amount) <= 0);
    const hasQuotaError = calculationType === 'amount' && (!desiredQuota || Number(desiredQuota) <= 0);
    const hasMonthsError = !months || Number(months) <= 0;
    const hasTinError = tin === '' || Number(tin) < 0;

    const hasAnyError = hasAmountError || hasQuotaError || hasMonthsError || hasTinError;

    const handleConvert = () => {
        if (hasAnyError || !simulationResult) {
            setShowValidationErrors(true);
            return;
        }

        if (onConvertToRealLoan) {
            onConvertToRealLoan({
                name: simulationMode === 'loan' ? 'Préstamo Simulado' : 'Financiación Tarjeta',
                amount: simulationResult.principal,
                tin: Number(tin) || 0,
                tae: tae !== '' ? Number(tae) : undefined,
                months: simulationResult.months,
                monthlyQuota: simulationResult.monthlyPayment
            });
        }
        onClose();
    };

    if (!isOpen) return null;

    const inputStyle: React.CSSProperties = {
        width: '100%',
        padding: '0.85rem 1rem',
        borderRadius: '0.75rem',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        background: 'rgba(255, 255, 255, 0.05)',
        color: 'white',
        fontSize: '0.95rem',
        outline: 'none',
        boxSizing: 'border-box'
    };

    const labelStyle: React.CSSProperties = {
        display: 'block',
        fontSize: '0.85rem',
        fontWeight: 600,
        color: 'rgba(255, 255, 255, 0.7)',
        marginBottom: '0.4rem'
    };

    return (
        <ModalPortal>
            <div style={{
                position: 'fixed',
                top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.75)',
                backdropFilter: 'blur(8px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
                padding: '1rem'
            }}>
                <div style={{
                    background: 'linear-gradient(145deg, #1e1e2d 0%, #151521 100%)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '1.25rem',
                    width: '100%',
                    maxWidth: '580px',
                    maxHeight: '90vh',
                    overflowY: 'auto',
                    boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                    padding: '1.5rem',
                    color: 'white',
                    position: 'relative'
                }}>
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{
                                width: '42px', height: '42px', borderRadius: '12px',
                                background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
                            }}>
                                <Calculator size={22} color="white" />
                            </div>
                            <div>
                                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>Simulador de Préstamos</h2>
                                <p style={{ margin: 0, fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>Calcula cuotas y financiación sin guardar datos</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            style={{
                                background: 'rgba(255,255,255,0.05)',
                                border: 'none',
                                borderRadius: '50%',
                                width: '36px', height: '36px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: 'rgba(255,255,255,0.6)', cursor: 'pointer'
                            }}
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Simulation Type Selector */}
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', background: 'rgba(255,255,255,0.03)', padding: '4px', borderRadius: '10px' }}>
                        <button
                            type="button"
                            onClick={() => setSimulationMode('loan')}
                            style={{
                                flex: 1, padding: '0.6rem', borderRadius: '8px', border: 'none',
                                background: simulationMode === 'loan' ? 'var(--color-primary)' : 'transparent',
                                color: 'white', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            🏦 Préstamo Bancario / Personal
                        </button>
                        <button
                            type="button"
                            onClick={() => setSimulationMode('card_finance')}
                            style={{
                                flex: 1, padding: '0.6rem', borderRadius: '8px', border: 'none',
                                background: simulationMode === 'card_finance' ? '#EC4899' : 'transparent',
                                color: 'white', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            💳 Compra a Plazos (Tarjeta)
                        </button>
                    </div>

                    {/* Calculation Goal Selector */}
                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)' }}>
                            <input
                                type="radio"
                                name="calcType"
                                checked={calculationType === 'quota'}
                                onChange={() => setCalculationType('quota')}
                                style={{ accentColor: 'var(--color-primary)' }}
                            />
                            Calcular Cuota Mensual
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)' }}>
                            <input
                                type="radio"
                                name="calcType"
                                checked={calculationType === 'amount'}
                                onChange={() => setCalculationType('amount')}
                                style={{ accentColor: 'var(--color-primary)' }}
                            />
                            Calcular Importe Máximo por Cuota
                        </label>
                    </div>

                    {/* Inputs */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                        {calculationType === 'quota' ? (
                            <div>
                                <label style={labelStyle}>Importe a Financiar (€) *</label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type="number"
                                        step="100"
                                        min="1"
                                        style={{ ...inputStyle, borderColor: (showValidationErrors && hasAmountError) ? '#ef4444' : inputStyle.borderColor }}
                                        value={amount}
                                        onChange={e => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                                        placeholder="Ej. 5000"
                                    />
                                </div>
                                {showValidationErrors && hasAmountError && (
                                    <span style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '0.25rem', display: 'block' }}>Introduce un importe superior a 0 €</span>
                                )}
                            </div>
                        ) : (
                            <div>
                                <label style={labelStyle}>Cuota Máxima Deseada (€/mes) *</label>
                                <input
                                    type="number"
                                    step="10"
                                    min="1"
                                    style={{ ...inputStyle, borderColor: (showValidationErrors && hasQuotaError) ? '#ef4444' : inputStyle.borderColor }}
                                    value={desiredQuota}
                                    onChange={e => setDesiredQuota(e.target.value === '' ? '' : Number(e.target.value))}
                                    placeholder="Ej. 150"
                                />
                                {showValidationErrors && hasQuotaError && (
                                    <span style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '0.25rem', display: 'block' }}>Introduce una cuota superior a 0 €</span>
                                )}
                            </div>
                        )}

                        <div>
                            <label style={labelStyle}>Plazo (Meses) *</label>
                            <input
                                type="number"
                                min="1"
                                max="360"
                                style={{ ...inputStyle, borderColor: (showValidationErrors && hasMonthsError) ? '#ef4444' : inputStyle.borderColor }}
                                value={months}
                                onChange={e => setMonths(e.target.value === '' ? '' : Number(e.target.value))}
                                placeholder="Ej. 24"
                            />
                            {showValidationErrors && hasMonthsError && (
                                <span style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '0.25rem', display: 'block' }}>Introduce un número de meses mayor a 0</span>
                            )}
                        </div>

                        <div>
                            <label style={labelStyle}>Interés TIN Anual (%) *</label>
                            <input
                                type="number"
                                step="0.1"
                                min="0"
                                style={{ ...inputStyle, borderColor: (showValidationErrors && hasTinError) ? '#ef4444' : inputStyle.borderColor }}
                                value={tin}
                                onChange={e => setTin(e.target.value === '' ? '' : Number(e.target.value))}
                                placeholder="Ej. 7.5"
                            />
                            {showValidationErrors && hasTinError && (
                                <span style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '0.25rem', display: 'block' }}>Introduce el TIN de la operación</span>
                            )}
                        </div>

                        <div>
                            <label style={labelStyle}>TAE (%) (Opcional)</label>
                            <input
                                type="number"
                                step="0.1"
                                min="0"
                                style={inputStyle}
                                value={tae}
                                onChange={e => setTae(e.target.value === '' ? '' : Number(e.target.value))}
                                placeholder="Ej. 8.1"
                            />
                        </div>
                    </div>

                    {/* Global Error Banner */}
                    {showValidationErrors && hasAnyError && (
                        <div style={{
                            background: 'rgba(239, 68, 68, 0.15)',
                            border: '1px solid rgba(239, 68, 68, 0.4)',
                            borderRadius: '0.75rem',
                            padding: '0.85rem 1rem',
                            marginBottom: '1.25rem',
                            color: '#f87171',
                            fontSize: '0.85rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.6rem'
                        }}>
                            <AlertTriangle size={18} style={{ flexShrink: 0 }} />
                            <div>
                                <strong>Falta información requerida</strong>
                                <div style={{ marginTop: '2px', opacity: 0.9 }}>
                                    Por favor, corrige o completa los campos destacados en rojo para calcular la simulación.
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Results Box */}
                    {simulationResult && !hasAnyError && (
                        <div style={{
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid rgba(99, 102, 241, 0.25)',
                            borderRadius: '1rem',
                            padding: '1.25rem',
                            marginBottom: '1.25rem'
                        }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                                RESULTADO DE LA SIMULACIÓN
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', textAlign: 'center', marginBottom: '1rem' }}>
                                <div style={{ background: 'rgba(99, 102, 241, 0.1)', padding: '0.75rem', borderRadius: '0.75rem' }}>
                                    <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase' }}>Cuota Mensual</div>
                                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#818cf8', marginTop: '0.2rem' }}>
                                        {formatMoney(simulationResult.monthlyPayment)}
                                    </div>
                                </div>

                                <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '0.75rem', borderRadius: '0.75rem' }}>
                                    <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase' }}>Total Intereses</div>
                                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f87171', marginTop: '0.2rem' }}>
                                        {formatMoney(simulationResult.totalInterests)}
                                    </div>
                                </div>

                                <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '0.75rem', borderRadius: '0.75rem' }}>
                                    <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase' }}>Total Amortizado</div>
                                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#34d399', marginTop: '0.2rem' }}>
                                        {formatMoney(simulationResult.totalPayable)}
                                    </div>
                                </div>
                            </div>

                            {/* Schedule Toggle */}
                            {simulationResult.schedule.length > 0 && (
                                <div>
                                    <button
                                        type="button"
                                        onClick={() => setShowSchedule(!showSchedule)}
                                        style={{
                                            background: 'transparent', border: 'none', color: '#818cf8',
                                            fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', gap: '0.4rem', padding: 0
                                        }}
                                    >
                                        {showSchedule ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                        {showSchedule ? 'Ocultar Cuadro de Amortización' : 'Ver Cuadro de Amortización'}
                                    </button>

                                    {showSchedule && (
                                        <div style={{ marginTop: '0.75rem', maxHeight: '180px', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.5rem' }}>
                                            <table style={{ width: '100%', fontSize: '0.75rem', borderCollapse: 'collapse', textAlign: 'right' }}>
                                                <thead style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.6)' }}>
                                                    <tr>
                                                        <th style={{ padding: '6px', textAlign: 'center' }}>Mes</th>
                                                        <th style={{ padding: '6px' }}>Cuota</th>
                                                        <th style={{ padding: '6px' }}>Capital</th>
                                                        <th style={{ padding: '6px' }}>Interés</th>
                                                        <th style={{ padding: '6px' }}>Pendiente</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {simulationResult.schedule.map(row => (
                                                        <tr key={row.month} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                                            <td style={{ padding: '6px', textAlign: 'center' }}>{row.month}</td>
                                                            <td style={{ padding: '6px' }}>{formatMoney(row.payment)}</td>
                                                            <td style={{ padding: '6px', color: '#34d399' }}>{formatMoney(row.capital)}</td>
                                                            <td style={{ padding: '6px', color: '#f87171' }}>{formatMoney(row.interest)}</td>
                                                            <td style={{ padding: '6px', opacity: 0.7 }}>{formatMoney(row.remaining)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{
                                flex: 1,
                                padding: '0.85rem',
                                borderRadius: '0.75rem',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                background: 'transparent',
                                color: 'white',
                                fontWeight: 600,
                                cursor: 'pointer'
                            }}
                        >
                            Cerrar
                        </button>

                        <button
                            type="button"
                            onClick={handleConvert}
                            disabled={hasAnyError || !simulationResult}
                            style={{
                                flex: 1.8,
                                padding: '0.85rem',
                                borderRadius: '0.75rem',
                                border: 'none',
                                background: (hasAnyError || !simulationResult) ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                                color: (hasAnyError || !simulationResult) ? 'rgba(255,255,255,0.3)' : 'white',
                                fontWeight: 700,
                                fontSize: '0.9rem',
                                cursor: (hasAnyError || !simulationResult) ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem',
                                boxShadow: (hasAnyError || !simulationResult) ? 'none' : '0 4px 15px rgba(99, 102, 241, 0.4)'
                            }}
                        >
                            <ArrowRight size={18} /> Convertir en Préstamo Real
                        </button>
                    </div>
                </div>
            </div>
        </ModalPortal>
    );
};

export default LoanSimulatorModal;
