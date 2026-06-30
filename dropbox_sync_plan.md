# Dropbox Data Synchronization Plan (PCSHogar) - IMPLEMENTED (v0.7.0)

## Objective
Enable multi-device synchronization using Dropbox as a cloud provider, allowing multiple users to share and manage the same financial data file (`pcshogar_data.json`).

## Architecture
- **Storage**: A single JSON file in the user's Dropbox account.
- **Service**: `DropboxService.ts` handles API calls and merging.
- **Authentication**: OAuth2 (PKCE/Token flow) integrated with `DropboxAuthHandler.tsx`.
- **Conflict Resolution**: Smart merge based on `updatedAt` timestamps for every record.

## Implemented Components
1. **Dropbox SDK Integration**: Installed `dropbox` package.
2. **Sync Settings**: Added `dropboxToken` and `dropboxUserEmail` to `SyncSettings`.
3. **DropboxService**:
   - `getAuthUrl()`: Generates the login link.
   - `uploadData()` / `downloadData()`: Cloud file operations.
   - `mergeData()`: Intelligent reconciliation of local and remote state.
   - `sync()`: Orchestrates the full process (Download -> Merge -> Upload -> Import).
4. **UI Integration**:
   - `AppSettingsView`: Added connection button, status display, and manual sync.
   - `DropboxAuthHandler`: Captures tokens from the redirect URL.
5. **Auto-Sync**: `FinanceContext` watches for state changes and triggers background sync when Dropbox is enabled.

## Next Steps for the User
1. **Dropbox App Key**: CONFIGURED (`y9nh44kplesrdd1`).
2. **Redirect URI**: CONFIGURED (`http://localhost:5173/`).
3. **Permissions**: CONFIGURED (read/write access enabled).

La aplicación está lista para sincronizar.
