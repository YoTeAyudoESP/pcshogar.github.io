import React, { useState, useRef, useEffect } from 'react';
import { useAppSettings } from '../../contexts/AppSettingsContext';
import { ChevronDown, Home, Building2, Briefcase, Wallet, Plus, Settings } from 'lucide-react';
import EconomyManagementModal from '../settings/EconomyManagementModal';

const EconomySelector: React.FC = () => {
    const { activeProfile, activeEconomy, switchEconomy } = useAppSettings();
    const [isOpen, setIsOpen] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
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

    if (!activeProfile || !activeEconomy) return null;

    // Helper to get matching icon for economy name
    const getEconomyIcon = (name: string, size = 18) => {
        const lower = name.toLowerCase();
        if (lower.includes('hogar') || lower.includes('casa') || lower.includes('domest')) {
            return <Home size={size} color="var(--color-primary, #6366f1)" />;
        }
        if (lower.includes('vecino') || lower.includes('comunid') || lower.includes('edifici')) {
            return <Building2 size={size} color="var(--color-success)" />;
        }
        if (lower.includes('trabaj') || lower.includes('negoci') || lower.includes('freelanc') || lower.includes('proyect')) {
            return <Briefcase size={size} color="#f59e0b" />;
        }
        return <Wallet size={size} color="#ec4899" />;
    };

    const handleSelect = async (economyId: string) => {
        setIsOpen(false);
        await switchEconomy(economyId);
    };

    return (
        <div ref={dropdownRef} style={{ position: 'relative' }}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={triggerButtonStyle}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {getEconomyIcon(activeEconomy.name, 20)}
                    <span style={textStyle}>{activeEconomy.name}</span>
                </div>
                <ChevronDown size={16} color="#94a3b8" style={{
                    transform: isOpen ? 'rotate(180deg)' : 'rotate(0)',
                    transition: 'transform 0.2s ease'
                }} />
            </button>

            {isOpen && (
                <div style={dropdownMenuStyle}>
                    <div style={headerMenuStyle}>Cambiar Entorno</div>
                    
                    {activeProfile.economies.map((economy) => (
                        <button
                            key={economy.id}
                            onClick={() => handleSelect(economy.id)}
                            style={{
                                ...menuItemStyle,
                                backgroundColor: economy.id === activeEconomy.id 
                                    ? 'rgba(99, 102, 241, 0.08)' 
                                    : 'transparent',
                                fontWeight: economy.id === activeEconomy.id ? '600' : '400'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                {getEconomyIcon(economy.name)}
                                <span style={{ color: '#ffffff' }}>{economy.name}</span>
                            </div>
                        </button>
                    ))}

                    <div style={dividerStyle} />

                    <button
                        onClick={() => {
                            setIsOpen(false);
                            setIsModalOpen(true);
                        }}
                        style={{ ...menuItemStyle, color: 'var(--color-primary, #6366f1)' }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Settings size={18} color="var(--color-primary, #6366f1)" />
                            <span>Gestionar Entornos</span>
                        </div>
                    </button>
                </div>
            )}

            <EconomyManagementModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
            />
        </div>
    );
};

// Styles using vanilla CSS variables matching app style
const triggerButtonStyle: React.CSSProperties = {
    background: 'rgba(var(--color-rgb-light), 0.03)',
    border: '1px solid var(--panel-border)',
    borderRadius: '12px',
    padding: '8px 16px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    minWidth: '160px',
    color: '#ffffff',
    transition: 'all 0.2s ease',
    outline: 'none',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
};

const textStyle: React.CSSProperties = {
    fontSize: '14px',
    fontWeight: '600',
    letterSpacing: '-0.01em'
};

const dropdownMenuStyle: React.CSSProperties = {
    position: 'absolute',
    top: 'calc(100% + 8px)',
    left: 0,
    background: 'rgba(15, 23, 42, 0.95)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid var(--panel-border)',
    borderRadius: '14px',
    padding: '6px',
    minWidth: '220px',
    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.4)',
    zIndex: 100,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    animation: 'fadeIn 0.15s ease-out'
};

const headerMenuStyle: React.CSSProperties = {
    fontSize: '11px',
    fontWeight: '700',
    textTransform: 'uppercase',
    color: '#64748b',
    padding: '8px 12px 4px 12px',
    letterSpacing: '0.05em'
};

const menuItemStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    width: '100%',
    padding: '10px 12px',
    borderRadius: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: '13.5px',
    textAlign: 'left',
    transition: 'background-color 0.15s ease',
    outline: 'none'
};

const dividerStyle: React.CSSProperties = {
    height: '1px',
    background: 'rgba(var(--color-rgb-light), 0.08)',
    margin: '4px 6px'
};

export default EconomySelector;
