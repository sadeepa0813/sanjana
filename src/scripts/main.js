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

// Expose Supabase to window for backward compatibility
window.sb = supabase;

// State
let currentUser = null;
let userProfile = null;

// Expose state to window
window.currentUser = currentUser;
window.userProfile = userProfile;

// ========================================== 
// UTILITIES
// ========================================== 

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
    if (type === 'success') bg = 'linear-gradient(to right, #06b6d4, #3b82f6)';
    else if (type === 'error') bg = 'linear-gradient(to right, #ef4444, #b91c1c)';
    else if (type === 'warning') bg = 'linear-gradient(to right, #f59e0b, #d97706)';
    else bg = 'linear-gradient(to right, #334155, #475569)';

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
    logout: () => authService.logout()
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
// loadProducts is exposed below after definition

// ========================================== 
// AUTHENTICATION LOGIC
// ========================================== 

window.addEventListener('auth:updated', (event) => {
    const { user, profile } = event.detail;
    currentUser = user;
    userProfile = profile;
    window.currentUser = user;
    window.userProfile = profile;
    
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

async function loadProducts() {
    const grid = document.getElementById('product-grid');
    if (!grid) return;

    // Show Skeletons
    grid.innerHTML = Array.from({ length: 4 }, () => createProductSkeleton()).join('');

    try {
        // Check Cache
        const cached = storage.get(CACHE_KEY);
        if (cached && (Date.now() - cached.timestamp < CACHE_DURATION)) {
            console.log('Serving from cache');
            renderProducts(cached.data);
            return;
        }

        // Fetch from Supabase
        let { data: products, error } = await supabase
            .from('products')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Fallback Dummy Data
        if (!products || products.length === 0) {
            console.warn("Using dummy data due to empty DB");
            products = getDummyProducts();
        }

        // Save to Cache
        storage.set(CACHE_KEY, {
            timestamp: Date.now(),
            data: products
        });

        renderProducts(products);
    } catch (error) {
        console.error('Error loading products:', error);
        
        // Try to serve stale cache
        const cached = storage.get(CACHE_KEY);
        if (cached) {
            showToast('Offline mode: Showing cached products', 'warning');
            renderProducts(cached.data);
            return;
        }

        showErrorUI(grid);
    }
}
window.loadProducts = loadProducts;

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

function getDummyProducts() {
    return [
        {
            id: 1, 
            name: "Neon Cyber Headphones Pro", 
            price: 89.99, 
            original_price: 129.99,
            image_url: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80",
            discount_percent: 30,
            category: "audio",
            stock: 50,
            is_featured: true
        },
        {
            id: 2, 
            name: "Mechanical Keychron K8 Pro", 
            price: 120.00, 
            original_price: 150.00,
            image_url: "https://images.unsplash.com/photo-1587829741301-dc798b91add1?auto=format&fit=crop&w=800&q=80",
            discount_percent: 20,
            category: "keyboards",
            stock: 30,
            is_featured: true
        },
        {
            id: 3, 
            name: "Gaming Mouse Pro X", 
            price: 65.50, 
            original_price: 79.99,
            image_url: "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=800&q=80",
            discount_percent: 18,
            category: "mice",
            stock: 100,
            is_featured: false
        }
    ];
}

function renderProducts(products) {
    const grid = document.getElementById('product-grid');
    if (!grid) return;
    grid.innerHTML = '';

    products.forEach((product) => {
        const cardHtml = createProductCard(product);
        grid.insertAdjacentHTML('beforeend', cardHtml);
    });
    
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
    // Using innerHTML directly as DOMPurify is not available in environment
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

    const btn = document.querySelector(`button[onclick*="toggleWishlist(${productId})"]`);
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
            initIcons(); // Re-init the original icon
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

    // Find the button that triggered this to add loading state
    // Note: Since we pass values, we might not have a direct ref, but we can try generic
    // or just show a toast if no button ref. 
    // For specific product cards, we can't easily find "the" button without an event.
    // So we'll use a full screen loader or just toast.
    
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
                        whatsapp_number: userProfile?.phone || config.whatsapp.number,
                        shipping_address: customerAddress,
                        payment_method: 'Cash/Pending'
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
            // Continue to WhatsApp anyway
        }
    }

    showReceiptModal({
        orderNumber,
        date,
        customerName,
        productName,
        total,
        customerAddress,
        savedOrderId: savedOrder?.id
    });
}

function showReceiptModal(details) {
    const existingModal = document.getElementById('receipt-modal');
    if (existingModal) existingModal.remove();

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
                    <span class="text-white">${details.orderNumber}</span>
                </div>
                <div class="flex justify-between border-b border-white/5 pb-2">
                    <span class="text-slate-400">Date</span>
                    <span class="text-white">${details.date}</span>
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
        const message = `*NEW ORDER: ${details.orderNumber}*\n\n` + 
            `👤 *Customer:* ${details.customerName}\n` + 
            `📦 *Item:* ${details.productName}\n` + 
            `💰 *Total:* $${details.total}\n` + 
            `📍 *Address:* ${details.customerAddress}\n\n` + 
            `_Status: Cash/Pending_ - Please confirm availability.`;
            
        const phoneNumber = config.whatsapp.number;
        const url = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
        
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

        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4';
        
        modal.innerHTML = `
            <div class="glass-card rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <div class="p-6">
                    <div class="flex justify-between items-start mb-6">
                        <h2 class="text-2xl font-bold">${product.name}</h2>
                        <button onclick="this.closest('.fixed').remove()" class="text-slate-400 hover:text-white">
                            <i data-lucide="x" class="w-6 h-6"></i>
                        </button>
                    </div>
                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div>
                            <img src="${product.image_url}" alt="${product.name}" class="w-full h-64 lg:h-96 object-cover rounded-lg">
                        </div>
                        <div>
                            <div class="mb-6">
                                <h3 class="text-xl font-bold text-cyan-400 mb-2">$${product.price}</h3>
                                <p class="text-slate-300 mb-4">${product.description || 'No description available.'}</p>
                            </div>
                            <div class="flex gap-3">
                                <button onclick="addToCart(${product.id}, '${product.name.replace(/'/g, "'")}', ${product.price})" 
                                        class="btn-neon flex-1 py-3 rounded-lg font-bold flex items-center justify-center gap-2">
                                    <i data-lucide="shopping-cart" class="w-5 h-5"></i> Add to Cart
                                </button>
                                <button onclick="buyViaWhatsApp('${product.name.replace(/'/g, "'")}', ${product.price}, ${product.id})" 
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
// INITIALIZATION
// ========================================== 

document.addEventListener('DOMContentLoaded', async () => {
    initIcons();
    
    // Determine which page we're on
    const path = window.location.pathname;

    window.addEventListener('auth:updated', async (event) => {
        const { user, profile } = event.detail;

        // Admin Page - Load admin module dynamically
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
        
        // User Dashboard - Load dashboard module dynamically
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

        // Feedback Page - Load feedback module dynamically
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

    // Index page - Load products
    if (path.includes('index.html') || path === '/' || path.endsWith('/')) {
        loadProducts();
        
        // Intersection observer for animations
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('fade-in-up');
                }
            });
        }, { threshold: 0.1 });

        setTimeout(() => {
            document.querySelectorAll('.glass-card').forEach(card => {
                observer.observe(card);
            });
        }, 1000);
    }
});
