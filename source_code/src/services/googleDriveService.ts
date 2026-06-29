import { incomeDB } from './db';

const GOOGLE_CLIENT_ID = '199102669718-4icl7gmh1rvi36oj33fb6rm5d6qmbv34.apps.googleusercontent.com';

export class GoogleDriveService {
    private static token: string | null = null;
    private static currentPath: string = 'pcshogar_data.json';
    /**
     * True only when the Google Drive session has been explicitly verified
     * (getUserInfo() succeeded). init() with a stored token does NOT set this
     * flag. setSessionDisconnected() resets it when the user chooses
     * "Continuar sin conexión" at startup.
     */
    private static _sessionVerified: boolean = false;

    static init(token: string, path?: string) {
        this.token = token;
        if (path) this.currentPath = path;
        // init() alone does NOT mark the session as verified.
    }

    /** Returns true only when token exists AND session has been verified. */
    static isConnected(): boolean {
        return this.token !== null && this._sessionVerified;
    }

    /** Mark the session as verified after a successful getUserInfo() call. */
    static setSessionVerified() {
        this._sessionVerified = true;
    }

    /**
     * Mark the session as intentionally disconnected.
     * Called when the user presses "Continuar sin conexión" at startup.
     */
    static setSessionDisconnected() {
        this._sessionVerified = false;
    }

    /** Clears the in-memory token and session flag (does NOT clear the stored token) */
    static disconnect() {
        this.token = null;
        this._sessionVerified = false;
    }

    static getAuthUrl(state: string = 'web') {
        // Detect if we are on a real mobile device or emulator via Capacitor
        const isMobile = window.location.origin.includes('localhost') && !window.location.port;
        
        let redirectUri = '';
        let finalState = state;
        
        if (isMobile) {
            // Mobile app will open system browser which redirects to landing page
            redirectUri = 'https://pcshogar.es/app/';
            if (state === 'googledrive') finalState = 'googledrive-android';
        } else if (window.location.origin.startsWith('file://')) {
            // Electron production
            redirectUri = 'https://pcshogar.es/app/';
        } else {
            // Web production or dev
            redirectUri = window.location.origin + window.location.pathname;
        }

        return `https://accounts.google.com/o/oauth2/v2/auth?` +
            `client_id=${GOOGLE_CLIENT_ID}` +
            `&redirect_uri=${encodeURIComponent(redirectUri)}` +
            `&response_type=token` +
            `&scope=${encodeURIComponent('https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email')}` +
            `&state=${finalState}` +
            `&include_granted_scopes=true` +
            `&prompt=select_account`;
    }

    static async getUserInfo() {
        if (!this.token) throw new Error('Google Drive not initialized');
        const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: {
                Authorization: `Bearer ${this.token}`
            }
        });
        if (!response.ok) throw new Error('Failed to get Google user info');
        const data = await response.json();
        // Mark session as verified since the API call succeeded
        this._sessionVerified = true;
        return {
            email: data.email
        };
    }

    private static async getFolderIdByPath(path: string, createIfMissing: boolean = false): Promise<string | null> {
        if (!this.token) return null;
        const cleanPath = path.replace(/^\/+|\/+$/g, '');
        if (!cleanPath) return 'root';
        
        const parts = cleanPath.split('/');
        let currentParentId = 'root';
        
        for (const part of parts) {
            const q = encodeURIComponent(`name = '${part}' and mimeType = 'application/vnd.google-apps.folder' and '${currentParentId}' in parents and trashed = false`);
            const response = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id)&spaces=drive`, {
                headers: { Authorization: `Bearer ${this.token}` }
            });
            if (!response.ok) return null;
            const data = await response.json();
            
            if (data.files && data.files.length > 0) {
                currentParentId = data.files[0].id;
            } else {
                if (!createIfMissing) return null;
                
                const createResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${this.token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        name: part,
                        mimeType: 'application/vnd.google-apps.folder',
                        parents: [currentParentId]
                    })
                });
                if (!createResponse.ok) throw new Error(`Failed to create folder ${part} on Google Drive`);
                const createData = await createResponse.json();
                currentParentId = createData.id;
            }
        }
        return currentParentId;
    }

    private static async getFileId(createFoldersIfMissing: boolean = false): Promise<string | null> {
        if (!this.token) throw new Error('Google Drive not initialized');
        let folderPath = '';
        let fileName = this.currentPath;
        
        if (this.currentPath.includes('/')) {
            const parts = this.currentPath.split('/');
            fileName = parts.pop() || '';
            folderPath = parts.join('/');
        }
        
        const folderId = await this.getFolderIdByPath(folderPath, createFoldersIfMissing);
        if (!folderId) return null;
        
        const q = encodeURIComponent(`name = '${fileName}' and '${folderId}' in parents and trashed = false`);
        const response = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id)&spaces=drive`, {
            headers: { Authorization: `Bearer ${this.token}` }
        });
        if (!response.ok) throw new Error('Failed to search file on Google Drive');
        const data = await response.json();
        
        if (data.files && data.files.length > 0) {
            return data.files[0].id;
        }
        return null;
    }

    static async fileExists(path: string): Promise<boolean> {
        if (!this.token) return false;
        try {
            const originalPath = this.currentPath;
            this.currentPath = path;
            const fileId = await this.getFileId();
            this.currentPath = originalPath;
            return fileId !== null;
        } catch {
            return false;
        }
    }

    static async listFolders(path: string = ''): Promise<{ name: string, path_lower: string }[]> {
        if (!this.token) throw new Error('Google Drive not initialized');
        const folderId = await this.getFolderIdByPath(path);
        if (!folderId) return [];

        const q = encodeURIComponent(`mimeType = 'application/vnd.google-apps.folder' and '${folderId}' in parents and trashed = false`);
        const response = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)&spaces=drive`, {
            headers: { Authorization: `Bearer ${this.token}` }
        });
        
        if (!response.ok) throw new Error('Failed to list folders on Google Drive');
        const data = await response.json();
        
        const cleanPath = path.replace(/\/+$/g, '');
        return (data.files || []).map((f: any) => ({
            name: f.name,
            path_lower: `${cleanPath}/${f.name}`
        }));
    }

    static async deleteFile(): Promise<void> {
        if (!this.token) throw new Error('Google Drive not initialized');
        const fileId = await this.getFileId();
        if (!fileId) return;
        
        const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
            method: 'DELETE',
            headers: {
                Authorization: `Bearer ${this.token}`
            }
        });
        if (!response.ok && response.status !== 404) {
            throw new Error('Failed to delete file from Google Drive');
        }
    }

    static async downloadData() {
        if (!this.token) throw new Error('Google Drive not initialized');
        const fileId = await this.getFileId();
        if (!fileId) return null; // File doesn't exist yet
        
        const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
            headers: {
                Authorization: `Bearer ${this.token}`
            }
        });
        if (!response.ok) {
            if (response.status === 404) return null;
            throw new Error('Failed to download data from Google Drive');
        }
        return await response.json();
    }

    static async uploadData(data: any) {
        if (!this.token) throw new Error('Google Drive not initialized');
        const fileId = await this.getFileId(true); // create folders if missing
        const content = JSON.stringify(data);
        
        if (fileId) {
            // Update existing file content
            const response = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
                method: 'PATCH',
                headers: {
                    Authorization: `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: content
            });
            if (!response.ok) throw new Error('Failed to update file on Google Drive');
        } else {
            // Create new file with metadata and content (using multipart upload)
            let folderPath = '';
            let fileName = this.currentPath;
            if (this.currentPath.includes('/')) {
                const parts = this.currentPath.split('/');
                fileName = parts.pop() || '';
                folderPath = parts.join('/');
            }
            
            const folderId = await this.getFolderIdByPath(folderPath, true);
            const metadata: any = {
                name: fileName,
                mimeType: 'application/json'
            };
            if (folderId && folderId !== 'root') {
                metadata.parents = [folderId];
            }
            
            const boundary = '314159265358979323846';
            const delimiter = `\r\n--${boundary}\r\n`;
            const closeDelimiter = `\r\n--${boundary}--\r\n`;
            
            const body = 
                delimiter +
                'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
                JSON.stringify(metadata) +
                delimiter +
                'Content-Type: application/json\r\n\r\n' +
                content +
                closeDelimiter;
                
            const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${this.token}`,
                    'Content-Type': `multipart/related; boundary=${boundary}`
                },
                body: body
            });
            if (!response.ok) throw new Error('Failed to create file on Google Drive');
        }
        return Date.now();
    }

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

    static mergeData(localData: any, remoteData: any) {
        if (!remoteData) return localData;
        
        const merged: any = { ...localData };
        
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

        const mergeArray = (localArr: any[], remoteArr: any[], storeName: string, localTombstones: any[], remoteTombstones: any[]) => {
            const result = [...localArr];
            
            const allTombstones = [...localTombstones, ...remoteTombstones]
                .filter(t => t.store === storeName);

            remoteArr.forEach(remoteItem => {
                const localIndex = result.findIndex(l => l.id === remoteItem.id);
                const remoteTs = getItemTimestamp(remoteItem, storeName);
                
                const tombstone = allTombstones.find(t => t.id === `${storeName}:${remoteItem.id}`);
                if (tombstone && tombstone.deletedAt > remoteTs) {
                    if (localIndex !== -1) result.splice(localIndex, 1);
                    return;
                }

                if (localIndex === -1) {
                    result.push(remoteItem);
                } else {
                    const localItem = result[localIndex];
                    const localTs = getItemTimestamp(localItem, storeName);
                    if (remoteTs > localTs) {
                        result[localIndex] = remoteItem;
                    }
                }
            });

            return result.filter(item => {
                const tombstone = allTombstones.find(t => t.id === `${storeName}:${item.id}`);
                const itemTs = getItemTimestamp(item, storeName);
                return !tombstone || itemTs > tombstone.deletedAt;
            });
        };

        const collections = [
            'accounts', 'cards', 'expenses', 'incomes', 'recurring_expenses', 
            'savings', 'allocations', 'loans', 'transfers', 
            'categories', 'closings', 'overrides', 'movements'
        ];

        const localTombstones = localData['deleted_items'] || [];
        const remoteTombstones = remoteData['deleted_items'] || [];
        
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
        if (!this.token) return null;

        try {
            const rawLocal = await incomeDB.exportFullData();
            const localData = this.normalizeDataKeys(rawLocal);
            
            const rawRemote = await this.downloadData();
            this._sessionVerified = true;
            if (!rawRemote) {
                await this.uploadData(localData);
                return Date.now();
            }
            const remoteData = this.normalizeDataKeys(rawRemote);
            
            const mergedData = this.mergeData(localData, remoteData);
            
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
            console.error("Google Drive sync error:", error);
            throw error;
        }
    }
}
