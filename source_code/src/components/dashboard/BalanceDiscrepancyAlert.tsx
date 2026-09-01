import React, { useMemo, useState } from 'react';
import { useFinance } from '../../contexts/FinanceContext';
import { AlertTriangle, TrendingDown, PiggyBank, ChevronDown, ChevronUp, Calendar, Check, Wallet } from 'lucide-react';
import { calculateBalanceDiscrepancy, calculateAvailableBalanceForMonth, formatMoney } from '../../utils/financeCalculations';
import type { SavingGoal } from '../../types/finance';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function nextIncomeDate(paymentDay: number): Date {
    const now = new Date();
    const candidate = new Date(now.getFullYear(), now.getMonth(), paymentDay);
    if (candidate <= now) candidate.setMonth(candidate.getMonth() + 1);
    return candidate;
}

function formatDate(d: Date): string {
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatMonthLabel(mesActual: string): string {
    const [year, month] = mesActual.split('-');
    const d = new Date(Number(year), Number(month) - 1, 1);
    return d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
}

// ─────────────────────────────────────────────────────────────────────────────
// Breakdown row helper (only renders if value > 0)
// ─────────────────────────────────────────────────────────────────────────────
const BreakdownRow: React.FC<{
    label: string;
    value: number;
    color?: string;
    separator?: boolean;
    bold?: boolean;
}> = ({ label, value, color = 'rgba(255,255,255,0.7)', separator = false, bold = false }) => {
    if (Math.abs(value) < 0.005 && !bold) return null;
    return (
        <>
            {separator && <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', margin: '4px 0' }} />}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '3px 0' }}>
                <span style={{ fontSize: '0.82rem', color: bold ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.5)', fontWeight: bold ? 700 : 400 }}>{label}</span>
                <span style={{ fontSize: '0.85rem', color, fontWeight: bold ? 800 : 500 }}>{formatMoney(value)}</span>
            </div>
        </>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

const BalanceDiscrepancyAlert: React.FC = () => {
    const { accounts, savings, expenses, cards, fixedIncomes, recurringExpenses, incomes, allocations, overrides, adjustSavings, setMonthOverride } = useFinance();

    const result = useMemo(() => {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();

        const autoAvailable = calculateAvailableBalanceForMonth(currentYear, currentMonth, {
            fixedIncomes: (incomes || []).filter((i: any) => i.type === 'fixed') as any[],
            extraIncomes: incomes?.filter(i => i.type === 'extra' || i.type === 'rollover') || [],
            expenses,
            allocations,
            savings,
            recurringExpenses,
            overrides,
            cards
        });

        // autoAvailable.availableToSpend already incorporates MonthOverride (if active)
        // and subtracts subsequent variable expenses, fixed deviations, and allocations.
        const manualOverride = (overrides || []).find(o => o.year === currentYear && o.month === currentMonth);
        const effectiveAvailableToSpend = autoAvailable.availableToSpend;

        return {
            ...calculateBalanceDiscrepancy(accounts, savings, expenses, cards, recurringExpenses, effectiveAvailableToSpend, 0.50, incomes, allocations),
            baseAvailableToSpend: autoAvailable.availableToSpend,
            effectiveAvailableToSpend,
            isManualOverrideActive: !!manualOverride
        };
    }, [accounts, savings, expenses, cards, recurringExpenses, incomes, allocations, overrides]);

    const {
        dineroReal, dineroLibreReal, compromisoGastos, compromisoTarjetas,
        compromisos, dineroEnHuchas, desajuste, isOverdraft,
        hasSignificantDiscrepancy, mesActual, baseAvailableToSpend,
        effectiveAvailableToSpend, isManualOverrideActive
    } = result;

    const [expanded, setExpanded] = useState(false);
    const [showProjection, setShowProjection] = useState(false);

    // Distribution state — "dinero sin asignar" (desajuste > 0)
    const [distributions, setDistributions] = useState<Record<string, number>>({});
    const [distributing, setDistributing] = useState(false);

    // Reduction state — "huchas > dinero libre" (desajuste < 0)
    const [reductions, setReductions] = useState<Record<string, number>>({});
    const [reducing, setReducing] = useState(false);

    // ── Income projection for overdraft ──────────────────────────────────────
    const incomeProjection = useMemo(() => {
        if (!isOverdraft) return [];
        const activeIncomes = fixedIncomes.filter(inc => inc.active && inc.frequency === 'monthly');
        const upcoming = activeIncomes
            .map(inc => ({ inc, date: nextIncomeDate(inc.paymentDay) }))
            .sort((a, b) => a.date.getTime() - b.date.getTime());

        const shortfall = Math.abs(dineroReal);
        let accumulated = 0;
        const rows: { name: string; amount: number; date: Date; cumulative: number; solves: boolean }[] = [];
        for (const { inc, date } of upcoming) {
            accumulated += inc.amount;
            rows.push({ name: inc.name, amount: inc.amount, date, cumulative: accumulated, solves: accumulated >= shortfall });
            if (accumulated >= shortfall) break;
        }
        return rows;
    }, [isOverdraft, fixedIncomes, dineroReal]);

    // ── Check if dismissed ────────────────────────────────────────────────────
    const [dismissedUntil, setDismissedUntil] = useState<number>(0);
    
    React.useEffect(() => {
        try {
            const saved = localStorage.getItem('balanceDiscrepancyDismissed');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed.untilDate) {
                    setDismissedUntil(parsed.untilDate);
                }
            }
        } catch (e) {
            console.error('Error reading discrepancy dismissed state', e);
        }
    }, []);

    // ── Guard ─────────────────────────────────────────────────────────────────
    if (!isOverdraft && !hasSignificantDiscrepancy) return null;
    
    if (Date.now() < dismissedUntil) {
        return (
            <div 
                onClick={() => {
                    localStorage.removeItem('balanceDiscrepancyDismissed');
                    setDismissedUntil(0);
                }}
                style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px', 
                    padding: '8px 16px', 
                    background: 'linear-gradient(135deg, rgba(245,158,11,0.2) 0%, rgba(245,158,11,0.05) 100%)', 
                    border: '1px solid rgba(245,158,11,0.3)', 
                    borderRadius: '24px', 
                    marginBottom: '1rem',
                    cursor: 'pointer',
                    width: 'fit-content',
                    fontSize: '0.85rem',
                    color: '#f59e0b',
                    fontWeight: 600,
                    transition: 'all 0.2s',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}
            >
                <AlertTriangle size={16} color="#f59e0b" />
                <span>Descuadre de saldos oculto (Toca para restaurar)</span>
            </div>
        );
    }

    const isUnassigned  = !isOverdraft && desajuste > 0;
    const isNegativeGap = !isOverdraft && desajuste < 0;

    // ── Colours ───────────────────────────────────────────────────────────────
    const borderColor = isOverdraft ? 'rgba(244,63,94,0.5)' : isUnassigned ? 'rgba(245,158,11,0.45)' : 'rgba(251,146,60,0.45)';
    const bgColor     = isOverdraft ? 'rgba(244,63,94,0.08)' : isUnassigned ? 'rgba(245,158,11,0.07)' : 'rgba(251,146,60,0.07)';
    const accentColor = isOverdraft ? '#f43f5e' : isUnassigned ? '#f59e0b' : '#fb923c';
    const Icon        = isOverdraft ? TrendingDown : isUnassigned ? PiggyBank : AlertTriangle;

    // ── Distribution handlers ─────────────────────────────────────────────────
    const totalDistributed = Object.values(distributions).reduce((s, v) => s + v, 0);
    const remainingToAssign = Math.max(0, Math.abs(desajuste) - totalDistributed);

    const handleApplyDistribution = async () => {
        setDistributing(true);
        try {
            for (const [goalId, amount] of Object.entries(distributions)) {
                if (goalId === 'disponible') continue;
                if (amount > 0) {
                    const src = accounts.find(a => a.type === 'bank') || accounts[0];
                    if (src) await adjustSavings(goalId, amount, src.id, false, undefined, undefined, undefined, 'adjustment', 'Ajuste por descuadre de saldo');
                }
            }
            handleDismissNextMonth();
            setDistributions({});
            setExpanded(false);
        } finally { setDistributing(false); }
    };

    const totalReduction = Object.values(reductions).reduce((s, v) => s + v, 0);

    const handleApplyReduction = async () => {
        setReducing(true);
        try {
            for (const [goalId, amount] of Object.entries(reductions)) {
                if (amount && amount > 0 && goalId !== 'disponible') {
                    await adjustSavings(goalId, -amount, undefined, false, undefined, undefined, undefined, 'adjustment', 'Ajuste por descuadre de saldo');
                }
            }
            handleDismissNextMonth();
            setReductions({});
            setExpanded(false);
        } finally { setReducing(false); }
    };

    const monthLabel = formatMonthLabel(mesActual);

    const handleDismissDays = (days: number) => {
        const until = Date.now() + days * 24 * 60 * 60 * 1000;
        localStorage.setItem('balanceDiscrepancyDismissed', JSON.stringify({ untilDate: until }));
        setDismissedUntil(until);
    };

    const handleDismissNextMonth = () => {
        const now = new Date();
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        localStorage.setItem('balanceDiscrepancyDismissed', JSON.stringify({ untilDate: nextMonth.getTime() }));
        setDismissedUntil(nextMonth.getTime());
    };

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div style={{ borderRadius: '16px', border: `1px solid ${borderColor}`, background: bgColor, marginBottom: '1rem', overflow: 'hidden', transition: 'all 0.3s ease' }}>

            {/* ── Header ───────────────────────────────────────────────────── */}
            <div onClick={() => setExpanded(e => !e)} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem 1.25rem', cursor: 'pointer', userSelect: 'none' }}>
                <div style={{ background: `${accentColor}20`, borderRadius: '10px', padding: '8px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={20} color={accentColor} />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                    {isOverdraft && (
                        <>
                            <div style={{ fontWeight: 700, color: accentColor, fontSize: '0.95rem' }}>⚠️ Descubierto bancario: {formatMoney(Math.abs(dineroReal))}</div>
                            <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.55)', marginTop: '2px' }}>Tu saldo real en bancos y efectivo es negativo. Toca para ver más.</div>
                        </>
                    )}
                    {isUnassigned && (
                        <>
                            <div style={{ fontWeight: 700, color: accentColor, fontSize: '0.95rem' }}>💰 Tienes {formatMoney(desajuste)} libres sin asignar</div>
                            <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.55)', marginTop: '2px' }}>Dinero real disponible tras descontar compromisos del mes y huchas.</div>
                        </>
                    )}
                    {isNegativeGap && (
                        <>
                            <div style={{ fontWeight: 700, color: accentColor, fontSize: '0.95rem' }}>⚠️ Desajuste de {formatMoney(Math.abs(desajuste))}: compromisos + huchas superan tu dinero real</div>
                            <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.55)', marginTop: '2px' }}>Lo asignado excede tu dinero libre real. Toca para ajustar.</div>
                        </>
                    )}
                    {/* Real-date badge — always visible */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '5px' }}>
                        <Calendar size={11} color="rgba(255,255,255,0.3)" />
                        <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)', fontWeight: 500 }}>
                            Estado real · {monthLabel}
                        </span>
                    </div>
                </div>

                <div style={{ color: 'rgba(255,255,255,0.4)', flexShrink: 0 }}>
                    {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </div>
            </div>

            {/* ── Expanded panel ───────────────────────────────────────────── */}
            {expanded && (
                <div style={{ borderTop: `1px solid ${borderColor}`, padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                    {/* ─── Breakdown (all non-overdraft scenarios) ───── */}
                    {!isOverdraft && (
                        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '0.9rem 1rem' }}>
                            <BreakdownRow label="Saldo bruto bancos / efectivo" value={dineroReal} color="rgba(255,255,255,0.75)" />
                            {compromisoGastos > 0.005 && <BreakdownRow label="Gastos pendientes del mes (fijos y variables)" value={-compromisoGastos} color="#f87171" />}
                            {compromisoTarjetas > 0.005 && <BreakdownRow label="Ciclos de tarjeta de crédito abiertos" value={-compromisoTarjetas} color="#f87171" />}
                            <BreakdownRow label="Dinero libre real" value={dineroLibreReal} color={dineroLibreReal >= 0 ? '#10b981' : '#f43f5e'} separator bold />
                            {dineroEnHuchas > 0.005 && <BreakdownRow label="En huchas" value={-dineroEnHuchas} color="#818cf8" />}
                            {effectiveAvailableToSpend > 0.005 && <BreakdownRow label={isManualOverrideActive ? "Disponible del mes (Ajustado por ti)" : "Disponible del mes"} value={-effectiveAvailableToSpend} color="#f59e0b" />}
                            <BreakdownRow label={isUnassigned ? 'Sin asignar' : 'Desajuste negativo'} value={desajuste} color={accentColor} separator bold />
                        </div>
                    )}

                    {/* ─── OVERDRAFT ────────────────────────────────── */}
                    {isOverdraft && (
                        <>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                <div style={statBox}><span style={statLabel}>Saldo real total</span><span style={{ ...statValue, color: '#f43f5e' }}>{formatMoney(dineroReal)}</span></div>
                                <div style={statBox}><span style={statLabel}>En huchas</span><span style={{ ...statValue, color: '#818cf8' }}>{formatMoney(dineroEnHuchas)}</span></div>
                            </div>
                            <p style={{ margin: 0, fontSize: '0.85rem', color: 'rgba(255,255,255,0.65)', lineHeight: 1.5 }}>
                                No tienes capacidad real para cubrir este descubierto de <strong style={{ color: '#f43f5e' }}>{formatMoney(Math.abs(dineroReal))}</strong>. Solo nuevos ingresos podrán solventarlo.
                            </p>
                            {incomeProjection.length > 0 && (
                                <button onClick={e => { e.stopPropagation(); setShowProjection(p => !p); }} style={linkButton}>
                                    <Calendar size={14} />
                                    {showProjection ? 'Ocultar proyección' : '¿Cuándo podré solventarlo?'}
                                </button>
                            )}
                            {showProjection && incomeProjection.length > 0 && (
                                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', overflow: 'hidden' }}>
                                    <div style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', borderBottom: '1px solid rgba(255,255,255,0.05)', fontWeight: 600 }}>PRÓXIMOS INGRESOS FIJOS (MENSUAL)</div>
                                    {incomeProjection.map((row, i) => (
                                        <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', borderBottom: i < incomeProjection.length - 1 ? '1px solid rgba(255,255,255,0.04)' : undefined, background: row.solves ? 'rgba(16,185,129,0.06)' : undefined }}>
                                            <div>
                                                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'white' }}>{row.name}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)' }}>{formatDate(row.date)}</div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#10b981' }}>+{formatMoney(row.amount)}</div>
                                                <div style={{ fontSize: '0.75rem', color: row.solves ? '#10b981' : 'rgba(255,255,255,0.45)' }}>Acum.: {formatMoney(row.cumulative)}{row.solves && ' ✓'}</div>
                                            </div>
                                        </div>
                                    ))}
                                    {incomeProjection.some(r => r.solves) && (
                                        <div style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', color: '#10b981', fontWeight: 600, borderTop: '1px solid rgba(16,185,129,0.15)' }}>
                                            ✅ Con {incomeProjection.find(r => r.solves)?.name} ({formatDate(incomeProjection.find(r => r.solves)!.date)}) podrías cubrir el descubierto.
                                        </div>
                                    )}
                                </div>
                            )}
                            {incomeProjection.length === 0 && (
                                <p style={{ margin: 0, fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' }}>
                                    No tienes ingresos fijos mensuales configurados. Ve a Gestión y Ajustes → Ingresos Fijos para añadirlos.
                                </p>
                            )}
                        </>
                    )}

                    {/* ─── UNASSIGNED: distribute ──────────────────────── */}
                    {isUnassigned && (
                        <>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                <div style={statBox}><span style={statLabel}>Libre sin asignar</span><span style={{ ...statValue, color: '#f59e0b' }}>{formatMoney(desajuste)}</span></div>
                                <div style={statBox}><span style={statLabel}>Pendiente de asignar</span><span style={{ ...statValue, color: remainingToAssign > 0.005 ? '#f59e0b' : '#10b981' }}>{formatMoney(remainingToAssign)}</span></div>
                            </div>
                            <p style={{ margin: 0, fontSize: '0.85rem', color: 'rgba(255,255,255,0.65)', lineHeight: 1.5 }}>
                                Distribuye este dinero entre tus huchas o déjalo como disponible libre. Solo se aplicará lo que indiques.
                            </p>
                            {savings.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                    <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>ASIGNAR A HUCHAS</div>
                                    {savings.map((goal: SavingGoal) => (
                                        <div key={goal.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                                            <PiggyBank size={16} color="#818cf8" style={{ flexShrink: 0 }} />
                                            <span style={{ flex: 1, fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)' }}>{goal.name}</span>
                                            <div style={inputWrapper}>
                                                <input type="text" inputMode="decimal" value={distributions[goal.id] ?? ''} placeholder="0,00"
                                                    onChange={e => {
                                                        const raw = e.target.value.replace(',', '.');
                                                        if (raw !== '' && isNaN(Number(raw))) return;
                                                        let v = parseFloat(raw) || 0;
                                                        const currentOthers = Object.entries(distributions).filter(([k]) => k !== goal.id).reduce((s, [_, val]) => s + val, 0);
                                                        if (currentOthers + v > desajuste) {
                                                            v = Math.max(0, desajuste - currentOthers);
                                                        }
                                                        setDistributions(prev => ({ ...prev, [goal.id]: raw === '' ? undefined : Number(v.toFixed(2)) } as any));
                                                    }}
                                                    style={numInput} />
                                                <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>€</span>
                                            </div>
                                        </div>
                                    ))}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0, marginTop: '4px', borderTop: '1px dashed rgba(255,255,255,0.1)', paddingTop: '10px' }}>
                                        <Wallet size={16} color="#f59e0b" style={{ flexShrink: 0 }} />
                                        <span style={{ flex: 1, fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)' }}>Dejar en Disponible libre</span>
                                        <div style={inputWrapper}>
                                            <input type="text" inputMode="decimal" value={distributions['disponible'] ?? ''} placeholder="0,00"
                                                onChange={e => {
                                                    const raw = e.target.value.replace(',', '.');
                                                    if (raw !== '' && isNaN(Number(raw))) return;
                                                    let v = parseFloat(raw) || 0;
                                                    const currentOthers = Object.entries(distributions).filter(([k]) => k !== 'disponible').reduce((s, [_, val]) => s + val, 0);
                                                    if (currentOthers + v > desajuste) {
                                                        v = Math.max(0, desajuste - currentOthers);
                                                    }
                                                    setDistributions(prev => ({ ...prev, 'disponible': raw === '' ? undefined : Number(v.toFixed(2)) } as any));
                                                }}
                                                style={numInput} />
                                            <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>€</span>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <p style={{ margin: 0, fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' }}>No tienes huchas configuradas. Ve a Gestión y Ajustes → Huchas para crear una.</p>
                            )}
                            {savings.length > 0 && (
                                <button onClick={handleApplyDistribution} disabled={distributing || totalDistributed < 0.005}
                                    style={{ ...applyButton, background: totalDistributed < 0.005 ? 'rgba(255,255,255,0.05)' : 'rgba(245,158,11,0.2)', border: `1px solid ${totalDistributed < 0.005 ? 'rgba(255,255,255,0.08)' : 'rgba(245,158,11,0.35)'}`, color: totalDistributed < 0.005 ? 'rgba(255,255,255,0.3)' : '#f59e0b', cursor: totalDistributed < 0.005 ? 'not-allowed' : 'pointer' }}>
                                    <Check size={16} />
                                    {distributing ? 'Aplicando...' : `Aplicar asignación (${formatMoney(totalDistributed)})`}
                                </button>
                            )}
                        </>
                    )}

                    {/* ─── NEGATIVE GAP: reduce huchas or disponible ───── */}
                    {isNegativeGap && (
                        <>
                            <p style={{ margin: 0, fontSize: '0.85rem', color: 'rgba(255,255,255,0.65)', lineHeight: 1.5 }}>
                                Necesitas reducir el disponible del mes o el saldo de tus huchas en al menos <strong style={{ color: '#fb923c' }}>{formatMoney(Math.abs(desajuste))}</strong> para cuadrar con tu dinero libre real.
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>REDUCIR SALDOS</div>
                                
                                {/* Option to reduce from Disponible del Mes */}
                                {effectiveAvailableToSpend > 0 && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                                        <Wallet size={16} color="#f59e0b" style={{ flexShrink: 0 }} />
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>Disponible del Mes</div>
                                            <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)' }}>Disponible actual: {formatMoney(effectiveAvailableToSpend)}</div>
                                        </div>
                                        <div style={inputWrapper}>
                                            <input type="text" inputMode="decimal" value={reductions['disponible'] ?? ''} placeholder="0,00"
                                                onChange={e => {
                                                    const raw = e.target.value.replace(',', '.');
                                                    if (raw !== '' && isNaN(Number(raw))) return;
                                                    let v = parseFloat(raw) || 0;
                                                    const currentOthers = Object.entries(reductions).filter(([k]) => k !== 'disponible').reduce((s, [_, val]) => s + val, 0);
                                                    const needed = Math.abs(desajuste);
                                                    if (currentOthers + v > needed) {
                                                        v = Math.max(0, needed - currentOthers);
                                                    }
                                                    if (v > effectiveAvailableToSpend) v = effectiveAvailableToSpend;
                                                    setReductions(prev => ({ ...prev, 'disponible': raw === '' ? undefined : Number(v.toFixed(2)) } as any));
                                                }}
                                                style={numInput} />
                                            <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>€</span>
                                        </div>
                                    </div>
                                )}

                                {/* Huchas reduction options */}
                                {savings.filter(s => s.currentAmount > 0).map((goal: SavingGoal) => (
                                    <div key={goal.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                                        <PiggyBank size={16} color="#818cf8" style={{ flexShrink: 0 }} />
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)' }}>{goal.name}</div>
                                            <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)' }}>Saldo actual: {formatMoney(goal.currentAmount)}</div>
                                        </div>
                                        <div style={inputWrapper}>
                                            <input type="text" inputMode="decimal" value={reductions[goal.id] ?? ''} placeholder="0,00"
                                                onChange={e => {
                                                    const raw = e.target.value.replace(',', '.');
                                                    if (raw !== '' && isNaN(Number(raw))) return;
                                                    let v = parseFloat(raw) || 0;
                                                    const currentOthers = Object.entries(reductions).filter(([k]) => k !== goal.id).reduce((s, [_, val]) => s + val, 0);
                                                    const needed = Math.abs(desajuste);
                                                    if (currentOthers + v > needed) {
                                                        v = Math.max(0, needed - currentOthers);
                                                    }
                                                    if (v > goal.currentAmount) v = goal.currentAmount;
                                                    setReductions(prev => ({ ...prev, [goal.id]: raw === '' ? undefined : Number(v.toFixed(2)) } as any));
                                                }}
                                                style={numInput} />
                                            <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>€</span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {(() => {
                                const isReductionValid = Math.abs(totalReduction - Math.abs(desajuste)) < 0.005;
                                return (
                                    <button onClick={handleApplyReduction} disabled={reducing || !isReductionValid}
                                        style={{ ...applyButton, background: !isReductionValid ? 'rgba(255,255,255,0.05)' : 'rgba(251,146,60,0.15)', border: `1px solid ${!isReductionValid ? 'rgba(255,255,255,0.08)' : 'rgba(251,146,60,0.35)'}`, color: !isReductionValid ? 'rgba(255,255,255,0.3)' : '#fb923c', cursor: !isReductionValid ? 'not-allowed' : 'pointer' }}>
                                        <Check size={16} />
                                        {reducing ? 'Ajustando...' : isReductionValid ? `Ajustar saldos (${formatMoney(totalReduction)})` : `Faltan ${formatMoney(Math.abs(desajuste) - totalReduction)} por recortar`}
                                    </button>
                                );
                            })()}
                        </>
                    )}

                </div>
            )}
            
            {/* ── Footer actions (Dismiss) ─────────────────────────────────── */}
            {expanded && (
                <div style={{ 
                    display: 'flex', 
                    gap: '8px', 
                    padding: '0.75rem 1.25rem', 
                    borderTop: `1px solid ${borderColor}`,
                    background: 'rgba(0,0,0,0.1)'
                }}>
                    <button onClick={() => handleDismissDays(3)} style={dismissButton}>
                        Ocultar 3 días
                    </button>
                    <button onClick={handleDismissNextMonth} style={dismissButton}>
                        Ocultar hasta el próximo mes
                    </button>
                </div>
            )}
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const statBox: React.CSSProperties = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '0.75rem 1rem', display: 'flex', flexDirection: 'column', gap: '4px' };
const statLabel: React.CSSProperties = { fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', fontWeight: 500 };
const statValue: React.CSSProperties = { fontSize: '1.1rem', fontWeight: 800 };
const linkButton: React.CSSProperties = { background: 'none', border: 'none', color: 'rgba(255,255,255,0.55)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', padding: 0, textDecoration: 'underline', textDecorationColor: 'rgba(255,255,255,0.25)', textUnderlineOffset: '3px' };
const inputWrapper: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', padding: '0 10px', flexShrink: 0 };
const numInput: React.CSSProperties = { width: '65px', padding: '8px 0', border: 'none', background: 'transparent', color: 'white', fontSize: '0.9rem', textAlign: 'right', outline: 'none' };
const applyButton: React.CSSProperties = { width: '100%', padding: '0.85rem', borderRadius: '12px', fontSize: '0.9rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s ease', marginTop: '0.25rem' };
const dismissButton: React.CSSProperties = { flex: 1, padding: '0.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem', cursor: 'pointer', transition: 'all 0.2s ease' };

export default BalanceDiscrepancyAlert;
