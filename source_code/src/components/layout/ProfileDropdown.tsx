import React, { useState, useRef, useEffect } from 'react';
import { useAppSettings } from '../../contexts/AppSettingsContext';
import { LogOut, User } from 'lucide-react';
import UserAvatar from '../common/UserAvatar';

interface ProfileDropdownProps {
    onEditProfile: () => void;
}

const ProfileDropdown: React.FC<ProfileDropdownProps> = ({ onEditProfile }) => {
    const { activeProfile, logout, settings } = useAppSettings();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (!activeProfile) return null;

    const isPrincipal = activeProfile.id === 'prof_default';

    return (
        <div ref={dropdownRef} style={{ position: 'relative' }}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={triggerButtonStyle}
                title="Menú de Usuario"
            >
                <UserAvatar avatar={activeProfile.avatar} name={activeProfile.name} size={38} />
                <span style={nameTextStyle}>{activeProfile.name}</span>
            </button>

            {isOpen && (
                <div style={dropdownMenuStyle}>
                    {/* User Profile Header Summary */}
                    <div style={headerSummaryStyle}>
                        <UserAvatar avatar={activeProfile.avatar} name={activeProfile.name} size={44} fontSize="18px" />
                        <div style={metaAreaStyle}>
                            <div style={nameLabelStyle}>{activeProfile.name}</div>
                            <div style={roleLabelStyle}>
                                {isPrincipal ? 'Usuario Principal' : 'Usuario Secundario'}
                            </div>
                        </div>
                    </div>

                    <div style={dividerStyle} />

                    {/* Action Items */}
                    <button
                        onClick={() => {
                            setIsOpen(false);
                            onEditProfile();
                        }}
                        style={menuItemStyle}
                    >
                        <div style={itemContentStyle}>
                            <User size={16} color="#94a3b8" />
                            <span>Editar mi perfil</span>
                        </div>
                    </button>

                    {(() => {
                        const hasPin = !!activeProfile.pinHash;
                        const hasMultipleProfiles = !!(settings.profiles && settings.profiles.length > 1);
                        const showLockOption = hasPin || hasMultipleProfiles;
                        return showLockOption && (
                            <>
                                <div style={dividerStyle} />
                                <button
                                    onClick={() => {
                                        setIsOpen(false);
                                        logout();
                                    }}
                                    style={{ ...menuItemStyle, color: '#f43f5e' }}
                                >
                                    <div style={itemContentStyle}>
                                        <LogOut size={16} color="#f43f5e" />
                                        <span>Bloquear / Salir</span>
                                    </div>
                                </button>
                            </>
                        );
                    })()}
                </div>
            )}
        </div>
    );
};

// CSS Styles
const triggerButtonStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '4px 8px',
    borderRadius: '100px',
    transition: 'all 0.2s ease',
    outline: 'none'
};

const nameTextStyle: React.CSSProperties = {
    fontSize: '14px',
    fontWeight: '600',
    color: '#e2e8f0',
    maxWidth: '120px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    display: 'none',
};

const dropdownMenuStyle: React.CSSProperties = {
    position: 'absolute',
    top: 'calc(100% + 8px)',
    right: 0,
    background: 'rgba(15, 23, 42, 0.96)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '16px',
    padding: '8px',
    minWidth: '200px',
    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)',
    zIndex: 100,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    animation: 'fadeIn 0.15s ease-out'
};

const headerSummaryStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 12px 8px 12px'
};

const metaAreaStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    overflow: 'hidden'
};

const nameLabelStyle: React.CSSProperties = {
    fontSize: '14.5px',
    fontWeight: '700',
    color: '#ffffff',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
};

const roleLabelStyle: React.CSSProperties = {
    fontSize: '11px',
    color: '#94a3b8',
    fontWeight: '500'
};

const dividerStyle: React.CSSProperties = {
    height: '1px',
    background: 'rgba(255, 255, 255, 0.08)',
    margin: '6px 4px'
};

const menuItemStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    width: '100%',
    padding: '10px 12px',
    borderRadius: '10px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: '13.5px',
    textAlign: 'left',
    transition: 'background-color 0.15s ease',
    outline: 'none',
    color: '#e2e8f0'
};

const itemContentStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
};

export default ProfileDropdown;
