import { app, BrowserWindow, shell, ipcMain, session } from 'electron';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import fs from 'fs';
import os from 'os';
import https from 'https';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function createWindow() {
    // Clear the cache to prevent service worker update loops
    session.defaultSession.clearStorageData({
        storages: ['serviceworkers', 'caches']
    }).catch(err => console.error('Failed to clear session cache:', err));

    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        icon: path.join(__dirname, '../dist/Icono_PCSHogar.png'),
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
    });

    // IPC: expose the real installed app version to the renderer
    ipcMain.handle('get-app-version', () => {
        return app.getVersion();
    });

    // IPC: open a URL in the system default browser
    ipcMain.handle('open-external', (_event, url) => {
        shell.openExternal(url);
    });

    // IPC: open the bundled manual in the default browser
    ipcMain.handle('open-manual', (_event) => {
        try {
            const manualPath = path.join(__dirname, '../dist/manual.html');
            const tempManualPath = path.join(os.tmpdir(), 'manual_pcshogar.html');
            
            // Read from ASAR and write to temp folder so default browser can open it
            const htmlContent = fs.readFileSync(manualPath, 'utf8');
            fs.writeFileSync(tempManualPath, htmlContent, 'utf8');
            
            shell.openExternal(pathToFileURL(tempManualPath).href);
        } catch (error) {
            console.error('Failed to open manual:', error);
        }
    });

    // IPC: connect with an OAuth provider in an overlay window and intercept the token redirect
    const handleOAuth = async (_event, authUrl) => {
        return new Promise((resolve, reject) => {
            const authWindow = new BrowserWindow({
                width: 600,
                height: 700,
                show: true,
                webPreferences: {
                    nodeIntegration: false,
                    contextIsolation: true,
                },
            });

            authWindow.loadURL(authUrl);

            const handleCallback = (url) => {
                if (url.includes('access_token=')) {
                    try {
                        const hashPart = url.split('#')[1];
                        const params = new URLSearchParams(hashPart);
                        const token = params.get('access_token');
                        if (token) {
                            resolve(token);
                        } else {
                            reject(new Error('No se pudo encontrar el token de acceso.'));
                        }
                    } catch (err) {
                        reject(err);
                    }
                    authWindow.destroy();
                }
            };

            authWindow.webContents.on('will-navigate', (_e, url) => {
                handleCallback(url);
            });

            authWindow.webContents.on('did-redirect-navigation', (_e, url) => {
                handleCallback(url);
            });

            authWindow.on('closed', () => {
                reject(new Error('Ventana de autenticación cerrada por el usuario.'));
            });
        });
    };

    ipcMain.handle('connect-dropbox', handleOAuth);
    ipcMain.handle('connect-oauth', handleOAuth);

    // IPC: save a base64-encoded PDF to the user's Downloads folder
    ipcMain.handle('save-pdf', async (_event, { base64, filename }) => {
        try {
            const downloadsPath = app.getPath('downloads');
            const filePath = path.join(downloadsPath, filename);
            const buffer = Buffer.from(base64, 'base64');
            fs.writeFileSync(filePath, buffer);
            return { success: true, path: filePath };
        } catch (error) {
            console.error('Failed to save PDF:', error);
            return { success: false, error: String(error) };
        }
    });

    // IPC: open a local file with the system default application
    ipcMain.handle('open-file', async (_event, filePath) => {
        try {
            await shell.openPath(filePath);
            return { success: true };
        } catch (error) {
            console.error('Failed to open file:', error);
            return { success: false, error: String(error) };
        }
    });


    // IPC: download and run installer for updates
    ipcMain.handle('download-and-install-update', async (event, url) => {
        return new Promise((resolve, reject) => {
            const tempPath = path.join(app.getPath('temp'), 'PCSHogar_Setup_Latest.exe');
            
            // Delete old file if it exists to avoid corrupt/locked installer problems
            if (fs.existsSync(tempPath)) {
                try {
                    fs.unlinkSync(tempPath);
                } catch (e) {
                    console.error('Failed to delete old installer:', e);
                }
            }

            const file = fs.createWriteStream(tempPath);
            
            const downloadFile = (downloadUrl) => {
                https.get(downloadUrl, (response) => {
                    if (response.statusCode === 302 || response.statusCode === 301) {
                        downloadFile(response.headers.location);
                        return;
                    }
                    
                    if (response.statusCode !== 200) {
                        reject(new Error(`Failed to download: Status Code ${response.statusCode}`));
                        return;
                    }
                    
                    const totalBytes = parseInt(response.headers['content-length'], 10) || 0;
                    let downloadedBytes = 0;
                    
                    response.on('data', (chunk) => {
                        downloadedBytes += chunk.length;
                        if (totalBytes > 0) {
                            const progress = Math.round((downloadedBytes / totalBytes) * 100);
                            event.sender.send('download-progress', progress);
                        }
                    });
                    
                    response.pipe(file);
                    
                    file.on('finish', () => {
                        file.close();
                        shell.openPath(tempPath).then(() => {
                            // Delay slightly before quitting to make sure installation starts cleanly
                            setTimeout(() => {
                                app.quit();
                            }, 1000);
                            resolve(true);
                        }).catch(err => {
                            reject(err);
                        });
                    });
                }).on('error', (err) => {
                    fs.unlink(tempPath, () => {});
                    reject(err);
                });
            };
            
            downloadFile(url);
        });
    });

    if (process.env.VITE_DEV_SERVER_URL) {
        win.loadURL(process.env.VITE_DEV_SERVER_URL);
    } else {
        // In production, load the built index.html
        win.loadFile(path.join(__dirname, '../dist/index.html'));
    }
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
