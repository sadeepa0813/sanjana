// ==========================================
// FILE: src/scripts/main.js
// PURPOSE: Main application logic
// DEPENDENCIES: supabase, config, components
// ========================================== 

import supabase from '../services/supabase.js';
import config from '../config/config.js';
import authService from './AuthContext.js';
import cartService from './CartContext.js';
import { createProductCard } from '../components/ProductCard.js';
import { renderNavbar } from '../components/Navbar.js';
import { renderCartModal } from '../components/CartModal.js';

// Constants
const CACHE_KEY = 'products_cache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const STORE_PHONE = '94768164223';
const PRODUCTS_PER_PAGE = 20;

// State
let currentUser = null;
let userProfile = null;
let activeCategory = 'all';
let currentPage = 0;
let currentSearchQuery = '';

// ========================================== 
// UTILITIES
// ========================================== 

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

// Debounce Function
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// Storage Helper
const storage = {
    get(key, defaultValue) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (e) {
            console.error('Storage read error', e);
            return defaultValue;
        }
    },
    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
            console.error('Storage write error', e);
        }
    },
    remove(key) {
        localStorage.removeItem(key);
    }
};
window.storage = storage;

// Initialize Lucide Icons
function initIcons() {
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

// Show Toast Notification
function showToast(message, type = 'info', position = 'right') {
    if (typeof Toastify === 'undefined') {
        console.log(`[${type.toUpperCase()}] ${message}`);
        return;
    }

    let bg = '';
    let borderColor = '';
    if (type === 'success') {
        bg = 'linear-gradient(to right, #10b981, #059669)';
        borderColor = 'rgba(16, 185, 129, 0.5)';
    } else if (type === 'error') {
        bg = 'linear-gradient(to right, #ef4444, #b91c1c)';
        borderColor = 'rgba(239, 68, 68, 0.5)';
    } else if (type === 'warning') {
        bg = 'linear-gradient(to right, #f59e0b, #d97706)';
        borderColor = 'rgba(245, 158, 11, 0.5)';
    } else {
        bg = 'linear-gradient(to right, #334155, #475569)';
        borderColor = 'rgba(148, 163, 184, 0.5)';
    }

    let icon = '';
    if (type === 'success') icon = '✅ ';
    else if (type === 'error') icon = '❌ ';
    else if (type === 'warning') icon = '⚠️ ';
    else icon = 'ℹ️ ';
    
    Toastify({
        text: icon + message,
        duration: 3000,
        gravity: "top",
        position: position,
        style: { 
            background: bg,
            border: `1px solid ${borderColor}`,
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
            fontWeight: '500'
        },
        stopOnFocus: true,
        onClick: function() {
            this.hideToast();
        }
    }).showToast();
}

// Format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
}

// Global Namespace Organization
window.LankaShop = {
    showToast,
    formatCurrency,
    initIcons,
    addToCart: (id, name, price) => cartService.addItem({ id, name, price }),
    viewCart,
    removeFromCart: (id) => cartService.removeItem(id),
    checkoutCart: () => cartService.checkout(currentUser),
    clearCart: () => cartService.clear(),
    buyViaWhatsApp,
    toggleWishlist,
    viewProductDetails,
    loginWithGoogle: () => authService.loginWithGoogle(),
    logout: () => authService.logout(),
    loadProducts,
    searchProducts,
    loadMoreProducts,
    filterProducts
};

// Legacy Support Bindings
window.showToast = showToast;
window.formatCurrency = formatCurrency;
window.addToCart = window.LankaShop.addToCart;
window.buyViaWhatsApp = buyViaWhatsApp;
window.toggleWishlist = toggleWishlist;
window.viewProductDetails = viewProductDetails;
window.loginWithGoogle = window.LankaShop.loginWithGoogle;
window.logout = window.LankaShop.logout;
window.viewCart = viewCart;
window.removeFromCart = window.LankaShop.removeFromCart;
window.checkoutCart = window.LankaShop.checkoutCart;
window.clearCart = window.LankaShop.clearCart;
window.initIcons = initIcons;
window.loadProducts = loadProducts;
window.searchProducts = searchProducts;
window.loadMoreProducts = loadMoreProducts;
window.filterProducts = filterProducts;

// ========================================== 
// AUTHENTICATION LOGIC
// ========================================== 

window.addEventListener('auth:updated', (event) => {
    const { user, profile } = event.detail;
    currentUser = user;
    userProfile = profile;
    
    if (user) {
        renderNavbar(currentUser, userProfile);
    } else {
        renderNavbar(null, null);
    }
    initIcons();
    cartService.notify();
    
    const legacyEvent = new CustomEvent('auth:ready', { detail: { user, profile } });
    window.dispatchEvent(legacyEvent);
});

// ========================================== 
// SHOP LOGIC
// ========================================== 

function createProductSkeleton() {
    return `
        <div class="glass-card rounded-xl overflow-hidden p-4 animate-pulse">
            <div class="w-full h-48 bg-slate-800 rounded-lg mb-4"></div>
            <div class="h-6 bg-slate-800 rounded w-3/4 mb-2"></div>
            <div class="h-4 bg-slate-800 rounded w-1/2 mb-4"></div>
            <div class="flex justify-between items-center">
                <div class="h-6 bg-slate-800 rounded w-1/3"></div>
                <div class="h-10 bg-slate-800 rounded w-1/3"></div>
            </div>
        </div>
    `;
}

async function loadProducts(category = 'all', searchQuery = '', page = 0, limit = PRODUCTS_PER_PAGE) {
    const grid = document.getElementById('product-grid');
    const loadMoreBtn = document.getElementById('load-more-btn');
    if (!grid) return;

    // Reset if new search or category
    if (page === 0) {
        grid.innerHTML = Array.from({ length: 4 }, () => createProductSkeleton()).join('');
        activeCategory = category;
        currentSearchQuery = searchQuery;
        currentPage = 0;
        if(loadMoreBtn) loadMoreBtn.classList.add('hidden');
    }

    try {
        // Build Query
        let query = supabase
            .from('products')
            .select('*', { count: 'exact' });

        // Apply Filters
        if (category !== 'all') {
            if (category === 'featured') {
                query = query.eq('is_featured', true);
            } else if (category === 'discounted') {
                query = query.gt('discount_percent', 0);
            } else {
                query = query.ilike('category', `%${category}%`);
            }
        }

        if (searchQuery) {
            query = query.ilike('name', `%${searchQuery}%`);
        }

        // Apply Pagination
        const from = page * limit;
        const to = from + limit - 1;
        query = query.range(from, to).order('created_at', { ascending: false });

        let { data: products, error, count } = await query;

        if (error) throw error;

        // Render
        if (page === 0) grid.innerHTML = '';
        
        if (products && products.length > 0) {
            products.forEach((product) => {
                const cardHtml = createProductCard(product);
                grid.insertAdjacentHTML('beforeend', cardHtml);
            });
            
            // Init VanillaTilt on new elements
            if (typeof VanillaTilt !== 'undefined') {
                VanillaTilt.init(grid.querySelectorAll(".glass-card"), {
                    max: 15,
                    speed: 400,
                    glare: true,
                    "max-glare": 0.2,
                    scale: 1.02,
                    gyroscope: true
                });
            }
        } else if (page === 0) {
            grid.innerHTML = `
                <div class="col-span-full text-center py-12">
                    <i data-lucide="search-x" class="w-12 h-12 text-slate-500 mx-auto mb-4"></i>
                    <p class="text-slate-400">No products found matching your criteria.</p>
                </div>
            `;
        }

        // Handle Load More Button
        if (loadMoreBtn) {
            if (count > to + 1) {
                loadMoreBtn.classList.remove('hidden');
            } else {
                loadMoreBtn.classList.add('hidden');
            }
        }

    } catch (error) {
        console.error('Error loading products:', error);
        if (page === 0) showErrorUI(grid);
    }
    
    initIcons();
}

function loadMoreProducts() {
    currentPage++;
    loadProducts(activeCategory, currentSearchQuery, currentPage);
}

function filterProducts(category) {
    activeCategory = category;
    
    // Update active button state
    const buttons = document.querySelectorAll('button[onclick^="filterProducts"]');
    buttons.forEach(btn => {
        if (btn.getAttribute('onclick').includes(`'${category}'`)) {
            btn.classList.add('border-cyan-500/50', 'text-cyan-400', 'bg-cyan-500/10');
            btn.classList.remove('border-slate-700', 'text-slate-400');
        } else {
            btn.classList.remove('border-cyan-500/50', 'text-cyan-400', 'bg-cyan-500/10');
            btn.classList.add('border-slate-700', 'text-slate-400');
        }
    });

    const searchInput = document.getElementById('search-input');
    const query = searchInput ? searchInput.value : '';
    
    loadProducts(category, query, 0); // Reset page to 0
    showToast(`Filtering by: ${category.charAt(0).toUpperCase() + category.slice(1)}`, 'info');
}

// Debounced Search Handler
const handleSearch = debounce((query) => {
    loadProducts(activeCategory, query, 0);
}, 400);

function searchProducts(query) {
    handleSearch(query);
}

function showErrorUI(grid) {
    grid.innerHTML = `
        <div class="col-span-full text-center py-20">
            <i data-lucide="wifi-off" class="w-12 h-12 text-slate-500 mx-auto mb-4"></i>
            <h3 class="text-xl font-bold text-white mb-2">Connection Failed</h3>
            <p class="text-slate-400 mb-6">Unable to load products. Please check your connection.</p>
            <button onclick="loadProducts()" class="px-6 py-2 bg-cyan-500/10 text-cyan-400 border border-cyan-500/50 rounded hover:bg-cyan-500/20 transition">
                Try Again
            </button>
        </div>
    `;
    initIcons();
}

// ========================================== 
// CART & WISHLIST
// ========================================== 

function viewCart() {
    if (!currentUser) {
        showToast('Please login to view cart', 'warning');
        setTimeout(() => window.location.href = 'login.html', 1500);
        return;
    }
    
    if (cartService.cart.length === 0) {
        showToast('Your cart is empty', 'info');
        return;
    }
    
    const total = cartService.getTotal();
    const modalHtml = renderCartModal(cartService.cart, total);
    
    const wrapper = document.createElement('div');
    wrapper.innerHTML = modalHtml; 
    
    document.body.appendChild(wrapper.firstElementChild);
    initIcons();
}

async function toggleWishlist(productId) {
    if (!currentUser) {
        showToast('Please login to add to wishlist', 'warning');
        setTimeout(() => window.location.href = 'login.html', 1500);
        return;
    }

    // Try to find button
    const btn = event?.currentTarget;
    const originalIcon = btn ? btn.innerHTML : '';
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<i data-lucide="loader-2" class="w-5 h-5 animate-spin"></i>`;
        initIcons();
    }
    
    try {
        const { data: existing } = await supabase
            .from('wishlists')
            .select('id')
            .eq('user_id', currentUser.id)
            .eq('product_id', productId)
            .single();

        if (existing) {
            await supabase.from('wishlists').delete().eq('id', existing.id);
            showToast('Removed from wishlist', 'info');
        } else {
            await supabase.from('wishlists').insert([{ user_id: currentUser.id, product_id: productId }]);
            showToast('Added to wishlist!', 'success');
        }
    } catch (error) {
        console.error('Wishlist error:', error);
        showToast('Error updating wishlist', 'error');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = originalIcon;
            initIcons();
        }
    }
}

// ========================================== 
// WHATSAPP ORDER
// ========================================== 

async function buyViaWhatsApp(productName, price, productId = null) {
    if (!currentUser) {
        showToast('Please login to place an order', 'warning');
        setTimeout(() => window.location.href = 'login.html', 1500);
        return;
    }

    let userPhone = userProfile?.phone;

    if (!userPhone) {
        const phone = await promptForPhoneNumber();
        if (!phone) {
            showToast('Phone number is required to place an order.', 'warning');
            return;
        }
        userPhone = phone;
        supabase.from('profiles').update({ phone: userPhone }).eq('id', currentUser.id).then();
        if (userProfile) userProfile.phone = userPhone;
    }

    const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const date = new Date().toLocaleString();
    const customerName = userProfile?.full_name || currentUser.email;
    const customerAddress = userProfile?.address || 'Address not provided';
    const total = parseFloat(price).toFixed(2);

    let savedOrder = null;
    if (productId) {
        try {
            const { data, error } = await supabase
                .from('orders')
                .insert([
                    {
                        user_id: currentUser.id,
                        order_number: orderNumber,
                        total_amount: price,
                        status: 'pending',
                        whatsapp_number: userPhone,
                        shipping_address: customerAddress,
                        payment_method: 'WhatsApp/COD'
                    }
                ])
                .select()
                .single();

            if (!error && data) {
                savedOrder = data;
                await supabase.from('order_items').insert([
                    {
                        order_id: data.id,
                        product_id: productId,
                        quantity: 1,
                        price_at_time: price
                    }
                ]);
            }
        } catch (error) {
            console.error('Order save error:', error);
        }
    }

    showReceiptModal({
        orderNumber,
        date,
        customerName,
        customerPhone: userPhone,
        productName,
        productId,
        total,
        customerAddress,
        savedOrderId: savedOrder?.id
    });
}

function promptForPhoneNumber() {
    return new Promise((resolve) => {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black/80 z-[70] flex items-center justify-center p-4 fade-in';
        modal.innerHTML = `
            <div class="glass-card w-full max-w-sm rounded-xl p-6 border border-cyan-500/30">
                <h3 class="text-xl font-bold text-white mb-4">Phone Number Required</h3>
                <p class="text-slate-400 text-sm mb-4">Please enter your WhatsApp number to continue with the order.</p>
                <input type="tel" id="input-phone-number" class="w-full bg-slate-900/50 border border-white/10 rounded px-3 py-2 text-white mb-4 focus:border-cyan-500 outline-none" placeholder="e.g. +94 77 123 4567">
                <div class="flex gap-3">
                    <button id="cancel-phone-btn" class="flex-1 py-2 rounded border border-slate-700 text-slate-400 hover:text-white">Cancel</button>
                    <button id="submit-phone-btn" class="flex-1 py-2 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 hover:bg-cyan-500/30">Continue</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        const input = document.getElementById('input-phone-number');
        input.focus();

        const submit = () => {
            const val = input.value.trim();
            if (val) {
                modal.remove();
                resolve(val);
            } else {
                input.classList.add('border-red-500');
            }
        };

        document.getElementById('submit-phone-btn').onclick = submit;
        document.getElementById('cancel-phone-btn').onclick = () => {
            modal.remove();
            resolve(null);
        };
        input.onkeypress = (e) => { if (e.key === 'Enter') submit(); };
    });
}

function showReceiptModal(details) {
    const existingModal = document.getElementById('receipt-modal');
    if (existingModal) existingModal.remove();

    const safeProductName = escapeHTML(details.productName);
    const safeCustomerName = escapeHTML(details.customerName);
    const safePhone = escapeHTML(details.customerPhone);
    const safeOrderNum = escapeHTML(details.orderNumber);

    const modal = document.createElement('div');
    modal.id = 'receipt-modal';
    modal.className = 'fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 fade-in';
    
    modal.innerHTML = `
        <div class="glass-card w-full max-w-md rounded-xl overflow-hidden relative border border-cyan-500/30 box-shadow-cyan">
            <div class="bg-slate-900/50 p-6 text-center border-b border-white/10 relative">
                <div class="w-16 h-16 bg-cyan-500/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                    <i data-lucide="check-circle" class="w-8 h-8 text-cyan-400"></i>
                </div>
                <h3 class="text-2xl font-bold text-white">Order Initiated!</h3>
                <p class="text-slate-400 text-sm mt-1">Please confirm via WhatsApp.</p>
            </div>

            <div class="p-6 space-y-4 font-mono text-sm bg-black/20">
                <div class="flex justify-between border-b border-white/5 pb-2">
                    <span class="text-slate-400">Order #</span>
                    <span class="text-white">${safeOrderNum}</span>
                </div>
                <div class="flex justify-between border-b border-white/5 pb-2">
                    <span class="text-slate-400">Item</span>
                    <span class="text-white truncate max-w-[200px]">${safeProductName}</span>
                </div>
                 <div class="flex justify-between border-b border-white/5 pb-2">
                    <span class="text-slate-400">Customer Phone</span>
                    <span class="text-white">${safePhone}</span>
                </div>
                <div class="flex justify-between items-center pt-2">
                    <span class="text-slate-400">Total</span>
                    <span class="text-2xl font-bold text-cyan-400">$${details.total}</span>
                </div>
            </div>

            <div class="p-6 bg-slate-900/50 border-t border-white/10 flex flex-col gap-3">
                <button id="confirm-whatsapp-btn" class="btn-neon w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2 group">
                    <i data-lucide="message-circle" class="w-5 h-5 group-hover:scale-110 transition"></i>
                    Send to WhatsApp
                </button>
                <button onclick="document.getElementById('receipt-modal').remove()" class="text-slate-400 hover:text-white text-sm py-2">
                    Close
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    initIcons();

    document.getElementById('confirm-whatsapp-btn').onclick = () => {
        const message = 
            `I would like to order this product:\n` +
            `--------------------------------\n` +
            `Item: ${details.productName}\n` +
            `Price: $${details.total}\n` +
            `Product ID: ${details.productId || 'N/A'}\n` +
            `--------------------------------\n` +
            `Customer Phone: ${details.customerPhone}`;
            
        const url = `https://wa.me/${STORE_PHONE}?text=${encodeURIComponent(message)}`;
        
        window.open(url, '_blank');
        modal.remove();
        showToast('Opening WhatsApp...', 'success');
    };
}

async function viewProductDetails(productId) {
    try {
        const { data: product, error } = await supabase
            .from('products')
            .select('*')
            .eq('id', productId)
            .single();

        if (error) throw error;

        const safeName = escapeHTML(product.name);
        const safeDesc = escapeHTML(product.description || 'No description available.');
        const safeImage = escapeHTML(product.image_url);

        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4';
        
        modal.innerHTML = `
            <div class="glass-card rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <div class="p-6">
                    <div class="flex justify-between items-start mb-6">
                        <h2 class="text-2xl font-bold text-white">${safeName}</h2>
                        <button onclick="this.closest('.fixed').remove()" class="text-slate-400 hover:text-white">
                            <i data-lucide="x" class="w-6 h-6"></i>
                        </button>
                    </div>
                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div>
                            <img src="${safeImage}" alt="${safeName}" class="w-full h-64 lg:h-96 object-cover rounded-lg">
                        </div>
                        <div>
                            <div class="mb-6">
                                <h3 class="text-xl font-bold text-cyan-400 mb-2">$${product.price}</h3>
                                <p class="text-slate-300 mb-4">${safeDesc}</p>
                            </div>
                            <div class="flex gap-3">
                                <button onclick="addToCart(${product.id}, '${safeName.replace(/'/g, "\'")}', ${product.price})" 
                                        class="btn-neon flex-1 py-3 rounded-lg font-bold flex items-center justify-center gap-2">
                                    <i data-lucide="shopping-cart" class="w-5 h-5"></i> Add to Cart
                                </button>
                                <button onclick="buyViaWhatsApp('${safeName.replace(/'/g, "\'")}', ${product.price}, ${product.id})" 
                                        class="flex-1 py-3 rounded-lg border border-green-500 text-green-400 hover:bg-green-500/10 font-bold flex items-center justify-center gap-2">
                                    <i data-lucide="message-circle" class="w-5 h-5"></i> Buy Now
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        initIcons();
    } catch (error) {
        console.error('Error loading product details:', error);
        showToast('Error loading product details', 'error');
    }
}

// ========================================== 
// HERO PARALLAX EFFECT
// ========================================== 

function initHeroParallax() {
    const hero = document.getElementById('hero');
    if (!hero) return;

    const elements = hero.querySelectorAll('.shape, .parallax-element');

    function updateParallax(x, y) {
        elements.forEach(el => {
            const speedAttr = el.getAttribute('data-speed') || 0;
            let speed = parseFloat(speedAttr);
            
            // Shapes move fast/opposite, Text moves slow
            // Based on user request: "Shapes move fast (speed * -1), Text moves slow (speed * 0.5)"
            // I'll multiply by -1 if it has class 'shape'
            if (el.classList.contains('shape')) {
                speed = speed * -1;
            } else {
                speed = speed * 0.5;
            }

            const centerX = window.innerWidth / 2;
            const centerY = window.innerHeight / 2;
            
            const xOffset = ((x - centerX) * speed) / 100;
            const yOffset = ((y - centerY) * speed) / 100;
            
            el.style.transform = `translate3d(${xOffset}px, ${yOffset}px, 0)`;
        });
    }

    let isTicking = false;
    document.addEventListener('mousemove', (e) => {
        if (!isTicking) {
            window.requestAnimationFrame(() => {
                updateParallax(e.clientX, e.clientY);
                isTicking = false;
            });
            isTicking = true;
        }
    });

    if (window.DeviceOrientationEvent) {
        window.addEventListener('deviceorientation', (e) => {
            const tiltX = (e.gamma || 0);
            const tiltY = (e.beta || 0);
            const x = (window.innerWidth / 2) + (tiltX * 10);
            const y = (window.innerHeight / 2) + (tiltY * 10);
            
            if (!isTicking) {
                window.requestAnimationFrame(() => {
                    updateParallax(x, y);
                    isTicking = false;
                });
                isTicking = true;
            }
        });
    }
}

// ========================================== 
// INITIALIZATION
// ========================================== 

document.addEventListener('DOMContentLoaded', async () => {
    initIcons();
    
    const path = window.location.pathname;

    window.addEventListener('auth:updated', async (event) => {
        const { user, profile } = event.detail;

        if (path.includes('admin.html')) {
            if (profile?.role === 'admin') {
                try {
                    const adminModule = await import('./admin.js');
                    if (adminModule.initAdminDashboard) {
                        adminModule.initAdminDashboard();
                    }
                } catch (error) {
                    console.error('Failed to load admin module:', error);
                    showToast('Failed to load admin panel', 'error');
                }
            } else {
                window.location.href = 'index.html';
            }
        }
        else if (path.includes('user-dashboard.html')) {
            if (user) {
                try {
                    const dashboardModule = await import('./dashboard.js');
                    if (dashboardModule.loadDashboardData) {
                        dashboardModule.loadDashboardData();
                    }
                } catch (error) {
                    console.error('Failed to load dashboard module:', error);
                    showToast('Failed to load dashboard', 'error');
                }
            } else {
                window.location.href = 'login.html';
            }
        }
        else if (path.includes('feedback.html')) {
            try {
                const feedbackModule = await import('./feedback.js');
                if (feedbackModule.initFeedbackSystem) {
                    feedbackModule.initFeedbackSystem();
                }
            } catch (error) {
                console.error('Failed to load feedback module:', error);
                showToast('Failed to load feedback system', 'error');
            }
        }
    });

    if (path.includes('index.html') || path === '/' || path.endsWith('/')) {
        loadProducts();
        initHeroParallax();
        
        if (typeof AOS !== 'undefined') {
            AOS.init({
                duration: 800,
                once: true
            });
        }
    }
});
