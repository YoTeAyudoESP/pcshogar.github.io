import React, { useEffect, useRef, useState } from 'react';
import { X, CheckCircle, Clock } from 'lucide-react';
import type { Loan } from '../../types/finance';
import { calculateLoanAmortization, formatMoney } from '../../utils/financeCalculations';
import ModalPortal from '../common/ModalPortal';

interface LoanScheduleModalProps {
    loan: Loan;
    onClose: () => void;
}

const LoanScheduleModal: React.FC<LoanScheduleModalProps> = ({ loan, onClose }) => {
    const currentRef = useRef<HTMLDivElement | HTMLTableRowElement | null>(null);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const calc = calculateLoanAmortization(loan);

    useEffect(() => {
        if (currentRef.current) {
            setTimeout(() => {
                currentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 200);
        }
    }, [calc]);

    if (!calc) {
        return (
            <ModalPortal>
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 1000, padding: '1rem'
                }}>
                    <div style={{
                        background: 'linear-gradient(145deg, #1e1e2d 0%, #151521 100%)',
                        border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1.25rem',
                        padding: '1.5rem', maxWidth: '450px', width: '100%', color: 'white', textAlign: 'center'
                    }}>
                        <h3>Cuadro no disponible</h3>
                        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem' }}>
                            Para ver el cuadro de amortización completo se requiere configurar el tin/tae y la cuota mensual del préstamo.
                        </p>
                        <button
                            onClick={onClose}
                            style={{
                                marginTop: '1rem', padding: '0.75rem 1.5rem', borderRadius: '0.75rem',
                                border: 'none', background: 'var(--color-primary)', color: 'white', fontWeight: 700, cursor: 'pointer'
                            }}
                        >
                            Cerrar
                        </button>
                    </div>
                </div>
            </ModalPortal>
        );
    }

    const currentInstallment = calc.schedule.find(s => s.isCurrent) || calc.schedule[calc.schedule.length - 1];

    return (
        <ModalPortal>
            <div style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 1000, padding: isMobile ? '0.5rem' : '1.5rem'
            }}>
                <div style={{
                    background: 'linear-gradient(145deg, #1e1e2d 0%, #151521 100%)',
                    border: '1px solid rgba(255,255,255,0.12)', borderRadius: '1.25rem',
                    width: '100%', maxWidth: '850px', maxHeight: '92vh',
                    display: 'flex', flexDirection: 'column', color: 'white', overflow: 'hidden'
                }}>
                    {/* Header */}
                    <div style={{
                        padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    }}>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'white' }}>
                                Cuadro de Amortización: {loan.name}
                            </h3>
                            <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>
                                TIN: {loan.tin || loan.tae || 0}% | Cuota: {formatMoney(loan.monthlyPayment || loan.monthlyInstallment || 0)}/mes
                            </span>
                        </div>
                        <button
                            onClick={onClose}
                            style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', padding: '0.4rem' }}
                        >
                            <X size={22} />
                        </button>
                    </div>

                    {/* Summary Cards Header */}
                    <div style={{
                        display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3, 1fr)',
                        gap: '0.75rem', padding: '1rem 1.5rem', background: 'rgba(255,255,255,0.02)',
                        borderBottom: '1px solid rgba(255,255,255,0.08)'
                    }}>
                        <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)', padding: '0.75rem 1rem', borderRadius: '0.85rem' }}>
                            <div style={{ fontSize: '0.75rem', color: '#60a5fa', fontWeight: 600 }}>Deuda Principal Pendiente</div>
                            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'white', marginTop: '2px' }}>
                                {formatMoney(calc.remainingCapital)}
                            </div>
                        </div>

                        <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)', padding: '0.75rem 1rem', borderRadius: '0.85rem' }}>
                            <div style={{ fontSize: '0.75rem', color: '#fbbf24', fontWeight: 600 }}>Cuota Actual</div>
                            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'white', marginTop: '2px' }}>
                                {currentInstallment ? `${currentInstallment.installmentNumber} / ${calc.schedule.length}` : '-'}
                            </div>
                        </div>

                        <div style={{
                            background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)',
                            padding: '0.75rem 1rem', borderRadius: '0.85rem',
                            gridColumn: isMobile ? '1 / -1' : 'auto'
                        }}>
                            <div style={{ fontSize: '0.75rem', color: '#f87171', fontWeight: 600 }}>Intereses Restantes por Pagar</div>
                            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'white', marginTop: '2px' }}>
                                {formatMoney(calc.remainingInterest)}
                            </div>
                        </div>
                    </div>

                    {/* Body: Mobile Cards vs Desktop Table */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '0.75rem' : '1.25rem' }}>
                        {isMobile ? (
                            /* MOBILE VERTICAL STACKED CARDS - NO HORIZONTAL SCROLL EVER */
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {calc.schedule.map(row => {
                                    const monthLabel = row.date.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' });
                                    return (
                                        <div
                                            key={row.installmentNumber}
                                            ref={row.isCurrent ? (el => { currentRef.current = el; }) : null}
                                            style={{
                                                background: row.isCurrent
                                                    ? 'rgba(59, 130, 246, 0.18)'
                                                    : row.isPaid
                                                        ? 'rgba(255,255,255,0.03)'
                                                        : 'rgba(255,255,255,0.015)',
                                                border: row.isCurrent
                                                    ? '2px solid #3b82f6'
                                                    : '1px solid rgba(255,255,255,0.08)',
                                                borderRadius: '0.85rem',
                                                padding: '0.85rem 1rem'
                                            }}
                                        >
                                            {/* Card Top Header */}
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.4rem' }}>
                                                <div style={{ fontWeight: 800, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <span>Cuota {row.installmentNumber}</span>
                                                    <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', fontWeight: 400 }}>({monthLabel})</span>
                                                </div>
                                                {row.isCurrent ? (
                                                    <span style={{ background: '#3b82f6', color: 'white', padding: '0.2rem 0.6rem', borderRadius: '1rem', fontSize: '0.7rem', fontWeight: 700 }}>
                                                        📍 Cuota Actual
                                                    </span>
                                                ) : row.isPaid ? (
                                                    <span style={{ color: '#10b981', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px' }}>
                                                        <CheckCircle size={12} /> Pagada
                                                    </span>
                                                ) : (
                                                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                                        <Clock size={12} /> Pendiente
                                                    </span>
                                                )}
                                            </div>

                                            {/* Card Grid Details */}
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.8rem' }}>
                                                <div>
                                                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem' }}>Cuota Total</div>
                                                    <div style={{ fontWeight: 700, color: 'white' }}>{formatMoney(row.payment)}</div>
                                                </div>
                                                <div>
                                                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem' }}>Amort. Capital</div>
                                                    <div style={{ fontWeight: 700, color: '#10b981' }}>{formatMoney(row.capital)}</div>
                                                </div>
                                                <div>
                                                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem' }}>Interés del Mes</div>
                                                    <div style={{ fontWeight: 700, color: '#ef4444' }}>{formatMoney(row.interest)}</div>
                                                </div>
                                                <div>
                                                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem' }}>Deuda Restante</div>
                                                    <div style={{ fontWeight: 700, color: '#3b82f6' }}>{formatMoney(row.remainingCapital)}</div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            /* DESKTOP TABLE VIEW */
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                <thead>
                                    <tr style={{ borderBottom: '2px solid rgba(255,255,255,0.1)', textAlign: 'left' }}>
                                        <th style={{ padding: '0.75rem 0.5rem', color: 'rgba(255,255,255,0.6)' }}>Nº</th>
                                        <th style={{ padding: '0.75rem 0.5rem', color: 'rgba(255,255,255,0.6)' }}>Mes / Año</th>
                                        <th style={{ padding: '0.75rem 0.5rem', color: 'rgba(255,255,255,0.6)', textAlign: 'right' }}>Cuota</th>
                                        <th style={{ padding: '0.75rem 0.5rem', color: 'rgba(255,255,255,0.6)', textAlign: 'right' }}>Capital</th>
                                        <th style={{ padding: '0.75rem 0.5rem', color: 'rgba(255,255,255,0.6)', textAlign: 'right' }}>Intereses</th>
                                        <th style={{ padding: '0.75rem 0.5rem', color: 'rgba(255,255,255,0.6)', textAlign: 'right' }}>Capital Pendiente</th>
                                        <th style={{ padding: '0.75rem 0.5rem', color: 'rgba(255,255,255,0.6)', textAlign: 'center' }}>Estado</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {calc.schedule.map(row => {
                                        const monthLabel = row.date.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' });
                                        return (
                                            <tr
                                                key={row.installmentNumber}
                                                ref={row.isCurrent ? (el => { currentRef.current = el; }) : null}
                                                style={{
                                                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                                                    background: row.isCurrent ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                                                    fontWeight: row.isCurrent ? 700 : 400
                                                }}
                                            >
                                                <td style={{ padding: '0.65rem 0.5rem' }}>{row.installmentNumber}</td>
                                                <td style={{ padding: '0.65rem 0.5rem', color: 'rgba(255,255,255,0.85)' }}>{monthLabel}</td>
                                                <td style={{ padding: '0.65rem 0.5rem', textAlign: 'right', fontWeight: 600 }}>{formatMoney(row.payment)}</td>
                                                <td style={{ padding: '0.65rem 0.5rem', textAlign: 'right', color: '#10b981', fontWeight: 600 }}>{formatMoney(row.capital)}</td>
                                                <td style={{ padding: '0.65rem 0.5rem', textAlign: 'right', color: '#ef4444' }}>{formatMoney(row.interest)}</td>
                                                <td style={{ padding: '0.65rem 0.5rem', textAlign: 'right', color: '#3b82f6', fontWeight: 600 }}>{formatMoney(row.remainingCapital)}</td>
                                                <td style={{ padding: '0.65rem 0.5rem', textAlign: 'center' }}>
                                                    {row.isCurrent ? (
                                                        <span style={{ background: '#3b82f6', color: 'white', padding: '0.15rem 0.5rem', borderRadius: '1rem', fontSize: '0.7rem', fontWeight: 700 }}>
                                                            📍 Actual
                                                        </span>
                                                    ) : row.isPaid ? (
                                                        <span style={{ color: '#10b981', fontSize: '0.75rem', fontWeight: 600 }}>Pagada</span>
                                                    ) : (
                                                        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}>Pendiente</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>
        </ModalPortal>
    );
};

export default LoanScheduleModal;
