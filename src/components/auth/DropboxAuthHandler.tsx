
import React, { useEffect } from 'react';
import { App } from '@capacitor/app';
import { useAppSettings } from '../../contexts/AppSettingsContext';
import { DropboxService } from '../../services/dropboxService';

const DropboxAuthHandler: React.FC = () => {
    const { settings, updateSyncSettings } = useAppSettings();

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
            alert(`Dropbox conectado con éxito: ${user.email}`);
        }).catch(err => {
            console.error("Error fetching dropbox user", err);
            alert("Error al conectar con Dropbox.");
        });
    };

    useEffect(() => {
        // 1. Handle redirect if it happened in the same webview (hash)
        const hash = window.location.hash;
        if (hash && hash.includes('access_token=')) {
            const params = new URLSearchParams(hash.substring(1));
            const token = params.get('access_token');
            if (token) {
                window.history.replaceState({}, document.title, window.location.pathname);
                handleToken(token);
            }
        }

        // 2. Handle deep link (from external browser)
        const setupDeepLink = async () => {
            await App.addListener('appUrlOpen', data => {
                // The URL will be com.pcshogar.app://auth/dropbox#access_token=...
                const url = data.url;
                if (url.includes('access_token=')) {
                    const hashPart = url.split('#')[1];
                    const params = new URLSearchParams(hashPart);
                    const token = params.get('access_token');
                    if (token) {
                        handleToken(token);
                    }
                }
            });
        };

        setupDeepLink();

        return () => {
            App.removeAllListeners();
        };
    }, [updateSyncSettings, settings.sync.dropboxPath]);

    return null; // This component doesn't render anything
};

export default DropboxAuthHandler;
