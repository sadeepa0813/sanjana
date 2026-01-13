/**
 * 3D Store - Admin Panel Logic
 * Handles product management, order management, and image uploads
 */

// Initialize Supabase Client
const supabase = window.supabase.createClient(
    SUPABASE_CONFIG.url,
    SUPABASE_CONFIG.anonKey
);

// Global state
let currentFilter = 'all';
let deleteTarget = null;
let allOrders = [];

// Check authentication on page load
window.addEventListener('DOMContentLoaded', async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
        window.location.href = 'admin-login.html';
        return;
    }
    
    // Set last login time
    document.getElementById('lastLogin').textContent = new Date().toLocaleString();
    
    // Load initial data
    await loadDashboardStats();
    await loadProducts();
    await loadOrders();
    
    // Set up real-time subscriptions
    setupRealtimeSubscriptions();
});

// Setup Real-time Subscriptions
function setupRealtimeSubscriptions() {
    // Listen for new products
    supabase
        .channel('products-channel')
        .on('postgres_changes', 
            { event: 'INSERT', schema: 'public', table: 'products' },
            (payload) => {
                showNotification('New product added!');
                loadProducts();
                loadDashboardStats();
            }
        )
        .subscribe();
    
    // Listen for new orders
    supabase
        .channel('orders-channel')
        .on('postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'orders' },
            (payload) => {
                showNotification('New order received!');
                loadOrders();
                loadDashboardStats();
            }
        )
        .subscribe();
}

// Show Notification
function showNotification(message) {
    if (!APP_CONFIG.enableNotifications) return;
    
    showToast(message, 'success');
    
    // Browser notification (if permitted)
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('3D Store Admin', {
            body: message,
            icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y="75" font-size="75">📦</text></svg>'
        });
    }
}

// Load Dashboard Statistics
async function loadDashboardStats() {
    try {
        // Get products count
        const { count: productsCount } = await supabase
            .from('products')
            .select('*', { count: 'exact', head: true });
        
        // Get orders count
        const { count: ordersCount } = await supabase
            .from('orders')
            .select('*', { count: 'exact', head: true });
        
        // Get pending orders count
        const { count: pendingCount } = await supabase
            .from('orders')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'Pending');
        
        // Get confirmed orders count
        const { count: confirmedCount } = await supabase
            .from('orders')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'Confirmed');
        
        // Update UI
        document.getElementById('totalProducts').textContent = productsCount || 0;
        document.getElementById('totalOrders').textContent = ordersCount || 0;
        document.getElementById('pendingOrders').textContent = pendingCount || 0;
        document.getElementById('confirmedOrders').textContent = confirmedCount || 0;
        
        // Load recent orders
        await loadRecentOrders();
        
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Load Recent Orders
async function loadRecentOrders() {
    try {
        const { data: orders, error } = await supabase
            .from('orders')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(5);
        
        if (error) throw error;
        
        const container = document.getElementById('recentOrdersTable');
        
        if (!orders || orders.length === 0) {
            container.innerHTML = '<p style="text-align: center; opacity: 0.6; padding: 20px;">No orders yet</p>';
            return;
        }
        
        container.innerHTML = `
            <div class="table-responsive">
                <table>
                    <thead>
                        <tr>
                            <th>Tracking ID</th>
                            <th>Customer</th>
                            <th>Product</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${orders.map(order => `
                            <tr>
                                <td class="mono">${order.tracking_id}</td>
                                <td>${order.customer_name}</td>
                                <td>${order.product_name}</td>
                                <td><span class="status-badge status-${order.status.toLowerCase()}">${order.status}</span></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } catch (error) {
        console.error('Error loading recent orders:', error);
    }
}

// Preview Image
function previewImage(event) {
    const file = event.target.files[0];
    const preview = document.getElementById('imagePreview');
    const fileName = document.getElementById('fileName');
    
    if (file) {
        fileName.textContent = file.name;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
            preview.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    }
}

// Handle Add Product
async function handleAddProduct(event) {
    event.preventDefault();
    const form = event.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    
    // Disable button
    submitBtn.disabled = true;
    submitBtn.textContent = 'Uploading...';
    
    try {
        // Get form data
        const name = form.name.value.trim();
        const price = parseFloat(form.price.value);
        const description = form.description.value.trim();
        const imageFile = document.getElementById('productImage').files[0];
        
        if (!imageFile) {
            throw new Error('Please select an image');
        }
        
        // Upload image to Supabase Storage
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${fileName}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('product-images')
            .upload(filePath, imageFile);
        
        if (uploadError) throw uploadError;
        
        // Get public URL
        const { data: { publicUrl } } = supabase.storage
            .from('product-images')
            .getPublicUrl(filePath);
        
        // Insert product into database
        const { data, error } = await supabase
            .from('products')
            .insert([{
                name: name,
                price: price,
                description: description,
                image_url: publicUrl
            }])
            .select()
            .single();
        
        if (error) throw error;
        
        // Success
        showToast('Product added successfully!', 'success');
        form.reset();
        document.getElementById('imagePreview').classList.add('hidden');
        document.getElementById('fileName').textContent = 'Choose image file...';
        
        // Reload products
        await loadProducts();
        await loadDashboardStats();
        
    } catch (error) {
        console.error('Error adding product:', error);
        showToast(error.message || 'Failed to add product', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = '✨ Add Product';
    }
}

// Load Products
async function loadProducts() {
    try {
        const { data: products, error } = await supabase
            .from('products')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        const container = document.getElementById('productsTableContainer');
        
        if (!products || products.length === 0) {
            container.innerHTML = '<p style="text-align: center; opacity: 0.6; padding: 20px;">No products yet</p>';
            return;
        }
        
        container.innerHTML = `
            <div class="table-responsive">
                <table>
                    <thead>
                        <tr>
                            <th>Image</th>
                            <th>Name</th>
                            <th>Price</th>
                            <th>Description</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${products.map(product => `
                            <tr>
                                <td>
                                    <img src="${product.image_url}" 
                                         style="width: 50px; height: 50px; border-radius: 8px; object-fit: cover;"
                                         onerror="this.src='https://via.placeholder.com/50'">
                                </td>
                                <td><strong>${product.name}</strong></td>
                                <td class="mono">Rs. ${product.price.toLocaleString()}</td>
                                <td style="max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                                    ${product.description || '-'}
                                </td>
                                <td>
                                    <button class="btn-3d btn-danger btn-small" 
                                            onclick="openDeleteModal('product', ${product.id}, '${product.name}')">
                                        Delete
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } catch (error) {
        console.error('Error loading products:', error);
        showToast('Failed to load products', 'error');
    }
}

// Load Orders
async function loadOrders() {
    try {
        const { data: orders, error } = await supabase
            .from('orders')
            .select(`
                *,
                products (
                    name,
                    image_url
                )
            `)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        allOrders = orders || [];
        displayOrders(allOrders);
        
    } catch (error) {
        console.error('Error loading orders:', error);
        showToast('Failed to load orders', 'error');
    }
}

// Display Orders
function displayOrders(orders) {
    const container = document.getElementById('ordersTableContainer');
    
    // Filter orders
    const filteredOrders = currentFilter === 'all' 
        ? orders 
        : orders.filter(o => o.status === currentFilter);
    
    if (!filteredOrders || filteredOrders.length === 0) {
        container.innerHTML = '<p style="text-align: center; opacity: 0.6; padding: 20px;">No orders found</p>';
        return;
    }
    
    container.innerHTML = `
        <div class="table-responsive">
            <table>
                <thead>
                    <tr>
                        <th>Tracking ID</th>
                        <th>Customer</th>
                        <th>Product</th>
                        <th>Qty</th>
                        <th>Total</th>
                        <th>Status</th>
                        <th>Date</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${filteredOrders.map(order => `
                        <tr>
                            <td class="mono">${order.tracking_id}</td>
                            <td>${order.customer_name}</td>
                            <td>${order.product_name}</td>
                            <td class="mono">${order.quantity}</td>
                            <td class="mono">Rs. ${order.total.toLocaleString()}</td>
                            <td><span class="status-badge status-${order.status.toLowerCase()}">${order.status}</span></td>
                            <td style="font-size: 0.85rem; opacity: 0.7;">${new Date(order.created_at).toLocaleDateString()}</td>
                            <td>
                                <div style="display: flex; gap: 5px;">
                                    ${order.status === 'Pending' ? `
                                        <button class="btn-3d btn-success btn-small" 
                                                onclick="updateOrderStatus('${order.tracking_id}', 'Confirmed')"
                                                title="Confirm">
                                            ✓
                                        </button>
                                    ` : ''}
                                    ${order.status !== 'Cancelled' ? `
                                        <button class="btn-3d btn-danger btn-small" 
                                                onclick="updateOrderStatus('${order.tracking_id}', 'Cancelled')"
                                                title="Cancel">
                                            ✕
                                        </button>
                                    ` : ''}
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// Filter Orders
function filterOrders(status) {
    currentFilter = status;
    displayOrders(allOrders);
}

// Update Order Status
async function updateOrderStatus(trackingId, newStatus) {
    try {
        const { error } = await supabase
            .from('orders')
            .update({ status: newStatus })
            .eq('tracking_id', trackingId);
        
        if (error) throw error;
        
        showToast(`Order ${newStatus.toLowerCase()}!`, 'success');
        await loadOrders();
        await loadDashboardStats();
        
    } catch (error) {
        console.error('Error updating order:', error);
        showToast('Failed to update order', 'error');
    }
}

// Open Delete Modal
function openDeleteModal(type, id, name) {
    deleteTarget = { type, id, name };
    document.getElementById('deleteMessage').textContent = 
        `Are you sure you want to delete "${name}"? This action cannot be undone.`;
    document.getElementById('deleteModal').classList.add('open');
}

// Close Delete Modal
function closeDeleteModal() {
    document.getElementById('deleteModal').classList.remove('open');
    deleteTarget = null;
}

// Confirm Delete
async function confirmDelete() {
    if (!deleteTarget) return;
    
    try {
        if (deleteTarget.type === 'product') {
            // Get product to find image URL
            const { data: product } = await supabase
                .from('products')
                .select('image_url')
                .eq('id', deleteTarget.id)
                .single();
            
            // Delete from database
            const { error } = await supabase
                .from('products')
                .delete()
                .eq('id', deleteTarget.id);
            
            if (error) throw error;
            
            // Try to delete image from storage
            if (product && product.image_url) {
                const fileName = product.image_url.split('/').pop();
                await supabase.storage
                    .from('product-images')
                    .remove([fileName]);
            }
            
            showToast('Product deleted successfully!', 'success');
            await loadProducts();
            await loadDashboardStats();
        }
        
        closeDeleteModal();
        
    } catch (error) {
        console.error('Error deleting:', error);
        showToast('Failed to delete item', 'error');
    }
}

// Show Section
function showSection(section) {
    // Update nav
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Update sections
    document.querySelectorAll('.admin-section').forEach(sec => {
        sec.classList.remove('active');
    });
    document.getElementById(section).classList.add('active');
    
    // Reload data for section
    if (section === 'dashboard') {
        loadDashboardStats();
    } else if (section === 'products') {
        loadProducts();
    } else if (section === 'orders') {
        loadOrders();
    }
}

// Handle Logout
async function handleLogout() {
    if (!confirm('Are you sure you want to logout?')) return;
    
    try {
        await supabase.auth.signOut();
        window.location.href = 'admin-login.html';
    } catch (error) {
        console.error('Logout error:', error);
        showToast('Failed to logout', 'error');
    }
}

// Toast Notification
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = type === 'success' ? 'show success' : (type === 'error' ? 'show error' : 'show');
    setTimeout(() => {
        toast.className = '';
    }, 3000);
}

// Request notification permission
if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
}
