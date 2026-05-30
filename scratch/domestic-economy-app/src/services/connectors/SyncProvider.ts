export interface FileMetadata {
    name: string;
    path: string;
    size: number;
    mtime: number;
    isDirectory: boolean;
}

export interface SyncProvider {
    name: string; // 'dropbox', 'gdrive', 'smb', 'local'

    // Authentication
    isAuthenticated(): Promise<boolean>;
    authenticate(): Promise<void>;
    disconnect(): Promise<void>;

    // Operations
    listFiles(path: string): Promise<FileMetadata[]>;
    uploadFile(path: string, content: string): Promise<void>;
    downloadFile(path: string): Promise<string>;

    // Helper functionality
    getAuthUrl?(): string;
    handleCallback?(url: string): Promise<void>;
}
