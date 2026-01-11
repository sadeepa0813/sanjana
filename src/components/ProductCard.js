// ==========================================
// FILE: src/components/ProductCard.js
// PURPOSE: Render a product card component
// ==========================================

import config from '../config/config.js';

// Utility to prevent XSS
function escapeHTML(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/