
import { Dropbox } from 'dropbox';
import { incomeDB } from './db';

const DROPBOX_CLIENT_ID = 'y9nh44kplesrdd1';
export class DropboxService {
    private static dbx: Dropbox | null = null;
    private static currentPath: string = '/pcshogar_data.json';

    static init(token: string, path?: string) {
        this.dbx = new Dropbox({ accessToken: token });
        if (path) this.currentPath = path;
    }

    /** Returns true only if DropboxService has been initialized this session */
    static isConnected(): boolean {
        return this.dbx !== null;
    }

    /** Clears the in-memory Dropbox client (does NOT clear the stored token) */
    static disconnect() {
        this.dbx = null;
    }

    static async fileExists(path: string): Promise<boolean> {
        if (!this.dbx) return false;
        try {
            await this.dbx.filesGetMetadata({ path });
            return true;
        } catch (error: any) {
            if (error.status === 409 || error.status === 404 || (error.error && error.error.error_summary && error.error.error_summary.includes('path/not_found'))) {
                return false;
            }
            throw error;
        }
    }

    static getAuthUrl() {
        // Detect if we are on a real mobile device or emulator via Capacitor
        const isMobile = window.location.origin.includes('localhost') && !window.location.port;
        
        let redirectUri = '';
        if (isMobile) {
            redirectUri = 'com.pcshogar.app://auth/dropbox';
        } else if (window.location.origin.startsWith('file://')) {
            // Electron production
            redirectUri = 'https://yoteayudoesp.github.io/pcshogar.github.io/app/';
        } else {
            // Web production (https://yoteayudoesp.github.io/pcshogar.github.io/app/) or dev (http://localhost:5173/)
            redirectUri = window.location.origin + window.location.pathname;
        }
            
        return `https://www.dropbox.com/oauth2/authorize?client_id=${DROPBOX_CLIENT_ID}&response_type=token&redirect_uri=${encodeURIComponent(redirectUri)}`;
    }

    static async getUserInfo() {
        if (!this.dbx) throw new Error('Dropbox not initialized');
        const response = await this.dbx.usersGetCurrentAccount();
        return response.result;
    }

    static async listFolders(path: string = '') {
        if (!this.dbx) throw new Error('Dropbox not initialized');
        const response = await this.dbx.filesListFolder({ path, recursive: false });
        return response.result.entries.filter(entry => entry['.tag'] === 'folder');
    }

    static async uploadData(data: any) {
        if (!this.dbx) throw new Error('Dropbox not initialized');
        
        const content = JSON.stringify(data);
        await this.dbx.filesUpload({
            path: this.currentPath,
            contents: content,
            mode: { '.tag': 'overwrite' }
        });
        return Date.now();
    }

    static async downloadData() {
        if (!this.dbx) throw new Error('Dropbox not initialized');
        
        try {
            const response = await this.dbx.filesDownload({ path: this.currentPath });
            // @ts-ignore - contents is in the result in some versions, or blob
            const fileBlob = (response.result as any).fileBlob;
            const text = await fileBlob.text();
            return JSON.parse(text);
        } catch (error: any) {
            if (error.status === 409 || error.status === 404) {
                return null; // File doesn't exist yet
            }
            throw error;
        }
    }

    /**
     * Normalizes data keys to use standard IndexedDB store names,
     * converting legacy camelCase keys from older backups if present.
     */
    static normalizeDataKeys(data: any): any {
        if (!data) return {};
        
        const KEY_MAP: Record<string, string> = {
            'recurringExpenses': 'recurring_expenses',
            'fixedExpenses': 'recurring_expenses',
            'savingGoals': 'savings',
            'savingAllocations': 'allocations',
            'accountMovements': 'movements',
            'accountOverrides': 'overrides',
            'monthClosings': 'closings',
            'fixedIncomes': 'incomes',
            'recurring': 'recurring_expenses'
        };

        const normalized: any = {};
        
        // Copy over keys, mapping legacy ones
        Object.keys(data).forEach(key => {
            const normalizedKey = KEY_MAP[key] || key;
            if (Array.isArray(data[key])) {
                normalized[normalizedKey] = [
                    ...(normalized[normalizedKey] || []),
                    ...data[key]
                ];
            } else {
                normalized[normalizedKey] = data[key];
            }
        });

        // Normalize deleted_items table store names and IDs
        if (Array.isArray(normalized['deleted_items'])) {
            normalized['deleted_items'] = normalized['deleted_items'].map((tombstone: any) => {
                if (tombstone && tombstone.store) {
                    const normalizedStore = KEY_MAP[tombstone.store] || tombstone.store;
                    if (normalizedStore !== tombstone.store) {
                        const baseId = tombstone.id.includes(':') 
                            ? tombstone.id.split(':').slice(1).join(':') 
                            : tombstone.id;
                        return {
                            ...tombstone,
                            store: normalizedStore,
                            id: `${normalizedStore}:${baseId}`
                        };
                    }
                }
                return tombstone;
            });
        }

        // Ensure all collections exist as arrays
        const collections = [
            'accounts', 'cards', 'expenses', 'incomes', 'recurring_expenses', 
            'savings', 'allocations', 'loans', 'transfers', 
            'categories', 'closings', 'overrides', 'movements', 'deleted_items'
        ];

        collections.forEach(col => {
            if (!normalized[col]) {
                normalized[col] = [];
            }
        });

        return normalized;
    }

    /**
     * Checks if two database states are functionally equal based on item counts
     * and their modification/deletion timestamps.
     */
    static isEqualState(a: any, b: any): boolean {
        const collections = [
            'accounts', 'cards', 'expenses', 'incomes', 'recurring_expenses', 
            'savings', 'allocations', 'loans', 'transfers', 
            'categories', 'closings', 'overrides', 'movements', 'deleted_items'
        ];

        for (const col of collections) {
            const arrA = a[col] || [];
            const arrB = b[col] || [];

            if (arrA.length !== arrB.length) {
                return false;
            }

            // Create id maps
            const mapA = new Map<string, number>();
            arrA.forEach((item: any) => {
                if (item && item.id) {
                    const ts = col === 'deleted_items' 
                        ? item.deletedAt 
                        : col === 'closings' 
                            ? (item.updatedAt || item.closedAt || 0) 
                            : (item.updatedAt || 0);
                    mapA.set(item.id, ts);
                }
            });

            // Check if every item in B exists in A with the exact same timestamp
            for (const item of arrB) {
                if (!item || !item.id) continue;
                const tsB = col === 'deleted_items' 
                    ? item.deletedAt 
                    : col === 'closings' 
                        ? (item.updatedAt || item.closedAt || 0) 
                        : (item.updatedAt || 0);
                const tsA = mapA.get(item.id);
                if (tsA === undefined || tsA !== tsB) {
                    return false;
                }
            }
        }

        return true;
    }

    /**
     * Intelligent merge between local and remote data
     * Based on updatedAt timestamps and tombstones for deletions
     */
    static mergeData(localData: any, remoteData: any) {
        if (!remoteData) return localData;
        
        const merged: any = { ...localData };
        
        // Helper to extract timestamp for comparison
        const getItemTimestamp = (item: any, store: string) => {
            if (!item) return 0;
            if (store === 'deleted_items') {
                return item.deletedAt || 0;
            }
            if (store === 'closings') {
                return item.updatedAt || item.closedAt || 0;
            }
            return item.updatedAt || 0;
        };

        // Helper to merge arrays of objects with 'id' and modification timestamp
        const mergeArray = (localArr: any[], remoteArr: any[], storeName: string, localTombstones: any[], remoteTombstones: any[]) => {
            const result = [...localArr];
            
            // Track all known tombstones for this store
            const allTombstones = [...localTombstones, ...remoteTombstones]
                .filter(t => t.store === storeName);

            // Process remote items
            remoteArr.forEach(remoteItem => {
                const localIndex = result.findIndex(l => l.id === remoteItem.id);
                const remoteTs = getItemTimestamp(remoteItem, storeName);
                
                // Check if this item has a tombstone anywhere
                const tombstone = allTombstones.find(t => t.id === `${storeName}:${remoteItem.id}`);
                if (tombstone && tombstone.deletedAt > remoteTs) {
                    // Item was deleted after it was last updated, skip/remove it
                    if (localIndex !== -1) result.splice(localIndex, 1);
                    return;
                }

                if (localIndex === -1) {
                    // New item from remote
                    result.push(remoteItem);
                } else {
                    // Existing item, compare timestamps
                    const localItem = result[localIndex];
                    const localTs = getItemTimestamp(localItem, storeName);
                    if (remoteTs > localTs) {
                        result[localIndex] = remoteItem;
                    }
                }
            });

            // One final pass to remove local items that have a remote tombstone
            return result.filter(item => {
                const tombstone = allTombstones.find(t => t.id === `${storeName}:${item.id}`);
                const itemTs = getItemTimestamp(item, storeName);
                return !tombstone || itemTs > tombstone.deletedAt;
            });
        };

        // List of keys to merge (collections in our DB using standard IndexedDB store names)
        const collections = [
            'accounts', 'cards', 'expenses', 'incomes', 'recurring_expenses', 
            'savings', 'allocations', 'loans', 'transfers', 
            'categories', 'closings', 'overrides', 'movements'
        ];

        const localTombstones = localData['deleted_items'] || [];
        const remoteTombstones = remoteData['deleted_items'] || [];
        
        // Merge tombstones collection first
        merged['deleted_items'] = mergeArray(localTombstones, remoteTombstones, 'deleted_items', [], []);

        collections.forEach(key => {
            if (localData[key] && remoteData[key]) {
                merged[key] = mergeArray(localData[key], remoteData[key], key, localTombstones, remoteTombstones);
            } else if (remoteData[key]) {
                merged[key] = mergeArray([], remoteData[key], key, localTombstones, remoteTombstones);
            }
        });

        return merged;
    }

    static async sync() {
        if (!this.dbx) return null;

        try {
            // 1. Export local and normalize
            const rawLocal = await incomeDB.exportFullData();
            const localData = this.normalizeDataKeys(rawLocal);
            
            // 2. Download remote and normalize
            const rawRemote = await this.downloadData();
            if (!rawRemote) {
                // First time: just upload local
                await this.uploadData(localData);
                return Date.now();
            }
            const remoteData = this.normalizeDataKeys(rawRemote);
            
            // 3. Merge
            const mergedData = this.mergeData(localData, remoteData);
            
            // 4. If data changed, update local and/or upload
            const localChanged = !this.isEqualState(localData, mergedData);
            const remoteChanged = !this.isEqualState(remoteData, mergedData);
            
            if (localChanged) {
                await incomeDB.importFullData(mergedData);
            }
            
            if (remoteChanged) {
                await this.uploadData(mergedData);
            }
            
            if (localChanged || remoteChanged) {
                return Date.now();
            }
            
            return null;
        } catch (error) {
            console.error("Sync error:", error);
            throw error;
        }
    }
}
