// ==========================================
// FILE: src/scripts/admin.js
// PURPOSE: Admin Dashboard Logic
// ==========================================

import supabase from '../services/supabase.js';

// Global State
let currentTab = 'dashboard';

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

// Initialize Dashboard
export async function initAdminDashboard() {
    // 1. Auth Check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    // Check Role
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (profile?.role !== 'admin') {
        window.location.href = 'index.html';
        return;
    }

    console.log("Admin Authorized");
    document.getElementById('admin-email').textContent = user.email;

    // 2. Load Initial Data (Dashboard)
    loadDashboardStats();
    
    // 3. Setup Global Listener for Tab Switching
    window.loadAdminSection = (tabId) => {
        currentTab = tabId;
        console.log(`Loading section: ${tabId}`);
        switch (tabId) {
            case 'dashboard': loadDashboardStats(); break;
            case 'products': loadProducts(); break;
            case 'orders': loadOrders(); break;
            case 'coupons': loadCoupons(); break;
            case 'reviews': loadReviews(); break;
            case 'customers': loadCustomers(); break;
        }
    };

    // 4. Setup Event Listeners
    setupForms();
}

// ---------------------------------------------------------
// SECTION 1: DASHBOARD STATS
// ---------------------------------------------------------
async function loadDashboardStats() {
    try {
        const [revenueRes, ordersRes, usersRes] = await Promise.all([
            supabase.from('orders').select('total_amount').neq('status', 'cancelled'),
            supabase.from('orders').select('*', { count: 'exact', head: true }),
            supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'user')
        ]);

        // Revenue
        const totalRevenue = revenueRes.data?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;
        document.getElementById('stat-revenue').textContent = `$${totalRevenue.toFixed(2)}`;

        // Total Orders
        document.getElementById('stat-orders').textContent = ordersRes.count || 0;

        // Total Users
        document.getElementById('stat-users').textContent = usersRes.count || 0;

    } catch (error) {
        console.error("Stats Error:", error);
        window.showToast("Failed to load dashboard stats", 'error');
    }
}

// ---------------------------------------------------------
// SECTION 2: PRODUCTS
// ---------------------------------------------------------
async function loadProducts() {
    const tbody = document.getElementById('products-table-body');
    tbody.innerHTML = '<tr><td colspan="5" class="p-4 text-center">Loading...</td></tr>';

    const { data: products, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) return window.showToast("Error loading products", 'error');

    tbody.innerHTML = products.map(p => `
        <tr class="hover:bg-white/5 transition">
            <td class="px-6 py-4 flex items-center gap-3">
                <img src="${escapeHTML(p.image_url)}" class="w-10 h-10 rounded object-cover bg-slate-800">
                <span class="font-medium text-white">${escapeHTML(p.name)}</span>
            </td>
            <td class="px-6 py-4 text-cyan-400 font-bold">$${p.price}</td>
            <td class="px-6 py-4">${p.stock_quantity ?? p.stock}</td>
            <td class="px-6 py-4"><span class="px-2 py-1 rounded bg-slate-800 text-xs">${escapeHTML(p.category)}</span></td>
            <td class="px-6 py-4 text-right">
                <button onclick="editProduct(${p.id})" class="text-blue-400 hover:text-blue-300 mr-3"><i data-lucide="edit-2" class="w-4 h-4"></i></button>
                <button onclick="deleteProduct(${p.id})" class="text-red-400 hover:text-red-300"><i data-lucide="trash" class="w-4 h-4"></i></button>
            </td>
        </tr>
    `).join('');
    
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

window.editProduct = async (id) => {
    const { data: p } = await supabase.from('products').select('*').eq('id', id).single();
    if (p) {
        document.getElementById('prod-id').value = p.id;
        document.getElementById('prod-name').value = p.name;
        document.getElementById('prod-price').value = p.price;
        document.getElementById('prod-stock').value = p.stock_quantity ?? p.stock;
        document.getElementById('prod-category').value = p.category;
        document.getElementById('prod-image').value = p.image_url;
        
        document.getElementById('modal-title').textContent = 'Edit Product';
        document.getElementById('product-modal').classList.remove('hidden');
    }
};

window.deleteProduct = async (id) => {
    if (!confirm("Are you sure?")) return;
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (!error) {
        window.showToast("Product deleted", 'success');
        loadProducts();
    } else {
        window.showToast("Delete failed", 'error');
    }
};

// ---------------------------------------------------------
// SECTION 3: ORDERS
// ---------------------------------------------------------
async function loadOrders() {
    const tbody = document.getElementById('orders-table-body');
    tbody.innerHTML = '<tr><td colspan="6" class="p-4 text-center">Loading...</td></tr>';

    const { data: orders } = await supabase
        .from('orders')
        .select('*, profiles(full_name, email)')
        .order('created_at', { ascending: false });

    tbody.innerHTML = orders.map(o => `
        <tr class="hover:bg-white/5 transition">
            <td class="px-6 py-4 font-mono text-sm text-slate-400">${escapeHTML(o.order_number)}</td>
            <td class="px-6 py-4">
                <div class="text-white text-sm">${escapeHTML(o.profiles?.full_name || 'Guest')}</div>
                <div class="text-xs text-slate-500">${escapeHTML(o.profiles?.email || 'No Email')}</div>
            </td>
            <td class="px-6 py-4 font-bold text-cyan-400">$${o.total_amount}</td>
            <td class="px-6 py-4">
                <select onchange="updateOrderStatus('${o.id}', this.value)" class="bg-slate-900 border border-white/10 rounded text-xs px-2 py-1 outline-none ${getStatusColor(o.status)}">
                    <option value="pending" ${o.status === 'pending' ? 'selected' : ''}>Pending</option>
                    <option value="shipped" ${o.status === 'shipped' ? 'selected' : ''}>Shipped</option>
                    <option value="delivered" ${o.status === 'delivered' ? 'selected' : ''}>Delivered</option>
                    <option value="cancelled" ${o.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                </select>
            </td>
            <td class="px-6 py-4 text-xs">${new Date(o.created_at).toLocaleDateString()}</td>
            <td class="px-6 py-4 text-right">
                <button onclick="viewOrderDetails('${o.id}')" class="text-cyan-400 hover:underline text-xs">View Details</button>
            </td>
        </tr>
    `).join('');
}

function getStatusColor(status) {
    if (status === 'pending') return 'text-yellow-400 border-yellow-400/30';
    if (status === 'shipped') return 'text-blue-400 border-blue-400/30';
    if (status === 'delivered') return 'text-green-400 border-green-400/30';
    return 'text-red-400 border-red-400/30';
}

window.updateOrderStatus = async (id, status) => {
    const { error } = await supabase.from('orders').update({ status }).eq('id', id);
    if (!error) window.showToast(`Order status updated to ${status}`, 'success');
    else window.showToast("Update failed", 'error');
};

window.viewOrderDetails = async (id) => {
    const { data: order } = await supabase
        .from('orders')
        .select('*, order_items(*, products(*))')
        .eq('id', id)
        .single();

    if (order) {
        document.getElementById('order-modal-id').textContent = `#${escapeHTML(order.order_number)}`;
        const container = document.getElementById('order-modal-content');
        
        let itemsHtml = order.order_items.map(item => `
            <div class="flex items-center justify-between p-3 bg-slate-800/50 rounded">
                <div class="flex items-center gap-3">
                    <img src="${escapeHTML(item.products?.image_url)}" class="w-12 h-12 rounded object-cover">
                    <div>
                        <p class="text-sm text-white font-medium">${escapeHTML(item.products?.name)}</p>
                        <p class="text-xs text-slate-400">Qty: ${item.quantity}</p>
                    </div>
                </div>
                <div class="text-cyan-400 font-bold">$${item.price_at_time}</div>
            </div>
        `).join('');

        container.innerHTML = `
            <div>
                <h4 class="text-slate-400 text-xs uppercase mb-2">Shipping Address</h4>
                <p class="text-white text-sm bg-slate-800 p-3 rounded">${escapeHTML(order.shipping_address || 'No Address')}</p>
            </div>
            <div>
                <h4 class="text-slate-400 text-xs uppercase mb-2">Items</h4>
                <div class="space-y-2">${itemsHtml}</div>
            </div>
            <div class="flex justify-between items-center pt-4 border-t border-white/10">
                <span class="text-white font-bold">Total Amount</span>
                <span class="text-2xl text-cyan-400 font-bold">$${order.total_amount}</span>
            </div>
        `;
        
        document.getElementById('order-modal').classList.remove('hidden');
    }
};

// ---------------------------------------------------------
// SECTION 4: COUPONS
// ---------------------------------------------------------
async function loadCoupons() {
    const tbody = document.getElementById('coupons-table-body');
    const { data: coupons } = await supabase.from('coupons').select('*').order('created_at', { ascending: false });

    if (!coupons) return;

    tbody.innerHTML = coupons.map(c => `
        <tr class="hover:bg-white/5 transition">
            <td class="px-6 py-4 font-mono font-bold text-white">${escapeHTML(c.code)}</td>
            <td class="px-6 py-4 text-green-400">${c.discount_percent}% OFF</td>
            <td class="px-6 py-4 text-xs">${c.expiry_date ? new Date(c.expiry_date).toLocaleDateString() : 'Never'}</td>
            <td class="px-6 py-4 text-right">
                <button onclick="deleteCoupon(${c.id})" class="text-red-400 hover:text-red-300"><i data-lucide="trash" class="w-4 h-4"></i></button>
            </td>
        </tr>
    `).join('');
    
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

window.deleteCoupon = async (id) => {
    if (!confirm("Delete coupon?")) return;
    await supabase.from('coupons').delete().eq('id', id);
    loadCoupons();
};

// ---------------------------------------------------------
// SECTION 5: REVIEWS
// ---------------------------------------------------------
async function loadReviews() {
    const list = document.getElementById('reviews-list');
    const { data: reviews } = await supabase
        .from('reviews')
        .select('*, profiles(full_name), products(name)')
        .order('created_at', { ascending: false });

    if (!reviews) return;

    list.innerHTML = reviews.map(r => `
        <div class="glass-card p-4 rounded-lg flex justify-between items-start">
            <div>
                <div class="flex items-center gap-2 mb-1">
                    <span class="text-white font-bold text-sm">${escapeHTML(r.profiles?.full_name || 'Anonymous')}</span>
                    <span class="text-slate-500 text-xs">on ${escapeHTML(r.products?.name)}</span>
                </div>
                <div class="flex text-yellow-400 text-xs mb-2">
                    ${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}
                </div>
                <p class="text-slate-300 text-sm">${escapeHTML(r.comment || '')}</p>
            </div>
            <button onclick="deleteReview(${r.id})" class="text-slate-500 hover:text-red-400"><i data-lucide="x" class="w-4 h-4"></i></button>
        </div>
    `).join('');
    
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

window.deleteReview = async (id) => {
    if (!confirm("Remove review?")) return;
    await supabase.from('reviews').delete().eq('id', id);
    loadReviews();
};

// ---------------------------------------------------------
// SECTION 6: CUSTOMERS
// ---------------------------------------------------------
async function loadCustomers() {
    const tbody = document.getElementById('customers-table-body');
    const { data: users } = await supabase
        .from('profiles')
        .select('*')
        .neq('role', 'admin');

    tbody.innerHTML = users.map(u => `
        <tr class="hover:bg-white/5 transition">
            <td class="px-6 py-4 flex items-center gap-3">
                <div class="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs text-white">
                    ${u.full_name ? escapeHTML(u.full_name[0]) : 'U'}
                </div>
                <span class="text-white text-sm">${escapeHTML(u.full_name || 'Unknown')}</span>
            </td>
            <td class="px-6 py-4 text-sm">${escapeHTML(u.email)}</td>
            <td class="px-6 py-4 text-xs">${new Date(u.created_at).toLocaleDateString()}</td>
            <td class="px-6 py-4 text-right text-xs uppercase bg-slate-800/50 rounded px-2">Customer</td>
        </tr>
    `).join('');
}

// ---------------------------------------------------------
// UTILS & FORM HANDLERS
// ---------------------------------------------------------
function setupForms() {
    // Product Form
    document.getElementById('product-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('prod-id').value;
        const data = {
            name: document.getElementById('prod-name').value,
            price: parseFloat(document.getElementById('prod-price').value),
            stock_quantity: parseInt(document.getElementById('prod-stock').value),
            category: document.getElementById('prod-category').value,
            image_url: document.getElementById('prod-image').value
        };

        let res;
        if (id) {
            res = await supabase.from('products').update(data).eq('id', id);
        } else {
            res = await supabase.from('products').insert([data]);
        }

        if (res.error) window.showToast("Error saving product", 'error');
        else {
            window.showToast("Product saved successfully!", 'success');
            document.getElementById('product-modal').classList.add('hidden');
            loadProducts();
        }
    });

    // Coupon Form
    document.getElementById('add-coupon-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
            code: document.getElementById('coupon-code').value.toUpperCase(),
            discount_percent: parseInt(document.getElementById('coupon-percent').value),
            expiry_date: document.getElementById('coupon-expiry').value || null
        };

        const { error } = await supabase.from('coupons').insert([data]);
        if (error) window.showToast("Error creating coupon", 'error');
        else {
            window.showToast("Coupon created!", 'success');
            e.target.reset();
            loadCoupons();
        }
    });
}