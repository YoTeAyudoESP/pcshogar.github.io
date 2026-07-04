import React, { createContext, useContext, useState, type ReactNode } from 'react';

interface DateSelectionContextType {
    selectedMonth: number;
    selectedYear: number;
    prevMonth: () => void;
    nextMonth: () => void;
    prevYear: () => void;
    nextYear: () => void;
    setSelectedMonth: (month: number) => void;
    setSelectedYear: (year: number) => void;
}

const DateSelectionContext = createContext<DateSelectionContextType | undefined>(undefined);

export const DateSelectionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const now = new Date();
    const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
    const [selectedYear, setSelectedYear] = useState(now.getFullYear());

    const prevMonth = () => {
        setSelectedMonth(prev => {
            if (prev === 0) {
                setSelectedYear(y => y - 1);
                return 11;
            }
            return prev - 1;
        });
    };

    const nextMonth = () => {
        setSelectedMonth(prev => {
            if (prev === 11) {
                setSelectedYear(y => y + 1);
                return 0;
            }
            return prev + 1;
        });
    };

    const prevYear = () => setSelectedYear(y => y - 1);
    const nextYear = () => setSelectedYear(y => y + 1);

    return (
        <DateSelectionContext.Provider value={{
            selectedMonth,
            selectedYear,
            prevMonth,
            nextMonth,
            prevYear,
            nextYear,
            setSelectedMonth,
            setSelectedYear
        }}>
            {children}
        </DateSelectionContext.Provider>
    );
};

export const useDateSelection = () => {
    const context = useContext(DateSelectionContext);
    if (context === undefined) {
        throw new Error('useDateSelection must be used within a DateSelectionProvider');
    }
    return context;
};
