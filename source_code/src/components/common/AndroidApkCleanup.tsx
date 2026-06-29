import React, { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';

const AndroidApkCleanup: React.FC = () => {
    useEffect(() => {
        // Run only on native Android
        if (Capacitor.getPlatform() !== 'android') return;

        const cleanApkFiles = async () => {
            try {
                // Request read/write permissions for public storage if needed
                const status = await Filesystem.checkPermissions();
                if (status.publicStorage !== 'granted') {
                    await Filesystem.requestPermissions();
                }

                // Directories to clean
                const dirsToClean = [
                    { dir: Directory.Cache, path: '' },
                    { dir: Directory.Documents, path: '' }
                ];

                for (const target of dirsToClean) {
                    try {
                        const result = await Filesystem.readdir({
                            directory: target.dir,
                            path: target.path
                        });

                        for (const file of result.files) {
                            const name = file.name.toLowerCase();
                            // If the file is an APK related to PCSHogar, delete it
                            if (name.includes('pcshogar') && name.endsWith('.apk')) {
                                await Filesystem.deleteFile({
                                    directory: target.dir,
                                    path: (target.path ? target.path + '/' : '') + file.name
                                });
                                console.log(`Deleted leftover APK file: ${file.name}`);
                            }
                        }
                    } catch (e) {
                        // Suppress errors for single directories so execution continues
                        console.warn(`Could not read/clean directory ${target.dir}:`, e);
                    }
                }
            } catch (error) {
                console.error('Android APK cleanup failed:', error);
            }
        };

        // Delay execution by 5 seconds to prevent performance impact on app startup
        const timer = setTimeout(cleanApkFiles, 5000);
        return () => clearTimeout(timer);
    }, []);

    return null;
};

export default AndroidApkCleanup;
