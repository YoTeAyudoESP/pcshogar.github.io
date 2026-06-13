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
}

