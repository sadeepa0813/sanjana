// ==========================================
// FILE: src/scripts/admin.js
// PURPOSE: Admin dashboard logic
// DEPENDENCIES: supabase (via window.sb or import)
// ==========================================

// Import supabase directly for cleaner code, though window.sb is available from main.js
import supabase from '../services/supabase.js';

// Admin Panel Functionality
let revenueChart = null;
let orderStatusChart = null;
let selectedUsers = new Set();
let selectedTab = 'products';

// Expose functions to window for onclick handlers
window.initAdminDashboard = initAdminDashboard;
window.editProduct = editProduct;
window.deleteProduct = deleteProduct;
window.viewOrderDetails = viewOrderDetails;
window.updateOrderStatus = updateOrderStatus;
window.deleteOrder = deleteOrder; // Added
window.sendMessageToUser = sendMessageToUser;
window.toggleUserRole = toggleUserRole;
window.banUser = banUser; // Added
window.copyDiscountCode = copyDiscountCode;
window.deleteDiscount = deleteDiscount;
window.refreshDashboard = refreshDashboard;
window.exportOrders = exportOrders;
window.showAddProductModal = showAddProductModal;
window.showAddDiscountModal = showAddDiscountModal;
window.showSendNotificationModal = showSendNotificationModal;
window.closeModal = closeModal;
window.promoteToAdmin = promoteToAdmin;

// Initialize Admin Dashboard
async function initAdminDashboard() {
    // Wait for Auth to be ready if not already
    if (!window.currentUser) {
        // AuthContext will handle redirect if not logged in
        return; 
    }

    if (window.userProfile?.role !== 'admin') {
        window.location.href = 'index.html';
        return;
    }

    console.log("Admin Access Granted");

    // Set admin email
    document.getElementById('admin-email').textContent = window.currentUser.email;
    
    // Load all dashboard data
    await loadAdminStats();
    await loadAdminProducts();
    await loadAdminOrders();
    await loadAdminUsers();
    await loadDiscounts();
    await loadRecentNotifications();
    await initCharts();
    
    // Setup tab switching
    setupTabs();
    
    // Setup form handlers (including Image Preview)
    setupFormHandlers();
}

// ... existing code ...

function setupFormHandlers() {
    // Image Preview Logic
    const imageInput = document.getElementById('prod-image');
    if (imageInput) {
        imageInput.addEventListener('input', function() {
            const url = this.value;
            const previewContainer = document.getElementById('image-preview-container');
            const previewImg = document.getElementById('image-preview');
            
            if (url) {
                previewImg.src = url;
                previewContainer.classList.remove('hidden');
            } else {
                previewContainer.classList.add('hidden');
            }
        });
        
        // Handle load errors
        document.getElementById('image-preview').addEventListener('error', function() {
            this.src = 'https://via.placeholder.com/150?text=Invalid+URL';
        });
    }

    // Add/Edit Product Form
    const addProductForm = document.getElementById('add-product-form');
    if (addProductForm) {
        addProductForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const name = document.getElementById('prod-name').value;
            const description = document.getElementById('prod-description').value;
            const category = document.getElementById('prod-category').value;
            const price = parseFloat(document.getElementById('prod-price').value);
            const originalPrice = document.getElementById('prod-original-price').value;
            const stock = parseInt(document.getElementById('prod-stock').value);
            const image = document.getElementById('prod-image').value;
            const discount = document.getElementById('prod-discount').value;
            const featured = document.getElementById('prod-featured').checked;
            const editingId = this.dataset.editingId; // Get ID if editing
            
            const btn = this.querySelector('button[type="submit"]');
            const originalText = btn.textContent;
            btn.disabled = true;
            btn.textContent = editingId ? 'Updating...' : 'Adding...';
            
            try {
                const productData = {
                    name,
                    description,
                    category,
                    price,
                    stock,
                    image_url: image,
                    is_featured: featured
                };
                
                if (originalPrice) productData.original_price = parseFloat(originalPrice);
                if (discount) productData.discount_percent = parseInt(discount);
                
                let result;
                if (editingId) {
                    // Update existing
                    result = await supabase
                        .from('products')
                        .update(productData)
                        .eq('id', editingId);
                } else {
                    // Insert new
                    result = await supabase
                        .from('products')
                        .insert([productData]);
                }
                
                if (result.error) throw result.error;
                
                window.showToast(editingId ? 'Product updated!' : 'Product added successfully!', 'success');
                closeModal('add-product-modal');
                this.reset();
                delete this.dataset.editingId; // Clear editing state
                document.querySelector('#add-product-modal h3').textContent = 'Add New Product';
                btn.textContent = 'Add Product';
                
                loadAdminProducts();
                loadAdminStats();
            } catch (error) {
                window.showToast('Error saving product: ' + error.message, 'error');
                btn.disabled = false;
                btn.textContent = originalText;
            }
        });
    }
    
    // Add Discount Form
    const addDiscountForm = document.getElementById('add-discount-form');
    if (addDiscountForm) {
        addDiscountForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const code = document.getElementById('discount-code').value.toUpperCase();
            const description = document.getElementById('discount-description').value;
            const percent = parseInt(document.getElementById('discount-percent').value);
            const maxUses = document.getElementById('discount-max-uses').value;
            const minValue = document.getElementById('discount-min-value').value;
            const validFrom = document.getElementById('discount-valid-from').value;
            const validUntil = document.getElementById('discount-valid-until').value;
            const isActive = document.getElementById('discount-active').checked;
            
            const btn = this.querySelector('button[type="submit"]');
            const originalText = btn.textContent;
            btn.disabled = true;
            btn.textContent = 'Creating...';
            
            try {
                const discountData = {
                    code,
                    description,
                    discount_percent: percent,
                    is_active: isActive
                };
                
                if (maxUses) discountData.max_uses = parseInt(maxUses);
                if (minValue) discountData.min_order_value = parseFloat(minValue);
                if (validFrom) discountData.valid_from = validFrom;
                if (validUntil) discountData.valid_until = validUntil;
                
                const { error } = await supabase
                    .from('discounts')
                    .insert([discountData]);
                
                if (error) throw error;
                
                window.showToast('Discount code created successfully!', 'success');
                closeModal('add-discount-modal');
                this.reset();
                loadDiscounts();
            } catch (error) {
                window.showToast('Error creating discount: ' + error.message, 'error');
            } finally {
                btn.disabled = false;
                btn.textContent = originalText;
            }
        });
    }
    
    // Send Notification Form
    const sendNotificationForm = document.getElementById('send-notification-form');
    if (sendNotificationForm) {
        sendNotificationForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const target = document.getElementById('notification-target').value;
            const type = document.getElementById('notification-type').value;
            const title = document.getElementById('notification-title').value;
            const message = document.getElementById('notification-message').value;
            
            const btn = this.querySelector('button[type="submit"]');
            const originalText = btn.textContent;
            btn.disabled = true;
            btn.textContent = 'Sending...';
            
            try {
                // Get users based on target
                let userQuery = supabase.from('profiles').select('id');
                
                if (target === 'admins') {
                    userQuery = userQuery.eq('role', 'admin');
                } else if (target === 'customers') {
                    userQuery = userQuery.eq('role', 'user');
                } else if (target === 'recent') {
                    const lastWeek = new Date();
                    lastWeek.setDate(lastWeek.getDate() - 7);
                    userQuery = userQuery.gte('created_at', lastWeek.toISOString());
                } else if (target === 'specific') {
                    const email = document.getElementById('specific-user-email').value;
                    if (!email) throw new Error('Please enter user email');
                    
                    const { data: user } = await supabase
                        .from('profiles')
                        .select('id')
                        .eq('email', email)
                        .single();
                    
                    if (!user) throw new Error('User not found');
                    
                    userQuery = { data: [user] };
                }
                
                const { data: users, error: userError } = await userQuery;
                if (userError) throw userError;
                
                if (!users || users.length === 0) {
                    throw new Error('No users found for the selected target');
                }
                
                // Create notifications for each user
                const notifications = users.map(user => ({
                    user_id: user.id,
                    title,
                    message,
                    type
                }));
                
                const { error: notifError } = await supabase
                    .from('notifications')
                    .insert(notifications);
                
                if (notifError) throw notifError;
                
                window.showToast(`Notification sent to ${users.length} users!`, 'success');
                this.reset();
                loadRecentNotifications();
            } catch (error) {
                window.showToast('Error sending notification: ' + error.message, 'error');
            } finally {
                btn.disabled = false;
                btn.textContent = originalText;
            }
        });
    }
    
    // Notification target change
    const notificationTarget = document.getElementById('notification-target');
    if (notificationTarget) {
        notificationTarget.addEventListener('change', function() {
            const specificField = document.getElementById('specific-user-field');
            specificField.classList.toggle('hidden', this.value !== 'specific');
        });
    }
}

// Modal Functions
function showAddProductModal() {
    const modal = document.getElementById('add-product-modal');
    const form = document.getElementById('add-product-form');
    
    // Reset for "Add" mode
    form.reset();
    delete form.dataset.editingId;
    modal.querySelector('h3').textContent = 'Add New Product';
    form.querySelector('button[type="submit"]').textContent = 'Add Product';
    
    modal.classList.remove('hidden');
}

function showAddDiscountModal() {
    document.getElementById('add-discount-modal').classList.remove('hidden');
}

function showSendNotificationModal() {
    document.getElementById('tab-notifications').classList.remove('hidden');
    document.querySelector('[data-tab="notifications"]').click();
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
}

// Product Management
async function editProduct(productId) {
    try {
        window.showToast('Loading product details...', 'info');
        const { data: product, error } = await supabase
            .from('products')
            .select('*')
            .eq('id', productId)
            .single();
            
        if (error) throw error;
        
        // Populate form
        document.getElementById('prod-name').value = product.name;
        document.getElementById('prod-category').value = product.category;
        document.getElementById('prod-description').value = product.description || '';
        document.getElementById('prod-price').value = product.price;
        document.getElementById('prod-original-price').value = product.original_price || '';
        document.getElementById('prod-stock').value = product.stock;
        document.getElementById('prod-image').value = product.image_url || '';
        document.getElementById('prod-discount').value = product.discount_percent || '';
        document.getElementById('prod-featured').checked = product.is_featured;
        
        // Set Editing State
        const form = document.getElementById('add-product-form');
        form.dataset.editingId = productId;
        
        // Update Modal UI
        const modal = document.getElementById('add-product-modal');
        modal.querySelector('h3').textContent = 'Edit Product';
        form.querySelector('button[type="submit"]').textContent = 'Update Product';
        
        modal.classList.remove('hidden');
        
    } catch (error) {
        window.showToast('Error loading product: ' + error.message, 'error');
    }
}

async function deleteProduct(productId) {
    if (!confirm('Are you sure you want to delete this product?')) return;
    
    try {
        const { error } = await supabase
            .from('products')
            .delete()
            .eq('id', productId);
        
        if (error) throw error;
        
        window.showToast('Product deleted successfully', 'success');
        loadAdminProducts();
        loadAdminStats();
    } catch (error) {
        window.showToast('Error deleting product: ' + error.message, 'error');
    }
}

// Order Management
async function viewOrderDetails(orderId) {
    try {
        const { data: order, error } = await supabase
            .from('orders')
            .select(`
                *,
                profiles (*),
                order_items (
                    quantity,
                    price_at_time,
                    products (*)
                )
            `)
            .eq('id', orderId)
            .single();
        
        if (error) throw error;
        
        document.getElementById('modal-order-number').textContent = order.order_number;
        
        const content = document.getElementById('order-details-content');
        const customer = order.profiles;
        
        let itemsHtml = '';
        order.order_items?.forEach(item => {
            const product = item.products;
            itemsHtml += `
                <div class="flex items-center justify-between py-2 border-b border-white/5">
                    <div class="flex items-center gap-3">
                        <img src="${product.image_url}" class="w-12 h-12 rounded object-cover">
                        <div>
                            <div class="font-medium">${product.name}</div>
                            <div class="text-sm text-slate-500">Quantity: ${item.quantity}</div>
                        </div>
                    </div>
                    <div class="text-cyan-400">$${item.price_at_time}</div>
                </div>
            `;
        });
        
        content.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div class="glass-card p-4 rounded-lg">
                    <h4 class="font-bold mb-3">Customer Information</h4>
                    <div class="space-y-2">
                        <div><span class="text-slate-400">Name:</span> ${customer?.full_name || 'Not provided'}</div>
                        <div><span class="text-slate-400">Email:</span> ${customer?.email}</div>
                        <div><span class="text-slate-400">Phone:</span> ${customer?.phone || 'Not provided'}</div>
                    </div>
                </div>
                <div class="glass-card p-4 rounded-lg">
                    <h4 class="font-bold mb-3">Order Information</h4>
                    <div class="space-y-2">
                        <div><span class="text-slate-400">Status:</span> 
                            <span class="px-2 py-1 rounded-full text-xs ${order.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' : 
                                order.status === 'delivered' ? 'bg-green-500/20 text-green-400' : 
                                'bg-cyan-500/20 text-cyan-400'}">${order.status.toUpperCase()}</span>
                        </div>
                        <div><span class="text-slate-400">Date:</span> ${new Date(order.created_at).toLocaleString()}</div>
                        <div><span class="text-slate-400">Payment:</span> ${order.payment_method}</div>
                        ${order.tracking_number ? `<div><span class="text-slate-400">Tracking:</span> ${order.tracking_number}</div>` : ''}
                    </div>
                </div>
            </div>
            
            <div class="glass-card p-4 rounded-lg mb-6">
                <h4 class="font-bold mb-3">Shipping Address</h4>
                <p class="text-slate-300">${order.shipping_address || 'Not provided'}</p>
            </div>
            
            <div class="glass-card p-4 rounded-lg mb-6">
                <h4 class="font-bold mb-3">Order Items</h4>
                ${itemsHtml || '<p class="text-slate-400">No items found</p>'}
                <div class="flex justify-between items-center pt-4 mt-4 border-t border-white/5">
                    <div class="text-lg font-bold">Total Amount</div>
                    <div class="text-2xl font-bold text-cyan-400">$${order.total_amount}</div>
                </div>
            </div>
            
            ${order.notes ? `
                <div class="glass-card p-4 rounded-lg">
                    <h4 class="font-bold mb-3">Customer Notes</h4>
                    <p class="text-slate-300">${order.notes}</p>
                </div>
            ` : ''}
            
            <div class="flex gap-3 pt-6">
                <button onclick="updateOrderStatus('${order.id}')" class="btn-neon px-6 py-2 rounded">Update Status</button>
                <button onclick="closeModal('order-details-modal')" class="px-6 py-2 rounded border border-slate-700 hover:bg-white/5">Close</button>
            </div>
        `;
        
        document.getElementById('order-details-modal').classList.remove('hidden');
        if (typeof lucide !== 'undefined') lucide.createIcons();
    } catch (error) {
        window.showToast('Error loading order details: ' + error.message, 'error');
    }
}

async function updateOrderStatus(orderId) {
    const statuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
    const currentStatus = prompt('Enter new status (pending, confirmed, processing, shipped, delivered, cancelled):');
    
    if (!currentStatus || !statuses.includes(currentStatus.toLowerCase())) {
        window.showToast('Invalid status', 'error');
        return;
    }
    
    try {
        const { error } = await supabase
            .from('orders')
            .update({ status: currentStatus.toLowerCase() })
            .eq('id', orderId);
        
        if (error) throw error;
        
        window.showToast('Order status updated!', 'success');
        loadAdminOrders(document.getElementById('order-filter').value);
        loadAdminStats();
        
        // Close modal if open
        closeModal('order-details-modal');
    } catch (error) {
        window.showToast('Error updating order: ' + error.message, 'error');
    }
}

// User Management
async function toggleUserRole(userId, currentRole) {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    
    if (!confirm(`Are you sure you want to ${newRole === 'admin' ? 'promote' : 'demote'} this user?`)) {
        return;
    }
    
    try {
        const { error } = await supabase
            .from('profiles')
            .update({ role: newRole })
            .eq('id', userId);
        
        if (error) throw error;
        
        window.showToast(`User ${newRole === 'admin' ? 'promoted to admin' : 'demoted to user'}`, 'success');
        loadAdminUsers();
    } catch (error) {
        window.showToast('Error updating user role: ' + error.message, 'error');
    }
}

async function promoteToAdmin() {
    if (selectedUsers.size === 0) {
        window.showToast('Please select users to promote', 'warning');
        return;
    }
    
    if (!confirm(`Promote ${selectedUsers.size} user(s) to admin?`)) {
        return;
    }
    
    try {
        const { error } = await supabase
            .from('profiles')
            .update({ role: 'admin' })
            .in('id', Array.from(selectedUsers));
        
        if (error) throw error;
        
        window.showToast(`${selectedUsers.size} user(s) promoted to admin`, 'success');
        selectedUsers.clear();
        loadAdminUsers();
    } catch (error) {
        window.showToast('Error promoting users: ' + error.message, 'error');
    }
}

async function banUser(userId, isCurrentlyBanned) {
    const action = isCurrentlyBanned ? 'unban' : 'ban';
    
    if (!confirm(`Are you sure you want to ${action} this user?`)) {
        return;
    }
    
    try {
        const { error } = await supabase
            .from('profiles')
            .update({ is_banned: !isCurrentlyBanned })
            .eq('id', userId);
        
        if (error) throw error;
        
        window.showToast(`User ${action}ned successfully`, 'success');
        loadAdminUsers();
    } catch (error) {
        window.showToast(`Error ${action}ning user: ` + error.message, 'error');
    }
}

async function deleteOrder(orderId) {
    if (!confirm('Are you sure you want to PERMANENTLY delete this order? This cannot be undone.')) return;
    
    try {
        // Delete order items first (if cascade is not set, but usually it is)
        await supabase.from('order_items').delete().eq('order_id', orderId);
        
        const { error } = await supabase
            .from('orders')
            .delete()
            .eq('id', orderId);
        
        if (error) throw error;
        
        window.showToast('Order deleted successfully', 'success');
        loadAdminOrders(document.getElementById('order-filter').value);
        loadAdminStats();
    } catch (error) {
        window.showToast('Error deleting order: ' + error.message, 'error');
    }
}

function sendMessageToUser(email) {
    window.showToast(`Opening WhatsApp to message ${email}...`, 'info');
    // Implement WhatsApp messaging
}

// Discount Management
function copyDiscountCode(code) {
    navigator.clipboard.writeText(code);
    window.showToast(`Copied: ${code}`, 'success');
}

async function deleteDiscount(discountId) {
    if (!confirm('Are you sure you want to delete this discount code?')) return;
    
    try {
        const { error } = await supabase
            .from('discounts')
            .delete()
            .eq('id', discountId);
        
        if (error) throw error;
        
        window.showToast('Discount code deleted', 'success');
        loadDiscounts();
    } catch (error) {
        window.showToast('Error deleting discount: ' + error.message, 'error');
    }
}

// Other Functions
function refreshDashboard() {
    window.showToast('Refreshing dashboard...', 'info');
    initAdminDashboard();
}

function exportOrders() {
    window.showToast('Exporting orders to CSV...', 'info');
    // Implement CSV export
}
