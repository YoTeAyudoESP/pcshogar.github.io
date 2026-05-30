import React, { useState, useRef, useMemo } from 'react';
import { X, FileText, Download, AlertCircle } from 'lucide-react';
import { useFinance } from '../../contexts/FinanceContext';
import { formatCurrency } from '../../utils/formatters';
import { DEFAULT_CATEGORIES } from '../../types/finance';
import type { Income } from '../../types/income';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface ReportModalProps {
    onClose: () => void;
}

type PeriodType = 'monthly' | 'quarterly' | 'yearly';

const ReportModal: React.FC<ReportModalProps> = ({ onClose }) => {
    const { expenses, savings, categories, extraIncomes } = useFinance();

    const [periodType, setPeriodType] = useState<PeriodType>('monthly');
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
    const [selectedQuarter, setSelectedQuarter] = useState<number>(Math.floor(new Date().getMonth() / 3) + 1);

    // Secciones a incluir
    const [includeSummary, setIncludeSummary] = useState(true);
    const [includeCategories, setIncludeCategories] = useState(true);
    const [includeSavings, setIncludeSavings] = useState(true);
    const [includeTransactions, setIncludeTransactions] = useState(true);

    const [isGenerating, setIsGenerating] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const reportRef = useRef<HTMLDivElement>(null);

    const years = useMemo(() => {
        const current = new Date().getFullYear();
        return Array.from({ length: 5 }, (_, i) => current - i);
    }, []);

    const monthNames = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    // Obtener los datos filtrados según el periodo seleccionado
    const reportData = useMemo(() => {
        let filteredExpenses = [...expenses];
        let filteredIncomes = [...extraIncomes];

        if (periodType === 'monthly') {
            filteredExpenses = expenses.filter(exp => {
                const d = new Date(exp.date);
                return d.getFullYear() === selectedYear && d.getMonth() === selectedMonth;
            });
            filteredIncomes = extraIncomes.filter((inc: any) => {
                const d = inc.receivedDate ? new Date(inc.receivedDate) : new Date(inc.createdAt);
                const incMonth = inc.budgetMonth !== undefined ? inc.budgetMonth : d.getMonth();
                const incYear = inc.budgetYear !== undefined ? inc.budgetYear : d.getFullYear();
                return incYear === selectedYear && incMonth === selectedMonth && inc.status === 'received';
            });
        } else if (periodType === 'quarterly') {
            const startMonth = (selectedQuarter - 1) * 3;
            const endMonth = startMonth + 2;

            filteredExpenses = expenses.filter(exp => {
                const d = new Date(exp.date);
                return d.getFullYear() === selectedYear && d.getMonth() >= startMonth && d.getMonth() <= endMonth;
            });
            filteredIncomes = extraIncomes.filter((inc: any) => {
                const d = inc.receivedDate ? new Date(inc.receivedDate) : new Date(inc.createdAt);
                const incMonth = inc.budgetMonth !== undefined ? inc.budgetMonth : d.getMonth();
                const incYear = inc.budgetYear !== undefined ? inc.budgetYear : d.getFullYear();
                return incYear === selectedYear && incMonth >= startMonth && incMonth <= endMonth && inc.status === 'received';
            });
        } else if (periodType === 'yearly') {
            filteredExpenses = expenses.filter(exp => {
                return new Date(exp.date).getFullYear() === selectedYear;
            });
            filteredIncomes = extraIncomes.filter((inc: any) => {
                const d = inc.receivedDate ? new Date(inc.receivedDate) : new Date(inc.createdAt);
                const incYear = inc.budgetYear !== undefined ? inc.budgetYear : d.getFullYear();
                return incYear === selectedYear && inc.status === 'received';
            });
        }

        // Excluir gastos financiados por huchas y liquidaciones de tarjeta para un balance neto real
        const validExpenses = filteredExpenses.filter(exp => {
            if (exp.linkedSavingGoalId) return false;
            if (exp.description.startsWith('[LIQUIDACION]')) return false;
            return exp.status === 'paid';
        });

        // Excluir ingresos destinados directamente a huchas
        const validIncomes = filteredIncomes.filter((inc: any) => {
            if (inc.linkedSavingGoalId) return false;
            return true;
        });

        const totalExpenses = validExpenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
        const totalIncomes = validIncomes.reduce((sum, inc) => sum + Number(inc.amount), 0);
        const netSavings = totalIncomes - totalExpenses;

        // Distribución por Categorías
        const categoryTotals: { [key: string]: number } = {};
        validExpenses.forEach(exp => {
            const catId = exp.categoryId || 'cat_other';
            categoryTotals[catId] = (categoryTotals[catId] || 0) + Number(exp.amount);
        });

        const categorySummary = Object.keys(categoryTotals).map(catId => {
            const cat = categories.find(c => c.id === catId) || DEFAULT_CATEGORIES.find(c => c.id === catId);
            return {
                id: catId,
                name: cat ? cat.name : (catId === 'cat_other' ? 'Otros' : catId),
                color: cat ? cat.color : '#95a5a6',
                amount: categoryTotals[catId],
                percentage: totalExpenses > 0 ? (categoryTotals[catId] / totalExpenses) * 100 : 0
            };
        }).sort((a, b) => b.amount - a.amount);

        // Huchas activas
        const activeSavings = savings.filter(s => !s.isVirtual || s.currentAmount > 0);

        // Transacciones más relevantes (las 10 mayores de gastos)
        const topTransactions = [...validExpenses]
            .sort((a, b) => Number(b.amount) - Number(a.amount))
            .slice(0, 10);

        return {
            totalIncomes,
            totalExpenses,
            netSavings,
            categorySummary,
            activeSavings,
            topTransactions,
            expensesCount: validExpenses.length,
            incomesCount: validIncomes.length
        };
    }, [expenses, extraIncomes, savings, categories, periodType, selectedYear, selectedMonth, selectedQuarter]);

    const handleGeneratePdf = async () => {
        if (!reportRef.current) return;
        setIsGenerating(true);
        setErrorMsg(null);

        try {
            // Esperar un instante para que el navegador renderice el reporte oculto
            await new Promise(resolve => setTimeout(resolve, 300));

            const element = reportRef.current;
            
            // Forzar visualización temporal del elemento oculto para la captura
            const originalStyle = element.getAttribute('style') || '';
            element.setAttribute('style', 'display: block; width: 800px; padding: 30px; background: white; color: #333;');

            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff'
            });

            // Restaurar el estilo original (oculto)
            element.setAttribute('style', originalStyle);

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const imgWidth = 210; // A4 ancho en mm
            const pageHeight = 295; // A4 alto en mm
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            let heightLeft = imgHeight;
            let position = 0;

            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;

            while (heightLeft >= 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;
            }

            const periodName = periodType === 'monthly'
                ? `${monthNames[selectedMonth]}_${selectedYear}`
                : periodType === 'quarterly'
                    ? `Q${selectedQuarter}_${selectedYear}`
                    : `${selectedYear}`;

            pdf.save(`PCSHogar_Informe_${periodName}.pdf`);
            onClose();
        } catch (err: any) {
            console.error('Error generando PDF:', err);
            setErrorMsg('Hubo un error al compilar el PDF. Por favor, inténtalo de nuevo.');
        } finally {
            setIsGenerating(false);
        }
    };

    const getPeriodTitle = () => {
        if (periodType === 'monthly') {
            return `Informe Mensual: ${monthNames[selectedMonth]} de ${selectedYear}`;
        } else if (periodType === 'quarterly') {
            return `Informe Trimestral: Q${selectedQuarter} (${selectedYear})`;
        } else {
            return `Informe Anual: Gestión de ${selectedYear}`;
        }
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
            animation: 'fadeIn 0.25s ease-out'
        }}>
            <div className="glass-panel" style={{
                width: '100%',
                maxWidth: '650px',
                maxHeight: '90vh',
                overflowY: 'auto',
                padding: '1.5rem',
                border: 'var(--card-border)',
                background: 'var(--bg-surface-elevated)',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.5rem',
                position: 'relative',
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)'
            }}>
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: '1rem',
                        right: '1rem',
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer'
                    }}
                >
                    <X size={22} />
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                        background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)',
                        padding: '0.6rem',
                        borderRadius: '12px',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <FileText size={24} />
                    </div>
                    <div>
                        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>Generar Informe Financiero</h2>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>Exportar balances en un PDF profesional compilado localmente.</p>
                    </div>
                </div>

                {errorMsg && (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        background: 'rgba(231, 76, 60, 0.1)',
                        border: '1px solid #e74c3c',
                        padding: '0.75rem',
                        borderRadius: '8px',
                        color: '#ff4d4d',
                        fontSize: '0.9rem'
                    }}>
                        <AlertCircle size={18} />
                        <span>{errorMsg}</span>
                    </div>
                )}

                {/* Paso 1: Configurar el Período */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <label style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-muted)' }}>1. SELECCIONAR TIPO DE PERIODO</label>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: '0.5rem',
                        background: 'rgba(255,255,255,0.03)',
                        padding: '0.25rem',
                        borderRadius: '10px'
                    }}>
                        {(['monthly', 'quarterly', 'yearly'] as PeriodType[]).map((type) => (
                            <button
                                key={type}
                                onClick={() => setPeriodType(type)}
                                style={{
                                    padding: '0.6rem',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    background: periodType === type ? 'var(--color-primary)' : 'transparent',
                                    color: periodType === type ? 'white' : 'var(--text-muted)',
                                    transition: 'all 0.2s',
                                    fontSize: '0.85rem'
                                }}
                            >
                                {type === 'monthly' ? 'Mensual' : type === 'quarterly' ? 'Trimestral' : 'Anual'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Selectores dinámicos del periodo */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: periodType === 'yearly' ? '1fr' : '1fr 1fr',
                    gap: '0.75rem'
                }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Año</label>
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(Number(e.target.value))}
                            style={{
                                padding: '0.6rem',
                                borderRadius: '8px',
                                background: 'var(--bg-surface)',
                                color: 'var(--text-main)',
                                border: 'var(--card-border)'
                            }}
                        >
                            {years.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>

                    {periodType === 'monthly' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Mes</label>
                            <select
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                                style={{
                                    padding: '0.6rem',
                                    borderRadius: '8px',
                                    background: 'var(--bg-surface)',
                                    color: 'var(--text-main)',
                                    border: 'var(--card-border)'
                                }}
                            >
                                {monthNames.map((name, idx) => <option key={idx} value={idx}>{name}</option>)}
                            </select>
                        </div>
                    )}

                    {periodType === 'quarterly' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Trimestre</label>
                            <select
                                value={selectedQuarter}
                                onChange={(e) => setSelectedQuarter(Number(e.target.value))}
                                style={{
                                    padding: '0.6rem',
                                    borderRadius: '8px',
                                    background: 'var(--bg-surface)',
                                    color: 'var(--text-main)',
                                    border: 'var(--card-border)'
                                }}
                            >
                                <option value={1}>Primer Trimestre (Ene - Mar)</option>
                                <option value={2}>Segundo Trimestre (Abr - Jun)</option>
                                <option value={3}>Tercer Trimestre (Jul - Sep)</option>
                                <option value={4}>Cuarto Trimestre (Oct - Dic)</option>
                            </select>
                        </div>
                    )}
                </div>

                {/* Paso 2: Personalizar Secciones */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <label style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-muted)' }}>2. SECCIONES A INCLUIR EN EL INFORME</label>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '0.6rem'
                    }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                            <input type="checkbox" checked={includeSummary} onChange={(e) => setIncludeSummary(e.target.checked)} />
                            <span>Resumen general de saldos</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                            <input type="checkbox" checked={includeCategories} onChange={(e) => setIncludeCategories(e.target.checked)} />
                            <span>Desglose por categorías</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                            <input type="checkbox" checked={includeSavings} onChange={(e) => setIncludeSavings(e.target.checked)} />
                            <span>Estado de metas de ahorro</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                            <input type="checkbox" checked={includeTransactions} onChange={(e) => setIncludeTransactions(e.target.checked)} />
                            <span>Top 10 mayores gastos</span>
                        </label>
                    </div>
                </div>

                {/* Vista previa de los datos a exportar */}
                <div style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: 'var(--card-border)',
                    padding: '0.8rem 1rem',
                    borderRadius: '8px',
                    fontSize: '0.85rem'
                }}>
                    <div style={{ fontWeight: 600, marginBottom: '0.4rem', color: 'var(--text-muted)' }}>Resumen del período (Vista previa)</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                        <span>Total Ingresos:</span>
                        <span style={{ color: '#2ed573', fontWeight: 600 }}>{formatCurrency(reportData.totalIncomes)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                        <span>Total Gastos:</span>
                        <span style={{ color: '#ff4757', fontWeight: 600 }}>{formatCurrency(reportData.totalExpenses)}</span>
                    </div>
                    <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', margin: '0.4rem 0' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                        <span>Ahorro Neto Realizado:</span>
                        <span style={{ color: reportData.netSavings >= 0 ? '#2ed573' : '#ff4757' }}>
                            {formatCurrency(reportData.netSavings)}
                        </span>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                    <button
                        onClick={onClose}
                        style={{
                            flex: 1,
                            padding: '0.8rem',
                            border: 'var(--card-border)',
                            borderRadius: '8px',
                            background: 'transparent',
                            color: 'var(--text-main)',
                            fontWeight: 600,
                            cursor: 'pointer'
                        }}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleGeneratePdf}
                        disabled={isGenerating}
                        style={{
                            flex: 2,
                            padding: '0.8rem',
                            border: 'none',
                            borderRadius: '8px',
                            background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)',
                            color: 'white',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                            boxShadow: '0 4px 15px rgba(52, 152, 219, 0.3)',
                            opacity: isGenerating ? 0.7 : 1
                        }}
                    >
                        {isGenerating ? (
                            <>Generando PDF...</>
                        ) : (
                            <>
                                <Download size={18} />
                                Descargar PDF
                            </>
                        )}
                    </button>
                </div>

                {/* =========================================
                    PREVIEW HTML DOCUMENT FOR PDF EXPORT
                    Este div se dibuja totalmente invisible y contiene
                    el estilo y estructura A4 limpio para compilar el PDF
                    ========================================= */}
                <div
                    ref={reportRef}
                    style={{
                        display: 'none',
                        position: 'absolute',
                        top: -9999,
                        left: -9999,
                        width: '800px',
                        fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
                        background: '#ffffff',
                        color: '#333333',
                        padding: '40px',
                        boxSizing: 'border-box'
                    }}
                >
                    {/* Encabezado del PDF */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderBottom: '3px solid #3498db',
                        paddingBottom: '20px',
                        marginBottom: '30px'
                    }}>
                        <div>
                            <h1 style={{ margin: 0, fontSize: '28px', color: '#2c3e50', fontWeight: 800 }}>PCS Hogar</h1>
                            <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: '#7f8c8d', fontWeight: 500 }}>Gestión de Finanzas Domésticas</p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{
                                background: '#3498db',
                                color: 'white',
                                padding: '6px 12px',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: 700,
                                display: 'inline-block'
                            }}>
                                INFORME FINANCIERO
                            </div>
                            <p style={{ margin: '8px 0 0 0', fontSize: '11px', color: '#95a5a6' }}>Generado el: {new Date().toLocaleDateString('es-ES')}</p>
                        </div>
                    </div>

                    <h2 style={{ fontSize: '20px', color: '#2c3e50', marginBottom: '25px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
                        {getPeriodTitle()}
                    </h2>

                    {/* SECCIÓN 1: RESUMEN GENERAL */}
                    {includeSummary && (
                        <div style={{ marginBottom: '35px' }}>
                            <h3 style={{ fontSize: '15px', color: '#3498db', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '15px', fontWeight: 700 }}>
                                1. Resumen de Cuentas y Saldos
                            </h3>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(3, 1fr)',
                                gap: '15px',
                                marginBottom: '20px'
                            }}>
                                <div style={{ background: '#f8f9fa', border: '1px solid #e9ecef', borderRadius: '8px', padding: '15px', textAlign: 'center' }}>
                                    <div style={{ fontSize: '11px', color: '#7f8c8d', fontWeight: 600, textTransform: 'uppercase', marginBottom: '5px' }}>Total Ingresos</div>
                                    <div style={{ fontSize: '20px', color: '#2ecc71', fontWeight: 700 }}>{formatCurrency(reportData.totalIncomes)}</div>
                                    <div style={{ fontSize: '10px', color: '#bdc3c7', marginTop: '4px' }}>{reportData.incomesCount} transacciones</div>
                                </div>
                                <div style={{ background: '#f8f9fa', border: '1px solid #e9ecef', borderRadius: '8px', padding: '15px', textAlign: 'center' }}>
                                    <div style={{ fontSize: '11px', color: '#7f8c8d', fontWeight: 600, textTransform: 'uppercase', marginBottom: '5px' }}>Total Gastos</div>
                                    <div style={{ fontSize: '20px', color: '#e74c3c', fontWeight: 700 }}>{formatCurrency(reportData.totalExpenses)}</div>
                                    <div style={{ fontSize: '10px', color: '#bdc3c7', marginTop: '4px' }}>{reportData.expensesCount} transacciones</div>
                                </div>
                                <div style={{
                                    background: reportData.netSavings >= 0 ? 'rgba(46, 204, 113, 0.08)' : 'rgba(231, 76, 60, 0.08)',
                                    border: reportData.netSavings >= 0 ? '1px solid rgba(46, 204, 113, 0.2)' : '1px solid rgba(231, 76, 60, 0.2)',
                                    borderRadius: '8px',
                                    padding: '15px',
                                    textAlign: 'center'
                                }}>
                                    <div style={{ fontSize: '11px', color: '#7f8c8d', fontWeight: 600, textTransform: 'uppercase', marginBottom: '5px' }}>Ahorro Neto</div>
                                    <div style={{ fontSize: '20px', color: reportData.netSavings >= 0 ? '#27ae60' : '#c0392b', fontWeight: 700 }}>
                                        {formatCurrency(reportData.netSavings)}
                                    </div>
                                    <div style={{ fontSize: '10px', color: '#7f8c8d', marginTop: '4px' }}>
                                        Tasa de ahorro: {reportData.totalIncomes > 0 ? ((reportData.netSavings / reportData.totalIncomes) * 100).toFixed(1) : 0}%
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* SECCIÓN 2: DESGLOSE POR CATEGORÍAS */}
                    {includeCategories && (
                        <div style={{ marginBottom: '35px' }}>
                            <h3 style={{ fontSize: '15px', color: '#3498db', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '15px', fontWeight: 700 }}>
                                2. Distribución de Gastos por Categoría
                            </h3>
                            {reportData.categorySummary.length === 0 ? (
                                <p style={{ fontSize: '13px', color: '#7f8c8d', fontStyle: 'italic' }}>No hay gastos registrados en este período.</p>
                            ) : (
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                    <thead>
                                        <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                                            <th style={{ textAlign: 'left', padding: '10px 15px', color: '#495057', fontWeight: 700 }}>Categoría</th>
                                            <th style={{ textAlign: 'right', padding: '10px 15px', color: '#495057', fontWeight: 700 }}>Importe</th>
                                            <th style={{ textAlign: 'right', padding: '10px 15px', color: '#495057', fontWeight: 700 }}>Porcentaje</th>
                                            <th style={{ width: '150px', padding: '10px 15px' }}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {reportData.categorySummary.map((cat, idx) => (
                                            <tr key={idx} style={{ borderBottom: '1px solid #e9ecef' }}>
                                                <td style={{ padding: '12px 15px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                                                    <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', backgroundColor: cat.color }}></span>
                                                    {cat.name}
                                                </td>
                                                <td style={{ padding: '12px 15px', textAlign: 'right', fontWeight: 700, color: '#2c3e50' }}>{formatCurrency(cat.amount)}</td>
                                                <td style={{ padding: '12px 15px', textAlign: 'right', color: '#7f8c8d' }}>{cat.percentage.toFixed(1)}%</td>
                                                <td style={{ padding: '12px 15px' }}>
                                                    <div style={{ width: '100%', height: '8px', background: '#e9ecef', borderRadius: '4px', overflow: 'hidden' }}>
                                                        <div style={{ width: `${cat.percentage}%`, height: '100%', background: cat.color }}></div>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    )}

                    {/* SECCIÓN 3: ESTADO DE LAS HUCHAS */}
                    {includeSavings && reportData.activeSavings.length > 0 && (
                        <div style={{ marginBottom: '35px' }}>
                            <h3 style={{ fontSize: '15px', color: '#3498db', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '15px', fontWeight: 700 }}>
                                3. Objetivos y Huchas de Ahorro
                            </h3>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                <thead>
                                    <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                                        <th style={{ textAlign: 'left', padding: '10px 15px', color: '#495057', fontWeight: 700 }}>Meta / Hucha</th>
                                        <th style={{ textAlign: 'right', padding: '10px 15px', color: '#495057', fontWeight: 700 }}>Saldo Actual</th>
                                        <th style={{ textAlign: 'right', padding: '10px 15px', color: '#495057', fontWeight: 700 }}>Objetivo</th>
                                        <th style={{ textAlign: 'right', padding: '10px 15px', color: '#495057', fontWeight: 700 }}>Progreso</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {reportData.activeSavings.map((goal, idx) => {
                                        const targetAmount = goal.targetAmount ?? 0;
                                        const progress = targetAmount > 0 ? (goal.currentAmount / targetAmount) * 100 : 100;
                                        return (
                                            <tr key={idx} style={{ borderBottom: '1px solid #e9ecef' }}>
                                                <td style={{ padding: '12px 15px', fontWeight: 600 }}>{goal.name}</td>
                                                <td style={{ padding: '12px 15px', textAlign: 'right', fontWeight: 700, color: '#27ae60' }}>{formatCurrency(goal.currentAmount)}</td>
                                                <td style={{ padding: '12px 15px', textAlign: 'right', color: '#7f8c8d' }}>
                                                    {targetAmount > 0 ? formatCurrency(targetAmount) : 'N/A'}
                                                </td>
                                                <td style={{ padding: '12px 15px', textAlign: 'right', fontWeight: 700 }}>
                                                    {targetAmount > 0 ? `${Math.min(100, progress).toFixed(0)}%` : 'Completado'}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* SECCIÓN 4: TRANSACCIONES DESTACADAS */}
                    {includeTransactions && reportData.topTransactions.length > 0 && (
                        <div style={{ marginBottom: '25px' }}>
                            <h3 style={{ fontSize: '15px', color: '#3498db', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '15px', fontWeight: 700 }}>
                                4. Mayores Gastos del Período
                            </h3>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                                <thead>
                                    <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                                        <th style={{ textAlign: 'left', padding: '8px 12px', color: '#495057', fontWeight: 700 }}>Fecha</th>
                                        <th style={{ textAlign: 'left', padding: '8px 12px', color: '#495057', fontWeight: 700 }}>Descripción</th>
                                        <th style={{ textAlign: 'left', padding: '8px 12px', color: '#495057', fontWeight: 700 }}>Categoría</th>
                                        <th style={{ textAlign: 'right', padding: '8px 12px', color: '#495057', fontWeight: 700 }}>Importe</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {reportData.topTransactions.map((exp, idx) => {
                                        const cat = categories.find(c => c.id === exp.categoryId) || DEFAULT_CATEGORIES.find(c => c.id === exp.categoryId);
                                        return (
                                            <tr key={idx} style={{ borderBottom: '1px solid #e9ecef' }}>
                                                <td style={{ padding: '10px 12px', color: '#7f8c8d' }}>{new Date(exp.date).toLocaleDateString('es-ES')}</td>
                                                <td style={{ padding: '10px 12px', fontWeight: 500 }}>{exp.description}</td>
                                                <td style={{ padding: '10px 12px', color: '#7f8c8d' }}>{cat ? cat.name : 'Otros'}</td>
                                                <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#e74c3c' }}>{formatCurrency(exp.amount)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Pie de página del PDF */}
                    <div style={{
                        marginTop: '40px',
                        borderTop: '1px solid #eee',
                        paddingTop: '15px',
                        textAlign: 'center',
                        fontSize: '11px',
                        color: '#bdc3c7'
                    }}>
                        Documento generado por la aplicación PCS Hogar de forma local y segura. © {new Date().getFullYear()}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReportModal;
