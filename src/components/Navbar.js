// ==========================================
// FILE: src/components/Navbar.js
// PURPOSE: Render the navigation bar
// ==========================================

export function renderNavbar(user, profile) {
    const navAuth = document.getElementById('nav-auth');
    if (!navAuth) return;

    if (user) {
        navAuth.innerHTML = `
            <div class="flex items-center gap-4">
                <div class="relative mr-2">
                    <button onclick="viewCart()" class="p-2 hover:bg-white/5 rounded-lg transition relative">
                        <i data-lucide="shopping-cart" id="cart-icon" class="w-5 h-5 text-slate-300 hover:text-white"></i>
                        <span id="cart-count" class="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center hidden">0</span>
                    </button>
                </div>
                <span class="text-sm text-gray-300 hidden md:block">${user.email.split('@')[0]}</span>
                ${profile?.role === 'admin' ? 
                    '<a href="admin.html" class="px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-sm hover:bg-cyan-500/30 transition">Admin</a>' : ''}
                <a href="user-dashboard.html" class="text-slate-400 hover:text-white transition flex items-center gap-1">
                    <i data-lucide="user" class="w-4 h-4"></i>
                    <span class="hidden md:inline">Dashboard</span>
                </a>
                <button onclick="logout()" class="text-red-400 hover:text-red-300 transition">
                    <i data-lucide="log-out" class="w-4 h-4"></i>
                </button>
            </div>
        `;
    } else {
        navAuth.innerHTML = `
            <div class="flex items-center gap-4">
                <a href="feedback.html" class="text-slate-400 hover:text-white hidden md:block">Reviews</a>
                <a href="login.html" class="px-4 py-2 rounded-full border border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10 transition">Login</a>
            </div>
        `;
    }
}
