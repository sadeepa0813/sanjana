// ==========================================
// FILE: src/components/CartModal.js
// PURPOSE: Render the cart modal
// ==========================================

export function renderCartModal(cart, total) {
    let cartHtml = '';
    
    cart.forEach(item => {
        cartHtml += `
            <div class="flex items-center justify-between p-4 border-b border-white/5">
                <div class="flex items-center gap-4">
                    <div class="w-16 h-16 bg-slate-800 rounded"></div>
                    <div>
                        <h4 class="font-medium">${item.name}</h4>
                        <p class="text-cyan-400">$${item.price.toFixed(2)} × ${item.quantity}</p>
                    </div>
                </div>
                <div class="flex items-center gap-4">
                    <span class="font-bold">$${(item.price * item.quantity).toFixed(2)}</span>
                    <button onclick="removeFromCart(${item.id})" class="text-red-400 hover:text-red-300">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                </div>
            </div>
        `;
    });
    
    return `
        <div class="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
            <div class="glass-card rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
                <div class="p-6">
                    <div class="flex justify-between items-center mb-6">
                        <h2 class="text-2xl font-bold">Your Cart</h2>
                        <button onclick="this.closest('.fixed').remove()" class="text-slate-400 hover:text-white">
                            <i data-lucide="x" class="w-6 h-6"></i>
                        </button>
                    </div>
                    
                    ${cartHtml}
                    
                    <div class="p-4 border-t border-white/5">
                        <div class="flex justify-between items-center mb-4">
                            <span class="text-lg">Total:</span>
                            <span class="text-2xl font-bold text-cyan-400">$${total.toFixed(2)}</span>
                        </div>
                        
                        <div class="flex gap-3">
                            <button onclick="checkoutCart()" class="btn-neon flex-1 py-3 rounded-lg font-bold">
                                Checkout via WhatsApp
                            </button>
                            <button onclick="clearCart()" class="px-6 py-3 rounded border border-red-500/30 text-red-400 hover:bg-red-500/10">
                                Clear Cart
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}
