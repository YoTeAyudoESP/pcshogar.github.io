import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

type ToastType = 'success' | 'error' | 'info' | 'sync';

interface Toast {
    id: string;
    message: string;
    type: ToastType;
}

interface ToastContextType {
    showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = useCallback((message: string, type: ToastType = 'info') => {
        const id = Math.random().toString(36).substring(2, 9);
        setToasts(prev => [...prev, { id, message, type }]);

        // Auto remove after 3.5 seconds
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 3500);
    }, []);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <div style={{
                position: 'fixed',
                bottom: '2rem',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 9999,
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                pointerEvents: 'none',
                width: '100%',
                maxWidth: '400px',
                padding: '0 1rem'
            }}>
                {toasts.map(toast => (
                    <div 
                        key={toast.id}
                        style={{
                            background: 'rgba(20, 20, 20, 0.9)',
                            backdropFilter: 'blur(12px)',
                            border: '1px solid var(--panel-bg-3)',
                            borderRadius: '1rem',
                            padding: '0.75rem 1.25rem',
                            color: 'var(--text-main)',
                            fontSize: '0.9rem',
                            fontWeight: 500,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4)',
                            animation: 'toast-in 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
                            pointerEvents: 'auto'
                        }}
                    >
                        {toast.type === 'success' && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-success)' }} />}
                        {toast.type === 'error' && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }} />}
                        {toast.type === 'sync' && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#6366f1', animation: 'pulse 1.5s infinite' }} />}
                        {toast.type === 'info' && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#94a3b8' }} />}
                        
                        <span>{toast.message}</span>
                    </div>
                ))}
            </div>
            <style>{`
                @keyframes toast-in {
                    from { transform: translateY(1rem); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                @keyframes pulse {
                    0% { transform: scale(0.95); opacity: 0.5; }
                    50% { transform: scale(1.05); opacity: 1; }
                    100% { transform: scale(0.95); opacity: 0.5; }
                }
            `}</style>
        </ToastContext.Provider>
    );
};

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) throw new Error('useToast must be used within ToastProvider');
    return context;
};
