const { app, BrowserWindow, ipcMain, dialog, Menu, shell } = require('electron');
const path = require('path');
const fs = require('fs');

function setSpanishMenu() {
    const template = [
        {
            label: 'Archivo',
            submenu: [
                { label: 'Salir', role: 'quit' }
            ]
        },
        {
            label: 'Edición',
            submenu: [
                { label: 'Deshacer', role: 'undo' },
                { label: 'Rehacer', role: 'redo' },
                { type: 'separator' },
                { label: 'Cortar', role: 'cut' },
                { label: 'Copiar', role: 'copy' },
                { label: 'Pegar', role: 'paste' },
                { label: 'Seleccionar todo', role: 'selectAll' }
            ]
        },
        {
            label: 'Ver',
            submenu: [
                { label: 'Recargar', role: 'reload' },
                { label: 'Forzar recarga', role: 'forceReload' },
                { label: 'Herramientas de desarrollo', role: 'toggleDevTools' },
                { type: 'separator' },
                { label: 'Restablecer zoom', role: 'resetZoom' },
                { label: 'Acercar', role: 'zoomIn' },
                { label: 'Alejar', role: 'zoomOut' },
                { type: 'separator' },
                { label: 'Pantalla completa', role: 'togglefullscreen' }
            ]
        },
        {
            label: 'Ventana',
            submenu: [
                { label: 'Minimizar', role: 'minimize' },
                { label: 'Cerrar', role: 'close' }
            ]
        },
        {
            label: 'Ayuda',
            submenu: [
                {
                    label: 'Soporte',
                    click: async () => {
                        await shell.openExternal('https://github.com/pablo-yta/pcs-hogar');
                    }
                }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    app.quit();
} else {
    // Protocol Handler Registration
    if (process.defaultApp) {
        if (process.argv.length >= 2) {
            app.setAsDefaultProtocolClient('pcshogar', process.execPath, [path.resolve(process.argv[1])]);
        }
    } else {
        app.setAsDefaultProtocolClient('pcshogar');
    }

    app.on('second-instance', (event, commandLine, workingDirectory) => {
        // Someone tried to run a second instance, we should focus our window.
        // Find the window
        const win = BrowserWindow.getAllWindows()[0];
        if (win) {
            if (win.isMinimized()) win.restore();
            win.focus();

            // Handle Deep Link on Windows (it comes in commandLine)
            const url = commandLine.find(arg => arg.startsWith('pcshogar://'));
            if (url) {
                console.log('Received deep link via second-instance:', url);
                win.webContents.send('deep-link', url);
            }
        }
    });

    app.whenReady().then(() => {
        setSpanishMenu();
        createWindow();

        app.on('activate', () => {
            if (BrowserWindow.getAllWindows().length === 0) {
                createWindow();
            }
        });

        // Handle Open-URL for macOS (and sometimes Windows depending on config)
        app.on('open-url', (event, url) => {
            event.preventDefault();
            const win = BrowserWindow.getAllWindows()[0];
            if (win) {
                win.webContents.send('deep-link', url);
            }
        });
    });
}

function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
        icon: path.join(__dirname, '../public/logo.jpg')
    });

    if (process.env.VITE_DEV_SERVER_URL) {
        win.loadURL(process.env.VITE_DEV_SERVER_URL);
    } else {
        win.loadFile(path.join(__dirname, '../dist/index.html'));
    }
}

// IPC Handlers
ipcMain.handle('select-directory', async () => {
    const result = await dialog.showOpenDialog({
        properties: ['openDirectory']
    });
    return result.filePaths[0];
});

ipcMain.handle('select-save-path', async (event, { defaultPath, title, filters }) => {
    const result = await dialog.showSaveDialog({
        defaultPath,
        title,
        filters
    });
    return result.filePath;
});

ipcMain.handle('save-file', async (event, { filePath, content }) => {
    try {
        fs.writeFileSync(filePath, content, 'utf8');
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('pick-file', async () => {
    const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [
            { name: 'JSON', extensions: ['json'] },
            { name: 'Todos los archivos', extensions: ['*'] }
        ]
    });

    if (result.canceled || result.filePaths.length === 0) return undefined;

    const filePath = result.filePaths[0];
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const stats = fs.statSync(filePath);
        return {
            path: filePath,
            content: content,
            metadata: {
                size: stats.size,
                mtime: stats.mtime.getTime()
            }
        };
    } catch (e) {
        console.error('Error reading picked file:', e);
        return undefined;
    }
});
ipcMain.handle('read-file', async (event, filePath) => {
    try {
        if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf8');
            const stats = fs.statSync(filePath);
            return { success: true, content, metadata: { size: stats.size, mtime: stats.mtime.getTime() } };
        }
        return { success: false, error: 'File not found' };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('open-external', async (event, url) => {
    await shell.openExternal(url);
    return { success: true };
});

// SMB Handlers
let smbClient = null;
const SMB2 = require('smb2');

ipcMain.handle('smb-connect', async (event, config) => {
    return new Promise((resolve) => {
        try {
            // SMB2 requires share in the format \\IP\Share
            // But the library takes 'share' as a separate config
            // We assume config has { share: '\\\\192.168.1.X\\ShareName', domain, username, password }
            const sharePath = config.share.replace(/\\/g, '/'); // Normalize slashes just in case

            smbClient = new SMB2({
                share: sharePath,
                domain: config.domain || 'WORKGROUP',
                username: config.username,
                password: config.password
            });

            // Test connection by listing root
            smbClient.readdir('', (err, files) => {
                if (err) {
                    smbClient = null;
                    resolve({ success: false, error: err.message || 'Connection failed' });
                } else {
                    resolve({ success: true });
                }
            });
        } catch (e) {
            resolve({ success: false, error: e.message });
        }
    });
});

ipcMain.handle('smb-disconnect', async () => {
    if (smbClient) {
        // smb2 lib doesn't have an explict disconnect, we just nullify
        smbClient = null;
    }
    return { success: true };
});

ipcMain.handle('smb-list', async (event, path) => {
    return new Promise((resolve) => {
        if (!smbClient) return resolve({ success: false, error: 'Not connected' });

        // normalize path: SMB2 expects backslashes or just name
        const p = path === '/' ? '' : path.replace(/\//g, '\\');

        smbClient.readdir(p, (err, files) => {
            if (err) return resolve({ success: false, error: err.message });

            // We need stats to know if directory. This is slow for many files.
            // For now, let's just return names. Ideally we'd loop and stat.
            // SMB2 'readdir' just returns strings.
            // We'll proceed with a simple list for compatibility.
            // If we need true 'isDirectory', we have to call 'stat' on each.

            // Parallel stat lookup
            const promises = files.map(file => new Promise(resStr => {
                const fullPath = p ? `${p}\\${file}` : file;
                smbClient.stat(fullPath, (errStat, stats) => {
                    resStr({
                        name: file,
                        path: fullPath,
                        isDirectory: errStat ? false : stats.isDirectory(), // basic check
                        size: stats ? stats.size : 0,
                        mtime: stats ? stats.mtime.getTime() : Date.now()
                    });
                });
            }));

            Promise.all(promises).then(results => {
                resolve({ success: true, files: results });
            });
        });
    });
});

ipcMain.handle('smb-read', async (event, path) => {
    return new Promise((resolve) => {
        if (!smbClient) return resolve({ success: false, error: 'Not connected' });
        const p = path.replace(/\//g, '\\');
        smbClient.readFile(p, 'utf8', (err, data) => {
            if (err) resolve({ success: false, error: err.message });
            else resolve({ success: true, content: data });
        });
    });
});

ipcMain.handle('smb-write', async (event, { path, content }) => {
    return new Promise((resolve) => {
        if (!smbClient) return resolve({ success: false, error: 'Not connected' });
        const p = path.replace(/\//g, '\\');
        smbClient.writeFile(p, content, (err) => {
            if (err) resolve({ success: false, error: err.message });
            else resolve({ success: true });
        });
    });
});

// app.whenReady is handled above within the lock check

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
