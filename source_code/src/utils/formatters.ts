/**
 * Formats a numeric value as a currency string with the symbol at the end,
 * dot as thousands separator, and comma as decimal separator.
 * Example: 1234.56 => "1.234,56 €"
 */
export const formatCurrency = (amount: number, currency: string = 'EUR'): string => {
    if (amount === undefined || amount === null || isNaN(amount)) {
        return `0,00€`;
    }
    const isNegative = amount < 0;
    const fixedVal = Math.abs(amount).toFixed(2);
    const [integerPart, decimalPart] = fixedVal.split('.');
    const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    
    let symbol = '€';
    if (currency === 'USD') symbol = '$';
    if (currency === 'GBP') symbol = '£';

    return `${isNegative ? '-' : ''}${formattedInteger},${decimalPart}${symbol}`;
};
