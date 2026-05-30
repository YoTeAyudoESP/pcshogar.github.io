import React, { useState, useEffect } from 'react';
import { subscribeToNotifications, type SyncNotification } from '../../services/syncService';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const GlobalNotification: React.FC = () => {
    const [notification, setNotification] = useState<SyncNotification | null>(null);

    useEffect(() => {
        return subscribeToNotifications((notif) => {
            setNotification(notif);
            if (notif.duration) {
                setTimeout(() => {
                    setNotification((current) => current === notif ? null : current);
                }, notif.duration);
            }
        });
    }, []);

    if (!notification) return null;

    let bg = 'rgba(33, 150, 243, 0.9)';
    let Icon = Info;
    if (notification.type === 'success') {
        bg = 'rgba(76, 175, 80, 0.9)';
        Icon = CheckCircle2;
    } else if (notification.type === 'error') {
        bg = 'rgba(244, 67, 54, 0.9)';
        Icon = AlertCircle;
    }

    return (
        <div style={{
            position: 'fixed',
            bottom: window.innerWidth < 600 ? 'calc(var(--safe-area-bottom, 0px) + 5rem)' : '2rem',
            left: '50%',
            transform: 'translateX(-50%)',
            background: bg,
            color: 'white',
            padding: '0.75rem 1.25rem',
            borderRadius: '2rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            boxShadow: '0 4px 6px rgba(0,0,0,0.2)',
            zIndex: 9999,
            maxWidth: '90vw',
            animation: 'fadeIn 0.3s ease-out'
        }}>
            <Icon size={20} />
            <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{notification.message}</span>
            <button
                onClick={() => setNotification(null)}
                style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'white',
                    cursor: 'pointer',
                    padding: 0,
                    marginLeft: '0.5rem',
                    opacity: 0.8
                }}
            >
                <X size={16} />
            </button>
        </div>
    );
};

export default GlobalNotification;
