import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import versionInfo from '../../public/version.json';

const UPDATE_JSON_URL = 'https://pcshogar.es/version.json';

export interface UpdateInfo {
    hasUpdate: boolean;
    currentVersion: string;
    latestVersion: string;
    downloadUrl: string;
    releaseNotes?: string;
}

export const UpdateService = {
    /**
     * Checks if a new version of the app is available on the GitHub repository.
     */
    async checkUpdate(): Promise<UpdateInfo> {
        try {
            // Fetch version.json from GitHub Pages without caching (with cache buster)
            const response = await fetch(`${UPDATE_JSON_URL}?t=${Date.now()}`, { cache: 'no-store' });
            if (!response.ok) throw new Error('No se pudo obtener la información de la versión remota.');
            const data = await response.json();
            
            const latestVersion = data.version;
            const isElectron = typeof window !== 'undefined' && (
                !!(window as any).require || 
                navigator.userAgent.toLowerCase().indexOf(' electron/') > -1
            );
            const downloadUrl = isElectron ? (data.windowsUrl || data.url) : data.url;
            const releaseNotes = data.releaseNotes;

            // Get current local version from Capacitor/Electron
            let currentVersion = '0.0.0'; // Safe fallback: never triggers a false update
            if (Capacitor.isNativePlatform()) {
                const info = await App.getInfo();
                currentVersion = info.version;
            } else if (isElectron) {
                // Read the real installed version from the Electron main process
                const { ipcRenderer } = (window as any).require('electron');
                try {
                    currentVersion = await ipcRenderer.invoke('get-app-version');
                } catch (e) {
                    console.warn('Could not read app version from Electron, using package fallback', e);
                    currentVersion = versionInfo.version; // fallback to current build version
                }
            }

            // Compare versions using semver
            const hasUpdate = this.isNewerVersion(currentVersion, latestVersion);

            return {
                hasUpdate,
                currentVersion,
                latestVersion,
                downloadUrl,
                releaseNotes
            };
        } catch (error) {
            console.error('Error al comprobar actualizaciones:', error);
            throw error;
        }
    },

    /**
     * Helper to check if the remote version is strictly greater than the current version.
     * Compares versions using SemVer format (e.g. 0.11.9 vs 0.11.10).
     */
    isNewerVersion(current: string, remote: string): boolean {
        const parse = (v: string) => v.split('.').map(num => parseInt(num, 10) || 0);
        const [cMajor, cMinor, cPatch] = parse(current);
        const [rMajor, rMinor, rPatch] = parse(remote);
        
        if (rMajor > cMajor) return true;
        if (rMajor < cMajor) return false;
        
        if (rMinor > cMinor) return true;
        if (rMinor < cMinor) return false;
        
        return rPatch > cPatch;
    }
};
