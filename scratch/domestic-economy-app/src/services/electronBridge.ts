import { Capacitor } from '@capacitor/core';
import { FilePicker } from '@capawesome/capacitor-file-picker';
import { Browser } from '@capacitor/browser';
import { App } from '@capacitor/app';

export interface PlatformAPI {
    selectDirectory: () => Promise<string | undefined>;
    saveFile: (filePath: string, content: string) => Promise<{ success: boolean; error?: string }>;
    selectSavePath: (options: { defaultPath?: string; title?: string; filters?: any[] }) => Promise<string | undefined>;
    readFile: (filePath: string) => Promise<{ success: boolean; content?: string; metadata?: { size: number; mtime: number }; error?: string }>;
    pickFile: () => Promise<{ path: string; content?: string; metadata?: { size: number; mtime: number } } | undefined>;
    selectFile: (options?: { filters?: any[] }) => Promise<string | undefined>;

    // SMB
    smbConnect: (config: any) => Promise<{ success: boolean; error?: string }>;
    smbDisconnect: () => Promise<{ success: boolean }>;
    smbList: (path: string) => Promise<{ success: boolean; files?: any[]; error?: string }>;
    smbRead: (path: string) => Promise<{ success: boolean; content?: string; error?: string }>;
    smbWrite: (path: string, content: string) => Promise<{ success: boolean; error?: string }>;

    // Deep Linking
    onDeepLink: (callback: (url: string) => void) => () => void;
    openExternal: (url: string) => Promise<void>;
    closeBrowser: () => Promise<void>;
    writeDebugLog: (message: string) => Promise<void>;
}

const getElectron = () => {
    if (typeof window !== 'undefined' && (window as any).require) {
        try {
            return (window as any).require('electron');
        } catch (e) {
            return null;
        }
    }
    return null;
};

const electron = getElectron();

const electronAPI: PlatformAPI = {
    selectDirectory: () => {
        if (electron) return electron.ipcRenderer.invoke('select-directory');
        return Promise.resolve(undefined);
    },
    saveFile: (filePath: string, content: string) => {
        if (electron) return electron.ipcRenderer.invoke('save-file', { filePath, content });
        return Promise.resolve({ success: false, error: 'Not electron' });
    },
    selectSavePath: (options: { defaultPath?: string; title?: string; filters?: any[] }) => {
        if (electron) return electron.ipcRenderer.invoke('select-save-path', options);
        return Promise.resolve(undefined);
    },
    readFile: (filePath: string) => {
        if (electron) return electron.ipcRenderer.invoke('read-file', filePath);
        return Promise.resolve({ success: false, error: 'Not electron' });
    },
    pickFile: () => {
        if (electron) return electron.ipcRenderer.invoke('pick-file');
        return Promise.resolve(undefined);
    },
    selectFile: (options) => {
        if (electron) return electron.ipcRenderer.invoke('select-file', options);
        return Promise.resolve(undefined);
    },

    // SMB
    smbConnect: (config: any) => {
        if (electron) return electron.ipcRenderer.invoke('smb-connect', config);
        return Promise.resolve({ success: false, error: 'Not supported' });
    },
    smbDisconnect: () => {
        if (electron) return electron.ipcRenderer.invoke('smb-disconnect');
        return Promise.resolve({ success: true });
    },
    smbList: (path: string) => {
        if (electron) return electron.ipcRenderer.invoke('smb-list', path);
        return Promise.resolve({ success: false, error: 'Not supported' });
    },
    smbRead: (path: string) => {
        if (electron) return electron.ipcRenderer.invoke('smb-read', path);
        return Promise.resolve({ success: false, error: 'Not supported' });
    },
    smbWrite: (path: string, content: string) => {
        if (electron) return electron.ipcRenderer.invoke('smb-write', { path, content });
        return Promise.resolve({ success: false, error: 'Not supported' });
    },

    onDeepLink: (callback: (url: string) => void) => {
        if (electron) {
            const handler = (_event: any, url: string) => callback(url);
            electron.ipcRenderer.on('deep-link', handler);
            return () => electron.ipcRenderer.removeListener('deep-link', handler);
        }
        return () => { };
    },
    openExternal: async (url: string) => {
        if (electron) {
            await electron.ipcRenderer.invoke('open-external', url);
        } else {
            window.open(url, '_system');
        }
    },
    closeBrowser: async () => {
        // No-op for Electron
    },
    writeDebugLog: async (_message: string) => {
        // Logging disabled for Windows as per user request (v0.1.62)
        // if (electron) { ... }
    }
};

const capacitorAPI: PlatformAPI = {
    selectDirectory: async () => {
        if (Capacitor.isNativePlatform()) {
            try {
                const result = await FilePicker.pickDirectory();
                if (result && result.path) {
                    return result.path;
                }
            } catch (e) {
                console.error('Directory picking failed', e);
            }
        }
        return undefined;
    },
    selectFile: async (options) => {
        if (Capacitor.isNativePlatform()) {
            try {
                const result = await FilePicker.pickFiles({
                    types: options?.filters?.[0]?.extensions || ['application/json'],
                    readData: false
                });
                if (result.files && result.files.length > 0) {
                    return result.files[0].path;
                }
            } catch (e) {
                console.error('File picking failed', e);
            }
        }
        return undefined;
    },
    selectSavePath: async (options: { defaultPath?: string; title?: string; filters?: any[] }) => {
        if (Capacitor.isNativePlatform()) {
            try {
                // On Android, we pick a directory and append the filename
                const result = await FilePicker.pickDirectory();
                if (result && result.path) {
                    const fileName = options.defaultPath || 'backup.json';
                    return result.path.endsWith('/') ? `${result.path}${fileName}` : `${result.path}/${fileName}`;
                }
            } catch (e) {
                console.error('Directory picking for save failed', e);
            }
        }
        return undefined;
    },
    saveFile: async (filePath: string, content: string) => {
        if (Capacitor.isNativePlatform()) {
            const Filesystem = (Capacitor as any).Plugins.Filesystem;
            if (Filesystem) {
                try {
                    const normalizedPath = decodeURIComponent(filePath);
                    const isAbsolute = normalizedPath.startsWith('/');
                    const isUri = normalizedPath.startsWith('content://') || normalizedPath.startsWith('file://');
                    const options: any = {
                        path: normalizedPath,
                        data: content,
                        encoding: 'utf8',
                    };

                    if (!isAbsolute && !isUri) {
                        options.directory = 'EXTERNAL';
                    }

                    await Filesystem.writeFile(options);
                    return { success: true };
                } catch (e: any) {
                    console.error('Save file error:', e);
                    if (e.message && (e.message.includes('EACCES') || e.message.includes('Permission denied'))) {
                        return { success: false, error: 'Permiso denegado. Android restringe escribir en este archivo de red directamente. Prueba a guardar localmente.' };
                    }
                    return { success: false, error: e.message };
                }
            }
        }
        return { success: false, error: 'Plataforma no soportada' };
    },
    readFile: async (filePath: string) => {
        if (Capacitor.isNativePlatform()) {
            const Filesystem = (Capacitor as any).Plugins.Filesystem;
            if (Filesystem) {
                try {
                    const normalizedPath = decodeURIComponent(filePath);
                    const isAbsolute = normalizedPath.startsWith('/');
                    const isUri = normalizedPath.startsWith('content://') || normalizedPath.startsWith('file://');
                    const options: any = {
                        path: normalizedPath,
                        encoding: 'utf8',
                    };
                    if (!isAbsolute && !isUri) {
                        options.directory = 'EXTERNAL';
                    }
                    const result = await Filesystem.readFile(options);
                    let metadata;
                    try {
                        const stat = await Filesystem.stat({ path: filePath, directory: isUri ? undefined : 'EXTERNAL' });
                        metadata = { size: stat.size, mtime: stat.mtime };
                    } catch (e) {
                        console.warn('Could not get stat for file', e);
                    }
                    return { success: true, content: result.data as string, metadata };
                } catch (e: any) {
                    console.error('Read file error:', e);
                    return { success: false, error: e.message };
                }
            }
        }
        return { success: false, error: 'Platform not supported' };
    },
    pickFile: async () => {
        if (Capacitor.isNativePlatform()) {
            try {
                const result = await FilePicker.pickFiles({
                    types: ['application/json', 'text/plain'],
                    readData: true
                });
                if (result.files && result.files.length > 0) {
                    const file = result.files[0];
                    let content: string | undefined = undefined;

                    if (file.data) {
                        try {
                            content = atob(file.data);
                            // Ensure it's valid UTF-8 if possible
                            try {
                                const bytes = new Uint8Array(content.length);
                                for (let i = 0; i < content.length; i++) {
                                    bytes[i] = content.charCodeAt(i);
                                }
                                content = new TextDecoder().decode(bytes);
                            } catch (e) { }
                        } catch (e) {
                            console.error('Failed to decode file data', e);
                        }
                    }

                    return {
                        path: file.path || '',
                        content,
                        metadata: {
                            size: file.size || 0,
                            mtime: file.modifiedAt || Date.now()
                        }
                    };
                }
            } catch (e) {
                console.error('File picking failed', e);
            }
        }
        return undefined;
    },
    smbConnect: async (config: any) => {
        if (Capacitor.isNativePlatform()) {
            try {
                // @ts-ignore
                await Capacitor.Plugins.SmbPlugin.connect(config);
                return { success: true };
            } catch (e: any) {
                return { success: false, error: e.message };
            }
        }
        return { success: false, error: 'Not supported' };
    },
    smbDisconnect: async () => {
        // Native plugin is stateless in terms of "connection" object (it uses CIFSContext per call or managed internally)
        // But we can implement a logic if needed. For now, just resolve.
        return { success: true };
    },
    smbList: async (path: string) => {
        if (Capacitor.isNativePlatform()) {
            try {
                // We need to pass credentials again? 
                // The native plugin is stateless? 
                // Wait, SmbPlugin.java uses `baseContext` or builds one from params.
                // The current app architecture assumes stateful connection in Electron (it remembers creds).
                // For Android plugin, we might need to pass creds every time OR store them in the plugin.
                // Re-reading SmbPlugin.java: it takes username/password in every call.
                // So we need to retrieve them from localStorage here before calling.

                const username = localStorage.getItem('pcs_smb_username') || '';
                const password = localStorage.getItem('pcs_smb_password') || '';
                const domain = localStorage.getItem('pcs_smb_domain') || '';

                // @ts-ignore
                const result = await Capacitor.Plugins.SmbPlugin.list({ path, username, password, domain });
                return { success: true, files: result.files };
            } catch (e: any) {
                return { success: false, error: e.message };
            }
        }
        return { success: false, error: 'Not supported' };
    },
    smbRead: async (path: string) => {
        if (Capacitor.isNativePlatform()) {
            try {
                const username = localStorage.getItem('pcs_smb_username') || '';
                const password = localStorage.getItem('pcs_smb_password') || '';
                const domain = localStorage.getItem('pcs_smb_domain') || '';

                // @ts-ignore
                const result = await Capacitor.Plugins.SmbPlugin.readFile({ path, username, password, domain });
                return { success: true, content: result.content };
            } catch (e: any) {
                return { success: false, error: e.message };
            }
        }
        return { success: false, error: 'Not supported' };
    },
    smbWrite: async (path: string, content: string) => {
        if (Capacitor.isNativePlatform()) {
            try {
                const username = localStorage.getItem('pcs_smb_username') || '';
                const password = localStorage.getItem('pcs_smb_password') || '';
                const domain = localStorage.getItem('pcs_smb_domain') || '';

                // @ts-ignore
                await Capacitor.Plugins.SmbPlugin.writeFile({ path, content, username, password, domain });
                return { success: true };
            } catch (e: any) {
                return { success: false, error: e.message };
            }
        }
        return { success: false, error: 'Not supported' };
    },
    onDeepLink: (callback: (url: string) => void) => {
        if (Capacitor.isNativePlatform()) {
            const handle = App.addListener('appUrlOpen', (data: any) => {
                console.log('Deep link received in Capacitor:', data.url);
                callback(data.url);
            });
            return () => {
                handle.then((h: any) => h.remove());
            };
        }
        return () => { };
    },
    openExternal: async (url: string) => {
        if (Capacitor.isNativePlatform()) {
            console.log('Opening external URL:', url);
            try {
                // Force System Browser (Chrome) to ensure Custom Scheme redirect works
                // Custom Tabs (Browser.open) are getting stuck on the redirect.
                window.open(url, '_system');
            } catch (e) {
                console.error('Browser open failed', e);
            }
        } else {
            window.open(url, '_blank');
        }
    },
    closeBrowser: async () => {
        if (Capacitor.isNativePlatform()) {
            try {
                // @ts-ignore
                await Browser.close();
            } catch (e) {
                console.warn('Failed to close browser', e);
            }
        }
    },
    writeDebugLog: async (message: string) => {
        console.log('Debug Log:', message);
        if (Capacitor.isNativePlatform()) {
            const Filesystem = (Capacitor as any).Plugins.Filesystem;
            if (Filesystem) {
                try {
                    const timestamp = new Date().toISOString();
                    const logLine = `[${timestamp}] ${message}\n`;

                    await Filesystem.appendFile({
                        path: 'PCSHogar_Debug.txt',
                        data: logLine,
                        directory: 'DOCUMENTS',
                        encoding: 'utf8'
                    });
                    console.log('Appended to Android debug log');
                } catch (e) {
                    // Try writing if append fails (file might not exist)
                    try {
                        const timestamp = new Date().toISOString();
                        const logLine = `[${timestamp}] ${message}\n`;
                        await Filesystem.writeFile({
                            path: 'PCSHogar_Debug.txt',
                            data: logLine,
                            directory: 'DOCUMENTS',
                            encoding: 'utf8'
                        });
                    } catch (e2) {
                        console.error('Failed to write Android debug log', e2);
                    }
                }
            }
        }
    }
};

export const isElectron = () => !!electron;
export const isCapacitor = () => Capacitor.isNativePlatform();
export const isPlatformReady = () => isElectron() || isCapacitor();

export const platformBridge: PlatformAPI = isElectron() ? electronAPI : capacitorAPI;
