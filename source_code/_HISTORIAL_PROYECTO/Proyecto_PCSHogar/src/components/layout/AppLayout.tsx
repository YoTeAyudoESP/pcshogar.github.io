import React, { type ReactNode } from 'react';

interface AppLayoutProps {
    children: ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
    return (
        <div style={{ display: 'flex', minHeight: '100vh', flexDirection: 'column' }}>
            {/* Mobile Header / Desktop Sidebar Placeholder */}
            <header className="glass-panel" style={{
                padding: 'var(--space-sm)',
                margin: 'var(--space-sm)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                position: 'sticky',
                top: 'var(--space-sm)',
                zIndex: 10
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                    <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 'bold',
                        color: 'white'
                    }}>
                        PCS
                    </div>
                    <h1 style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.02em' }}>PCSHogar</h1>
                </div>
                <nav>
                    {/* Simple Nav Placeholder */}
                    <button style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-main)',
                        cursor: 'pointer',
                        padding: '8px'
                    }}>
                        Menú
                    </button>
                </nav>
            </header>

            <main style={{
                flex: 1,
                padding: '0 var(--space-sm) var(--space-sm)',
                maxWidth: '1200px',
                width: '100%',
                margin: '0 auto'
            }}>
                {children}
            </main>
        </div>
    );
};

export default AppLayout;
