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
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function createProductCard(product) {
    const safeName = escapeHTML(product.name);
    const safePrice = escapeHTML(product.price);
    const safeImage = escapeHTML(product.image_url);
    const safeCategory = escapeHTML(product.category || 'General');

    // For JS arguments in onclick, we handle quotes specifically to avoid breaking the attribute
    const nameForJs = String(product.name || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
    
    let priceDisplay = `<span class="text-cyan-400 font-bold">$${safePrice}</span>`;
    let discountBadge = '';
    
    if (product.discount_percent > 0) {
         const discountedPrice = (product.price * (1 - product.discount_percent / 100)).toFixed(2);
         priceDisplay = `
            <span class="line-through text-slate-500 text-sm mr-2">$${safePrice}</span>
            <span class="text-green-400 font-bold">$${discountedPrice}</span>
         `;
         discountBadge = `<div class="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">-${product.discount_percent}%</div>`;
    }

    return `
        <div class="glass-card group relative rounded-xl overflow-hidden hover:shadow-cyan-500/20 transition-all duration-300 transform hover:-translate-y-1" data-tilt>
            ${discountBadge}
            <div class="relative h-48 overflow-hidden">
                <img src="${safeImage || 'https://via.placeholder.com/300'}" alt="${safeName}" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110">
                <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2 backdrop-blur-sm">
                    <button onclick="viewProductDetails(${product.id})" class="p-2 bg-white/10 rounded-full hover:bg-cyan-500 text-white transition-colors" title="View Details">
                        <i data-lucide="eye" class="w-5 h-5"></i>
                    </button>
                    <button onclick="addToCart(${product.id}, '${nameForJs}', ${product.price})" class="p-2 bg-white/10 rounded-full hover:bg-green-500 text-white transition-colors" title="Add to Cart">
                        <i data-lucide="shopping-cart" class="w-5 h-5"></i>
                    </button>
                </div>
            </div>
            
            <div class="p-4">
                <div class="text-xs text-cyan-400 mb-1 uppercase tracking-wider">${safeCategory}</div>
                <h3 class="text-lg font-bold text-white mb-2 truncate" title="${safeName}">${safeName}</h3>
                
                <div class="flex justify-between items-center mb-3">
                    <div class="flex items-center">
                        ${priceDisplay}
                    </div>
                    <div class="flex text-yellow-500 text-xs">
                        <i data-lucide="star" class="w-3 h-3 fill-current"></i>
                        <span class="ml-1 text-slate-400">4.5</span>
                    </div>
                </div>
                
                <button onclick="buyViaWhatsApp('${nameForJs}', ${product.price}, ${product.id})" class="w-full py-2 bg-cyan-500/10 border border-cyan-500/50 rounded text-cyan-400 font-medium hover:bg-cyan-500 hover:text-white transition-all duration-300 flex items-center justify-center gap-2 group-hover:shadow-[0_0_15px_rgba(6,182,212,0.5)]">
                    <i data-lucide="message-circle" class="w-4 h-4"></i>
                    Buy Now
                </button>
            </div>
        </div>
    `;
}
