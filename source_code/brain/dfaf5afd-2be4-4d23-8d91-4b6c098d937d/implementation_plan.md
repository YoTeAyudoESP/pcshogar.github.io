# Date Navigation Implementation Plan

## Goal Description
Allow the user to navigate between different months and years to view historical financial data, instead of being locked to the current date.

## User Review Required
None.

## Proposed Changes

### Contexts
#### [NEW] [DateSelectionContext.tsx](file:///c:/Users/pablo/.gemini/antigravity/scratch/domestic-economy-app/src/contexts/DateSelectionContext.tsx)
- Create a new context to manage `selectedMonth` (0-11) and `selectedYear` (number).
- Provide functions to:
    - `setMonth(month: number)`
    - `setYear(year: number)`
    - `nextMonth()` / `prevMonth()`
    - `nextYear()` / `prevYear()`
- State should initialize to current date.

### Components
#### [NEW] [DateSelector.tsx](file:///c:/Users/pablo/.gemini/antigravity/scratch/domestic-economy-app/src/components/common/DateSelector.tsx)
- A new UI component to display:
    - Year selector (Prev/Next buttons).
    - Month selector (Prev/Next buttons or dropdown).
- Will consume `DateSelectionContext`.

#### [MODIFY] [App.tsx](file:///c:/Users/pablo/.gemini/antigravity/scratch/domestic-economy-app/src/App.tsx)
- Wrap the application (or Dashboard) with `DateSelectionProvider`.

#### [MODIFY] [Dashboard.tsx](file:///c:/Users/pablo/.gemini/antigravity/scratch/domestic-economy-app/src/components/dashboard/Dashboard.tsx)
- Insert `DateSelector` at the top of the dashboard.

#### [MODIFY] [FinanceSummary.tsx](file:///c:/Users/pablo/.gemini/antigravity/scratch/domestic-economy-app/src/components/dashboard/FinanceSummary.tsx)
- Replace `new Date().getMonth()` and `.getFullYear()` with values from `DateSelectionContext`.
- Ensure filtering logic uses these selected values.

#### [MODIFY] [YearlyFinancialChart.tsx](file:///c:/Users/pablo/.gemini/antigravity/scratch/domestic-economy-app/src/components/analytics/YearlyFinancialChart.tsx)
- Replace `new Date().getFullYear()` with `selectedYear` from context.

## Verification Plan

### Manual Verification
1.  **Launch App**: `npm run dev`.
2.  **Verify Initial State**: Ensure the data shown is for the *current* month/year by default.
3.  **Change Month**:
    - Click "Previous Month".
    - Verify `FinanceSummary` updates values (should likely be 0 or different if data exists).
    - Verify `YearlyFinancialChart` does *not* change (as it shows the whole year).
4.  **Change Year**:
    - Click "Previous Year".
    - Verify `YearlyFinancialChart` updates to show the selected year (likely empty if no data).
    - Verify `FinanceSummary` updates to the same month but in the selected year.
5.  **Boundary Testing**:
    - Go from January to December (year should usually decrement if standard logic, or just wrap around? I'll implement standard calendar logic: Jan 2024 -> prev -> Dec 2023).
