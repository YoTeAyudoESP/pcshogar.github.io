
import React, { useEffect } from 'react';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { useAppSettings } from '../../contexts/AppSettingsContext';
import { DropboxService } from '../../services/dropboxService';
import { useToast } from '../../contexts/ToastContext';

const DropboxAuthHandler: React.FC = () => {
    const { settings, updateSyncSettings } = useAppSettings();
    const { showToast } = useToast();

    const handleToken = (token: string) => {
        // Initialize service and get user info
        DropboxService.init(token, settings.sync.dropboxPath);
        DropboxService.getUserInfo().then(user => {
            updateSyncSettings({
                dropboxToken: token,
                dropboxUserEmail: user.email,
                enabled: true,
                type: 'dropbox'
            });
            showToast(`Dropbox conectado con éxito: ${user.email}`, 'success');
        }).catch(err => {
            console.error("Error fetching dropbox user", err);
            showToast("Error al conectar con Dropbox.", 'error');
        });
    };

    useEffect(() => {
        // 1. Handle redirect if it happened in the same webview (hash)
        const hash = window.location.hash;
        if (hash && hash.includes('access_token=')) {
            const params = new URLSearchParams(hash.substring(1));
            const token = params.get('access_token');
            const state = params.get('state');
            
            // Ignore if this token belongs to Google Drive
            if (token && state !== 'googledrive' && state !== 'googledrive-android' && !hash.includes('googledrive')) {
                window.history.replaceState({}, document.title, window.location.pathname);
                handleToken(token);
            }
        }

        // 2. Handle deep link (from external browser)
        let isMounted = true;
        let deepLinkListener: any = null;

        const setupDeepLink = async () => {
            if (Capacitor.isNativePlatform()) {
                const listener = await App.addListener('appUrlOpen', data => {
                    // The URL will be com.pcshogar.app://auth/dropbox#access_token=...
                    const url = data.url;
                    if (url.includes('access_token=')) {
                        // Ignore if this token belongs to Google Drive
                        if (url.includes('auth/googledrive') || url.includes('state=googledrive') || url.includes('googledrive')) {
                            return;
                        }
                        const hashPart = url.split('#')[1];
                        const params = new URLSearchParams(hashPart);
                        const token = params.get('access_token');
                        if (token) {
                            handleToken(token);
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
    }, [updateSyncSettings, settings.sync.dropboxPath]);

    return null; // This component doesn't render anything
};

export default DropboxAuthHandler;
