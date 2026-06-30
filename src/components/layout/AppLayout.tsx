import React, { type ReactNode, useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import HelpFeedbackModal from '../common/HelpFeedbackModal';
import logo from '../../assets/logo.png';
import EconomySelector from './EconomySelector';
import { useAppSettings } from '../../contexts/AppSettingsContext';
import ProfileDropdown from './ProfileDropdown';
import EditProfileModal from '../settings/EditProfileModal';

interface AppLayoutProps {
    children: ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
    const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);


    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <div style={{ display: 'flex', minHeight: '100vh', flexDirection: 'column' }}>
            {/* Mobile Header / Desktop Sidebar Placeholder */}
            <header className="glass-panel" style={{
                padding: isMobile ? 'var(--space-xs) var(--space-sm)' : 'var(--space-sm)',
                margin: isMobile ? '0 0 var(--space-sm) 0' : 'var(--space-sm)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                position: 'sticky',
                top: isMobile ? 0 : 'var(--space-sm)',
                zIndex: 10,
                borderRadius: isMobile ? 0 : 'var(--radius-md)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                    <img 
                        src={logo} 
                        alt="PCS Hogar Logo" 
                        style={{ 
                            width: 'auto', 
                            height: isMobile ? '40px' : '50px', 
                            borderRadius: '12px',
                            objectFit: 'contain'
                        }} 
                    />
                    <EconomySelector />
                </div>
                <nav style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <ProfileDropdown onEditProfile={() => setIsEditProfileModalOpen(true)} />
                    <button 
                        onClick={() => setIsHelpModalOpen(true)}
                        style={{
                            background: 'var(--panel-bg-2)',
                            border: 'none',
                            color: '#ec4899',
                            cursor: 'pointer',
                            padding: '10px',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s ease',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                        }}
                    >
                        <Heart size={24} fill="#ec4899" />
                    </button>
                </nav>
            </header>

            <main style={{
                flex: 1,
                padding: isMobile ? '0 12px 24px' : '0 var(--space-sm) var(--space-sm)',
                maxWidth: '1200px',
                width: '100%',
                margin: '0 auto',
                animation: 'fadeIn 0.5s ease'
            }}>
                {children}
            </main>

            <HelpFeedbackModal 
                isOpen={isHelpModalOpen} 
                onClose={() => setIsHelpModalOpen(false)} 
            />
            <EditProfileModal
                isOpen={isEditProfileModalOpen}
                onClose={() => setIsEditProfileModalOpen(false)}
            />
        </div>
    );
};

export default AppLayout;
