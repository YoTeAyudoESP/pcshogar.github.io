
import { Dropbox } from 'dropbox';
import { incomeDB } from './db';

const DROPBOX_CLIENT_ID = 'y9nh44kplesrdd1';
const DATA_FILE_PATH = '/pcshogar_data.json';

export class DropboxService {
    private static dbx: Dropbox | null = null;

    static init(token: string) {
        this.dbx = new Dropbox({ accessToken: token });
    }

    static getAuthUrl() {
        // For Capacitor/Mobile, we might need a specific redirect URI
        const redirectUri = window.location.origin + '/auth/dropbox';
        return `https://www.dropbox.com/oauth2/authorize?client_id=${DROPBOX_CLIENT_ID}&response_type=token&redirect_uri=${encodeURIComponent(redirectUri)}`;
    }

    static async getUserInfo() {
        if (!this.dbx) throw new Error('Dropbox not initialized');
        const response = await this.dbx.usersGetCurrentAccount();
        return response.result;
    }

    static async uploadData(data: any) {
        if (!this.dbx) throw new Error('Dropbox not initialized');
        
        const content = JSON.stringify(data);
        await this.dbx.filesUpload({
            path: DATA_FILE_PATH,
            contents: content,
            mode: { '.tag': 'overwrite' }
        });
        return Date.now();
    }

    static async downloadData() {
        if (!this.dbx) throw new Error('Dropbox not initialized');
        
        try {
            const response = await this.dbx.filesDownload({ path: DATA_FILE_PATH });
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
     * Intelligent merge between local and remote data
     * Based on updatedAt timestamps
     */
    static mergeData(localData: any, remoteData: any) {
        if (!remoteData) return localData;
        
        const merged: any = { ...localData };
        
        // Helper to merge arrays of objects with 'id' and 'updatedAt'
        const mergeArray = (localArr: any[], remoteArr: any[]) => {
            const result = [...localArr];
            remoteArr.forEach(remoteItem => {
                const localIndex = result.findIndex(l => l.id === remoteItem.id);
                if (localIndex === -1) {
                    // New item from remote
                    result.push(remoteItem);
                } else {
                    // Existing item, compare updatedAt
                    const localItem = result[localIndex];
                    if ((remoteItem.updatedAt || 0) > (localItem.updatedAt || 0)) {
                        result[localIndex] = remoteItem;
                    }
                }
            });
            return result;
        };

        // List of keys to merge (collections in our DB)
        const collections = [
            'accounts', 'expenses', 'incomes', 'recurringExpenses', 
            'savings', 'allocations', 'loans', 'transfers', 
            'categories', 'monthClosings', 'monthOverrides', 'accountMovements'
        ];

        collections.forEach(key => {
            if (localData[key] && remoteData[key]) {
                merged[key] = mergeArray(localData[key], remoteData[key]);
            } else if (remoteData[key]) {
                merged[key] = remoteData[key];
            }
        });

        return merged;
    }

    static async sync() {
        if (!this.dbx) return;

        try {
            // 1. Export local
            const localData = await incomeDB.exportFullData();
            
            // 2. Download remote
            const remoteData = await this.downloadData();
            
            if (!remoteData) {
                // First time: just upload local
                await this.uploadData(localData);
                return Date.now();
            }

            // 3. Merge
            const mergedData = this.mergeData(localData, remoteData);
            
            // 4. If data changed, update local and upload
            // (In this simplified version, we always update local to be sure, and upload)
            await incomeDB.importFullData(mergedData);
            await this.uploadData(mergedData);
            
            return Date.now();
        } catch (error) {
            console.error("Sync error:", error);
            throw error;
        }
    }
}
