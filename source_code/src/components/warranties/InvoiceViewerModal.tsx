import React from 'react';
import { X, ExternalLink, Download } from 'lucide-react';
import ModalPortal from '../common/ModalPortal';

interface InvoiceViewerModalProps {
    title: string;
    invoiceDataUrl: string;
    onClose: () => void;
}

const InvoiceViewerModal: React.FC<InvoiceViewerModalProps> = ({ title, invoiceDataUrl, onClose }) => {
    const isPdf = invoiceDataUrl.startsWith('data:application/pdf') || invoiceDataUrl.endsWith('.pdf');

    const handleDownload = () => {
        const link = document.createElement('a');
        link.href = invoiceDataUrl;
        link.download = `Factura_${title.replace(/\s+/g, '_')}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <ModalPortal>
            <div style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(15, 23, 42, 0.85)',
                backdropFilter: 'blur(8px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '1rem',
                zIndex: 999999
            }}>
                <div className="glass-panel" style={{
                    background: '#0f172a',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '20px',
                    width: '100%',
                    maxWidth: '800px',
                    maxHeight: '90vh',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)'
                }}>
                    {/* Header */}
                    <div style={{
                        padding: '1rem 1.25rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                    }}>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#ffffff' }}>
                            📄 Factura / Ticket: {title}
                        </h3>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <button
                                onClick={handleDownload}
                                style={{
                                    background: 'rgba(99, 102, 241, 0.2)',
                                    border: '1px solid rgba(99, 102, 241, 0.4)',
                                    color: '#818cf8',
                                    padding: '0.4rem 0.85rem',
                                    borderRadius: '8px',
                                    fontSize: '0.8rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.4rem'
                                }}
                            >
                                <Download size={14} /> Descargar
                            </button>
                            <button
                                onClick={onClose}
                                style={{
                                    background: 'rgba(255, 255, 255, 0.08)',
                                    border: 'none',
                                    color: 'var(--text-muted)',
                                    padding: '0.4rem',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    display: 'flex'
                                }}
                            >
                                <X size={18} />
                            </button>
                        </div>
                    </div>

                    {/* Content Body */}
                    <div style={{
                        flex: 1,
                        padding: '1.25rem',
                        overflowY: 'auto',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        background: '#020617'
                    }}>
                        {isPdf ? (
                            <iframe
                                src={invoiceDataUrl}
                                title={title}
                                style={{
                                    width: '100%',
                                    height: '65vh',
                                    border: 'none',
                                    borderRadius: '12px'
                                }}
                            />
                        ) : (
                            <img
                                src={invoiceDataUrl}
                                alt={`Factura ${title}`}
                                style={{
                                    maxWidth: '100%',
                                    maxHeight: '65vh',
                                    objectFit: 'contain',
                                    borderRadius: '12px',
                                    boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
                                }}
                            />
                        )}
                    </div>
                </div>
            </div>
        </ModalPortal>
    );
};

export default InvoiceViewerModal;
