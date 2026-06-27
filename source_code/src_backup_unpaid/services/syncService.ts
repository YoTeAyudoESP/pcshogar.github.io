import { incomeDB } from './db';

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
