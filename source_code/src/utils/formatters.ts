/**
 * Formats a numeric value as a currency string with the symbol at the end,
 * dot as thousands separator, and comma as decimal separator.
 * Example: 1234.56 => "1.234,56 €"
 */
export const formatCurrency = (amount: number, currency: string = 'EUR'): string => {
    // We use 'es-ES' locale to get the requested format (dot for thousands, comma for decimals)
    // regardless of the application language setting, as per user's specific request.
    const formatter = new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

    return formatter.format(amount);
};
