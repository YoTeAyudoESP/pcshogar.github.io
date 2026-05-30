import type { SyncProvider, FileMetadata } from './SyncProvider';
import { platformBridge } from '../electronBridge';

const CLIENT_ID = 'y9nh44kplesrdd1';

export class DropboxProvider implements SyncProvider {
    name = 'dropbox';
    private accessToken: string | null = null;
    private authResolve: (() => void) | null = null;
    private authReject: ((reason: any) => void) | null = null;

    constructor() {
        this.accessToken = localStorage.getItem('dropbox_token');
    }

    async isAuthenticated(): Promise<boolean> {
        return !!this.accessToken;
    }

    async checkConnection(): Promise<boolean> {
        if (!this.accessToken) return false;

        try {
            const response = await fetch('https://api.dropboxapi.com/2/users/get_current_account', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                }
            });
            if (response.ok) return true;
            if (response.status === 401) {
                await this.disconnect();
                return false;
            }
        } catch (e) {
            console.warn('Dropbox connection check failed:', e);
        }
        return false;
    }

    async authenticate(): Promise<void> {
        const state = Math.random().toString(36).substring(7);
        localStorage.setItem('dropbox_auth_state', state);

        const isProdMode = window.location.protocol === 'file:' || window.location.protocol === 'pcshogar:' || window.location.protocol === 'capacitor:';
        const isElectron = window.navigator.userAgent.includes('Electron');
        const isCapacitor = !!(window as any).Capacitor;

        const redirectUri = (isProdMode || isElectron || isCapacitor)
            ? 'pcshogar://oauth/callback/dropbox'
            : 'http://localhost:5173/oauth/callback/dropbox';

        console.log('Dropbox Auth (Implicit) initiating with redirect:', redirectUri);
        await platformBridge.writeDebugLog(`Iniciando Autenticación Dropbox (Flujo Implícito). Redirect: ${redirectUri}`);

        // Scopes needed
        const scope = 'account_info.read files.content.write files.content.read files.metadata.read';

        // We use response_type=token for immediate token return (Implicit Flow)
        const authUrl = `https://www.dropbox.com/oauth2/authorize?client_id=${CLIENT_ID}&response_type=token&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&state=${state}&force_reapprove=true`;

        return new Promise(async (resolve, reject) => {
            this.authResolve = resolve;
            this.authReject = reject;

            // Setup listener for deep links if needed, but in implicit flow we might rely on the same origin redirect
            let cleanup: (() => void) | null = null;

            // In modern Capacitor/Electron, even with localhost redirects, we listen for the activity
            cleanup = platformBridge.onDeepLink(async (url) => {
                console.log('Dropbox Callback received:', url);
                await this.handleCallback(url);
                platformBridge.closeBrowser().catch(console.error);
                if (cleanup) cleanup();
            });

            // Fallback timeout
            const timeout = setTimeout(() => {
                if (this.authReject) {
                    this.authReject(new Error('Authentication timed out'));
                    this.authReject = null;
                    this.authResolve = null;
                    if (cleanup) cleanup();
                }
            }, 180000);

            try {
                await platformBridge.openExternal(authUrl);
            } catch (e) {
                clearTimeout(timeout);
                if (cleanup) cleanup();
                reject(e);
            }
        });
    }

    async handleCallback(url: string) {
        console.log('Dropbox handleCallback processing URL:', url);
        await platformBridge.writeDebugLog('Dropbox: Procesando callback de flujo implícito...');

        try {
            // In implicit flow, token is in the fragment (#)
            let hash = '';
            if (url.includes('#')) {
                hash = url.split('#')[1];
            } else if (url.includes('?')) {
                // Fallback to query params if Dropbox changes behavior or misconfiguration
                hash = url.split('?')[1];
            }

            if (!hash) {
                console.warn('No token found in callback URL');
                return;
            }

            const params = new URLSearchParams(hash);
            const accessToken = params.get('access_token');
            const state = params.get('state');
            const savedState = localStorage.getItem('dropbox_auth_state');

            if (state !== savedState) {
                console.warn('Dropbox Auth: State mismatch, possible CSRF');
                // Optional: reject(new Error('State mismatch'));
            }

            if (accessToken) {
                this.accessToken = accessToken;
                localStorage.setItem('dropbox_token', accessToken);
                console.log('Dropbox token received and stored!');
                await platformBridge.writeDebugLog('Dropbox: Token recibido con éxito.');

                if (this.authResolve) {
                    this.authResolve();
                    this.authResolve = null;
                    this.authReject = null;
                }
            } else {
                const error = params.get('error_description') || 'Unknown OAuth error';
                console.error('Dropbox Auth Error:', error);
                if (this.authReject) {
                    this.authReject(new Error(error));
                    this.authReject = null;
                    this.authResolve = null;
                }
            }
        } catch (e) {
            console.error('Error parsing callback URL:', e);
            if (this.authReject) {
                this.authReject(e);
                this.authReject = null;
                this.authResolve = null;
            }
        }
    }

    async disconnect(): Promise<void> {
        this.accessToken = null;
        localStorage.removeItem('dropbox_token');
        localStorage.removeItem('dropbox_refresh_token');
        localStorage.removeItem('dropbox_token_expiry');
    }

    private normalizePath(path: string): string {
        if (!path) return '';
        return path.startsWith('/') ? path : '/' + path;
    }

    async searchFiles(query: string = '.json'): Promise<FileMetadata[]> {
        if (!this.accessToken) throw new Error('Not authenticated');

        try {
            const response = await fetch('https://api.dropboxapi.com/2/files/search_v2', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    query: query,
                    options: {
                        file_extensions: ['json'],
                        max_results: 20
                    }
                })
            });

            if (!response.ok) throw new Error('Dropbox Search Error: ' + response.statusText);

            const data = await response.json();
            let matches = data.matches.map((match: any) => {
                const entry = match.metadata.metadata;
                return {
                    name: entry.name,
                    path: entry.path_lower,
                    size: entry.size || 0,
                    mtime: new Date(entry.client_modified || entry.server_modified || Date.now()).getTime(),
                    isDirectory: entry['.tag'] === 'folder'
                };
            });

            if (matches.length === 0) {
                return await this.listFiles('');
            }

            return matches;
        } catch (e) {
            return await this.listFiles('');
        }
    }

    async listFiles(path: string = ''): Promise<FileMetadata[]> {
        if (!this.accessToken) throw new Error('Not authenticated');

        const normalizedPath = path === '' || path === '/' ? '' : this.normalizePath(path);

        const response = await fetch('https://api.dropboxapi.com/2/files/list_folder', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                path: normalizedPath,
                recursive: false,
                include_media_info: false,
                include_deleted: false,
                include_has_explicit_shared_members: false
            })
        });

        if (!response.ok) {
            if (response.status === 401) {
                await this.disconnect();
                throw new Error('Sesión expirada');
            }
            throw new Error('Dropbox Error: ' + response.statusText);
        }

        const data = await response.json();
        return data.entries.map((entry: any) => ({
            name: entry.name,
            path: entry.path_lower,
            size: entry.size || 0,
            mtime: new Date(entry.client_modified || Date.now()).getTime(),
            isDirectory: entry['.tag'] === 'folder'
        }));
    }

    async uploadFile(path: string, content: string): Promise<void> {
        if (!this.accessToken) throw new Error('Not authenticated');

        const args = {
            path: this.normalizePath(path),
            mode: 'overwrite',
            autorename: false,
            mute: false,
            strict_conflict: false
        };

        const response = await fetch('https://content.dropboxapi.com/2/files/upload', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Dropbox-API-Arg': JSON.stringify(args),
                'Content-Type': 'application/octet-stream'
            },
            body: content
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error('Upload failed: ' + errorText);
        }
    }

    async downloadFile(path: string): Promise<string> {
        if (!this.accessToken) throw new Error('Not authenticated');

        const args = {
            path: this.normalizePath(path)
        };

        const response = await fetch('https://content.dropboxapi.com/2/files/download', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Dropbox-API-Arg': JSON.stringify(args)
            }
        });

        if (!response.ok) throw new Error('Download failed: ' + response.statusText);
        return await response.text();
    }
}
