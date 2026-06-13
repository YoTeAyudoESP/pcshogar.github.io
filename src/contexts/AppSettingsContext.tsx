import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { AppSettings, SyncSettings, Economy, UserProfile } from '../types/finance';
import { DropboxService } from '../services/dropboxService';
import { GoogleDriveService } from '../services/googleDriveService';
import { incomeDB } from '../services/db';

interface AppSettingsContextType {
    settings: AppSettings;
    updateSettings: (newSettings: Partial<AppSettings>) => void;
    updateSyncSettings: (newSync: Partial<SyncSettings>) => void;
    activeProfile: UserProfile | null;
    activeEconomy: Economy | null;
    isAuthenticated: boolean;
    setIsAuthenticated: (auth: boolean) => void;
    authenticate: (pin: string) => Promise<boolean>;
    logout: () => void;
    switchEconomy: (economyId: string) => Promise<void>;
    addEconomy: (name: string, syncType: 'local' | 'smb' | 'dropbox' | 'googledrive', syncPath: string, shareWithPrincipal?: boolean) => Promise<Economy>;
    deleteEconomy: (economyId: string) => Promise<void>;
    setProfilePin: (pin: string | null, profileId?: string) => Promise<void>;
    setProfileBiometric: (enabled: boolean) => Promise<void>;
    switchProfile: (profileId: string) => Promise<void>;
    addProfile: (name: string, sharedEconomyIds: string[], pin?: string) => Promise<void>;
    deleteProfile: (profileId: string) => Promise<void>;
    updateProfileShare: (profileId: string, sharedEconomyIds: string[]) => Promise<void>;
    updateEconomySharing: (economyId: string, sharedWithProfileIds: string[]) => Promise<void>;
    updateProfileName: (profileId: string, newName: string) => Promise<void>;
    updateProfileAvatar: (profileId: string, avatar: string) => Promise<void>;
}

const DEFAULT_SETTINGS: AppSettings = {
    currency: 'EUR',
    language: 'es',
    theme: 'default',
    sync: {
        enabled: false,
        type: 'local',
        localPath: '',
        dropboxPath: '/pcshogar_data.json',
        lastSync: 0
    }
};

const SettingsContext = createContext<AppSettingsContextType | undefined>(undefined);

// Helper to hash PIN locally using a robust pure JS FNV-1a hashing function (works in non-secure contexts like file://)
async function hashPIN(pin: string): Promise<string> {
    let hash = 0x811c9dc5;
    for (let i = 0; i < pin.length; i++) {
        hash ^= pin.charCodeAt(i);
        hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }
    return (hash >>> 0).toString(16).padStart(8, '0');
}

export const AppSettingsProvider = ({ children }: { children: ReactNode }) => {
    const [settings, setSettings] = useState<AppSettings>(() => {
        const saved = localStorage.getItem('pcshogar_settings');
        let baseSettings = DEFAULT_SETTINGS;
        
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                baseSettings = {
                    ...DEFAULT_SETTINGS,
                    ...parsed,
                    sync: { ...DEFAULT_SETTINGS.sync, ...parsed.sync }
                };
            } catch (e) {
                baseSettings = DEFAULT_SETTINGS;
            }
        }

        // Auto-migration to Profiles and Economies if not present
        if (!baseSettings.profiles || baseSettings.profiles.length === 0) {
            const defaultEcoId = 'eco_default';
            const defaultProfileId = 'prof_default';
            const defaultEconomy: Economy = {
                id: defaultEcoId,
                name: 'Hogar',
                dbName: 'domestic-economy-db', // Keeps the original database name for backward compatibility
                sync: { ...baseSettings.sync }
            };
            const defaultProfile: UserProfile = {
                id: defaultProfileId,
                name: 'Principal',
                economies: [defaultEconomy],
                activeEconomyId: defaultEcoId
            };
            baseSettings.profiles = [defaultProfile];
            baseSettings.activeProfileId = defaultProfileId;
        }

        // Clean up legacy 64-character SHA-256 PIN hashes from the previous beta test
        let didClearLegacyPin = false;
        let didMigrate = false;
        if (baseSettings.profiles) {
            baseSettings.profiles.forEach(p => {
                if (p.pinHash && p.pinHash.length === 64) {
                    p.pinHash = undefined;
                    didClearLegacyPin = true;
                }
                
                // Auto-migrate default avatar
                if (!p.avatar) {
                    p.avatar = p.id === 'prof_default' ? 'gradient:1' : 'gradient:2';
                    didMigrate = true;
                }
                
                // Auto-migrate economy owners
                p.economies.forEach(eco => {
                    if (!eco.ownerProfileId) {
                        const inPrincipal = baseSettings.profiles?.find(pr => pr.id === 'prof_default')?.economies.some(e => e.id === eco.id);
                        if (inPrincipal) {
                            eco.ownerProfileId = 'prof_default';
                        } else {
                            eco.ownerProfileId = p.id;
                        }
                        didMigrate = true;
                    }
                });
            });
        }

        if (didClearLegacyPin || didMigrate) {
            localStorage.setItem('pcshogar_settings', JSON.stringify(baseSettings));
        }

        return baseSettings;
    });

    const activeProfile = settings.profiles?.find(p => p.id === settings.activeProfileId) || null;
    const activeEconomy = activeProfile?.economies.find(e => e.id === activeProfile.activeEconomyId) || null;

    const [isAuthenticated, setIsAuthenticated] = useState(() => {
        const prof = settings.profiles?.find(p => p.id === settings.activeProfileId);
        if (!prof || !prof.pinHash) {
            return true;
        }
        return false;
    });

    // Initialize database switching to the correct active economy on startup
    useEffect(() => {
        if (activeEconomy) {
            incomeDB.switchDatabase(activeEconomy.dbName);
        }
    }, []);

    useEffect(() => {
        // Initialize Dropbox if token exists for active economy or global settings
        const currentSync = activeEconomy?.sync || settings.sync;
        if (currentSync.type === 'dropbox' && currentSync.dropboxToken) {
            DropboxService.init(currentSync.dropboxToken, currentSync.dropboxPath);
        } else if (currentSync.type === 'googledrive' && currentSync.googledriveToken) {
            GoogleDriveService.init(currentSync.googledriveToken, currentSync.googledrivePath || 'pcshogar_data.json');
        }

        localStorage.setItem('pcshogar_settings', JSON.stringify(settings));
        
        // Apply theme color tokens to root if necessary
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
    }, [settings, activeEconomy]);

    const updateSettings = (newSettings: Partial<AppSettings>) => {
        setSettings(prev => ({ ...prev, ...newSettings }));
    };

    const updateSyncSettings = (newSync: Partial<SyncSettings>) => {
        setSettings(prev => {
            const activeProf = prev.profiles?.find(p => p.id === prev.activeProfileId);
            const activeEcoId = activeProf?.activeEconomyId;

            const updatedProfiles = prev.profiles?.map(p => {
                const hasEco = p.economies.some(e => e.id === activeEcoId);
                if (hasEco) {
                    const updatedEconomies = p.economies.map(e => {
                        if (e.id === activeEcoId) {
                            return { ...e, sync: { ...e.sync, ...newSync } };
                        }
                        return e;
                    });
                    return { ...p, economies: updatedEconomies };
                }
                return p;
            });
            return {
                ...prev,
                sync: { ...prev.sync, ...newSync },
                profiles: updatedProfiles
            };
        });
    };

    const authenticate = async (pin: string): Promise<boolean> => {
        if (!activeProfile || !activeProfile.pinHash) {
            setIsAuthenticated(true);
            return true;
        }
        const hash = await hashPIN(pin);
        if (hash === activeProfile.pinHash) {
            setIsAuthenticated(true);
            return true;
        }
        return false;
    };

    const logout = () => {
        setIsAuthenticated(false);
    };

    const switchEconomy = async (economyId: string): Promise<void> => {
        if (!activeProfile) return;
        const economy = activeProfile.economies.find(e => e.id === economyId);
        if (!economy) return;

        await incomeDB.switchDatabase(economy.dbName);

        if (economy.sync.enabled) {
            if (economy.sync.type === 'dropbox' && economy.sync.dropboxToken) {
                DropboxService.init(economy.sync.dropboxToken, economy.sync.dropboxPath);
            } else if (economy.sync.type === 'googledrive' && economy.sync.googledriveToken) {
                GoogleDriveService.init(economy.sync.googledriveToken, economy.sync.googledrivePath || 'pcshogar_data.json');
            }
        }

        setSettings(prev => {
            const updatedProfiles = prev.profiles?.map(p => {
                if (p.id === prev.activeProfileId) {
                    return { ...p, activeEconomyId: economyId };
                }
                return p;
            });
            return {
                ...prev,
                sync: { ...prev.sync, ...economy.sync },
                profiles: updatedProfiles
            };
        });
    };

    const addEconomy = async (name: string, syncType: 'local' | 'smb' | 'dropbox' | 'googledrive', syncPath: string, shareWithPrincipal: boolean = false): Promise<Economy> => {
        if (!activeProfile) throw new Error("No hay perfil activo");
        const newEcoId = `eco_${Date.now()}`;
        const safeName = name.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
        const newEco: Economy = {
            id: newEcoId,
            name,
            dbName: `pcshogar_eco_${safeName}_${Date.now()}`,
            ownerProfileId: activeProfile.id,
            sync: {
                enabled: syncType !== 'local',
                type: syncType,
                dropboxPath: syncType === 'dropbox' ? syncPath : '',
                googledrivePath: syncType === 'googledrive' ? syncPath : '',
                dropboxToken: settings.sync.dropboxToken,
                googledriveToken: settings.sync.googledriveToken,
                lastSync: 0
            }
        };

        setSettings(prev => {
            const updatedProfiles = prev.profiles?.map(p => {
                if (p.id === prev.activeProfileId) {
                    return { ...p, economies: [...p.economies, newEco] };
                }
                if (shareWithPrincipal && p.id === 'prof_default') {
                    return { ...p, economies: [...p.economies, newEco] };
                }
                return p;
            });
            return { ...prev, profiles: updatedProfiles };
        });
        return newEco;
    };

    const deleteEconomy = async (economyId: string): Promise<void> => {
        if (!activeProfile) return;
        if (activeProfile.economies.length <= 1) {
            throw new Error("No puedes eliminar la única economía activa.");
        }

        // Switch active economy first if the deleted one is currently active
        if (activeProfile.activeEconomyId === economyId) {
            const remaining = activeProfile.economies.filter(e => e.id !== economyId);
            await switchEconomy(remaining[0].id);
        }

        setSettings(prev => {
            const updatedProfiles = prev.profiles?.map(p => {
                if (p.id === prev.activeProfileId) {
                    const filtered = p.economies.filter(e => e.id !== economyId);
                    return {
                        ...p,
                        economies: filtered,
                        activeEconomyId: p.activeEconomyId === economyId ? filtered[0].id : p.activeEconomyId
                    };
                }
                return p;
            });
            return { ...prev, profiles: updatedProfiles };
        });
    };

    const setProfilePin = async (pin: string | null, profileId?: string): Promise<void> => {
        const targetProfileId = profileId || activeProfile?.id;
        if (!targetProfileId) return;
        const pinHash = pin ? await hashPIN(pin) : undefined;

        setSettings(prev => {
            const updatedProfiles = prev.profiles?.map(p => {
                if (p.id === targetProfileId) {
                    return { ...p, pinHash };
                }
                return p;
            });
            return { ...prev, profiles: updatedProfiles };
        });

        if (!pin && targetProfileId === activeProfile?.id) {
            setIsAuthenticated(true);
        }
    };

    const setProfileBiometric = async (enabled: boolean): Promise<void> => {
        if (!activeProfile) return;
        setSettings(prev => {
            const updatedProfiles = prev.profiles?.map(p => {
                if (p.id === prev.activeProfileId) {
                    return { ...p, biometricEnabled: enabled };
                }
                return p;
            });
            return { ...prev, profiles: updatedProfiles };
        });
    };

    const switchProfile = async (profileId: string): Promise<void> => {
        const profile = settings.profiles?.find(p => p.id === profileId);
        if (!profile) return;

        setSettings(prev => ({
            ...prev,
            activeProfileId: profileId
        }));

        const economy = profile.economies.find(e => e.id === profile.activeEconomyId) || profile.economies[0];
        if (economy) {
            await incomeDB.switchDatabase(economy.dbName);
            if (economy.sync.enabled) {
                if (economy.sync.type === 'dropbox' && economy.sync.dropboxToken) {
                    DropboxService.init(economy.sync.dropboxToken, economy.sync.dropboxPath);
                } else if (economy.sync.type === 'googledrive' && economy.sync.googledriveToken) {
                    GoogleDriveService.init(economy.sync.googledriveToken, economy.sync.googledrivePath || 'pcshogar_data.json');
                }
            }
        }

        if (profile.pinHash) {
            setIsAuthenticated(false);
        } else {
            setIsAuthenticated(true);
        }
    };

    const addProfile = async (name: string, sharedEconomyIds: string[], pin?: string): Promise<void> => {
        const newProfId = `prof_${Date.now()}`;
        const pinHash = pin ? await hashPIN(pin) : undefined;

        const principalProfile = settings.profiles?.find(p => p.id === 'prof_default');
        const sharedEconomies = principalProfile?.economies.filter(e => sharedEconomyIds.includes(e.id)) || [];

        const economies = [...sharedEconomies];
        let activeEconomyId = '';
        if (economies.length === 0) {
            const ecoId = `eco_${Date.now()}`;
            const safeName = name.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
            const defaultEconomy: Economy = {
                id: ecoId,
                name: `Hogar de ${name}`,
                dbName: `pcshogar_eco_${safeName}_${Date.now()}`,
                ownerProfileId: newProfId,
                sync: {
                    enabled: false,
                    type: 'local',
                    localPath: '',
                    dropboxPath: `/pcshogar_eco_${safeName}.json`,
                    lastSync: 0
                }
            };
            economies.push(defaultEconomy);
            activeEconomyId = ecoId;
        } else {
            activeEconomyId = economies[0].id;
        }

        const newProfile: UserProfile = {
            id: newProfId,
            name,
            pinHash,
            biometricEnabled: false,
            economies,
            activeEconomyId,
            avatar: `gradient:${Math.floor(Math.random() * 8) + 1}`
        };

        setSettings(prev => ({
            ...prev,
            profiles: [...(prev.profiles || []), newProfile]
        }));
    };

    const deleteProfile = async (profileId: string): Promise<void> => {
        if (profileId === 'prof_default') {
            throw new Error("No puedes eliminar el perfil Principal.");
        }

        setSettings(prev => {
            const filtered = (prev.profiles || []).filter(p => p.id !== profileId);
            const activeId = prev.activeProfileId === profileId ? 'prof_default' : prev.activeProfileId;
            return {
                ...prev,
                profiles: filtered,
                activeProfileId: activeId
            };
        });

        if (settings.activeProfileId === profileId) {
            await switchProfile('prof_default');
        }
    };

    const updateProfileShare = async (profileId: string, sharedEconomyIds: string[]): Promise<void> => {
        const principalProfile = settings.profiles?.find(p => p.id === 'prof_default');
        const sharedEconomies = principalProfile?.economies.filter(e => sharedEconomyIds.includes(e.id)) || [];

        setSettings(prev => {
            const updated = prev.profiles?.map(p => {
                if (p.id === profileId) {
                    const ownEconomies = p.economies.filter(e => {
                        return !principalProfile?.economies.some(pe => pe.id === e.id);
                    });

                    const mergedEconomies = [...ownEconomies, ...sharedEconomies];
                    let activeId = p.activeEconomyId;
                    if (!mergedEconomies.some(e => e.id === activeId)) {
                        activeId = mergedEconomies[0]?.id || '';
                    }

                    return {
                        ...p,
                        economies: mergedEconomies,
                        activeEconomyId: activeId
                    };
                }
                return p;
            });

            return {
                ...prev,
                profiles: updated
            };
        });
    };

    const updateEconomySharing = async (economyId: string, sharedWithProfileIds: string[]): Promise<void> => {
        if (!activeProfile) return;
        const economyToShare = activeProfile.economies.find(e => e.id === economyId);
        if (!economyToShare) return;

        setSettings(prev => {
            const updatedProfiles = prev.profiles?.map(p => {
                if (p.id === activeProfile.id) {
                    return p; // Propietario siempre mantiene el entorno
                }

                const wantsShare = sharedWithProfileIds.includes(p.id);
                const hasEconomy = p.economies.some(e => e.id === economyId);

                let newEconomies = [...p.economies];
                let activeId = p.activeEconomyId;

                if (wantsShare && !hasEconomy) {
                    // Compartir: Copiar definición
                    newEconomies.push(economyToShare);
                } else if (!wantsShare && hasEconomy) {
                    // Quitar compartir
                    newEconomies = newEconomies.filter(e => e.id !== economyId);
                    if (activeId === economyId) {
                        activeId = newEconomies[0]?.id || '';
                    }
                } else if (wantsShare && hasEconomy) {
                    // Actualizar definición existente
                    newEconomies = newEconomies.map(e => e.id === economyId ? economyToShare : e);
                }

                return {
                    ...p,
                    economies: newEconomies,
                    activeEconomyId: activeId
                };
            });

            return {
                ...prev,
                profiles: updatedProfiles
            };
        });
    };

    const updateProfileName = async (profileId: string, newName: string): Promise<void> => {
        setSettings(prev => {
            const updatedProfiles = prev.profiles?.map(p => {
                if (p.id === profileId) {
                    return { ...p, name: newName };
                }
                return p;
            });
            return { ...prev, profiles: updatedProfiles };
        });
    };

    const updateProfileAvatar = async (profileId: string, avatar: string): Promise<void> => {
        setSettings(prev => {
            const updatedProfiles = prev.profiles?.map(p => {
                if (p.id === profileId) {
                    return { ...p, avatar };
                }
                return p;
            });
            return { ...prev, profiles: updatedProfiles };
        });
    };

    return (
        <SettingsContext.Provider value={{
            settings,
            updateSettings,
            updateSyncSettings,
            activeProfile,
            activeEconomy,
            isAuthenticated,
            setIsAuthenticated,
            authenticate,
            logout,
            switchEconomy,
            addEconomy,
            deleteEconomy,
            setProfilePin,
            setProfileBiometric,
            switchProfile,
            addProfile,
            deleteProfile,
            updateProfileShare,
            updateEconomySharing,
            updateProfileName,
            updateProfileAvatar
        }}>
            {children}
        </SettingsContext.Provider>
    );
};

export const useAppSettings = () => {
    const context = useContext(SettingsContext);
    if (!context) throw new Error('useAppSettings must be used within AppSettingsProvider');
    return context;
};
