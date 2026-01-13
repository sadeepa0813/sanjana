/**
 * 3D Store - Customer App Logic
 * Handles product display, ordering, and customer interactions
 */

// Initialize Supabase Client
const supabase = window.supabase.createClient(
    SUPABASE_CONFIG.url,
    SUPABASE_CONFIG.anonKey
);

// Global state
let currentProduct = null;

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    loadProducts();
});

// Load Products from Supabase
async function loadProducts() {
    const container = document.getElementById('productsContainer');
    
    try {
        const { data: products, error } = await supabase
            .from('products')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (!products || products.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <span>📭</span>
                    <h3>No Products Available</h3>
                    <p>Check back soon for exciting new products!</p>
                </div>
            `;
            return;
        }

        // Create product grid
        const grid = document.createElement('div');
        grid.className = 'product-grid fade-in';
        
        products.forEach(product => {
            const card = createProductCard(product);
            grid.appendChild(card);
        });

        container.innerHTML = '';
        container.appendChild(grid);

    } catch (error) {
        console.error('Error loading products:', error);
        container.innerHTML = `
            <div class="empty-state">
                <span>⚠️</span>
                <p>Failed to load products. Please refresh the page.</p>
            </div>
        `;
    }
}

// Create Product Card Element
function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'card-3d product-card';
    card.onclick = () => openOrderModal(product);
    
    card.innerHTML = `
        <div class="product-img-box">
            <img src="${product.image_url}" 
                 class="product-img" 
                 alt="${product.name}"
                 onerror="this.src='https://via.placeholder.com/400x300?text=No+Image'">
        </div>
        <div class="product-info">
            <h3>${product.name}</h3>
            <span class="product-price mono">Rs. ${product.price.toLocaleString()}</span>
            <p class="product-desc">${product.description || ''}</p>
        </div>
    `;
    
    return card;
}

// Open Order Modal
function openOrderModal(product) {
    currentProduct = product;
    const modal = document.getElementById('orderModal');
    const modalBody = document.getElementById('orderModalBody');
    
    modalBody.innerHTML = `
        <h2 style="margin-bottom: 25px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 15px;">
            Complete Your Order
        </h2>
        
        <div style="display: flex; gap: 20px; margin-bottom: 30px; align-items: center;">
            <img src="${product.image_url}" 
                 style="width: 100px; height: 100px; border-radius: 12px; object-fit: cover;"
                 onerror="this.src='https://via.placeholder.com/100'">
            <div>
                <h3 style="color: var(--primary); font-size: 1.3rem; margin-bottom: 5px;">${product.name}</h3>
                <p class="mono" style="font-size: 1.1rem; color: var(--accent);">Rs. ${product.price.toLocaleString()}</p>
                <p style="opacity: 0.7; font-size: 0.9rem; margin-top: 5px;">${product.description || ''}</p>
            </div>
        </div>

        <form id="orderForm" onsubmit="handleOrderSubmit(event)">
            <div class="form-group">
                <label>Your Name *</label>
                <input type="text" 
                       name="customerName" 
                       required 
                       placeholder="Enter your full name"
                       autocomplete="name">
            </div>
            
            <div class="form-group">
                <label>Quantity</label>
                <select name="quantity" onchange="updateOrderTotal()">
                    ${[1,2,3,4,5,6,7,8,9,10].map(n => `<option value="${n}">${n}</option>`).join('')}
                </select>
            </div>

            <div class="form-group">
                <label>Additional Requirements (Optional)</label>
                <textarea name="requirements" 
                          rows="3" 
                          placeholder="Any special requests? (e.g., gift wrapping, specific color)"></textarea>
            </div>

            <div style="margin: 25px 0; padding: 18px; background: rgba(0,0,0,0.3); border-radius: 12px; 
                        display: flex; justify-content: space-between; align-items: center; border: 1px solid rgba(255,255,255,0.05);">
                <span style="font-weight: 600; font-size: 1.05rem;">Total Amount:</span>
                <span class="mono" style="font-size: 1.6rem; color: var(--success); font-weight: 700;" id="orderTotal">
                    Rs. ${product.price.toLocaleString()}
                </span>
            </div>

            <div style="display: flex; gap: 15px;">
                <button type="button" class="btn-3d btn-secondary" onclick="closeOrderModal()" style="flex: 1;">
                    Cancel
                </button>
                <button type="submit" class="btn-3d btn-primary" style="flex: 2;">
                    Place Order 🚀
                </button>
            </div>
        </form>
    `;
    
    modal.classList.add('open');
}

// Update Order Total
function updateOrderTotal() {
    const form = document.getElementById('orderForm');
    const quantity = parseInt(form.quantity.value);
    const total = currentProduct.price * quantity;
    document.getElementById('orderTotal').textContent = `Rs. ${total.toLocaleString()}`;
}

// Handle Order Submission
async function handleOrderSubmit(event) {
    event.preventDefault();
    const form = event.target;
    
    const orderData = {
        tracking_id: generateTrackingId(),
        customer_name: form.customerName.value.trim(),
        product_id: currentProduct.id,
        product_name: currentProduct.name,
        price: currentProduct.price,
        quantity: parseInt(form.quantity.value),
        total: currentProduct.price * parseInt(form.quantity.value),
        requirements: form.requirements.value.trim() || null,
        status: 'Pending'
    };

    try {
        // Insert order into Supabase
        const { data, error } = await supabase
            .from('orders')
            .insert([orderData])
            .select()
            .single();

        if (error) throw error;

        // Close order modal
        closeOrderModal();
        
        // Show success modal
        showSuccessModal(orderData);

    } catch (error) {
        console.error('Error placing order:', error);
        showToast('Failed to place order. Please try again.', 'error');
    }
}

// Generate Tracking ID
function generateTrackingId() {
    return 'TRK-' + Math.floor(1000 + Math.random() * 9000);
}

// Show Success Modal
function showSuccessModal(order) {
    const modal = document.getElementById('successModal');
    const modalBody = document.getElementById('successModalBody');
    
    const whatsappMsg = encodeURIComponent(
        `Hi! I placed an order on 3D Store 🛍️\n\n` +
        `📦 Order Details:\n` +
        `━━━━━━━━━━━━━━━\n` +
        `👤 Customer: ${order.customer_name}\n` +
        `🏷️ Product: ${order.product_name}\n` +
        `📊 Quantity: ${order.quantity}\n` +
        `💰 Total: Rs. ${order.total.toLocaleString()}\n` +
        `🔖 Tracking ID: ${order.tracking_id}\n` +
        (order.requirements ? `📝 Requirements: ${order.requirements}\n` : '') +
        `━━━━━━━━━━━━━━━\n\n` +
        `Please confirm my order. Thank you! 😊`
    );

    const whatsappUrl = WHATSAPP_CONFIG.phoneNumber 
        ? `https://wa.me/${WHATSAPP_CONFIG.phoneNumber}?text=${whatsappMsg}`
        : `https://wa.me/?text=${whatsappMsg}`;
    
    modalBody.innerHTML = `
        <div style="text-align: center;">
            <div class="success-icon">✓</div>
            <h2 style="color: var(--success); margin-bottom: 10px;">Order Placed Successfully!</h2>
            <p style="opacity: 0.8; margin-bottom: 25px;">Thank you for shopping with us</p>
            
            <div class="tracking-display mono" onclick="copyTrackingId('${order.tracking_id}')">
                ${order.tracking_id}
            </div>
            <p style="font-size: 0.85rem; opacity: 0.6; margin-bottom: 25px;">
                Click to copy • Use this ID to track your order
            </p>

            <div style="text-align: left; background: rgba(255,255,255,0.05); padding: 20px; border-radius: 12px; margin-bottom: 25px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                    <span>Product:</span>
                    <strong>${order.product_name}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                    <span>Quantity:</span>
                    <strong>${order.quantity}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.1);">
                    <span>Total:</span>
                    <strong class="mono" style="color: var(--success);">Rs. ${order.total.toLocaleString()}</strong>
                </div>
            </div>

            <a href="${whatsappUrl}" 
               target="_blank" 
               class="btn-3d btn-success" 
               style="width: 100%; text-decoration: none; margin-bottom: 15px;"
               onclick="closeSuccessModal()">
                Open WhatsApp 💬
            </a>

            <button class="btn-3d btn-secondary" onclick="closeSuccessModal()" style="width: 100%;">
                Close
            </button>
        </div>
    `;
    
    modal.classList.add('open');
}

// Copy Tracking ID to Clipboard
function copyTrackingId(trackingId) {
    navigator.clipboard.writeText(trackingId).then(() => {
        showToast('Tracking ID copied!', 'success');
    }).catch(err => {
        console.error('Failed to copy:', err);
        showToast('Failed to copy. Please copy manually.', 'error');
    });
}

// Close Order Modal
function closeOrderModal() {
    document.getElementById('orderModal').classList.remove('open');
    currentProduct = null;
}

// Close Success Modal
function closeSuccessModal() {
    document.getElementById('successModal').classList.remove('open');
}

// Close modal on outside click
window.onclick = function(event) {
    const orderModal = document.getElementById('orderModal');
    const successModal = document.getElementById('successModal');
    
    if (event.target === orderModal) {
        closeOrderModal();
    }
    if (event.target === successModal) {
        closeSuccessModal();
    }
};

// Toast Notification
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = type === 'success' ? 'show success' : (type === 'error' ? 'show error' : 'show');
    setTimeout(() => {
        toast.className = '';
    }, 3000);
}
