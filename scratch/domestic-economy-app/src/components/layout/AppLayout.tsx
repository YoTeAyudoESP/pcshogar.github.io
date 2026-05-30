import React, { type ReactNode, useState, useEffect } from 'react';
import { ChevronUp } from 'lucide-react';

interface AppLayoutProps {
    children: ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
    const [showScrollTop, setShowScrollTop] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setShowScrollTop(window.scrollY > 200);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <div style={{ display: 'flex', minHeight: '100vh', flexDirection: 'column' }}>
            {/* Mobile Header / Desktop Sidebar Placeholder */}
            <header className="glass-panel" style={{
                padding: 'calc(max(env(safe-area-inset-top, 0px), var(--status-bar-height, 0px)) + var(--space-sm)) var(--space-sm) var(--space-sm)',
                margin: '0',
                borderRadius: '0 0 var(--radius-md) var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                position: 'sticky',
                top: 0,
                zIndex: 10,
                background: 'var(--bg-surface)',
                border: 'var(--card-border)',
                borderTop: 'none',
                backdropFilter: 'blur(var(--glass-blur))'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                    <img
                        src="./logo.jpg"
                        alt="PCSHogar Logo"
                        style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '12px',
                            objectFit: 'cover'
                        }}
                    />
                    <h1 style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.02em' }}>PCSHogar</h1>
                </div>
                <nav style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    {showScrollTop && (
                        <button
                            onClick={scrollToTop}
                            className="btn-icon"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0.5rem 0.75rem',
                                fontSize: '0.8rem',
                                color: 'var(--btn-ghost-text)',
                                background: 'var(--btn-ghost-bg)',
                                animation: 'fadeIn 0.3s ease-in-out'
                            }}
                            title="Volver Arriba"
                        >
                            <ChevronUp size={18} />
                            <span>Arriba</span>
                        </button>
                    )}
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
