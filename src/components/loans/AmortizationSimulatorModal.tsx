import React, { useState } from 'react';
import { X, Calculator, ArrowRight, DollarSign } from 'lucide-react';
import type { Loan } from '../../types/finance';
import { formatMoney } from '../../utils/financeCalculations';
import { LoanCalculations } from '../../utils/loanCalculations';

interface AmortizationSimulatorModalProps {
    loan: Loan;
    onClose: () => void;
}

const AmortizationSimulatorModal: React.FC<AmortizationSimulatorModalProps> = ({ loan, onClose }) => {
    const [amountToAmortize, setAmountToAmortize] = useState('');
    const [strategy, setStrategy] = useState<'reduce_fee' | 'reduce_time'>('reduce_time');

    const currentDebt = LoanCalculations.getCurrentDebt(loan);
    const feePercentage = loan.earlyAmortizationFee || 0;

    const extraAmount = parseFloat(amountToAmortize) || 0;
    const penaltyFee = LoanCalculations.calculateAmortizationFee(extraAmount, feePercentage);
    const totalCost = extraAmount + penaltyFee;

    const remainingAfterAmortization = Math.max(0, currentDebt - extraAmount);

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, padding: '1rem', backdropFilter: 'blur(4px)'
        }}>
            <div style={{
                background: 'var(--panel-bg)', borderRadius: '1.5rem', width: '100%', maxWidth: '500px',
                padding: '2rem', boxShadow: '0 20px 50px rgba(0,0,0,0.4)', border: '1px solid var(--panel-border)',
                position: 'relative', maxHeight: '90vh', overflowY: 'auto'
            }}>
                <button onClick={onClose} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', color: 'rgba(var(--color-rgb-light), 0.5)', cursor: 'pointer' }}>
                    <X size={24} />
                </button>

                <h2 style={{ margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', gap: '0.75rem', color: loan.color || '#f59e0b' }}>
                    <Calculator size={24} />
                    Simular Amortización
                </h2>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div style={{ background: 'var(--panel-bg-2)', padding: '1rem', borderRadius: '1rem' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Capital Pendiente Real</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{formatMoney(currentDebt)}</div>
                    </div>
                    <div style={{ background: 'var(--panel-bg-2)', padding: '1rem', borderRadius: '1rem' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Comisión Banco</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{feePercentage}%</div>
                    </div>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'rgba(var(--color-rgb-light), 0.7)', marginBottom: '0.5rem' }}>
                        ¿Cuánto quieres amortizar? (Capital)
                    </label>
                    <div style={{ position: 'relative' }}>
                        <DollarSign size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input 
                            type="number" 
                            step="0.01" 
                            style={{ width: '100%', padding: '1rem 1rem 1rem 2.5rem', borderRadius: '1rem', border: '2px solid var(--panel-border)', background: 'var(--panel-bg-3)', color: 'var(--text-main)', fontSize: '1.25rem', fontWeight: 600 }}
                            value={amountToAmortize}
                            onChange={e => setAmountToAmortize(e.target.value)}
                            placeholder="0.00"
                            max={currentDebt}
                        />
                    </div>
                    <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'flex-end' }}>
                        <button 
                            onClick={() => setAmountToAmortize(currentDebt.toString())}
                            style={{ background: 'none', border: 'none', color: loan.color || '#f59e0b', cursor: 'pointer', fontWeight: 600, padding: 0 }}
                        >
                            Amortizar Todo
                        </button>
                    </div>
                </div>

                {extraAmount > 0 && (
                    <div style={{ background: 'rgba(var(--color-info-rgb), 0.05)', border: '1px solid rgba(var(--color-info-rgb), 0.2)', padding: '1.25rem', borderRadius: '1rem', marginBottom: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Capital a reducir:</span>
                            <span style={{ fontWeight: 600 }}>{formatMoney(extraAmount)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Comisión ({feePercentage}%):</span>
                            <span style={{ fontWeight: 600, color: '#e74c3c' }}>+ {formatMoney(penaltyFee)}</span>
                        </div>
                        <div style={{ borderTop: '1px solid rgba(var(--color-rgb-light), 0.1)', margin: '0.5rem 0' }}></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem' }}>
                            <span>Total a pagar hoy:</span>
                            <span style={{ fontWeight: 800 }}>{formatMoney(totalCost)}</span>
                        </div>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1rem', padding: '0.75rem', background: 'var(--panel-bg-1)', borderRadius: '0.5rem' }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Capital restante</div>
                                <div style={{ fontWeight: 700 }}>{formatMoney(remainingAfterAmortization)}</div>
                            </div>
                        </div>
                    </div>
                )}

                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button onClick={onClose} style={{ flex: 1, padding: '1rem', borderRadius: '1rem', border: '1px solid var(--panel-bg-3)', background: 'var(--panel-bg-2)', color: 'var(--text-main)', fontWeight: 600, cursor: 'pointer' }}>
                        Cerrar
                    </button>
                    {/* Botón visual para simulación. Implementación de pago real pendiente de conectarse a cuentas */}
                    <button style={{ flex: 2, padding: '1rem', borderRadius: '1rem', border: 'none', background: `linear-gradient(135deg, ${loan.color || '#f59e0b'}, #d97706)`, color: '#fff', fontWeight: 700, cursor: extraAmount > 0 ? 'pointer' : 'not-allowed', opacity: extraAmount > 0 ? 1 : 0.5 }}>
                        Pagar {formatMoney(totalCost)}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AmortizationSimulatorModal;
