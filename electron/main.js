import { app, BrowserWindow, shell, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import fs from 'fs';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        icon: path.join(__dirname, '../dist/Icono_PCSHogar.png'),
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
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
