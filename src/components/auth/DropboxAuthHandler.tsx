
import React, { useEffect } from 'react';
import { useAppSettings } from '../../contexts/AppSettingsContext';
import { DropboxService } from '../../services/dropboxService';

const DropboxAuthHandler: React.FC = () => {
    const { updateSyncSettings } = useAppSettings();

    useEffect(() => {
        const hash = window.location.hash;
        if (hash && hash.includes('access_token=')) {
            const params = new URLSearchParams(hash.substring(1));
            const token = params.get('access_token');
            
            if (token) {
                // Clear hash
                window.history.replaceState({}, document.title, window.location.pathname);
                
                // Initialize service and get user info
                DropboxService.init(token);
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
            }
        }
    }, [updateSyncSettings]);

    return null; // This component doesn't render anything
};

export default DropboxAuthHandler;
