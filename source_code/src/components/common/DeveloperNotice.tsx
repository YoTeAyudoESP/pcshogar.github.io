import React, { useEffect, useState } from 'react';
import { AlertTriangle, X, Info } from 'lucide-react';

interface NoticeData {
    id: string;
    title: string;
    body: string;
    type?: 'info' | 'warning' | 'error';
    active: boolean;
}

const DeveloperNotice: React.FC = () => {
    const [notice, setNotice] = useState<NoticeData | null>(null);

    useEffect(() => {
        const fetchNotice = async () => {
            try {
                // Check local storage first so we don't fetch unnecessarily if we already dismissed the latest one
                // Wait, we need to fetch to know the latest ID, but we can do it silently.
                const response = await fetch('https://raw.githubusercontent.com/YoTeAyudoESP/pcshogar.github.io/main/notice.json', {
                    cache: 'no-store'
                });
                
                if (!response.ok) return;
                
                const data: NoticeData = await response.json();
                
                if (data && data.active && data.id) {
                    const dismissedId = localStorage.getItem('developerNoticeDismissed');
                    if (dismissedId !== data.id) {
                        setNotice(data);
                    }
                }
            } catch (error) {
                // Silently ignore network errors to not bother the user
                console.warn('Could not fetch developer notices:', error);
            }
        };

        fetchNotice();
    }, []);

    const handleDismiss = () => {
        if (notice) {
            localStorage.setItem('developerNoticeDismissed', notice.id);
            setNotice(null);
        }
    };

    if (!notice) return null;

    const isError = notice.type === 'error';
    const isWarning = notice.type === 'warning';
    
    const bgColor = isError ? 'rgba(244, 63, 94, 0.95)' : isWarning ? 'rgba(245, 158, 11, 0.95)' : 'rgba(59, 130, 246, 0.95)';
    const Icon = (isError || isWarning) ? AlertTriangle : Info;

    return (
        <div className="modal-overlay" style={{ zIndex: 9999, alignItems: 'center' }}>
            <div className="modal-container" style={{ maxWidth: '450px', background: '#1a1f2e', overflow: 'hidden' }}>
                <div style={{ background: bgColor, padding: '1.5rem', display: 'flex', alignItems: 'flex-start', gap: '1rem', color: 'white' }}>
                    <Icon size={28} style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div style={{ flex: 1 }}>
                        <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                            {notice.title}
                        </h2>
                        <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: 1.5, opacity: 0.9 }}>
                            {notice.body}
                        </p>
                    </div>
                </div>
                
                <div style={{ padding: '1.2rem', display: 'flex', justifyContent: 'flex-end', background: 'rgba(255,255,255,0.02)' }}>
                    <button 
                        onClick={handleDismiss}
                        style={{
                            background: 'rgba(255,255,255,0.1)',
                            border: '1px solid rgba(255,255,255,0.2)',
                            color: 'white',
                            padding: '0.6rem 1.5rem',
                            borderRadius: '8px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                    >
                        <X size={16} />
                        Entendido
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DeveloperNotice;
