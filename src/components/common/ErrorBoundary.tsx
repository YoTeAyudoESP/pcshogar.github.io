import React, { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
        errorInfo: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error, errorInfo: null };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        this.setState({ errorInfo });
        console.error("ErrorBoundary caught an uncaught error:", error, errorInfo);
    }

    private handleReset = () => {
        if (window.confirm("¿Estás seguro de que deseas restablecer la configuración? Esto borrará el PIN y los perfiles locales, pero no eliminará tus bases de datos de transacciones.")) {
            localStorage.removeItem('pcshogar_settings');
            localStorage.removeItem('pcshogar_terms_accepted');
            window.location.reload();
        }
    };

    private handleHardReset = () => {
        if (window.confirm("⚠️ ATENCIÓN: Esto borrará ABSOLUTAMENTE TODOS los datos locales de la aplicación (incluyendo transacciones, cuentas y PIN). ¿Deseas continuar?")) {
            localStorage.clear();
            // Delete IndexedDB databases
            const request1 = indexedDB.deleteDatabase('domestic-economy-db');
            request1.onsuccess = () => console.log('Deleted domestic-economy-db');
            
            // Delete profile-specific DBs if any
            const saved = localStorage.getItem('pcshogar_settings');
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    if (parsed.profiles) {
                        parsed.profiles.forEach((p: any) => {
                            if (p.economies) {
                                p.economies.forEach((e: any) => {
                                    if (e.dbName && e.dbName !== 'domestic-economy-db') {
                                        indexedDB.deleteDatabase(e.dbName);
                                    }
                                });
                            }
                        });
                    }
                } catch (e) {}
            }
            
            setTimeout(() => {
                window.location.reload();
            }, 500);
        }
    };

    private handleCopyError = () => {
        const errorText = `Error: ${this.state.error?.toString()}\n\nStack Trace:\n${this.state.error?.stack}\n\nComponent Stack:\n${this.state.errorInfo?.componentStack}`;
        navigator.clipboard.writeText(errorText).then(() => {
            alert("Detalles del error copiados al portapapeles.");
        }).catch(err => {
            console.error("Failed to copy error", err);
        });
    };

    public render() {
        if (this.state.hasError) {
            return (
                <div style={containerStyle}>
                    <div style={cardStyle}>
                        <div style={iconContainerStyle}>
                            <span style={{ fontSize: '2.5rem' }}>⚠️</span>
                        </div>
                        <h2 style={titleStyle}>Algo ha salido mal</h2>
                        <p style={subtitleStyle}>
                            La aplicación ha detectado un error inesperado al renderizar la pantalla.
                        </p>

                        <div style={errorDetailsStyle}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <span style={errorTitleStyle}>Detalles técnicos del error:</span>
                                <button 
                                    onClick={this.handleCopyError}
                                    style={copyButtonStyle}
                                >
                                    Copiar Reporte
                                </button>
                            </div>
                            <pre style={codeStyle}>
                                <strong>{this.state.error?.toString()}</strong>
                                {"\n\nStack Trace:\n"}
                                {this.state.error?.stack}
                                {this.state.errorInfo?.componentStack && `\n\nComponent Stack:\n${this.state.errorInfo.componentStack}`}
                            </pre>
                        </div>

                        <div style={buttonContainerStyle}>
                            <button 
                                onClick={() => window.location.reload()}
                                style={primaryButtonStyle}
                            >
                                Recargar Aplicación
                            </button>
                            
                            <button 
                                onClick={this.handleReset}
                                style={secondaryButtonStyle}
                            >
                                Restablecer Ajustes
                            </button>

                            <button 
                                onClick={this.handleHardReset}
                                style={dangerButtonStyle}
                            >
                                Borrar Todo (Reset Total)
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

// Premium dark glassmorphic styling matching the app lock screen
const containerStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    backgroundImage: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99999,
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
    padding: '20px',
    boxSizing: 'border-box'
};

const cardStyle: React.CSSProperties = {
    background: 'rgba(var(--color-rgb-light), 0.03)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid var(--panel-border)',
    borderRadius: '24px',
    padding: '32px',
    width: '100%',
    maxWidth: '650px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    boxSizing: 'border-box'
};

const iconContainerStyle: React.CSSProperties = {
    width: '72px',
    height: '72px',
    borderRadius: '50%',
    background: 'rgba(239, 68, 68, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '20px',
    border: '1px solid rgba(239, 68, 68, 0.2)'
};

const titleStyle: React.CSSProperties = {
    fontSize: '24px',
    fontWeight: '800',
    color: '#ffffff',
    margin: '0 0 8px 0',
    letterSpacing: '-0.025em'
};

const subtitleStyle: React.CSSProperties = {
    fontSize: '14px',
    color: '#94a3b8',
    margin: '0 0 24px 0',
    lineHeight: '1.5',
    textAlign: 'center'
};

const errorDetailsStyle: React.CSSProperties = {
    width: '100%',
    background: 'rgba(0, 0, 0, 0.3)',
    border: '1px solid var(--panel-bg-2)',
    borderRadius: '16px',
    padding: '16px',
    marginBottom: '24px',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column'
};

const errorTitleStyle: React.CSSProperties = {
    fontSize: '13px',
    fontWeight: '700',
    color: '#f87171'
};

const copyButtonStyle: React.CSSProperties = {
    background: 'rgba(var(--color-rgb-light), 0.08)',
    border: 'none',
    color: '#ffffff',
    padding: '4px 10px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.15s ease'
};

const codeStyle: React.CSSProperties = {
    margin: '8px 0 0 0',
    color: '#cbd5e1',
    fontFamily: 'Consolas, Monaco, monospace',
    fontSize: '12px',
    lineHeight: '1.5',
    maxHeight: '220px',
    overflowY: 'auto',
    textAlign: 'left',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all'
};

const buttonContainerStyle: React.CSSProperties = {
    display: 'flex',
    gap: '12px',
    width: '100%',
    flexWrap: 'wrap'
};

const primaryButtonStyle: React.CSSProperties = {
    flex: '1 1 200px',
    padding: '14px',
    borderRadius: '12px',
    background: 'var(--color-primary, #6366f1)',
    color: 'var(--text-main)',
    border: 'none',
    fontWeight: 700,
    fontSize: '14px',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.2)',
    transition: 'all 0.2s ease',
    outline: 'none'
};

const secondaryButtonStyle: React.CSSProperties = {
    flex: '1 1 200px',
    padding: '14px',
    borderRadius: '12px',
    background: 'var(--panel-bg-2)',
    color: 'var(--text-main)',
    border: '1px solid var(--panel-border)',
    fontWeight: 600,
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    outline: 'none'
};

const dangerButtonStyle: React.CSSProperties = {
    flex: '1 1 100%',
    padding: '10px',
    borderRadius: '12px',
    background: 'rgba(239, 68, 68, 0.1)',
    color: '#f87171',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    fontWeight: 600,
    fontSize: '12.5px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    outline: 'none',
    marginTop: '4px'
};

export default ErrorBoundary;
