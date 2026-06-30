const fs = require('fs');

function fixPicker(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');

    // Add state variables
    if (!content.includes('isCreatingFolder')) {
        content = content.replace('const [error, setError] = useState<string | null>(null);', 
            'const [error, setError] = useState<string | null>(null);\n    const [isCreatingFolder, setIsCreatingFolder] = useState(false);\n    const [newFolderName, setNewFolderName] = useState("");');
    }

    const serviceName = filePath.includes('Dropbox') ? 'DropboxService' : 'GoogleDriveService';
    const createCall = filePath.includes('Dropbox') ? `await DropboxService.createFolder(path, newFolderName.trim());` : `await GoogleDriveService.createFolder(newFolderName.trim(), path);`;

    const newHandleCreate = `
    const handleCreateFolder = () => {
        setIsCreatingFolder(true);
        setNewFolderName("");
    };

    const confirmCreateFolder = async () => {
        if (!newFolderName.trim()) {
            setIsCreatingFolder(false);
            return;
        }
        setLoading(true);
        setIsCreatingFolder(false);
        try {
            ${createCall}
            await loadFolders(path);
        } catch (err) {
            console.error("Error creating folder:", err);
            setError("Error al crear la carpeta.");
            setLoading(false);
        }
    };

    const cancelCreateFolder = () => {
        setIsCreatingFolder(false);
        setNewFolderName("");
    };
    `;
    
    // Replace the old handleCreateFolder
    content = content.replace(/const handleCreateFolder = async \(\) => \{[\s\S]*?setError\('Error al crear la carpeta\.'\);\s*setLoading\(false\);\s*\}\s*\};/, newHandleCreate);

    // Inject the UI for creating a folder inside the listStyle
    const createFolderUI = `
                    {isCreatingFolder && (
                        <div style={{ ...itemStyle(true), background: 'var(--panel-bg-2)', cursor: 'default' }}>
                            <FolderPlus size={18} color="var(--color-primary)" />
                            <input 
                                autoFocus
                                type="text"
                                value={newFolderName}
                                onChange={(e) => setNewFolderName(e.target.value)}
                                placeholder="Nombre de la carpeta..."
                                style={{
                                    flex: 1,
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'white',
                                    outline: 'none',
                                    fontSize: '1rem'
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') confirmCreateFolder();
                                    if (e.key === 'Escape') cancelCreateFolder();
                                }}
                            />
                            <button onClick={confirmCreateFolder} style={{ background: 'transparent', border: 'none', color: '#10b981', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                                <Check size={18} />
                            </button>
                            <button onClick={cancelCreateFolder} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                                <X size={18} />
                            </button>
                        </div>
                    )}
    `;

    // Inject right after <div style={listStyle}>
    if (!content.includes('isCreatingFolder && (')) {
        content = content.replace('<div style={listStyle}>', '<div style={listStyle}>\n' + createFolderUI);
    }

    fs.writeFileSync(filePath, content, 'utf8');
}

fixPicker('src/components/settings/DropboxFolderPicker.tsx');
fixPicker('src/components/settings/GoogleDriveFolderPicker.tsx');
