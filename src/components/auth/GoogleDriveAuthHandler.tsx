import React, { useEffect } from 'react';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { useAppSettings } from '../../contexts/AppSettingsContext';
import { GoogleDriveService } from '../../services/googleDriveService';
import { useToast } from '../../contexts/ToastContext';

const GoogleDriveAuthHandler: React.FC = () => {
    const { settings, updateSyncSettings } = useAppSettings();
    const { showToast } = useToast();

    const handleToken = (token: string) => {
        // Initialize Google Drive service
        GoogleDriveService.init(token, settings.sync.googledrivePath || 'pcshogar_data.json');
        
        // Fetch user email and save credentials
        GoogleDriveService.getUserInfo().then(user => {
            updateSyncSettings({
                googledriveToken: token,
                googledriveUserEmail: user.email,
                enabled: true,
                type: 'googledrive',
                // Clear dropbox settings if they were connected
                dropboxToken: undefined,
                dropboxUserEmail: undefined
            });
            showToast(`Google Drive conectado con éxito: ${user.email}`, 'success');
        }).catch(err => {
            console.error("Error fetching Google Drive user info", err);
            showToast("Error al conectar con Google Drive.", 'error');
        });
    };

    useEffect(() => {
        // 1. Handle redirect in the same webview (hash)
        const hash = window.location.hash;
        if (hash && hash.includes('access_token=')) {
            const params = new URLSearchParams(hash.substring(1));
            const token = params.get('access_token');
            const state = params.get('state');
            
            // Check if this token belongs to Google Drive
            if (token && (state === 'googledrive' || state === 'googledrive-android' || window.location.hash.includes('googledrive'))) {
                // Clear the hash in the browser address bar
                window.history.replaceState({}, document.title, window.location.pathname);
                handleToken(token);
            }
        }

        // 2. Handle native deep link (from external browser)
        let isMounted = true;
        let deepLinkListener: any = null;

        const setupDeepLink = async () => {
            if (Capacitor.isNativePlatform()) {
                const listener = await App.addListener('appUrlOpen', data => {
                    const url = data.url;
                    // Check if deep link is com.pcshogar.app://auth/googledrive
                    if (url.includes('auth/googledrive') || (url.includes('googledrive') && url.includes('access_token='))) {
                        const hashPart = url.split('#')[1];
                        if (hashPart) {
                            const params = new URLSearchParams(hashPart);
                            const token = params.get('access_token');
                            if (token) {
                                handleToken(token);
                            }
                        }
                    }
                });
                if (!isMounted) {
                    listener.remove();
                } else {
                    deepLinkListener = listener;
                }
            }
        };

        setupDeepLink();

        return () => {
            isMounted = false;
            if (deepLinkListener) {
                deepLinkListener.remove();
            }
        };
    }, [updateSyncSettings, settings.sync.googledrivePath]);

    return null;
};

export default GoogleDriveAuthHandler;
