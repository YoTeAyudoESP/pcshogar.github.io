import React from 'react';
import { Heart, Coffee, Mail, X } from 'lucide-react';

interface HelpFeedbackModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const HelpFeedbackModal: React.FC<HelpFeedbackModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
            animation: 'fadeIn 0.3s ease'
        }}>
            <div className="glass-panel" style={{
                maxWidth: '440px',
                width: '100%',
                backgroundColor: '#12141a',
                padding: '40px 30px',
                borderRadius: '24px',
                textAlign: 'center',
                position: 'relative',
                boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
                border: '1px solid rgba(255, 255, 255, 0.08)'
            }}>
                {/* Close Button */}
                <button 
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: '20px',
                        right: '20px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: 'none',
                        color: 'white',
                        cursor: 'pointer',
                        padding: '8px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                >
                    <X size={20} />
                </button>

                {/* Heart Icon in Gradient Circle */}
                <div style={{
                    width: '80px',
                    height: '80px',
                    margin: '0 auto 24px',
                    background: 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)',
                    borderRadius: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 10px 20px rgba(236, 72, 153, 0.3)'
                }}>
                    <Heart size={40} color="white" fill="white" />
                </div>

                {/* Title */}
                <h2 style={{
                    fontSize: '1.75rem',
                    fontWeight: 800,
                    marginBottom: '16px',
                    color: 'white'
                }}>
                    ¡Gracias por usar PCS Hogar!
                </h2>

                {/* Text */}
                <p style={{
                    fontSize: '1rem',
                    lineHeight: '1.6',
                    color: 'rgba(255, 255, 255, 0.7)',
                    marginBottom: '32px'
                }}>
                    Esta aplicación ha sido desarrollada de forma independiente y su uso es 100% gratuito. 
                    Si te resulta útil, puedes invitarme a un café de forma totalmente opcional. 
                    La app funcionará completa e idénticamente aportes o no.
                </p>

                {/* Buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
                    <button style={{
                        width: '100%',
                        padding: '16px',
                        borderRadius: '12px',
                        background: '#4f46e5',
                        color: 'white',
                        border: 'none',
                        fontWeight: 600,
                        fontSize: '1.1rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '10px',
                        cursor: 'pointer',
                        boxShadow: '0 4px 15px rgba(79, 70, 229, 0.3)'
                    }}>
                        <Coffee size={24} />
                        Invitar a un café (PayPal)
                    </button>

                    <button style={{
                        width: '100%',
                        padding: '16px',
                        borderRadius: '12px',
                        background: '#1e2028',
                        color: 'white',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        fontWeight: 600,
                        fontSize: '1.1rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '10px',
                        cursor: 'pointer'
                    }}>
                        <Mail size={24} />
                        Enviar una sugerencia
                    </button>
                </div>

                {/* Legal Text */}
                <p style={{
                    fontSize: '0.8rem',
                    lineHeight: '1.4',
                    color: 'rgba(255, 255, 255, 0.4)',
                    marginBottom: '24px',
                    padding: '0 10px'
                }}>
                    Aviso Legal: Toda aportación es 100% voluntaria, no reembolsable y no otorga servicios extra. 
                    Yo Te Ayudo (ESP) no recopila datos de pago. Pagos gestionados externamente y de forma segura por PayPal.
                </p>

                {/* Link */}
                <button 
                    onClick={onClose}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: 'rgba(255, 255, 255, 0.6)',
                        textDecoration: 'underline',
                        fontSize: '0.9rem',
                        cursor: 'pointer'
                    }}
                >
                    No volver a mostrar
                </button>
            </div>
        </div>
    );
};

export default HelpFeedbackModal;
