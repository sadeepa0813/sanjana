// ==========================================
// FILE: src/scripts/CartContext.js
// PURPOSE: Manage Shopping Cart State & Logic
// ==========================================

import config from '../config/config.js';

class CartContext {
    constructor() {
        this.cart = JSON.parse(localStorage.getItem('cart')) || [];
        this.listeners = [];
    }

    /**
     * Add Item to Cart
     */
    addItem(product) {
        const existingItem = this.cart.find(item => item.id === product.id);
        
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            this.cart.push({
                id: product.id,
                name: product.name,
                price: product.price,
                image_url: product.image_url,
                quantity: 1
            });
        }
        
        this.save();
        this.notify();
        window.showToast?.(`${product.name} added to cart!`, 'success');
    }

    /**
     * Remove Item from Cart
     */
    removeItem(productId) {
        this.cart = this.cart.filter(item => item.id !== productId);
        this.save();
        this.notify();
        window.showToast?.('Item removed from cart', 'success');
    }

    /**
     * Update Quantity
     */
    updateQuantity(productId, delta) {
        const item = this.cart.find(i => i.id === productId);
        if (item) {
            item.quantity += delta;
            if (item.quantity <= 0) {
                this.removeItem(productId);
            } else {
                this.save();
                this.notify();
            }
        }
    }

    /**
     * Clear Cart
     */
    clear() {
        this.cart = [];
        this.save();
        this.notify();
    }

    /**
     * Get Cart Total
     */
    getTotal() {
        return this.cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    }

    /**
     * Get Total Items Count
     */
    getCount() {
        return this.cart.reduce((sum, item) => sum + item.quantity, 0);
    }

    /**
     * Checkout via WhatsApp
     */
    checkout(user) {
        if (this.cart.length === 0) {
            window.showToast?.('Your cart is empty', 'warning');
            return;
        }

        if (!user) {
            window.showToast?.('Please login to checkout', 'warning');
            setTimeout(() => window.location.href = 'login.html', 1500);
            return;
        }

        let message = "Hello LankaShop Elite,\n\nI would like to place an order:\n\n";
        this.cart.forEach((item, index) => {
            message += `${index + 1}. ${item.name} - $${item.price} x ${item.quantity} = $${(item.price * item.quantity).toFixed(2)}\n`;
        });
        
        const total = this.getTotal().toFixed(2);
        message += `\n*Total Amount: $${total}*\n`;
        
        // Customer Details
        message += `\n*Customer Details:*\n`;
        message += `Name: ${user.user_metadata?.full_name || user.email}\n`;
        message += `Email: ${user.email}\n`;
        message += `Date: ${new Date().toLocaleString()}\n`;
        
        message += `\nPlease confirm my order and send payment details.`;

        const phoneNumber = config.whatsapp?.number || '94771234567'; // Fallback
        const url = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
        
        window.showToast?.('Opening WhatsApp for checkout...', 'success');
        
        setTimeout(() => {
            window.open(url, '_blank');
            this.clear();
            // Close modal if open
            document.querySelector('.fixed')?.remove();
        }, 1500);
    }

    // --- Internal Methods ---

    save() {
        localStorage.setItem('cart', JSON.stringify(this.cart));
        // Update global var for legacy scripts
        window.cart = this.cart; 
    }

    subscribe(callback) {
        this.listeners.push(callback);
        callback(this.cart);
    }

    notify() {
        this.listeners.forEach(cb => cb(this.cart));
        // Update UI
        this.updateCartIcon();
    }

    updateCartIcon() {
        const cartCount = document.getElementById('cart-count');
        if (cartCount) {
            const count = this.getCount();
            cartCount.textContent = count;
            cartCount.classList.toggle('hidden', count === 0);
        }
    }
}

const cartService = new CartContext();
export default cartService;
