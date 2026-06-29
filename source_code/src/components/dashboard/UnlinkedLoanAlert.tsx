import React, { useState } from 'react';
import { useFinance } from '../../contexts/FinanceContext';
import { Link2, X, AlertCircle, Search, Sparkles } from 'lucide-react';
import { formatMoney } from '../../utils/financeCalculations';

const UnlinkedLoanAlert: React.FC = () => {
    const { loans, recurringExpenses, updateLoan, updateRecurringExpense } = useFinance();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedLoanId, setSelectedLoanId] = useState('');
    const [selectedRecId, setSelectedRecId] = useState('');
    const [searchText, setSearchText] = useState('');

    const [dismissed, setDismissed] = useState(() => {
        try {
            return localStorage.getItem('pcshogar_loan_alert_dismissed') === 'true';
        } catch (e) {
            return false;
        }
    });

    // Find active, unpaid, and unlinked loans
    const unlinkedLoans = loans.filter(l => 
        l.status === 'active' && 
        !l.linkedRecurringExpenseId && 
        !(l.isPaid || (l.currentDebt ?? 0) <= 0)
    );

    if (unlinkedLoans.length === 0 || dismissed) return null;

    // Use first unlinked loan as default
    const currentLoan = unlinkedLoans.find(l => l.id === selectedLoanId) || unlinkedLoans[0];

    const handleDismiss = () => {
        setDismissed(true);
        try {
            localStorage.setItem('pcshogar_loan_alert_dismissed', 'true');
        } catch (e) {
            console.error(e);
        }
    };

    const handleOpenModal = () => {
        setSelectedLoanId(currentLoan.id);
        setSelectedRecId('');
        setSearchText('');
        setIsModalOpen(true);
    };

    const handleLink = async () => {
        if (!selectedLoanId || !selectedRecId) return;

        const loan = loans.find(l => l.id === selectedLoanId);
        const rec = recurringExpenses.find(r => r.id === selectedRecId);

        if (!loan || !rec) return;

        try {
            // Update loan
            await updateLoan({
                ...loan,
                linkedRecurringExpenseId: rec.id,
                updatedAt: Date.now()
            });

            // If selected recurring expense is not in Loans category, re-categorize it
            if (rec.categoryId !== 'cat_loans') {
                await updateRecurringExpense({
                    ...rec,
                    categoryId: 'cat_loans',
                    updatedAt: Date.now()
                });
                alert(`¡Vinculado con éxito! Se ha actualizado la categoría de "${rec.description}" a "Préstamos" para mantener tus gráficos correctos.`);
            } else {
                alert(`¡Vinculado con éxito! El préstamo "${loan.name}" ahora está conectado con "${rec.description}".`);
            }

            setIsModalOpen(false);
        } catch (err) {
            console.error("Error linking loan:", err);
            alert("Ocurrió un error al vincular el préstamo.");
        }
    };

    // Prepare lists of recurring expenses for dropdown
    const activeRecs = recurringExpenses.filter(r => r.active);
    
    // Keywords for matching loan/debt concepts
    const matchKeywords = ['prestamo', 'préstamo', 'hipoteca', 'coche', 'moto', 'credito', 'crédito', 'cuota', 'financiación', 'amorti'];
    
    const isRecommended = (rec: typeof activeRecs[0]) => {
        if (rec.categoryId === 'cat_loans') return true;
        const desc = rec.description.toLowerCase();
        // Check keywords
        if (matchKeywords.some(k => desc.includes(k))) return true;
        // Check loan name partial match
        if (currentLoan && desc.includes(currentLoan.name.toLowerCase())) return true;
        return false;
    };

    const recommendedRecs = activeRecs.filter(r => isRecommended(r));
    const otherRecs = activeRecs.filter(r => !isRecommended(r));

    // Filtered lists by search text
    const filterList = (list: typeof activeRecs) => {
        if (!searchText.trim()) return list;
        const query = searchText.toLowerCase();
        return list.filter(r => r.description.toLowerCase().includes(query) || r.amount.toString().includes(query));
    };

    const finalRecommended = filterList(recommendedRecs);
    const finalOther = filterList(otherRecs);

    return (
        <>
            {/* Banner Alert */}
            <div style={{
                background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(217, 119, 6, 0.06) 100%)',
                border: '1px solid rgba(245, 158, 11, 0.2)',
                borderRadius: '16px',
                padding: '1.25rem',
                marginBottom: '1.5rem',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
                backdropFilter: 'blur(10px)',
                animation: 'fadeIn 0.3s ease',
                boxSizing: 'border-box',
                width: '100%'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '280px' }}>
                    <div style={{
                        background: 'rgba(245, 158, 11, 0.15)',
                        borderRadius: '10px',
                        padding: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#f59e0b',
                        flexShrink: 0
                    }}>
                        <Link2 size={20} />
                    </div>
                    <div>
                        <h4 style={{ margin: '0 0 2px 0', color: '#fef08a', fontWeight: 700, fontSize: '0.95rem' }}>
                            Préstamo sin conectar
                        </h4>
                        <p style={{ margin: 0, color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.85rem', lineHeight: '1.4' }}>
                            Tienes el préstamo <strong>{currentLoan.name}</strong> activo. Conéctalo a un Gasto Fijo para amortizar la deuda automáticamente al pagar la cuota.
                        </p>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button 
                        onClick={handleOpenModal}
                        style={{
                            background: '#f59e0b',
                            border: 'none',
                            borderRadius: '8px',
                            color: 'white',
                            padding: '8px 16px',
                            fontWeight: 600,
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            transition: 'background 0.2s',
                            boxShadow: '0 4px 12px rgba(245, 158, 11, 0.2)'
                        }}
                    >
                        Conectar Préstamo
                    </button>
                    <button 
                        onClick={handleDismiss}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'rgba(255, 255, 255, 0.4)',
                            cursor: 'pointer',
                            padding: '8px',
                            borderRadius: '50%',
                            display: 'flex'
                        }}
                        title="No mostrar de nuevo"
                    >
                        <X size={18} />
                    </button>
                </div>
            </div>

            {/* Quick Linking Modal */}
            {isModalOpen && (
                <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
                    <div className="modal-container glass-panel" style={{ padding: '2rem', maxWidth: '480px', width: '95%' }} onClick={e => e.stopPropagation()}>
                        <button 
                            onClick={() => setIsModalOpen(false)}
                            style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', color: 'rgba(255, 255, 255, 0.5)', cursor: 'pointer' }}
                        >
                            <X size={24} />
                        </button>

                        <h2 style={{ margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.4rem' }}>
                            <Link2 size={24} color="#f59e0b" />
                            Vincular Préstamo
                        </h2>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            {/* Loan selector if multiple unlinked */}
                            {unlinkedLoans.length > 1 && (
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', opacity: 0.6, marginBottom: '0.4rem' }}>
                                        Selecciona el Préstamo
                                    </label>
                                    <select 
                                        style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '0.75rem', padding: '0.75rem', color: 'white', width: '100%' }}
                                        value={selectedLoanId}
                                        onChange={e => {
                                            setSelectedLoanId(e.target.value);
                                            setSelectedRecId('');
                                        }}
                                    >
                                        {unlinkedLoans.map(l => (
                                            <option key={l.id} value={l.id}>{l.name} ({formatMoney(l.currentDebt)})</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div>
                                <p style={{ fontSize: '0.88rem', color: 'rgba(255, 255, 255, 0.7)', margin: '0 0 1rem 0', lineHeight: '1.5' }}>
                                    Conecta <strong>{currentLoan.name}</strong> ({formatMoney(currentLoan.currentDebt)}) a su gasto fijo mensual de <strong>{formatMoney(currentLoan.monthlyPayment)}</strong>.
                                </p>
                            </div>

                            {/* Search bar inside select helper */}
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', opacity: 0.6, marginBottom: '0.4rem' }}>
                                    Buscar Gasto Fijo
                                </label>
                                <div style={{ position: 'relative', marginBottom: '0.5rem' }}>
                                    <input 
                                        type="text"
                                        placeholder="Buscar por nombre o cuota..."
                                        style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '0.75rem', padding: '0.75rem 0.75rem 0.75rem 2.25rem', color: 'white', width: '100%', boxSizing: 'border-box' }}
                                        value={searchText}
                                        onChange={e => setSearchText(e.target.value)}
                                    />
                                    <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} />
                                </div>

                                <select 
                                    style={{ background: 'rgba(25, 27, 34, 0.9)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '0.75rem', padding: '0.75rem', color: 'white', width: '100%', outline: 'none' }}
                                    value={selectedRecId}
                                    onChange={e => setSelectedRecId(e.target.value)}
                                    required
                                >
                                    <option value="">Selecciona un Gasto Fijo...</option>
                                    
                                    {finalRecommended.length > 0 && (
                                        <optgroup label="Recomendados (Misma cuota o palabras clave)">
                                            {finalRecommended.map(r => (
                                                <option key={r.id} value={r.id}>
                                                    ⭐ {r.description} ({formatMoney(r.amount)})
                                                </option>
                                            ))}
                                        </optgroup>
                                    )}

                                    {finalOther.length > 0 && (
                                        <optgroup label="Otros Gastos Fijos">
                                            {finalOther.map(r => (
                                                <option key={r.id} value={r.id}>
                                                    {r.description} ({formatMoney(r.amount)})
                                                </option>
                                            ))}
                                        </optgroup>
                                    )}

                                    {finalRecommended.length === 0 && finalOther.length === 0 && (
                                        <option disabled>No se encontraron resultados</option>
                                    )}
                                </select>
                            </div>

                            {selectedRecId && recurringExpenses.find(r => r.id === selectedRecId)?.categoryId !== 'cat_loans' && (
                                <div style={{ 
                                    background: 'rgba(59, 130, 246, 0.05)', 
                                    border: '1px solid rgba(59, 130, 246, 0.15)',
                                    padding: '0.75rem 1rem',
                                    borderRadius: '10px',
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: '0.75rem'
                                }}>
                                    <Sparkles size={16} style={{ color: '#3b82f6', marginTop: '2px', flexShrink: 0 }} />
                                    <span style={{ fontSize: '0.8rem', color: '#60a5fa', lineHeight: '1.4' }}>
                                        Nota: El gasto seleccionado no está categorizado como Préstamo. Al vincularlo, se reclasificará automáticamente como "Préstamos" para asegurar el correcto cálculo en los gráficos.
                                    </span>
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                <button 
                                    type="button" 
                                    onClick={() => setIsModalOpen(false)}
                                    style={{ flex: 1, padding: '0.85rem', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'white', fontWeight: 600, cursor: 'pointer' }}
                                >
                                    Cancelar
                                </button>
                                <button 
                                    type="button" 
                                    disabled={!selectedRecId}
                                    onClick={handleLink}
                                    style={{
                                        flex: 2,
                                        padding: '0.85rem',
                                        borderRadius: '0.75rem',
                                        border: 'none',
                                        background: !selectedRecId ? '#3e3f4b' : '#f59e0b',
                                        color: !selectedRecId ? 'rgba(255,255,255,0.3)' : 'white',
                                        fontWeight: 700,
                                        cursor: !selectedRecId ? 'not-allowed' : 'pointer',
                                        boxShadow: !selectedRecId ? 'none' : '0 4px 15px rgba(245, 158, 11, 0.3)'
                                    }}
                                >
                                    Vincular Gasto Fijo
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default UnlinkedLoanAlert;
