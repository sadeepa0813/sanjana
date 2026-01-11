// ==========================================
// FILE: src/scripts/dashboard.js
// PURPOSE: User dashboard logic
// DEPENDENCIES: supabase
// ==========================================

import supabase from '../services/supabase.js';

// User Dashboard Logic

let spendingChart = null;

// Expose functions to window
window.loadDashboardData = loadDashboardData;
window.editProfile = editProfile;
window.changePassword = changePassword;
window.viewNotifications = viewNotifications;
window.markAllAsRead = markAllAsRead;
window.clearWishlist = clearWishlist;
window.removeFromWishlist = removeFromWishlist;

async function loadDashboardData() {
    // Wait for currentUser to be available (from main.js)
    if (!window.currentUser) {
        console.warn('Dashboard waiting for user...');
        return; 
    }
    const currentUser = window.currentUser;
    const userProfile = window.userProfile;

    // Set welcome message
    const userNameElement = document.getElementById('user-name');
    if (userNameElement) userNameElement.textContent = userProfile?.full_name || currentUser.email.split('@')[0];
    
    const userEmailElement = document.getElementById('user-email');
    if (userEmailElement) userEmailElement.textContent = currentUser.email;
    
    const welcomeNameElement = document.getElementById('welcome-name');
    if (welcomeNameElement) welcomeNameElement.textContent = userProfile?.full_name || 'Elite Member';

    // Load all data in parallel
    await Promise.all([
        loadStats(),
        loadRecentOrders(),
        loadWishlist(),
        loadNotifications()
    ]);

    initSpendingChart();
}

async function loadStats() {
    const currentUser = window.currentUser;
    try {
        // Orders Stats
        const { data: orders, error: ordersError } = await supabase
            .from('orders')
            .select('id, total_amount, created_at, status')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false });

        if (ordersError) throw ordersError;

        const totalOrders = orders.length;
        const lastOrder = orders[0];
        const totalSpent = orders
            .filter(o => o.status !== 'cancelled')
            .reduce((sum, o) => sum + o.total_amount, 0);

        document.getElementById('total-orders-count').textContent = totalOrders;
        document.getElementById('last-order-date').textContent = lastOrder ? new Date(lastOrder.created_at).toLocaleDateString() : 'Never';
        document.getElementById('total-spent').textContent = window.formatCurrency(totalSpent);

        // Wishlist Stats
        const { count: wishlistCount, error: wishlistError } = await supabase
            .from('wishlists')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', currentUser.id);

        if (!wishlistError) {
            document.getElementById('wishlist-count').textContent = wishlistCount || 0;
        }

        // Reviews Stats
        const { data: reviews, error: reviewsError } = await supabase
            .from('reviews')
            .select('rating')
            .eq('user_id', currentUser.id);

        if (!reviewsError && reviews.length > 0) {
            document.getElementById('reviews-count').textContent = reviews.length;
            const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
            document.getElementById('avg-rating').textContent = avg.toFixed(1);
        }

    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

async function loadRecentOrders() {
    const currentUser = window.currentUser;
    const tableBody = document.getElementById('orders-table');
    if (!tableBody) return;

    try {
        const { data: orders, error } = await supabase
            .from('orders')
            .select(
                `
                *,
                order_items (
                    id,
                    products (name)
                )
            `)
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false })
            .limit(5);

        if (error) throw error;

        tableBody.innerHTML = '';
        
        if (orders.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="6" class="p-4 text-center text-slate-400">No orders found</td></tr>';
            return;
        }

        orders.forEach(order => {
            const itemCount = order.order_items.length;
            const firstItem = order.order_items[0]?.products?.name || 'Item';
            const itemsText = itemCount > 1 ? `${firstItem} + ${itemCount - 1} others` : firstItem;

            const row = document.createElement('tr');
            row.className = 'border-b border-white/5 hover:bg-white/5 transition';
            row.innerHTML = 
                `
                <td class="p-4 text-sm font-mono text-cyan-400">${order.order_number}</td>
                <td class="p-4 text-sm text-slate-300">${new Date(order.created_at).toLocaleDateString()}</td>
                <td class="p-4 text-sm text-slate-300">${itemsText}</td>
                <td class="p-4 text-sm font-bold text-white">$${order.total_amount.toFixed(2)}</td>
                <td class="p-4">
                    <span class="order-status-badge status-${order.status}">${order.status.toUpperCase()}</span>
                </td>
                <td class="p-4">
                    <button onclick="viewOrderDetails('${order.id}')" class="text-slate-400 hover:text-cyan-400 transition">
                        <i data-lucide="eye" class="w-4 h-4"></i>
                    </button>
                </td>
            `
            tableBody.appendChild(row);
        });
        
        if (window.initIcons) window.initIcons();

    } catch (error) {
        console.error('Error loading orders:', error);
        tableBody.innerHTML = '<tr><td colspan="6" class="p-4 text-center text-red-400">Error loading orders</td></tr>';
    }
}

async function loadWishlist() {
    const currentUser = window.currentUser;
    const container = document.getElementById('wishlist-items');
    if (!container) return;

    try {
        const { data: items, error } = await supabase
            .from('wishlists')
            .select(
                `
                id,
                products (*)
            `)
            .eq('user_id', currentUser.id);

        if (error) throw error;

        container.innerHTML = '';
        
        if (items.length === 0) {
            container.innerHTML = '<div class="col-span-full text-center py-8 text-slate-400">Your wishlist is empty</div>';
            return;
        }

        // Calculate total value
        const totalValue = items.reduce((sum, item) => sum + (item.products?.price || 0), 0);
        document.getElementById('wishlist-value').textContent = window.formatCurrency(totalValue);

        items.forEach(item => {
            const product = item.products;
            if (!product) return;

            const card = document.createElement('div');
            card.className = 'glass-card p-4 rounded-lg flex gap-4 items-center group';
            card.innerHTML = 
                `
                <img src="${product.image_url}" alt="${product.name}" class="w-16 h-16 rounded object-cover">
                <div class="flex-1 min-w-0">
                    <h4 class="font-medium truncate">${product.name}</h4>
                    <p class="text-cyan-400 font-bold">$${product.price}</p>
                </div>
                <div class="flex flex-col gap-2">
                    <button onclick="addToCart(${product.id}, '${product.name.replace(/'/g, "'")}', ${product.price})" 
                            class="p-2 bg-cyan-500/10 text-cyan-400 rounded hover:bg-cyan-500/20 transition">
                        <i data-lucide="shopping-cart" class="w-4 h-4"></i>
                    </button>
                    <button onclick="removeFromWishlist(${item.id})" class="p-2 bg-red-500/10 text-red-400 rounded hover:bg-red-500/20 transition">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                </div>
            `
            container.appendChild(card);
        });
        
        if (window.initIcons) window.initIcons();

    } catch (error) {
        console.error('Error loading wishlist:', error);
    }
}

async function removeFromWishlist(id) {
    try {
        const { error } = await supabase
            .from('wishlists')
            .delete()
            .eq('id', id);

        if (error) throw error;
        
        window.showToast('Removed from wishlist', 'success');
        loadWishlist(); // Reload
        loadStats(); // Update stats
    } catch (error) {
        window.showToast('Error removing item', 'error');
    }
}

async function clearWishlist() {
    const currentUser = window.currentUser;
    if (!confirm('Clear all items from wishlist?')) return;

    try {
        const { error } = await supabase
            .from('wishlists')
            .delete()
            .eq('user_id', currentUser.id);

        if (error) throw error;
        
        window.showToast('Wishlist cleared', 'success');
        loadWishlist();
        loadStats();
    } catch (error) {
        window.showToast('Error clearing wishlist', 'error');
    }
}

async function loadNotifications() {
    const currentUser = window.currentUser;
    const list = document.getElementById('notifications-list');
    const unreadBadge = document.getElementById('unread-count');
    if (!list) return;

    try {
        const { data: notifications, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false })
            .limit(10);

        if (error) throw error;

        const unreadCount = notifications.filter(n => !n.is_read).length;
        unreadBadge.textContent = unreadCount;
        unreadBadge.classList.toggle('hidden', unreadCount === 0);

        list.innerHTML = '';
        
        if (notifications.length === 0) {
            list.innerHTML = '<div class="text-center py-8 text-slate-400">No notifications</div>';
            return;
        }

        notifications.forEach(n => {
            const div = document.createElement('div');
            div.className = `p-3 rounded-lg border border-white/5 ${n.is_read ? 'bg-white/5 opacity-60' : 'bg-cyan-500/10 border-cyan-500/20'}`;
            div.innerHTML = 
                `
                <div class="flex justify-between items-start mb-1">
                    <h4 class="font-bold text-sm ${n.is_read ? 'text-slate-300' : 'text-cyan-400'}">${n.title}</h4>
                    <span class="text-xs text-slate-500">${new Date(n.created_at).toLocaleDateString()}</span>
                </div>
                <p class="text-sm text-slate-400">${n.message}</p>
            `
            list.appendChild(div);
        });

    } catch (error) {
        console.error('Error loading notifications:', error);
    }
}

async function markAllAsRead() {
    const currentUser = window.currentUser;
    try {
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('user_id', currentUser.id)
            .eq('is_read', false);

        if (error) throw error;
        
        loadNotifications();
        window.showToast('All notifications marked as read', 'success');
    } catch (error) {
        window.showToast('Error updating notifications', 'error');
    }
}

function initSpendingChart() {
    const ctx = document.getElementById('spendingChart')?.getContext('2d');
    if (!ctx) return;

    if (spendingChart) spendingChart.destroy();

    // Mock data for now - in a real app, aggregation would be done on the server or via complex queries
    const data = {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [{
            label: 'Spending ($)',
            data: [0, 0, 0, 0, 0, 0], // Placeholder
            borderColor: '#06b6d4',
            backgroundColor: 'rgba(6, 182, 212, 0.1)',
            fill: true,
            tension: 0.4
        }]
    };

    if (typeof Chart !== 'undefined') {
        spendingChart = new Chart(ctx, {
            type: 'line',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                        ticks: { color: '#94a3b8' }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: '#94a3b8' }
                    }
                }
            }
        });
    }
}

function editProfile() {
    const userProfile = window.userProfile;
    // Simple prompt implementation for now
    const newName = prompt('Enter new full name:', userProfile?.full_name);
    const newPhone = prompt('Enter new phone number:', userProfile?.phone);
    const newAddress = prompt('Enter new address:', userProfile?.address);

    if (newName || newPhone || newAddress) {
        updateProfile({
            full_name: newName || userProfile?.full_name,
            phone: newPhone || userProfile?.phone,
            address: newAddress || userProfile?.address
        });
    }
}

async function updateProfile(updates) {
    const currentUser = window.currentUser;
    try {
        const { error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', currentUser.id);

        if (error) throw error;

        window.showToast('Profile updated successfully', 'success');
        // Refresh profile data
        const { data } = await supabase.from('profiles').select('*').eq('id', currentUser.id).single();
        window.userProfile = data;
        loadDashboardData(); // Refresh UI
    } catch (error) {
        window.showToast('Error updating profile: ' + error.message, 'error');
    }
}

function changePassword() {
    const newPassword = prompt('Enter new password:');
    if (!newPassword) return;

    supabase.auth.updateUser({ password: newPassword })
        .then(({ data, error }) => {
            if (error) window.showToast(error.message, 'error');
            else window.showToast('Password updated successfully', 'success');
        });
}

function viewNotifications() {
    document.getElementById('notifications-list').scrollIntoView({ behavior: 'smooth' });
}
