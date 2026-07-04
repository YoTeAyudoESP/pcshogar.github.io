import React, { useState, useEffect } from 'react';
import { Folder, ChevronRight, ChevronLeft, Check, Search, X } from 'lucide-react';
import { DropboxService } from '../../services/dropboxService';

interface DropboxFolderPickerProps {
    currentPath: string;
    fileName: string; // e.g. 'pcshogar_data.json' or 'pcshogar_comunidad.json'
    onSelect: (path: string) => void;
    onClose: () => void;
}

const DropboxFolderPicker: React.FC<DropboxFolderPickerProps> = ({ currentPath, fileName, onSelect, onClose }) => {
    const [path, setPath] = useState('');
    const [folders, setFolders] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadFolders(path);
    }, [path]);

    const loadFolders = async (targetPath: string) => {
        setLoading(true);
        setError(null);
        try {
            const folderList = await DropboxService.listFolders(targetPath);
            setFolders(folderList);
        } catch (err) {
            console.error("Error loading Dropbox folders:", err);
            setError('Error al cargar las carpetas.');
        } finally {
            setLoading(false);
        }
    };

    const handleNavigate = (folderPath: string) => {
        setPath(folderPath);
    };

    const handleGoBack = () => {
        if (path === '') return;
        const parts = path.split('/');
        parts.pop();
        setPath(parts.join('/'));
    };

    const handleSelectCurrent = () => {
        // Build the final path using the economy's own file name (never hardcoded)
        const safeFileName = fileName || 'pcshogar_data.json';
        const finalPath = path === '' ? `/${safeFileName}` : `${path}/${safeFileName}`;
        onSelect(finalPath);
        onClose();
    };

    const modalStyle: React.CSSProperties = {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem'
    };

    const contentStyle: React.CSSProperties = {
        background: '#1a1a1a',
        width: '100%',
        maxWidth: '500px',
        borderRadius: '1.5rem',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: '80vh',
        overflow: 'hidden',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
    };

    const headerStyle: React.CSSProperties = {
        padding: '1.5rem',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
    };

    const listStyle: React.CSSProperties = {
        flex: 1,
        overflowY: 'auto',
        padding: '1rem'
    };

    const itemStyle = (isFolder: boolean): React.CSSProperties => ({
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        padding: '0.8rem 1rem',
        borderRadius: '0.75rem',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        background: 'rgba(255, 255, 255, 0.02)',
        marginBottom: '0.5rem',
        border: '1px solid transparent'
    });

    return (
        <div style={modalStyle}>
            <div style={contentStyle}>
                <div style={headerStyle}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Seleccionar Carpeta</h3>
                        <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.5 }}>{path || 'Raíz (Dropbox)'}</p>
                    </div>
                    <button 
                        onClick={onClose}
                        style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', padding: '0.5rem' }}
                    >
                        <X size={20} />
                    </button>
                </div>

                <div style={listStyle}>
                    {path !== '' && (
                        <div 
                            style={{ ...itemStyle(true), background: 'rgba(255, 255, 255, 0.05)' }}
                            onClick={handleGoBack}
                        >
                            <ChevronLeft size={18} />
                            <span style={{ fontWeight: 600 }}>Volver</span>
                        </div>
                    )}

                    {loading ? (
                        <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.5 }}>Cargando carpetas...</div>
                    ) : error ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: '#ef4444' }}>{error}</div>
                    ) : folders.length === 0 ? (
                        <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.5 }}>No hay subcarpetas aquí.</div>
                    ) : (
                        folders.map(f => (
                            <div 
                                key={f.id} 
                                style={itemStyle(true)}
                                onClick={() => handleNavigate(f.path_lower)}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)'}
                            >
                                <Folder size={18} color="var(--color-primary)" />
                                <span style={{ flex: 1 }}>{f.name}</span>
                                <ChevronRight size={16} opacity={0.3} />
                            </div>
                        ))
                    )}
                </div>

                <div style={{ padding: '1.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.05)', display: 'flex', gap: '1rem' }}>
                    <button 
                        onClick={handleSelectCurrent}
                        style={{ 
                            flex: 1, 
                            background: 'var(--color-primary)', 
                            color: 'white', 
                            border: 'none', 
                            padding: '0.8rem', 
                            borderRadius: '0.75rem', 
                            fontWeight: 700, 
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem'
                        }}
                    >
                        <Check size={18} /> Usar esta carpeta
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DropboxFolderPicker;
