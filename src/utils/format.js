// ==========================================
// FILE: src/utils/format.js
// PURPOSE: Currency and data formatting utilities
// ==========================================

export function formatLKR(amount) {
    if (amount === undefined || amount === null) return 'Rs. 0.00';
    return new Intl.NumberFormat('en-LK', {
        style: 'currency',
        currency: 'LKR',
        currencyDisplay: 'symbol'
    }).format(amount).replace('LKR', 'Rs.');
}
