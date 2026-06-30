import { getCurrencySymbol } from './financeCalculations';

/**
 * Formats a numeric value as a currency string with the symbol at the end,
 * dot as thousands separator, and comma as decimal separator.
 * Example: 1234.56 => "1.234,56 €"
 */
export const formatCurrency = (amount: number, _currency?: string): string => {
    const symbol = getCurrencySymbol();
    if (amount === undefined || amount === null || isNaN(amount)) {
        return `0,00${symbol}`;
    }
    const isNegative = amount < 0;
    const fixedVal = Math.abs(amount).toFixed(2);
    const [integerPart, decimalPart] = fixedVal.split('.');
    const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    
    return `${isNegative ? '-' : ''}${formattedInteger},${decimalPart}${symbol}`;
};
