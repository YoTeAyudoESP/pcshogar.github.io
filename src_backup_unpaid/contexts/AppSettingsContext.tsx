import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { AppSettings, SyncSettings } from '../types/finance';

interface AppSettingsContextType {
    settings: AppSettings;
    updateSettings: (newSettings: Partial<AppSettings>) => void;
    updateSyncSettings: (newSync: Partial<SyncSettings>) => void;
}

const DEFAULT_SETTINGS: AppSettings = {
    currency: 'EUR',
    language: 'es',
    theme: 'default',
    sync: {
        enabled: false,
        type: 'local',
        localPath: '',
        lastSync: 0
    }
};

const SettingsContext = createContext<AppSettingsContextType | undefined>(undefined);

export const AppSettingsProvider = ({ children }: { children: ReactNode }) => {
    const [settings, setSettings] = useState<AppSettings>(() => {
        const saved = localStorage.getItem('pcshogar_settings');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                // Ensure sync structure exists in case of old saved settings
                return {
                    ...DEFAULT_SETTINGS,
                    ...parsed,
                    sync: { ...DEFAULT_SETTINGS.sync, ...parsed.sync }
                };
            } catch (e) {
                return DEFAULT_SETTINGS;
            }
        }
        return DEFAULT_SETTINGS;
    });

    useEffect(() => {
        localStorage.setItem('pcshogar_settings', JSON.stringify(settings));
        
        // Apply theme color tokens to root if necessary
        // In this app, we might want to update CSS variables dynamically
        const root = document.documentElement;
        if (settings.theme === 'ocean') {
            root.style.setProperty('--color-primary', '#0ea5e9');
            root.style.setProperty('--color-secondary', '#0284c7');
        } else if (settings.theme === 'forest') {
            root.style.setProperty('--color-primary', '#10b981');
            root.style.setProperty('--color-secondary', '#059669');
        } else if (settings.theme === 'sunset') {
            root.style.setProperty('--color-primary', '#f59e0b');
            root.style.setProperty('--color-secondary', '#d97706');
        } else if (settings.theme === 'midnight') {
            root.style.setProperty('--color-primary', '#334155');
            root.style.setProperty('--color-secondary', '#1e293b');
        } else {
            root.style.setProperty('--color-primary', '#6366f1');
            root.style.setProperty('--color-secondary', '#4f46e5');
        }
    }, [settings]);

    const updateSettings = (newSettings: Partial<AppSettings>) => {
        setSettings(prev => ({ ...prev, ...newSettings }));
    };

    const updateSyncSettings = (newSync: Partial<SyncSettings>) => {
        setSettings(prev => ({
            ...prev,
            sync: { ...prev.sync, ...newSync }
        }));
    };

    return (
        <SettingsContext.Provider value={{ settings, updateSettings, updateSyncSettings }}>
            {children}
        </SettingsContext.Provider>
    );
};

export const useAppSettings = () => {
    const context = useContext(SettingsContext);
    if (!context) throw new Error('useAppSettings must be used within AppSettingsProvider');
    return context;
};
