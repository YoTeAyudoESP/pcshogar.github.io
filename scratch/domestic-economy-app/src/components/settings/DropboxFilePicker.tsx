import React, { useState, useEffect } from 'react';
import { Folder, FileJson, ChevronLeft, X, Check, RefreshCw, Home } from 'lucide-react';
import { providers } from '../../services/syncService';
import { DropboxProvider } from '../../services/connectors/DropboxProvider';
import type { FileMetadata } from '../../services/connectors/SyncProvider';

interface DropboxFilePickerProps {
    onSelect: (path: string) => void;
    onClose: () => void;
    currentPath?: string;
}

const DropboxFilePicker: React.FC<DropboxFilePickerProps> = ({ onSelect, onClose, currentPath }) => {
    const [path, setPath] = useState<string>('');
    const [items, setItems] = useState<FileMetadata[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const dropbox = providers.dropbox as DropboxProvider;

    const loadFolder = async (folderPath: string) => {
        setLoading(true);
        setError(null);
        try {
            const files = await dropbox.listFiles(folderPath);
            // Sort: folders first, then files
            const sortedItems = files.sort((a, b) => {
                if (a.isDirectory === b.isDirectory) return a.name.localeCompare(b.name);
                return a.isDirectory ? -1 : 1;
            });
            setItems(sortedItems);
            setPath(folderPath);
        } catch (e: any) {
            setError(e.message || 'Error al cargar carpeta');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Try to start from current path's directory if available
        let startPath = '';
        if (currentPath && currentPath.includes('/')) {
            startPath = currentPath.substring(0, currentPath.lastIndexOf('/'));
        }
        loadFolder(startPath);
    }, []);

    const handleBack = () => {
        if (!path) return;
        const parentPath = path.substring(0, path.lastIndexOf('/')) || '';
        loadFolder(parentPath);
    };

    const handleSelectFolder = () => {
        const fullPath = path ? `${path}/pcshogar_db.json` : '/pcshogar_db.json';
        onSelect(fullPath);
    };

    const handleSelectFile = (file: FileMetadata) => {
        onSelect(file.path);
    };

    return (
        <div className="modal-overlay" style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            backdropFilter: 'blur(5px)'
        }}>
            <div className="glass-panel" style={{
                width: '95%',
                maxWidth: '500px',
                maxHeight: '90vh',
                display: 'flex',
                flexDirection: 'column',
                padding: '1.25rem',
                position: 'relative',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
                margin: 'auto'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                    <h3 style={{ margin: 0 }}>Explorador de Dropbox</h3>
                    <button onClick={onClose} className="btn-icon">
                        <X size={20} />
                    </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', background: 'rgba(255,255,255,0.05)', padding: '0.5rem', borderRadius: 'var(--radius-md)', overflowX: 'auto' }}>
                    <button onClick={() => loadFolder('')} className="btn-icon" style={{ flexShrink: 0 }}>
                        <Home size={16} />
                    </button>
                    <span style={{ fontSize: '0.8rem', opacity: 0.7, whiteSpace: 'nowrap' }}>
                        {path || '/ (Raíz)'}
                    </span>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    {loading ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '1rem', opacity: 0.6 }}>
                            <RefreshCw size={32} className="spin" />
                            <span>Cargando archivos...</span>
                        </div>
                    ) : error ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--hue-danger)' }}>
                            <p>{error}</p>
                            <button onClick={() => loadFolder(path)} className="btn-secondary">Reintentar</button>
                        </div>
                    ) : (
                        <>
                            {path !== '' && (
                                <div
                                    onClick={handleBack}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem',
                                        cursor: 'pointer', borderRadius: 'var(--radius-sm)', transition: 'background 0.2s'
                                    }}
                                    className="hover-bg"
                                >
                                    <ChevronLeft size={20} style={{ opacity: 0.6 }} />
                                    <span>.. (Volver)</span>
                                </div>
                            )}
                            {items.length === 0 ? (
                                <div style={{ padding: '3rem', textAlign: 'center', opacity: 0.5, fontSize: '0.85rem' }}>
                                    No hay archivos o carpetas aquí.<br />
                                    Puedes usar "Seleccionar esta carpeta" para crear un nuevo archivo de datos en esta ubicación.
                                </div>
                            ) : (
                                items.map(item => (
                                    <div
                                        key={item.path}
                                        onClick={() => item.isDirectory ? loadFolder(item.path) : handleSelectFile(item)}
                                        style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem',
                                            cursor: 'pointer', borderRadius: 'var(--radius-sm)', transition: 'background 0.2s'
                                        }}
                                        className="hover-bg"
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            {item.isDirectory ? <Folder size={20} color="var(--color-primary)" /> : <FileJson size={20} color="var(--color-secondary)" />}
                                            <span style={{ fontSize: '0.9rem' }}>{item.name}</span>
                                        </div>
                                        {item.name === 'pcshogar_db.json' && (
                                            <Check size={16} color="var(--color-success)" />
                                        )}
                                    </div>
                                ))
                            )}
                        </>
                    )}
                </div>

                <div style={{ display: 'flex', gap: '1rem', borderTop: 'var(--card-border)', paddingTop: '1.25rem' }}>
                    <button
                        className="btn-primary"
                        style={{ flex: 1, justifyContent: 'center' }}
                        onClick={handleSelectFolder}
                        disabled={loading}
                    >
                        Seleccionar esta carpeta
                    </button>
                    <button className="btn-secondary" onClick={onClose}>
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DropboxFilePicker;
