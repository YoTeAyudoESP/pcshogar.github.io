# Implementation Plan - Domestic Economy App (Phase 1: Income)

## Goal Description
Build a "Local-First" Progressive Web App (PWA) for managing domestic economy. The app will work offline on Windows and Android, syncing eventually with a self-hosted Docker backend (future scope). The immediate goal is to implement the **Income Management** module, allowing configuration of fixed income (with expiration dates) and entry of extra income.

## User Review Required
> [!IMPORTANT]
> **Technology Stack**: React (Vite) + Vanilla CSS.
> **Storage**: Browser's IndexedDB (via Dexie.js) for true offline capability.
> **Sync Strategy**: The app will be "Offline First". Data lives on the device. Syncing to the Raspberry Pi will be implemented as a replication process later.

## Proposed Changes

### Project Initialization
#### [NEW] `domestic-economy-app/`
- Initialize standard Vite + React template.
- Configure PWA plugin (`vite-plugin-pwa`) to allow installation on Android/Windows.

### Data Layer (Local Persistence)
#### [NEW] `src/db/db.ts`
- Initialize Dexie database `EconomyDB`.
- Schema:
    - `fixed_incomes`: `++id, name, amount, frequency, startDate, endDate`
    - `extra_incomes`: `++id, description, amount, date, category`

### UI Components (Vanilla CSS)
- **Design System**: Use CSS Variables for a "Premium Dark Mode" aesthetic (Glassmorphism, Neon accents).
- **Layout**: Mobile-responsive layout (Grid/Flex).

### Feature: Income Management
#### [NEW] `src/modules/income/FixedIncomeForm.jsx`
- Form to add/edit recurring income.
- Date pickers for Start/End dates (essential for forecasting).

#### [NEW] `src/modules/income/ExtraIncomeForm.jsx`
- Simple transaction entry form.

#### [NEW] `src/modules/income/IncomeDashboard.jsx`
- **Forecasting Logic**: A helper function that calculates "Expected Income" for Month X by summing:
    - Active Fixed Incomes (where `Month X` is between `startDate` and `endDate`).
    - Known Extra Incomes for `Month X`.

## Verification Plan
### Manual Verification
1. **Offline Test**: Disconnect network, add an income, reload page -> Data should persist.
2. **Forecast Test**: add a Fixed Income ending in Dec 2025. Check Forecast for Jan 2026 -> Should NOT include that income.
3. **Responsiveness**: Resize browser to mobile size -> Layout should adapt.
