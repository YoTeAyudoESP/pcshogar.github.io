import type { SyncProvider, FileMetadata } from './SyncProvider';
import { platformBridge } from '../electronBridge';

// Configuration for Connect
export interface SMBConfig {
    share: string; // \\192.168.1.10\public
    username?: string;
    password?: string;
    domain?: string;
}

export class SMBProvider implements SyncProvider {
    name = 'smb';

    constructor() { }

    async isAuthenticated(): Promise<boolean> {
        // We don't have a reliable way to check "is connected" without trying a command,
        // but for now we'll assume if we can list root, we are good.
        // Actually, let's keep it simple: always require specific 'connect' action or saved config?
        // For security, maybe don't save password in plain text.
        // We'll rely on session state in backend.
        return true; // We perform auth on connect.
    }

    async authenticate(config?: SMBConfig): Promise<void> {
        if (!config) throw new Error('SMB config required');

        const result = await platformBridge.smbConnect(config);
        if (!result.success) throw new Error(result.error);
    }

    async disconnect(): Promise<void> {
        await platformBridge.smbDisconnect();
    }

    async listFiles(path: string = ''): Promise<FileMetadata[]> {
        const result = await platformBridge.smbList(path);
        if (!result.success) throw new Error(result.error);

        return (result.files || []).map((f: any) => ({
            name: f.name,
            path: f.path,
            size: f.size,
            mtime: f.mtime,
            isDirectory: f.isDirectory
        }));
    }

    private getFullUrl(path: string): string {
        let share = localStorage.getItem('pcs_smb_share') || '';
        if (!share) return path; // Should fail later if no share

        // Normalize share to ensure it doesn't end with slash if path starts with one
        if (share.endsWith('/')) share = share.slice(0, -1);
        if (share.endsWith('\\')) share = share.slice(0, -1);

        // Remove leading slash from path if present
        if (path.startsWith('/') || path.startsWith('\\')) path = path.slice(1);

        const fullPath = `${share}/${path}`;
        // v0.1.94: Collapse any double slashes (except the one in smb://)
        if (fullPath.startsWith('smb://')) {
            return 'smb://' + fullPath.slice(6).replace(/\/+/g, '/');
        }
        return fullPath.replace(/\/+/g, '/');
    }

    async uploadFile(path: string, content: string): Promise<void> {
        const fullPath = this.getFullUrl(path);
        const result = await platformBridge.smbWrite(fullPath, content);
        if (!result.success) throw new Error(result.error);
    }

    async downloadFile(path: string): Promise<string> {
        const fullPath = this.getFullUrl(path);
        const result = await platformBridge.smbRead(fullPath);
        if (!result.success) throw new Error(result.error);
        return result.content || '';
    }
}
