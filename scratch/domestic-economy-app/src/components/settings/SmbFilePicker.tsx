import React, { useState, useEffect } from 'react';
import { Folder, FileJson, ChevronLeft, X, RefreshCw, Home, Server } from 'lucide-react';
import { platformBridge } from '../../services/electronBridge';

interface SmbFilePickerProps {
    onSelect: (path: string) => void;
    onClose: () => void;
    config: {
        share: string;
        username?: string;
        password?: string;
        domain?: string;
    };
}

const SmbFilePicker: React.FC<SmbFilePickerProps> = ({ onSelect, onClose, config }) => {
    // Start with the base share but ensure it's normalized as smb://server/
    const [currentPath, setCurrentPath] = useState<string>(() => {
        let p = config.share.replace(/\\/g, '/');
        if (!p.startsWith('smb://')) {
            p = 'smb://' + p.replace(/^\/+/, '');
        }
        return p.endsWith('/') ? p : p + '/';
    });
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const loadFolder = async (path: string) => {
        setLoading(true);
        setError(null);
        try {
            let normalizedPath = path.replace(/\\/g, '/');
            if (!normalizedPath.startsWith('smb://')) {
                normalizedPath = 'smb://' + normalizedPath.replace(/^\/+/, '');
            }
            if (!normalizedPath.endsWith('/')) {
                normalizedPath += '/';
            }

            const result = await platformBridge.smbList(normalizedPath);

            if (result.success && result.files) {
                const sortedItems = result.files.sort((a: any, b: any) => {
                    if (a.isDirectory === b.isDirectory) return a.name.localeCompare(b.name);
                    return a.isDirectory ? -1 : 1;
                });
                setItems(sortedItems);
                setCurrentPath(normalizedPath);
            } else {
                throw new Error(result.error || 'Error al listar el NAS');
            }
        } catch (e: any) {
            setError(e.message || 'Error al conectar con el servidor SMB');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadFolder(currentPath);
    }, []);

    const handleBack = () => {
        let p = currentPath;
        if (p.endsWith('/')) p = p.slice(0, -1);

        const lastSlash = p.lastIndexOf('/');
        if (lastSlash < 6) return; // Cannot go above smb://host/

        const parentPath = p.substring(0, lastSlash) + '/';
        loadFolder(parentPath);
    };

    const handleSelectFolder = () => {
        onSelect(currentPath.replace('smb://', '//'));
    };

    const handleSelectFile = (file: any) => {
        let path = file.path;
        if (!path.endsWith('/') && file.isDirectory) path += '/';

        if (file.isDirectory) {
            loadFolder(path);
        } else {
            // If they select a file, get its directory
            const dir = path.substring(0, path.lastIndexOf('/') + 1);
            onSelect(dir.replace('smb://', '//'));
        }
    };

    // Breadcrumbs logic
    const getBreadcrumbs = () => {
        const parts = currentPath.replace('smb://', '').split('/').filter(Boolean);
        return parts;
    };

    return (
        <div className="modal-overlay" style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.9)',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            zIndex: 9999,
            backdropFilter: 'blur(10px)'
        }}>
            <div className="glass-panel" style={{
                width: '100%',
                maxWidth: '600px',
                maxHeight: '95vh',
                height: 'auto',
                borderTopLeftRadius: '28px',
                borderTopRightRadius: '28px',
                borderBottomLeftRadius: 0,
                borderBottomRightRadius: 0,
                display: 'flex',
                flexDirection: 'column',
                padding: '0',
                overflow: 'hidden',
                background: 'linear-gradient(180deg, #1a1a1a 0%, #121212 100%)',
                boxShadow: '0 -20px 60px rgba(0,0,0,0.8)'
            }}>
                {/* Header Section */}
                <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', position: 'relative' }}>
                    <div style={{
                        width: '36px', height: '4px', background: 'rgba(255,255,255,0.2)',
                        borderRadius: '2px', position: 'absolute', top: '8px', left: '50%',
                        transform: 'translateX(-50%)'
                    }} />

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem' }}>
                        <button
                            onClick={handleBack}
                            className="btn-icon"
                            disabled={getBreadcrumbs().length <= 1 || loading}
                            style={{ opacity: loading || getBreadcrumbs().length <= 1 ? 0.3 : 1 }}
                        >
                            <ChevronLeft size={24} />
                        </button>
                        <div style={{ flex: 1, overflow: 'hidden' }}>
                            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Explorador NAS</h3>
                            <div style={{ fontSize: '0.7rem', opacity: 0.5, marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {currentPath.replace('smb://', '//')}
                            </div>
                        </div>
                        <button onClick={onClose} className="btn-icon">
                            <X size={24} />
                        </button>
                    </div>
                </div>

                {/* Path / Breadcrumbs */}
                <div style={{
                    padding: '0.75rem 1.5rem',
                    background: 'rgba(255,255,255,0.02)',
                    display: 'flex',
                    gap: '0.5rem',
                    overflowX: 'auto',
                    scrollbarWidth: 'none'
                }}>
                    <button onClick={() => {
                        const host = currentPath.replace('smb://', '').split('/')[0];
                        loadFolder(`smb://${host}/`);
                    }}
                        className="btn-icon" style={{ flexShrink: 0, padding: '4px' }}>
                        <Home size={14} />
                    </button>
                    {getBreadcrumbs().map((part, i) => (
                        <React.Fragment key={i}>
                            <span style={{ opacity: 0.3 }}>/</span>
                            <span style={{ fontSize: '0.8rem', opacity: i === getBreadcrumbs().length - 1 ? 1 : 0.6, whiteSpace: 'nowrap' }}>
                                {part}
                            </span>
                        </React.Fragment>
                    ))}
                </div>

                {/* Content */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
                    {loading ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '1rem', opacity: 0.6 }}>
                            <RefreshCw size={36} className="spin text-primary" />
                            <span style={{ fontSize: '0.9rem' }}>Explorando Red...</span>
                        </div>
                    ) : error ? (
                        <div style={{ padding: '3rem 2rem', textAlign: 'center' }}>
                            <div style={{ color: '#ff5252', marginBottom: '1rem' }}>
                                <Server size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                                <p style={{ fontSize: '0.9rem' }}>{error}</p>
                            </div>
                            <button onClick={() => loadFolder(currentPath)} className="btn-secondary" style={{ padding: '0.6rem 2rem' }}>
                                Reintentar
                            </button>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            {items.length === 0 ? (
                                <div style={{ padding: '5rem 2rem', textAlign: 'center', opacity: 0.4 }}>
                                    <Folder size={48} style={{ marginBottom: '1rem', opacity: 0.2 }} />
                                    <p>Esta ubicación está vacía</p>
                                </div>
                            ) : (
                                items.map(item => (
                                    <div
                                        key={item.path}
                                        onClick={() => handleSelectFile(item)}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.25rem',
                                            cursor: 'pointer', borderRadius: 'var(--radius-lg)', margin: '2px 0',
                                            transition: 'all 0.2s', borderBottom: '1px solid rgba(255,255,255,0.03)'
                                        }}
                                        className="hover-bg"
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', borderRadius: '12px', background: item.isDirectory ? 'rgba(255, 193, 7, 0.1)' : 'rgba(74, 144, 226, 0.1)' }}>
                                            {item.isDirectory ? <Folder size={22} color="#ffc107" /> : <FileJson size={22} color="#4a90e2" />}
                                        </div>
                                        <div style={{ flex: 1, overflow: 'hidden' }}>
                                            <div style={{ fontSize: '0.95rem', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {item.name}
                                            </div>
                                            {!item.isDirectory && (
                                                <div style={{ fontSize: '0.7rem', opacity: 0.4 }}>
                                                    {(item.size / 1024).toFixed(1)} KB
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div style={{
                    padding: '1.5rem',
                    background: 'rgba(0,0,0,0.3)',
                    borderTop: '1px solid rgba(255,255,255,0.05)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem'
                }}>
                    <button
                        className="btn-primary"
                        style={{ width: '100%', height: '52px', justifyContent: 'center', fontSize: '1rem' }}
                        onClick={handleSelectFolder}
                        disabled={loading || !!error}
                    >
                        Seleccionar esta carpeta
                    </button>
                    <button className="btn-secondary" style={{ width: '100%', height: '48px', justifyContent: 'center', opacity: 0.7 }} onClick={onClose}>
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SmbFilePicker;
