// ==========================================
// FILE: src/components/ProductCard.js
// PURPOSE: Render a product card component
// ==========================================

import config from '../config/config.js';

export function createProductCard(product) {
    // Calculate discount
    const hasDiscount = product.discount_percent > 0;
    const discountBadge = hasDiscount ? 
        `<span class="absolute top-3 left-3 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded z-10">-${product.discount_percent}%</span>` : '';
    
    // Check if in wishlist (Logic handled by main.js state for now, passed as prop or checked globally)
    // For this modular component, we'll assume the caller might want to handle state, 
    // but since we are refactoring, we'll keep the dependency on global functions (addToCart, etc.) 
    // for now to minimize breaking changes, or better, bind events.
    
    // However, to make it cleaner, we will stick to generating HTML string.
    
    const wishlistIcon = 'heart'; // Default state
    const wishlistColor = 'text-white/60'; // Default state
    
    return `
        <div class="glass-card rounded-xl overflow-hidden flex flex-col group fade-in-up hover-lift" style="animation-delay: 100ms">
            <div class="relative h-48 overflow-hidden bg-slate-800">
                ${discountBadge}
                ${product.is_featured ? 
                    `<span class="absolute top-3 right-3 bg-cyan-500 text-white text-xs font-bold px-2 py-1 rounded z-10">FEATURED</span>` : ''}
                <img src="${product.image_url}" alt="${product.name}" 
                     class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110">
                <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div class="absolute bottom-4 left-4 right-4 flex justify-between items-center">
                        <button onclick="addToCart(${product.id}, '${product.name.replace(/'/g, "\\'")}', ${product.price})" 
                                class="btn-neon px-4 py-2 rounded text-sm flex items-center gap-2">
                            <i data-lucide="shopping-cart" class="w-4 h-4"></i> Add to Cart
                        </button>
                        <button onclick="toggleWishlist(${product.id})" 
                                class="p-2 rounded-full bg-black/50 backdrop-blur-sm hover:bg-black/70 transition">
                            <i data-lucide="${wishlistIcon}" class="w-5 h-5 ${wishlistColor}"></i>
                        </button>
                    </div>
                </div>
            </div>
            
            <div class="p-4 flex-1 flex flex-col">
                <div class="mb-2">
                    <span class="text-xs text-slate-400 bg-slate-800/50 px-2 py-1 rounded">${product.category || 'Electronics'}</span>
                </div>
                
                <h3 class="text-lg font-semibold text-gray-100 mb-2 line-clamp-2">${product.name}</h3>
                
                <div class="mt-auto">
                    <div class="flex items-center gap-2 mb-3">
                        <span class="text-2xl font-bold text-cyan-400">$${product.price.toFixed(2)}</span>
                        ${hasDiscount ? 
                            `<span class="text-sm text-slate-400 line-through">$${product.original_price.toFixed(2)}</span>` : ''}
                    </div>
                    
                    <div class="flex gap-2">
                        <button onclick="buyViaWhatsApp('${product.name.replace(/'/g, "\\'")}', ${product.price}, ${product.id})" 
                                class="btn-neon flex-1 py-2 rounded text-sm font-bold flex items-center justify-center gap-2">
                            <i data-lucide="message-circle" class="w-4 h-4"></i> Buy Now
                        </button>
                        <button onclick="viewProductDetails(${product.id})" 
                                class="px-3 py-2 rounded border border-slate-700 text-slate-400 hover:bg-white/5 hover:text-white transition">
                            <i data-lucide="eye" class="w-4 h-4"></i>
                        </button>
                    </div>
                    
                    ${product.stock < 10 ? 
                        `<p class="text-xs text-red-400 mt-2 flex items-center gap-1">
                            <i data-lucide="alert-circle" class="w-3 h-3"></i> Only ${product.stock} left in stock
                        </p>` : 
                        `<p class="text-xs text-green-400 mt-2 flex items-center gap-1">
                            <i data-lucide="check-circle" class="w-3 h-3"></i> In stock
                        </p>`
                    }
                </div>
            </div>
        </div>
    `;
}
