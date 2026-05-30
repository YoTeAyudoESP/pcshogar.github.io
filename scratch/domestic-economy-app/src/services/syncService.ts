import { incomeDB } from './db';
import { platformBridge, isElectron, isCapacitor } from './electronBridge';
import type { SyncProvider } from './connectors/SyncProvider';
import { DropboxProvider } from './connectors/DropboxProvider';
import { SMBProvider } from './connectors/SMBProvider';

export type SyncStatus = 'idle' | 'syncing' | 'offline' | 'error' | 'success';
export type SyncMode = 'network' | 'local' | 'dropbox' | 'smb';

let currentStatus: SyncStatus = 'idle';
let statusListeners: ((status: SyncStatus) => void)[] = [];
let currentProvider: SyncProvider | null = null;
let syncInProgress = false;

/**
 * Universal path joiner that handles URIs (Android) and platform specifics
 */
const joinPath = (base: string, fileName: string): string => {
    if (!base) return fileName;
    const isUri = base.startsWith('content://') || base.startsWith('file://');

    if (isUri) {
        // URIs always use / and must be joined carefully
        // If there's a query or fragment, joining by simple append might fail
        const [main, extra] = base.split(/[?#]/);
        const cleanBase = main.endsWith('/') ? main : main + '/';
        const result = cleanBase + fileName;
        return extra ? `${result}${base.includes('?') ? '?' : '#'}${extra}` : result;
    }

    // Standard file system path joining
    const separator = (base.includes('\\') || isElectron()) ? '\\' : '/';
    return base.endsWith(separator) ? `${base}${fileName}` : `${base}${separator}${fileName}`;
};

// Hardcoded providers for now
export const providers = {
    dropbox: new DropboxProvider(),
    smb: new SMBProvider()
};

export const subscribeToSyncStatus = (listener: (status: SyncStatus) => void) => {
    statusListeners.push(listener);
    listener(currentStatus);
    return () => {
        statusListeners = statusListeners.filter(l => l !== listener);
    };
};

const setStatus = (status: SyncStatus) => {
    currentStatus = status;
    statusListeners.forEach(l => l(status));
};

// Notification System
export type SyncNotification = { message: string; type: 'info' | 'success' | 'error'; duration?: number };
let notificationListeners: ((notification: SyncNotification) => void)[] = [];

export const subscribeToNotifications = (listener: (notification: SyncNotification) => void) => {
    notificationListeners.push(listener);
    return () => {
        notificationListeners = notificationListeners.filter(l => l !== listener);
    };
};

const notify = (message: string, type: 'info' | 'success' | 'error' = 'info', duration = 3000) => {
    notificationListeners.forEach(l => l({ message, type, duration }));
};

export const getSyncMode = (): SyncMode => {
    return (localStorage.getItem('pcs_sync_mode') as SyncMode) || 'network';
};

export const setSyncMode = (mode: SyncMode) => {
    localStorage.setItem('pcs_sync_mode', mode);
    if (mode === 'network' || mode === 'dropbox' || mode === 'smb') {
        syncToExternalFolder();
    } else {
        setStatus('offline');
    }
};

const getLastKnownSync = (): string => {
    return localStorage.getItem('pcs_last_known_sync') || '1970-01-01T00:00:00.000Z';
};

const setLastKnownSync = (isoDate: string) => {
    localStorage.setItem('pcs_last_known_sync', isoDate);
};

// New function to switch backend
export const setSyncProvider = async (type: 'dropbox' | 'smb' | 'local', config?: any) => {
    console.log('Switching Sync Provider to:', type, config);

    // 1. Strict Mutual Exclusion: Cleanup everything first
    currentProvider = null;

    // Clear tokens and paths from other providers to avoid accidental activation
    // We no longer delete other provider tokens, we just change the active currentProvider.
    // This allows the user to switch modes without losing their connections.
    if (type === 'dropbox') {
        const dropboxProvider = providers.dropbox;
        if (dropboxProvider) {
            currentProvider = dropboxProvider;
            localStorage.setItem('sync_provider_type', 'dropbox');
            setSyncMode('dropbox');
        }
    }

    if (type !== 'smb') {
        localStorage.removeItem('pcs_smb_native');
        localStorage.removeItem('pcs_smb_path');
        localStorage.removeItem('pcs_smb_share');
        localStorage.removeItem('pcs_smb_username');
        localStorage.removeItem('pcs_smb_password');
        localStorage.removeItem('pcs_smb_domain');
    }

    // IMPORTANT: Clear cloud path if switching to a mode that doesn't need it or needs its own
    // e.g. switching from Dropbox (which uses deep paths) to SMB (which uses direct share folder)
    if (type === 'smb') {
        localStorage.setItem('pcs_cloud_path', 'pcshogar_db.json');
    }

    if (type !== 'local') {
        // We don't necessarily want to delete the local path, but maybe stop using it
        // localStorage.removeItem('pcs_data_folder'); 
    }

    localStorage.setItem('sync_provider_type', type);

    if (type === 'local') {
        setSyncMode('local');
        if (config?.path) {
            localStorage.setItem('pcs_data_folder', config.path);
        }
        await syncToExternalFolder();
        return;
    }

    // @ts-ignore
    const provider = providers[type];
    if (provider || (type === 'smb' && config?.useNative)) {
        if (type === 'smb') {
            if (config?.useNative) {
                localStorage.setItem('pcs_smb_native', 'true');
                localStorage.setItem('pcs_smb_path', config.share);
            } else if (config) {
                await (provider as SMBProvider).authenticate(config);
                currentProvider = provider;
            }
        } else if (type === 'dropbox') {
            const dropboxProvider = providers.dropbox;
            if (!dropboxProvider) return;
            try {
                // Always try to authenticate, even if a token exists, to refresh or verify
                await dropboxProvider.authenticate();
                currentProvider = dropboxProvider;
                localStorage.setItem('sync_provider_type', 'dropbox'); // Explicitly set provider type

                if (config?.path) {
                    localStorage.setItem('pcs_dropbox_path', config.path);
                    localStorage.setItem('pcs_cloud_path', config.path);
                } else if (!localStorage.getItem('pcs_dropbox_path')) {
                    // AUTO-DETECTION: Try to find pcshogar_db.json if no path is set
                    try {
                        console.log('Dropbox: Intentando autodetección de archivo...');
                        const files = await dropboxProvider.searchFiles('pcshogar_db.json');
                        const mainFile = files.find(f => f.name === 'pcshogar_db.json');
                        if (mainFile) {
                            console.log('Dropbox: Archivo detectado automáticamente:', mainFile.path);
                            localStorage.setItem('pcs_dropbox_path', mainFile.path);
                            localStorage.setItem('pcs_cloud_path', mainFile.path);
                        }
                    } catch (e) {
                        console.warn('Dropbox: Error en autodetección:', e);
                    }
                }
                console.log('Dropbox provider set and authenticated');

                // Notify only if it was a fresh authentication (no existing token before this call)
                // This logic is now handled by the authenticate method itself or by checking lastAuthTimestamp
                // For now, we'll just notify success after successful auth.
                notify('Conectado a Dropbox', 'success');

                // Force a sync to ensure we pick up the existing cloud path if it's there
                await syncToExternalFolder(true);
            } catch (e: any) {
                console.error('Dropbox connection failed:', e);
                // Keep the intent of using Dropbox even if initial auth fails
                currentProvider = dropboxProvider;
                localStorage.setItem('sync_provider_type', 'dropbox');
                setSyncMode('dropbox');
                notify('Error al conectar con Dropbox: ' + (e.message || 'Error desconocido'), 'error');
                setStatus('error');
                return;
            }
        }

        // Trigger immediate sync after switching
        setSyncMode(type as any);
        await syncToExternalFolder();
    }
};

export const forceSyncPush = async () => {
    const fullData = await exportFinanceData();
    const mode = getSyncMode();

    try {
        if (currentProvider) {
            const FILENAME = localStorage.getItem('pcs_cloud_path') || 'pcshogar_db.json';
            await currentProvider.uploadFile(FILENAME, JSON.stringify(fullData, null, 2));
            notify('Copia de seguridad enviada a la nube (Forzado)', 'success');
        } else if (mode === 'local' || mode === 'smb') {
            // Re-use sync logic which handles local/smb writes if no provider object
            // But strictly speaking we just want to write.
            // For simplicity/robustness, let's just call syncToExternalFolder() 
            // because "Forced Push" in local mode IS just a write. 
            // But to be EXPLICIT about overwriting remote:
            const folderPath = localStorage.getItem('pcs_data_folder') || localStorage.getItem('pcs_smb_path');
            if (folderPath) {
                const fileName = 'pcshogar_db.json';
                const fullPath = (isElectron() && !folderPath.endsWith('.json')) ? `${folderPath}\\${fileName}` : folderPath;
                await platformBridge.saveFile(fullPath, JSON.stringify(fullData, null, 2));
                notify('Copia de seguridad guardada localmente (Forzado)', 'success');
            }
        }
    } catch (e: any) {
        notify('Error al forzar subida: ' + e.message, 'error');
    }
};

// Initialize provider from storage
export const initSync = async () => {
    const savedMode = getSyncMode();
    const savedProviderType = localStorage.getItem('sync_provider_type');

    console.log('Sync Init:', { savedMode, savedProviderType });

    // Cleanup old tombstones on init
    try {
        await incomeDB.cleanupOldTombstones(60);
    } catch (e) {
        console.warn('Failed to cleanup tombstones', e);
    }

    if (savedProviderType === 'dropbox') {
        const provider = providers.dropbox;
        // Verify connection before trusting the token
        const isConnected = await (provider as DropboxProvider).checkConnection();

        if (isConnected) {
            currentProvider = provider;
            console.log('Restored & Verified Dropbox Provider');

            // Ensure path is loaded before first sync
            const savedPath = localStorage.getItem('pcs_dropbox_path');
            if (savedPath) {
                localStorage.setItem('pcs_cloud_path', savedPath);
            }

            syncToExternalFolder(); // Trigger initial sync
        } else {
            console.warn('Dropbox token invalid or offline on init');
            // Check if it's really an auth error or just offline
            const isAuthError = localStorage.getItem('dropbox_last_error_401') === 'true';
            if (isAuthError) {
                // Keep the provider but set status to error/offline
                currentProvider = provider;
                setStatus('error');
                notify('Sesión de Dropbox caducada. Por favor, vuelve a conectar en Ajustes.', 'error');
            }
            else {
                // Just offline or other error, don't fallback to local yet
                currentProvider = provider;
                setStatus('offline');
                console.log('Dropbox provider kept even if offline');
            }
        }
    } else if (savedMode === 'smb' && savedProviderType === 'smb') {
        const share = localStorage.getItem('pcs_smb_share');
        const user = localStorage.getItem('pcs_smb_username');
        const pass = localStorage.getItem('pcs_smb_password');

        if (share) {
            console.log('Attempting to restore SMB connection on init...');
            try {
                await setSyncProvider('smb', { share, username: user, password: pass });
            } catch (e) {
                console.error('Failed to auto-init SMB:', e);
            }
        }
    }
};

export const getSyncProviderType = () => localStorage.getItem('sync_provider_type') || 'local';

export const exportFinanceData = async () => {
    return {
        incomes: await incomeDB.getAllIncomes(),
        accounts: await incomeDB.getAllAccounts(),
        cards: await incomeDB.getAllCards(),
        expenses: await incomeDB.getAllExpenses(),
        savings: await incomeDB.getAllSavings(),
        allocations: await incomeDB.getAllAllocations(),
        recurring: await incomeDB.getAllRecurringExpenses(),
        loans: await incomeDB.getAllLoans(),
        closings: await incomeDB.getAllClosings(),
        overrides: await incomeDB.getAllOverrides(),
        categories: await incomeDB.getAllCategories(),
        transfers: await incomeDB.getAllTransfers(),
        movements: await incomeDB.getAllMovements(),
        tombstones: await incomeDB.getTombstones(),
        lastSync: new Date().toISOString()
    };

};

const mergeData = async (_localData: any, remoteData: any) => {
    const changes = incomeDB.getChanges();
    const localTombstones = await incomeDB.getTombstones();
    const remoteTombstones = remoteData.tombstones || [];

    const mergeLists = (localList: any[], remoteList: any[], type: string) => {
        const isCompositeKey = ['closings', 'overrides'].includes(type);

        const getKey = (item: any) => {
            if (isCompositeKey) {
                return `${item.year}-${item.month}`;
            }
            return item.id;
        };

        const localMap = new Map(localList.map(i => [getKey(i), i]));
        const remoteMap = new Map(remoteList.map(i => [getKey(i), i]));

        const localChanges = changes[type] || [];

        const isDeletedLocally = (id: string | any) => {
            const t = localTombstones.find((t: any) => t.id === String(id) && t.type === type);
            if (!t) return false;

            // Check if there is a local item newer than the tombstone
            const localItem = localMap.get(id);
            if (localItem && localItem.updatedAt && localItem.updatedAt > t.date) return false;

            return true;
        };

        const isDeletedRemotely = (id: string | any) => {
            const t = remoteData.tombstones && remoteData.tombstones.find((t: any) => t.id === String(id) && t.type === type);
            if (!t) return false;

            // Check if local version is newer than remote tombstone
            const localItem = localMap.get(id);
            if (localItem && localItem.updatedAt && localItem.updatedAt > t.date) return false;

            return true;
        };

        const mergedMap = new Map();

        // 1. Process Remote Items (Cloud Truth)
        for (const [id, item] of remoteMap) {
            if (!isDeletedLocally(id)) {
                mergedMap.set(id, item);
            }
        }

        // 2. Process Local Items (Local Contribution)
        for (const [id, item] of localMap) {
            const remoteItem = remoteMap.get(id);
            const localUpdateAt = item.updatedAt || 0;
            const remoteUpdateAt = remoteItem ? (remoteItem.updatedAt || 0) : 0;

            // Priority Check: Is it deleted remotely? 
            // If it's deleted remotely, we MUST NOT re-add it even if we have local changes.
            if (isDeletedRemotely(id)) {
                mergedMap.delete(id);
                continue;
            }

            // Priority 1: If locally changed AND it's actually newer than what's in cloud
            if (localChanges.includes(id)) {
                if (remoteItem && remoteUpdateAt > localUpdateAt) {
                    // Remote is actually newer, even if we thought we had changes (can happen if local clock is behind)
                    mergedMap.set(id, remoteItem);
                } else {
                    mergedMap.set(id, item);
                }
            }
            // Priority 2: If NOT marked as local change, but we have it and it's newer than remote
            else if (remoteItem) {
                // For account balances, if timestamps are equal or missing, we prefer remote to avoid regression
                const forceRemotePriority = type === 'accounts' && localUpdateAt === remoteUpdateAt;

                if (localUpdateAt > remoteUpdateAt && !forceRemotePriority) {
                    mergedMap.set(id, item);
                }
            }
            // Priority 3: If NOT in cloud yet
            else if (!remoteMap.has(id)) {
                mergedMap.set(id, item);
            }
        }

        return Array.from(mergedMap.values());
    };

    const mergedData = {
        incomes: mergeLists(_localData.incomes || [], remoteData.incomes || [], 'incomes'),
        accounts: mergeLists(_localData.accounts || [], remoteData.accounts || [], 'accounts'),
        cards: mergeLists(_localData.cards || [], remoteData.cards || [], 'cards'),
        expenses: mergeLists(_localData.expenses || [], remoteData.expenses || [], 'expenses'),
        savings: mergeLists(_localData.savings || [], remoteData.savings || [], 'savings'),
        allocations: mergeLists(_localData.allocations || [], remoteData.allocations || [], 'allocations'),
        recurring: mergeLists(_localData.recurring || [], remoteData.recurring || [], 'recurring_expenses'),
        loans: mergeLists(_localData.loans || [], remoteData.loans || [], 'loans'),
        closings: mergeLists(_localData.closings || [], remoteData.closings || [], 'closings'),
        overrides: mergeLists(_localData.overrides || [], remoteData.overrides || [], 'overrides'),
        categories: mergeLists(_localData.categories || [], remoteData.categories || [], 'categories'),
        transfers: mergeLists(_localData.transfers || [], remoteData.transfers || [], 'transfers'),
        movements: mergeLists(_localData.movements || [], remoteData.movements || [], 'movements'),
        tombstones: [...localTombstones, ...remoteTombstones],
        lastSync: new Date().toISOString()
    };


    return { data: mergedData, hasChanges: true };
};

export const syncToExternalFolder = async (force: boolean = false) => {
    if (syncInProgress) {
        console.log('Sync already in progress, skipping...');
        return { success: false, updated: false };
    }

    const mode = getSyncMode();
    const hasLocalFolder = !!localStorage.getItem('pcs_data_folder');

    setStatus('syncing');
    syncInProgress = true;

    try {
        const syncChanges = incomeDB.getChanges();
        const fullData = await exportFinanceData();
        let dataUpdated = false;

        // --- CASE 1: CLOUD PROVIDER (Dropbox / SMB via Provider Object) ---
        if (currentProvider) {
            const FILENAME = localStorage.getItem('pcs_cloud_path') || 'pcshogar_db.json';
            let downloadVerified = false;

            try {
                const remoteContent = await currentProvider.downloadFile(FILENAME);
                if (remoteContent) {
                    try {
                        const remoteData = JSON.parse(remoteContent);
                        // @ts-ignore
                        const { data: mergedData } = await mergeData(fullData, remoteData);

                        if (force || remoteData.lastSync !== getLastKnownSync()) {
                            await incomeDB.importData(mergedData, false);
                            setLastKnownSync(remoteData.lastSync);
                            notify('Datos actualizados desde nube');
                            dataUpdated = true;
                        }
                        downloadVerified = true;
                    } catch (parseError: any) {
                        notify(`Error al leer archivo remoto (JSON inválido): ${parseError.message}`, 'error');
                        throw parseError; // Abort
                    }
                } else {
                    downloadVerified = true; // New file scenario
                }
            } catch (e: any) {
                const msg = (e.message || '').toLowerCase();
                // 409 and 404 usually mean the file doesn't exist yet in Dropbox/SMB
                if (msg.includes('409') || msg.includes('404') || msg.includes('not found') || msg.includes('no exist')) {
                    downloadVerified = true;
                    console.log('Remote file not found, will create a new one on upload.');
                } else {
                    throw e; // Abort on connection or auth error
                }
            }

            if (downloadVerified) {
                const freshData = await exportFinanceData();
                await currentProvider.uploadFile(FILENAME, JSON.stringify(freshData, null, 2));

                setLastKnownSync(freshData.lastSync);
                incomeDB.clearChanges(syncChanges);
                localStorage.removeItem('pcs_migration_safety');
                notify('Copia de seguridad enviada a la nube', 'success');

                // --- OPTIONAL EXTRA CACHE: Only write, never read from here in this mode ---
                if (hasLocalFolder) {
                    try {
                        const folderPath = localStorage.getItem('pcs_data_folder');
                        if (folderPath) {
                            const fullPath = folderPath.endsWith('.json') ? folderPath : joinPath(folderPath, 'pcshogar_db.json');
                            await platformBridge.saveFile(fullPath, JSON.stringify(freshData, null, 2));
                        }
                    } catch (cacheError) {
                        console.warn('Silent cache update failed:', cacheError);
                    }
                }

                setStatus('success');
                return { success: true, updated: dataUpdated };
            }
        }
        // --- CASE 2: NATIVE SMB (Windows direct access) ---
        else if (mode === 'smb' && localStorage.getItem('pcs_smb_native') === 'true' && isElectron()) {
            const smbPath = localStorage.getItem('pcs_smb_path');
            if (smbPath) {
                const fullPath = smbPath.endsWith('.json') ? smbPath : joinPath(smbPath, 'pcshogar_db.json');
                let readSuccess = false;

                try {
                    const readResult = await platformBridge.readFile(fullPath);
                    if (readResult.success && readResult.content) {
                        const remoteData = JSON.parse(readResult.content);
                        const { data: mergedData } = await mergeData(fullData, remoteData);
                        if (force || remoteData.lastSync !== getLastKnownSync()) {
                            await incomeDB.importData(mergedData, false);
                            setLastKnownSync(remoteData.lastSync);
                            notify('Datos sincronizados desde Red');
                            dataUpdated = true;
                        }
                        readSuccess = true;
                    } else if (readResult.error && (readResult.error.includes('ENOENT') || readResult.error.includes('not found'))) {
                        readSuccess = true;
                    } else {
                        throw new Error(readResult.error);
                    }
                } catch (e: any) {
                    notify(`Error SMB: ${e.message}`, 'error');
                    throw e;
                }

                if (readSuccess) {
                    const freshData = await exportFinanceData();
                    const saveResult = await platformBridge.saveFile(fullPath, JSON.stringify(freshData, null, 2));
                    if (saveResult.success) {
                        setLastKnownSync(freshData.lastSync);
                        incomeDB.clearChanges(syncChanges);
                        localStorage.removeItem('pcs_migration_safety');
                        notify('Datos sincronizados con Red', 'success');
                        setStatus('success');
                        return { success: true, updated: dataUpdated };
                    } else {
                        throw new Error(saveResult.error);
                    }
                }
            }
        }
        // --- CASE 3: LOCAL FOLDER MODE ---
        else if (mode === 'local' && hasLocalFolder) {
            const folderPath = localStorage.getItem('pcs_data_folder')!;
            const fullPath = folderPath.endsWith('.json') ? folderPath : joinPath(folderPath, 'pcshogar_db.json');

            let readSuccess = false;
            try {
                const readResult = await platformBridge.readFile(fullPath);
                if (readResult.success && readResult.content) {
                    const remoteData = JSON.parse(readResult.content);
                    const { data: mergedData } = await mergeData(fullData, remoteData);
                    if (force || remoteData.lastSync !== getLastKnownSync()) {
                        await incomeDB.importData(mergedData, false);
                        setLastKnownSync(remoteData.lastSync);
                        notify('Datos sincronizados del Archivo Local');
                        dataUpdated = true;
                    }
                    readSuccess = true;
                } else if (readResult.error && (readResult.error.includes('ENOENT') || readResult.error.includes('not found'))) {
                    readSuccess = true;
                } else {
                    throw new Error(readResult.error);
                }
            } catch (e: any) {
                const isPermissionError = e.message && (e.message.includes('EACCES') || e.message.includes('Permission denied') || e.message.includes('Permission'));
                if (isCapacitor() && isPermissionError) {
                    notify(`Permiso de archivo caducado. Por favor, vuelve a seleccionar el archivo local en Configuración.`, 'error');
                } else {
                    notify(`Error Local: ${e.message}`, 'error');
                }
                throw e;
            }

            if (readSuccess) {
                const freshData = await exportFinanceData();
                const saveResult = await platformBridge.saveFile(fullPath, JSON.stringify(freshData, null, 2));
                if (saveResult.success) {
                    setLastKnownSync(freshData.lastSync);
                    incomeDB.clearChanges(syncChanges);
                    localStorage.removeItem('pcs_migration_safety');
                    notify('Copia de seguridad guardada localmente', 'success');
                    setStatus('success');
                    return { success: true, updated: dataUpdated };
                } else {
                    throw new Error(saveResult.error);
                }
            }
        } else {
            // If no sync mode is active or configured
            setStatus('idle');
        }

    } catch (error: any) {
        console.error('Sync error:', error);

        if (error.message && (error.message.includes('401') || error.message.includes('auth'))) {
            notify('Error de autenticación: la sesión puede haber caducado.', 'error');
        } else {
            notify(error.message || 'Error de sincronización', 'error');
        }
        setStatus('error');
    } finally {
        syncInProgress = false;
    }
    return { success: false, updated: false };
};

export const loadAndMergeFromFile = async (path?: string, content?: string) => {
    // Legacy support
    const targetPath = path || localStorage.getItem('pcs_data_folder');
    if (!targetPath && !content) return { success: false, error: 'No path' };

    try {
        let finalContent = content;
        if (!finalContent && targetPath) {
            const result = await platformBridge.readFile(targetPath);
            if (result.success) finalContent = result.content;
        }

        if (finalContent) {
            const data = JSON.parse(finalContent);
            await incomeDB.importData(data);
            return { success: true };
        }
    } catch (e) {
        return { success: false, error: 'Error importing' };
    }
    return { success: false };
};

export const listCloudFiles = async () => {
    if (localStorage.getItem('sync_provider_type') === 'dropbox' && providers.dropbox) {
        if (!await providers.dropbox.isAuthenticated()) return [];
        try {
            const files = await (providers.dropbox as DropboxProvider).searchFiles('.json');
            return files;
        } catch (e) {
            console.error('Error searching files', e);
            return [];
        }
    }
    return [];
};

export const setCloudPath = async (path: string) => {
    localStorage.setItem('pcs_cloud_path', path);
    await syncToExternalFolder(true);
};

// Start periodic sync
setInterval(() => {
    const mode = getSyncMode();
    if (mode === 'network' || mode === 'dropbox' || mode === 'smb' || mode === 'local') {
        syncToExternalFolder();
    }
}, 1000 * 60 * 5); // Every 5 minutes
