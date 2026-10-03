import { incomeDB } from './db';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

export class SyncService {
    private static isElectron(): boolean {
        return typeof window !== 'undefined' && typeof (window as any).process === 'object' && (window as any).process.type === 'renderer';
    }

    private static getFs() {
        if (this.isElectron()) {
            try {
                // In some electron setups with nodeIntegration: true
                // eslint-disable-next-line @typescript-eslint/no-var-requires
                return (window as any).require('fs');
            } catch (e) {
                console.error("FS not available despite being Electron", e);
                return null;
            }
        }
        return null;
    }

    static async syncToLocalFile(path: string): Promise<boolean> {
        const fs = this.getFs();
        if (!fs) {
            console.warn("Auto-sync skipped: Not running in Electron or FS unavailable.");
            return false;
        }

        try {
            const data = await incomeDB.exportFullData();
            const content = JSON.stringify(data, null, 2);
            fs.writeFileSync(path, content, 'utf8');
            console.log(`Auto-sync success: ${path}`);
            return true;
        } catch (error) {
            console.error("Auto-sync failed", error);
            return false;
        }
    }

    static async exportToJSON(data: any, defaultFileName: string = 'pcshogar_backup.json') {
        if (Capacitor.getPlatform() === 'android') {
            try {
                const jsonString = JSON.stringify(data, null, 2);
                const writeResult = await Filesystem.writeFile({
                    path: defaultFileName,
                    data: jsonString,
                    directory: Directory.Cache,
                    encoding: Encoding.UTF8
                });

                let shareUrl = writeResult.uri;
                if (shareUrl && !shareUrl.startsWith('file://') && !shareUrl.startsWith('content://')) {
                    shareUrl = 'file://' + shareUrl;
                }

                await Share.share({
                    title: defaultFileName,
                    text: 'Aquí tienes tu copia de seguridad JSON de PCS Hogar.',
                    url: shareUrl,
                    dialogTitle: 'Compartir o guardar archivo JSON',
                });
            } catch (error) {
                console.error('Error sharing JSON on Android:', error);
                throw error;
            }
        } else {
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = defaultFileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }
    }

    static smartMerge(localData: any, remoteData: any): { mergedData: any; summary: { unified: number; added: number } } {
        const rootLocal = localData?.data || localData?.backup || localData || {};
        const rootRemote = remoteData?.data || remoteData?.backup || remoteData || {};

        const merged: Record<string, any[]> = {};
        const summary = {
            unified: 0,
            added: 0
        };

        const allStoreKeys = Array.from(new Set([
            ...Object.keys(rootLocal),
            ...Object.keys(rootRemote)
        ]));

        for (const store of allStoreKeys) {
            const localArr: any[] = Array.isArray(rootLocal[store]) ? rootLocal[store] : [];
            const remoteArr: any[] = Array.isArray(rootRemote[store]) ? rootRemote[store] : [];

            if (localArr.length === 0 && remoteArr.length === 0) continue;

            const storeMerged: any[] = [...localArr];
            let storeUnifiedCount = 0;
            let storeAddedCount = 0;

            for (const remoteItem of remoteArr) {
                if (!remoteItem || typeof remoteItem !== 'object') continue;

                let existingMatchIndex = -1;

                if (store === 'accounts' || store === 'cards') {
                    existingMatchIndex = storeMerged.findIndex(l => 
                        l.id === remoteItem.id || 
                        (l.name && remoteItem.name && l.name.trim().toLowerCase() === remoteItem.name.trim().toLowerCase())
                    );
                } else if (store === 'savings') {
                    existingMatchIndex = storeMerged.findIndex(l => 
                        l.id === remoteItem.id || 
                        (l.name && remoteItem.name && l.name.trim().toLowerCase() === remoteItem.name.trim().toLowerCase())
                    );
                } else if (store === 'recurring_expenses' || store === 'recurringExpenses') {
                    existingMatchIndex = storeMerged.findIndex(l => 
                        l.id === remoteItem.id || 
                        (l.description && remoteItem.description && 
                         l.description.trim().toLowerCase() === remoteItem.description.trim().toLowerCase() && 
                         Math.abs((l.amount || 0) - (remoteItem.amount || 0)) < 0.01 &&
                         l.frequency === remoteItem.frequency)
                    );
                } else if (store === 'vehicles') {
                    existingMatchIndex = storeMerged.findIndex(l => 
                        l.id === remoteItem.id || 
                        (l.licensePlate && remoteItem.licensePlate && l.licensePlate.trim().toLowerCase() === remoteItem.licensePlate.trim().toLowerCase()) ||
                        (l.name && remoteItem.name && l.name.trim().toLowerCase() === remoteItem.name.trim().toLowerCase())
                    );
                } else if (store === 'insurances') {
                    existingMatchIndex = storeMerged.findIndex(l => 
                        l.id === remoteItem.id || 
                        (l.policyNumber && remoteItem.policyNumber && l.policyNumber.trim().toLowerCase() === remoteItem.policyNumber.trim().toLowerCase()) ||
                        (l.name && remoteItem.name && l.name.trim().toLowerCase() === remoteItem.name.trim().toLowerCase())
                    );
                } else if (store === 'expenses' || store === 'incomes' || store === 'movements') {
                    existingMatchIndex = storeMerged.findIndex(l => {
                        if (l.id === remoteItem.id) return true;
                        const lDesc = l.description || l.name || '';
                        const rDesc = remoteItem.description || remoteItem.name || '';
                        const lDate = l.date || l.effectiveDate || l.receivedDate || l.createdAt;
                        const rDate = remoteItem.date || remoteItem.effectiveDate || remoteItem.receivedDate || remoteItem.createdAt;
                        return lDesc.trim().toLowerCase() === rDesc.trim().toLowerCase() &&
                               Math.abs((l.amount || 0) - (remoteItem.amount || 0)) < 0.01 &&
                               Math.abs((lDate || 0) - (rDate || 0)) < 60000;
                    });
                } else {
                    existingMatchIndex = storeMerged.findIndex(l => l.id && remoteItem.id && l.id === remoteItem.id);
                }

                if (existingMatchIndex >= 0) {
                    storeUnifiedCount++;
                    storeMerged[existingMatchIndex] = {
                        ...remoteItem,
                        ...storeMerged[existingMatchIndex]
                    };
                } else {
                    storeAddedCount++;
                    storeMerged.push(remoteItem);
                }
            }

            merged[store] = storeMerged;
            summary.unified += storeUnifiedCount;
            summary.added += storeAddedCount;
        }

        return { mergedData: merged, summary };
    }
}

