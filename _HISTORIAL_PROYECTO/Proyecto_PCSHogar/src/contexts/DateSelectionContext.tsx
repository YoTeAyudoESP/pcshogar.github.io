import React, { createContext, useContext, useState, type ReactNode } from 'react';

interface DateSelectionContextType {
    selectedMonth: number; // 0-11
    selectedYear: number;
    setMonth: (month: number) => void;
    setYear: (year: number) => void;
    nextMonth: () => void;
    prevMonth: () => void;
    nextYear: () => void;
    prevYear: () => void;
    currentDate: Date; // Derived date object helper
}

const DateSelectionContext = createContext<DateSelectionContextType | undefined>(undefined);

export const useDateSelection = () => {
    const context = useContext(DateSelectionContext);
    if (!context) {
        throw new Error('useDateSelection must be used within a DateSelectionProvider');
    }
    return context;
};

interface DateSelectionProviderProps {
    children: ReactNode;
}

export const DateSelectionProvider: React.FC<DateSelectionProviderProps> = ({ children }) => {
    const today = new Date();
    const [selectedMonth, setSelectedMonth] = useState(today.getMonth());
    const [selectedYear, setSelectedYear] = useState(today.getFullYear());

    const setMonth = (month: number) => {
        if (month < 0) {
            setSelectedMonth(11);
            setSelectedYear(prev => prev - 1);
        } else if (month > 11) {
            setSelectedMonth(0);
            setSelectedYear(prev => prev + 1);
        } else {
            setSelectedMonth(month);
        }
    };

    const nextMonth = () => setMonth(selectedMonth + 1);
    const prevMonth = () => setMonth(selectedMonth - 1);

    const nextYear = () => setSelectedYear(prev => prev + 1);
    const prevYear = () => setSelectedYear(prev => prev - 1);

    const currentDate = new Date(selectedYear, selectedMonth, 1);

    return (
        <DateSelectionContext.Provider value={{
            selectedMonth,
            selectedYear,
            setMonth,
            setYear: setSelectedYear,
            nextMonth,
            prevMonth,
            nextYear,
            prevYear,
            currentDate
        }}>
            {children}
        </DateSelectionContext.Provider>
    );
};
