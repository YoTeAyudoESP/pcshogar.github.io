import React from 'react';
import { ShieldCheck, Check, RefreshCw, AlertCircle } from 'lucide-react';
import ModalPortal from './ModalPortal';

interface DataRepairNoticeModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const DataRepairNoticeModal: React.FC<DataRepairNoticeModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <ModalPortal>
            <div style={{
                position: 'fixed',
                top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                backdropFilter: 'blur(8px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1100,
                padding: '1rem'
            }}>
                <div style={{
                    background: 'linear-gradient(145deg, #1e1e2d 0%, #151521 100%)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    borderRadius: '1.25rem',
                    width: '100%',
                    maxWidth: '520px',
                    boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
                    padding: '1.5rem',
                    color: 'white',
                    position: 'relative'
                }}>
                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '1.25rem' }}>
                        <div style={{
                            width: '46px', height: '46px', borderRadius: '14px',
                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)',
                            flexShrink: 0
                        }}>
                            <ShieldCheck size={26} color="white" />
                        </div>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>Mantenimiento de Datos Realizado</h2>
                            <p style={{ margin: 0, fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>Optimización e integridad del sistema</p>
                        </div>
                    </div>

                    {/* Main text */}
                    <div style={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.85)', lineHeight: '1.5', marginBottom: '1.25rem' }}>
                        En esta actualización hemos realizado una verificación de integridad en tu base de datos. Se han detectado y eliminado registros duplicados procedentes de la sincronización cruzada entre distintas economías.
                    </div>

                    {/* Recommendations Card */}
                    <div style={{
                        background: 'rgba(16, 185, 129, 0.08)',
                        border: '1px solid rgba(16, 185, 129, 0.25)',
                        borderRadius: '0.85rem',
                        padding: '1rem',
                        marginBottom: '1.25rem'
                    }}>
                        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <Check size={16} /> Pasos recomendados tras este ajuste
                        </div>
                        <ol style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.85)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <li>
                                <strong>Comprueba tu Dashboard:</strong> Verifica que tu saldo disponible y cuentas reflejan la realidad y que no aparece ninguna alerta de descuadre.
                            </li>
                            <li>
                                <strong>Si usas Sincronización en la Nube (Dropbox / Google Drive):</strong> Una vez hayas verificado en el Dashboard que todo está correcto, entra en <em>Ajustes ⚙️ ➔ Aplicación</em> y pulsa en <strong>"Sincronizar ahora"</strong> para guardar tu base de datos limpia en la nube.
                            </li>
                        </ol>
                    </div>

                    {/* Support Note */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '1.5rem' }}>
                        <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px', color: '#818cf8' }} />
                        <span>Si tienes cualquier duda o notas alguna incoherencia, puedes ponerte en contacto con el desarrollador desde la sección de soporte.</span>
                    </div>

                    {/* Action Button */}
                    <button
                        type="button"
                        onClick={onClose}
                        style={{
                            width: '100%',
                            padding: '0.9rem',
                            borderRadius: '0.75rem',
                            border: 'none',
                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                            color: 'white',
                            fontWeight: 700,
                            fontSize: '0.95rem',
                            cursor: 'pointer',
                            boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem'
                        }}
                    >
                        <Check size={18} /> Aceptar y Entendido
                    </button>
                </div>
            </div>
        </ModalPortal>
    );
};

export default DataRepairNoticeModal;
