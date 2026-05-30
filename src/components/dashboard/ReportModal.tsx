import React, { useState, useRef, useMemo } from 'react';
import { X, FileText, Download, AlertCircle, CheckCircle, ExternalLink, FolderOpen } from 'lucide-react';
import { useFinance } from '../../contexts/FinanceContext';
import { formatCurrency } from '../../utils/formatters';
import { DEFAULT_CATEGORIES } from '../../types/finance';
import type { Income } from '../../types/income';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface ReportModalProps {
    onClose: () => void;
}

type PeriodType = 'monthly' | 'quarterly' | 'yearly';

// ── Platform detection ───────────────────────────────────────────────────────
const isElectronPlatform = (): boolean =>
    typeof window !== 'undefined' && (
        !!(window as any).require ||
        navigator.userAgent.toLowerCase().includes(' electron/')
    );

const isAndroidPlatform = (): boolean => Capacitor.getPlatform() === 'android';

// Safe base64 conversion for large ArrayBuffers (avoids stack overflow)
const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const chunkSize = 8192;
    for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.slice(i, Math.min(i + chunkSize, bytes.length));
        binary += String.fromCharCode(...chunk);
    }
    return btoa(binary);
};

// ── Component ────────────────────────────────────────────────────────────────
const ReportModal: React.FC<ReportModalProps> = ({ onClose }) => {
    const { expenses, savings, categories, extraIncomes } = useFinance();

    const [periodType, setPeriodType] = useState<PeriodType>('monthly');
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
    const [selectedQuarter, setSelectedQuarter] = useState<number>(Math.floor(new Date().getMonth() / 3) + 1);

    // Report sections
    const [includeSummary, setIncludeSummary] = useState(true);
    const [includeCategories, setIncludeCategories] = useState(true);
    const [includeSavings, setIncludeSavings] = useState(true);
    const [includeTransactions, setIncludeTransactions] = useState(true);
    const [includeDetail, setIncludeDetail] = useState(true);

    // Generation state
    const [isGenerating, setIsGenerating] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Post-generation "open?" dialog state
    const [showOpenDialog, setShowOpenDialog] = useState(false);
    const [savedPdfPath, setSavedPdfPath] = useState<string | null>(null);
    const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
    const [savedFilename, setSavedFilename] = useState<string>('');

    const reportRef = useRef<HTMLDivElement>(null);

    const years = useMemo(() => {
        const current = new Date().getFullYear();
        return Array.from({ length: 5 }, (_, i) => current - i);
    }, []);

    const monthNames = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    // ── Computed report data ─────────────────────────────────────────────────
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
        } else {
            filteredExpenses = expenses.filter(exp => new Date(exp.date).getFullYear() === selectedYear);
            filteredIncomes = extraIncomes.filter((inc: any) => {
                const d = inc.receivedDate ? new Date(inc.receivedDate) : new Date(inc.createdAt);
                const incYear = inc.budgetYear !== undefined ? inc.budgetYear : d.getFullYear();
                return incYear === selectedYear && inc.status === 'received';
            });
        }

        // Exclude piggy-bank-funded expenses and card settlements
        const validExpenses = filteredExpenses.filter(exp => {
            if (exp.linkedSavingGoalId) return false;
            if (exp.description.startsWith('[LIQUIDACION]')) return false;
            return exp.status === 'paid';
        });

        // Exclude incomes linked to piggy banks
        const validIncomes = filteredIncomes.filter((inc: any) => !inc.linkedSavingGoalId);

        const totalExpenses = validExpenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
        const totalIncomes = validIncomes.reduce((sum, inc) => sum + Number(inc.amount), 0);
        const netSavings = totalIncomes - totalExpenses;

        // Category breakdown
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

        const activeSavings = savings.filter(s => !s.isVirtual || s.currentAmount > 0);

        const topTransactions = [...validExpenses]
            .sort((a, b) => Number(b.amount) - Number(a.amount))
            .slice(0, 10);

        // Detail lists (sorted by date descending)
        const detailIncomes = [...validIncomes].sort((a: any, b: any) => {
            const dateA = a.receivedDate || a.effectiveDate || a.createdAt;
            const dateB = b.receivedDate || b.effectiveDate || b.createdAt;
            return dateB - dateA;
        });
        const detailExpenses = [...validExpenses].sort((a, b) =>
            new Date(b.date).getTime() - new Date(a.date).getTime()
        );

        return {
            totalIncomes, totalExpenses, netSavings,
            categorySummary, activeSavings, topTransactions,
            expensesCount: validExpenses.length,
            incomesCount: validIncomes.length,
            detailIncomes, detailExpenses
        };
    }, [expenses, extraIncomes, savings, categories, periodType, selectedYear, selectedMonth, selectedQuarter]);

    // ── Period helpers ───────────────────────────────────────────────────────
    const getPeriodTitle = () => {
        if (periodType === 'monthly') return `Informe Mensual: ${monthNames[selectedMonth]} de ${selectedYear}`;
        if (periodType === 'quarterly') return `Informe Trimestral: Q${selectedQuarter} (${selectedYear})`;
        return `Informe Anual: Gestión de ${selectedYear}`;
    };

    const getPeriodName = () => {
        if (periodType === 'monthly') return `${monthNames[selectedMonth]}_${selectedYear}`;
        if (periodType === 'quarterly') return `Q${selectedQuarter}_${selectedYear}`;
        return `${selectedYear}`;
    };

    const getIncomeDate = (inc: any): string => {
        const ts = inc.receivedDate || inc.effectiveDate || inc.createdAt;
        return ts ? new Date(ts).toLocaleDateString('es-ES') : '—';
    };

    // ── PDF generation ───────────────────────────────────────────────────────
    const handleGeneratePdf = async () => {
        if (!reportRef.current) return;
        setIsGenerating(true);
        setErrorMsg(null);
        setShowOpenDialog(false);
        setPdfBlobUrl(null);
        setSavedPdfPath(null);

        try {
            await new Promise(resolve => setTimeout(resolve, 300));

            const element = reportRef.current;
            const originalStyle = element.getAttribute('style') || '';
            element.setAttribute('style', 'display: block; width: 800px; padding: 30px; background: white; color: #333;');

            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff'
            });

            element.setAttribute('style', originalStyle);

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const imgWidth = 210;
            const pageHeight = 295;
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

            const filename = `PCSHogar_Informe_${getPeriodName()}.pdf`;
            setSavedFilename(filename);
            const arrayBuffer = pdf.output('arraybuffer');

            if (isElectronPlatform()) {
                // ── Windows / Electron ─────────────────────────────────────
                const { ipcRenderer } = (window as any).require('electron');
                const base64 = arrayBufferToBase64(arrayBuffer);
                const result = await ipcRenderer.invoke('save-pdf', { base64, filename });
                if (result.success) {
                    setSavedPdfPath(result.path);
                    setShowOpenDialog(true);
                } else {
                    setErrorMsg('No se pudo guardar el PDF en la carpeta de Descargas.');
                }

            } else if (isAndroidPlatform()) {
                // ── Android (Capacitor) ────────────────────────────────────
                const base64data = pdf.output('datauristring').split(',')[1];
                await Filesystem.writeFile({
                    path: filename,
                    data: base64data,
                    directory: Directory.Cache,
                });
                const { uri } = await Filesystem.getUri({
                    path: filename,
                    directory: Directory.Cache,
                });
                await Share.share({
                    title: 'Informe Financiero PCS Hogar',
                    url: uri,
                    dialogTitle: 'Abrir o guardar el informe PDF',
                });
                onClose();

            } else {
                // ── Web / PWA ──────────────────────────────────────────────
                pdf.save(filename);
                const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
                setPdfBlobUrl(URL.createObjectURL(blob));
                setShowOpenDialog(true);
            }

        } catch (err: any) {
            console.error('Error generando PDF:', err);
            setErrorMsg('Hubo un error al compilar el PDF. Por favor, inténtalo de nuevo.');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleOpenPdf = async () => {
        if (isElectronPlatform() && savedPdfPath) {
            const { ipcRenderer } = (window as any).require('electron');
            await ipcRenderer.invoke('open-file', savedPdfPath);
        } else if (pdfBlobUrl) {
            window.open(pdfBlobUrl, '_blank');
        }
        setShowOpenDialog(false);
        onClose();
    };

    // ── Cell styles (reusable) ───────────────────────────────────────────────
    const thStyle: React.CSSProperties = {
        padding: '8px 10px', color: '#495057', fontWeight: 700,
        background: '#f8f9fa', borderBottom: '2px solid #dee2e6', textAlign: 'left'
    };
    const tdStyle: React.CSSProperties = { padding: '9px 10px', borderBottom: '1px solid #e9ecef' };

    // ── Render ───────────────────────────────────────────────────────────────
    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(10px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, padding: '1rem', animation: 'fadeIn 0.25s ease-out'
        }}>
            <div className="glass-panel" style={{
                width: '100%', maxWidth: '650px', maxHeight: '90vh', overflowY: 'auto',
                padding: '1.5rem', border: 'var(--card-border)',
                background: 'var(--bg-surface-elevated)',
                display: 'flex', flexDirection: 'column', gap: '1.5rem',
                position: 'relative', boxShadow: '0 20px 40px rgba(0,0,0,0.4)'
            }}>
                <button onClick={onClose} style={{
                    position: 'absolute', top: '1rem', right: '1rem',
                    background: 'transparent', border: 'none',
                    color: 'var(--text-muted)', cursor: 'pointer'
                }}>
                    <X size={22} />
                </button>

                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                        background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)',
                        padding: '0.6rem', borderRadius: '12px', color: 'white',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <FileText size={24} />
                    </div>
                    <div>
                        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>Generar Informe Financiero</h2>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                            Exportar balances en un PDF profesional compilado localmente.
                        </p>
                    </div>
                </div>

                {/* Error message */}
                {errorMsg && (
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                        background: 'rgba(231,76,60,0.1)', border: '1px solid #e74c3c',
                        padding: '0.75rem', borderRadius: '8px', color: '#ff4d4d', fontSize: '0.9rem'
                    }}>
                        <AlertCircle size={18} />
                        <span>{errorMsg}</span>
                    </div>
                )}

                {/* ── Success / Open dialog ───────────────────────────────── */}
                {showOpenDialog && (
                    <div style={{
                        background: 'rgba(46,213,115,0.08)', border: '1px solid rgba(46,213,115,0.3)',
                        borderRadius: '12px', padding: '1.25rem',
                        display: 'flex', flexDirection: 'column', gap: '0.75rem'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <CheckCircle size={22} color="#2ed573" />
                            <span style={{ fontWeight: 700, fontSize: '1rem' }}>¡Informe generado con éxito!</span>
                        </div>
                        {savedPdfPath && (
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                                <FolderOpen size={13} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                                Guardado en: <code style={{ fontSize: '0.75rem' }}>{savedPdfPath}</code>
                            </p>
                        )}
                        {pdfBlobUrl && (
                            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>
                                El PDF se ha descargado en tu carpeta de Descargas.
                            </p>
                        )}
                        <p style={{ fontWeight: 600, margin: 0, fontSize: '0.92rem' }}>
                            ¿Quieres abrirlo ahora con el visor de PDF?
                        </p>
                        <div style={{ display: 'flex', gap: '0.6rem' }}>
                            <button
                                onClick={handleOpenPdf}
                                style={{
                                    flex: 2, padding: '0.65rem', border: 'none', borderRadius: '8px',
                                    background: 'linear-gradient(135deg, #2ed573, #17a84d)',
                                    color: 'white', fontWeight: 700, cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem'
                                }}
                            >
                                <ExternalLink size={16} /> Sí, abrir PDF
                            </button>
                            <button
                                onClick={() => { setShowOpenDialog(false); onClose(); }}
                                style={{
                                    flex: 1, padding: '0.65rem', border: 'var(--card-border)',
                                    borderRadius: '8px', background: 'transparent',
                                    color: 'var(--text-main)', fontWeight: 600, cursor: 'pointer'
                                }}
                            >
                                No, cerrar
                            </button>
                        </div>
                    </div>
                )}

                {/* ── Config form (always visible) ────────────────────────── */}

                {/* Step 1: Period type */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <label style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                        1. SELECCIONAR TIPO DE PERIODO
                    </label>
                    <div style={{
                        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem',
                        background: 'rgba(255,255,255,0.03)', padding: '0.25rem', borderRadius: '10px'
                    }}>
                        {(['monthly', 'quarterly', 'yearly'] as PeriodType[]).map(type => (
                            <button key={type} onClick={() => setPeriodType(type)} style={{
                                padding: '0.6rem', border: 'none', borderRadius: '8px',
                                fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem',
                                background: periodType === type ? 'var(--color-primary)' : 'transparent',
                                color: periodType === type ? 'white' : 'var(--text-muted)',
                                transition: 'all 0.2s'
                            }}>
                                {type === 'monthly' ? 'Mensual' : type === 'quarterly' ? 'Trimestral' : 'Anual'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Period selectors */}
                <div style={{ display: 'grid', gridTemplateColumns: periodType === 'yearly' ? '1fr' : '1fr 1fr', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Año</label>
                        <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} style={{
                            padding: '0.6rem', borderRadius: '8px',
                            background: 'var(--bg-surface)', color: 'var(--text-main)', border: 'var(--card-border)'
                        }}>
                            {years.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>
                    {periodType === 'monthly' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Mes</label>
                            <select value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))} style={{
                                padding: '0.6rem', borderRadius: '8px',
                                background: 'var(--bg-surface)', color: 'var(--text-main)', border: 'var(--card-border)'
                            }}>
                                {monthNames.map((name, idx) => <option key={idx} value={idx}>{name}</option>)}
                            </select>
                        </div>
                    )}
                    {periodType === 'quarterly' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Trimestre</label>
                            <select value={selectedQuarter} onChange={e => setSelectedQuarter(Number(e.target.value))} style={{
                                padding: '0.6rem', borderRadius: '8px',
                                background: 'var(--bg-surface)', color: 'var(--text-main)', border: 'var(--card-border)'
                            }}>
                                <option value={1}>Primer Trimestre (Ene – Mar)</option>
                                <option value={2}>Segundo Trimestre (Abr – Jun)</option>
                                <option value={3}>Tercer Trimestre (Jul – Sep)</option>
                                <option value={4}>Cuarto Trimestre (Oct – Dic)</option>
                            </select>
                        </div>
                    )}
                </div>

                {/* Step 2: Sections */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <label style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                        2. SECCIONES A INCLUIR EN EL INFORME
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                        {[
                            [includeSummary, setIncludeSummary, 'Resumen general de saldos'],
                            [includeCategories, setIncludeCategories, 'Desglose por categorías'],
                            [includeSavings, setIncludeSavings, 'Estado de metas de ahorro'],
                            [includeTransactions, setIncludeTransactions, 'Top 10 mayores gastos'],
                            [includeDetail, setIncludeDetail, '📋 Detalle completo (2ª página)'],
                        ].map(([val, setter, label]: any) => (
                            <label key={label as string} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.88rem' }}>
                                <input type="checkbox" checked={val as boolean} onChange={e => setter(e.target.checked)} />
                                <span>{label as string}</span>
                            </label>
                        ))}
                    </div>
                </div>

                {/* Preview summary */}
                <div style={{
                    background: 'rgba(255,255,255,0.02)', border: 'var(--card-border)',
                    padding: '0.8rem 1rem', borderRadius: '8px', fontSize: '0.85rem'
                }}>
                    <div style={{ fontWeight: 600, marginBottom: '0.4rem', color: 'var(--text-muted)' }}>
                        Vista previa del período seleccionado
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                        <span>Total Ingresos ({reportData.incomesCount} movimientos):</span>
                        <span style={{ color: '#2ed573', fontWeight: 600 }}>{formatCurrency(reportData.totalIncomes)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                        <span>Total Gastos ({reportData.expensesCount} movimientos):</span>
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

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                    <button onClick={onClose} style={{
                        flex: 1, padding: '0.8rem', border: 'var(--card-border)', borderRadius: '8px',
                        background: 'transparent', color: 'var(--text-main)', fontWeight: 600, cursor: 'pointer'
                    }}>
                        Cancelar
                    </button>
                    <button
                        onClick={handleGeneratePdf}
                        disabled={isGenerating}
                        style={{
                            flex: 2, padding: '0.8rem', border: 'none', borderRadius: '8px',
                            background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)',
                            color: 'white', fontWeight: 700, cursor: isGenerating ? 'not-allowed' : 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                            boxShadow: '0 4px 15px rgba(52,152,219,0.3)', opacity: isGenerating ? 0.7 : 1
                        }}
                    >
                        {isGenerating ? 'Generando PDF...' : <><Download size={18} /> Generar y Descargar PDF</>}
                    </button>
                </div>

                {/* ═══════════════════════════════════════════════════════════
                    HIDDEN PDF TEMPLATE — rendered off-screen for html2canvas
                ════════════════════════════════════════════════════════════ */}
                <div
                    ref={reportRef}
                    style={{
                        display: 'none', position: 'absolute', top: -9999, left: -9999,
                        width: '800px', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
                        background: '#ffffff', color: '#333333',
                        padding: '40px', boxSizing: 'border-box'
                    }}
                >
                    {/* ── PDF Header ── */}
                    <div style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        borderBottom: '3px solid #3498db', paddingBottom: '20px', marginBottom: '30px'
                    }}>
                        <div>
                            <h1 style={{ margin: 0, fontSize: '28px', color: '#2c3e50', fontWeight: 800 }}>PCS Hogar</h1>
                            <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: '#7f8c8d', fontWeight: 500 }}>
                                Gestión de Finanzas Domésticas
                            </p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{
                                background: '#3498db', color: 'white', padding: '6px 12px',
                                borderRadius: '6px', fontSize: '12px', fontWeight: 700, display: 'inline-block'
                            }}>
                                INFORME FINANCIERO
                            </div>
                            <p style={{ margin: '8px 0 0 0', fontSize: '11px', color: '#95a5a6' }}>
                                Generado el: {new Date().toLocaleDateString('es-ES')}
                            </p>
                        </div>
                    </div>

                    <h2 style={{ fontSize: '20px', color: '#2c3e50', marginBottom: '25px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
                        {getPeriodTitle()}
                    </h2>

                    {/* ── SECCIÓN 1: Resumen ── */}
                    {includeSummary && (
                        <div style={{ marginBottom: '35px' }}>
                            <h3 style={{ fontSize: '15px', color: '#3498db', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '15px', fontWeight: 700 }}>
                                1. Resumen de Saldos
                            </h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', marginBottom: '10px' }}>
                                <div style={{ background: '#f8f9fa', border: '1px solid #e9ecef', borderRadius: '8px', padding: '15px', textAlign: 'center' }}>
                                    <div style={{ fontSize: '11px', color: '#7f8c8d', fontWeight: 600, textTransform: 'uppercase', marginBottom: '5px' }}>Total Ingresos</div>
                                    <div style={{ fontSize: '20px', color: '#2ecc71', fontWeight: 700 }}>{formatCurrency(reportData.totalIncomes)}</div>
                                    <div style={{ fontSize: '10px', color: '#bdc3c7', marginTop: '4px' }}>{reportData.incomesCount} movimientos</div>
                                </div>
                                <div style={{ background: '#f8f9fa', border: '1px solid #e9ecef', borderRadius: '8px', padding: '15px', textAlign: 'center' }}>
                                    <div style={{ fontSize: '11px', color: '#7f8c8d', fontWeight: 600, textTransform: 'uppercase', marginBottom: '5px' }}>Total Gastos</div>
                                    <div style={{ fontSize: '20px', color: '#e74c3c', fontWeight: 700 }}>{formatCurrency(reportData.totalExpenses)}</div>
                                    <div style={{ fontSize: '10px', color: '#bdc3c7', marginTop: '4px' }}>{reportData.expensesCount} movimientos</div>
                                </div>
                                <div style={{
                                    background: reportData.netSavings >= 0 ? 'rgba(46,204,113,0.08)' : 'rgba(231,76,60,0.08)',
                                    border: reportData.netSavings >= 0 ? '1px solid rgba(46,204,113,0.2)' : '1px solid rgba(231,76,60,0.2)',
                                    borderRadius: '8px', padding: '15px', textAlign: 'center'
                                }}>
                                    <div style={{ fontSize: '11px', color: '#7f8c8d', fontWeight: 600, textTransform: 'uppercase', marginBottom: '5px' }}>Ahorro Neto</div>
                                    <div style={{ fontSize: '20px', color: reportData.netSavings >= 0 ? '#27ae60' : '#c0392b', fontWeight: 700 }}>
                                        {formatCurrency(reportData.netSavings)}
                                    </div>
                                    <div style={{ fontSize: '10px', color: '#7f8c8d', marginTop: '4px' }}>
                                        Tasa: {reportData.totalIncomes > 0 ? ((reportData.netSavings / reportData.totalIncomes) * 100).toFixed(1) : 0}%
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── SECCIÓN 2: Categorías ── */}
                    {includeCategories && (
                        <div style={{ marginBottom: '35px' }}>
                            <h3 style={{ fontSize: '15px', color: '#3498db', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '15px', fontWeight: 700 }}>
                                2. Distribución de Gastos por Categoría
                            </h3>
                            {reportData.categorySummary.length === 0
                                ? <p style={{ fontSize: '13px', color: '#7f8c8d', fontStyle: 'italic' }}>No hay gastos registrados en este período.</p>
                                : (
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                        <thead>
                                            <tr>
                                                <th style={thStyle}>Categoría</th>
                                                <th style={{ ...thStyle, textAlign: 'right' }}>Importe</th>
                                                <th style={{ ...thStyle, textAlign: 'right' }}>% sobre total</th>
                                                <th style={{ ...thStyle, width: '140px' }}>Barra</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {reportData.categorySummary.map((cat, idx) => (
                                                <tr key={idx}>
                                                    <td style={{ ...tdStyle, display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                                                        <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', backgroundColor: cat.color }} />
                                                        {cat.name}
                                                    </td>
                                                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: '#2c3e50' }}>{formatCurrency(cat.amount)}</td>
                                                    <td style={{ ...tdStyle, textAlign: 'right', color: '#7f8c8d' }}>{cat.percentage.toFixed(1)}%</td>
                                                    <td style={tdStyle}>
                                                        <div style={{ width: '100%', height: '8px', background: '#e9ecef', borderRadius: '4px', overflow: 'hidden' }}>
                                                            <div style={{ width: `${cat.percentage}%`, height: '100%', background: cat.color }} />
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )
                            }
                        </div>
                    )}

                    {/* ── SECCIÓN 3: Huchas ── */}
                    {includeSavings && reportData.activeSavings.length > 0 && (
                        <div style={{ marginBottom: '35px' }}>
                            <h3 style={{ fontSize: '15px', color: '#3498db', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '15px', fontWeight: 700 }}>
                                3. Objetivos y Huchas de Ahorro
                            </h3>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                <thead>
                                    <tr>
                                        <th style={thStyle}>Meta / Hucha</th>
                                        <th style={{ ...thStyle, textAlign: 'right' }}>Saldo Actual</th>
                                        <th style={{ ...thStyle, textAlign: 'right' }}>Objetivo</th>
                                        <th style={{ ...thStyle, textAlign: 'right' }}>Progreso</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {reportData.activeSavings.map((goal, idx) => {
                                        const target = goal.targetAmount ?? 0;
                                        const pct = target > 0 ? (goal.currentAmount / target) * 100 : 100;
                                        return (
                                            <tr key={idx}>
                                                <td style={{ ...tdStyle, fontWeight: 600 }}>{goal.name}</td>
                                                <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: '#27ae60' }}>{formatCurrency(goal.currentAmount)}</td>
                                                <td style={{ ...tdStyle, textAlign: 'right', color: '#7f8c8d' }}>{target > 0 ? formatCurrency(target) : 'N/A'}</td>
                                                <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700 }}>{target > 0 ? `${Math.min(100, pct).toFixed(0)}%` : 'Completado'}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* ── SECCIÓN 4: Top 10 gastos ── */}
                    {includeTransactions && reportData.topTransactions.length > 0 && (
                        <div style={{ marginBottom: '35px' }}>
                            <h3 style={{ fontSize: '15px', color: '#3498db', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '15px', fontWeight: 700 }}>
                                4. Mayores Gastos del Período
                            </h3>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                                <thead>
                                    <tr>
                                        <th style={thStyle}>Fecha</th>
                                        <th style={thStyle}>Descripción</th>
                                        <th style={thStyle}>Categoría</th>
                                        <th style={{ ...thStyle, textAlign: 'right' }}>Importe</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {reportData.topTransactions.map((exp, idx) => {
                                        const cat = categories.find(c => c.id === exp.categoryId) || DEFAULT_CATEGORIES.find(c => c.id === exp.categoryId);
                                        return (
                                            <tr key={idx}>
                                                <td style={{ ...tdStyle, color: '#7f8c8d', whiteSpace: 'nowrap' }}>{new Date(exp.date).toLocaleDateString('es-ES')}</td>
                                                <td style={{ ...tdStyle, fontWeight: 500 }}>{exp.description}</td>
                                                <td style={{ ...tdStyle, color: '#7f8c8d' }}>{cat ? cat.name : 'Otros'}</td>
                                                <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: '#e74c3c' }}>{formatCurrency(exp.amount)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* ════════════════════════════════════════════════════════
                        SECCIÓN 5 — DETALLE DE MOVIMIENTOS (segunda página)
                    ═════════════════════════════════════════════════════════*/}
                    {includeDetail && (
                        <div style={{ marginTop: '70px' }}>
                            {/* Visual page-break separator */}
                            <div style={{
                                borderTop: '2px dashed #bdc3c7', paddingTop: '35px', marginBottom: '30px',
                                textAlign: 'center'
                            }}>
                                <span style={{
                                    fontSize: '12px', color: '#95a5a6', fontWeight: 700,
                                    letterSpacing: '3px', textTransform: 'uppercase'
                                }}>
                                    ─── Detalle Completo de Movimientos ───
                                </span>
                            </div>

                            <h2 style={{ fontSize: '18px', color: '#2c3e50', marginBottom: '25px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
                                {getPeriodTitle()} — Movimientos en Detalle
                            </h2>

                            {/* ── 5A: Ingresos recibidos ── */}
                            <div style={{ marginBottom: '40px' }}>
                                <h3 style={{ fontSize: '14px', color: '#27ae60', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '15px', fontWeight: 700 }}>
                                    A. Ingresos Recibidos ({reportData.detailIncomes.length})
                                </h3>
                                {reportData.detailIncomes.length === 0
                                    ? <p style={{ fontSize: '12px', color: '#7f8c8d', fontStyle: 'italic' }}>No hay ingresos registrados en este período.</p>
                                    : (
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                                            <thead>
                                                <tr>
                                                    <th style={{ ...thStyle, width: '110px' }}>Fecha</th>
                                                    <th style={thStyle}>Concepto / Nombre</th>
                                                    <th style={{ ...thStyle, textAlign: 'right', width: '120px' }}>Importe</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {reportData.detailIncomes.map((inc: any, idx) => (
                                                    <tr key={idx} style={{ background: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                                                        <td style={{ ...tdStyle, color: '#7f8c8d', whiteSpace: 'nowrap' }}>{getIncomeDate(inc)}</td>
                                                        <td style={{ ...tdStyle, fontWeight: 500 }}>{inc.name || '—'}</td>
                                                        <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: '#27ae60' }}>{formatCurrency(inc.amount)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                            <tfoot>
                                                <tr style={{ background: '#f0f9f4', borderTop: '2px solid #dee2e6' }}>
                                                    <td colSpan={2} style={{ padding: '10px', fontWeight: 700, fontSize: '13px' }}>TOTAL INGRESOS</td>
                                                    <td style={{ padding: '10px', textAlign: 'right', fontWeight: 800, fontSize: '14px', color: '#27ae60' }}>
                                                        {formatCurrency(reportData.totalIncomes)}
                                                    </td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    )
                                }
                            </div>

                            {/* ── 5B: Gastos pagados ── */}
                            <div style={{ marginBottom: '25px' }}>
                                <h3 style={{ fontSize: '14px', color: '#e74c3c', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '15px', fontWeight: 700 }}>
                                    B. Gastos Pagados ({reportData.detailExpenses.length})
                                </h3>
                                {reportData.detailExpenses.length === 0
                                    ? <p style={{ fontSize: '12px', color: '#7f8c8d', fontStyle: 'italic' }}>No hay gastos registrados en este período.</p>
                                    : (
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                                            <thead>
                                                <tr>
                                                    <th style={{ ...thStyle, width: '90px' }}>Fecha</th>
                                                    <th style={thStyle}>Descripción</th>
                                                    <th style={{ ...thStyle, width: '110px' }}>Categoría</th>
                                                    <th style={{ ...thStyle, textAlign: 'right', width: '110px' }}>Importe</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {reportData.detailExpenses.map((exp, idx) => {
                                                    const cat = categories.find(c => c.id === exp.categoryId) || DEFAULT_CATEGORIES.find(c => c.id === exp.categoryId);
                                                    return (
                                                        <tr key={idx} style={{ background: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                                                            <td style={{ ...tdStyle, color: '#7f8c8d', whiteSpace: 'nowrap', fontSize: '11px' }}>{new Date(exp.date).toLocaleDateString('es-ES')}</td>
                                                            <td style={{ ...tdStyle, fontWeight: 500 }}>{exp.description}</td>
                                                            <td style={{ ...tdStyle, color: '#7f8c8d' }}>{cat ? cat.name : 'Otros'}</td>
                                                            <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: '#e74c3c' }}>{formatCurrency(exp.amount)}</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                            <tfoot>
                                                <tr style={{ background: '#fdf2f2', borderTop: '2px solid #dee2e6' }}>
                                                    <td colSpan={3} style={{ padding: '10px', fontWeight: 700, fontSize: '13px' }}>TOTAL GASTOS</td>
                                                    <td style={{ padding: '10px', textAlign: 'right', fontWeight: 800, fontSize: '14px', color: '#e74c3c' }}>
                                                        {formatCurrency(reportData.totalExpenses)}
                                                    </td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    )
                                }
                            </div>
                        </div>
                    )}

                    {/* ── PDF Footer ── */}
                    <div style={{
                        marginTop: '40px', borderTop: '1px solid #eee', paddingTop: '15px',
                        textAlign: 'center', fontSize: '11px', color: '#bdc3c7'
                    }}>
                        Documento generado por la aplicación PCS Hogar de forma local y segura. © {new Date().getFullYear()}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReportModal;
