// ==========================================
// FILE: src/scripts/AuthContext.js
// PURPOSE: Centralized Authentication & RBAC Logic
// ==========================================

import supabase from '../services/supabase.js';

class AuthContext {
    constructor() {
        this.currentUser = null;
        this.userProfile = null;
        this.listeners = [];
        this.isLoading = true;
    }

    /**
     * Initialize the Auth Listener
     */
    async init() {
        // 1. Check for Hash in URL (Recovery/OAuth Callback)
        const { data: { session }, error } = await supabase.auth.getSession();
        
        // Listen for Supabase Auth Changes
        supabase.auth.onAuthStateChange(async (event, session) => {
            console.log(`[Auth] Event: ${event}`);

            if (session?.user) {
                this.currentUser = session.user;
                await this.fetchUserProfile(this.currentUser.id);
                
                // Security Check: Ban System
                if (this.userProfile?.is_banned) {
                    await this.logout("Your account has been suspended. Please contact support.");
                    return;
                }

                this.updateGlobalState();

                // Redirect Logic on Login/Initial Session
                if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
                    this.handleRedirect();
                }

            } else {
                this.currentUser = null;
                this.userProfile = null;
                this.updateGlobalState();
            }
            
            this.isLoading = false;
            this.notifyListeners();
        });
    }

    /**
     * Handle Role-Based Redirects
     */
    handleRedirect() {
        const currentPath = window.location.pathname;
        const role = this.userProfile?.role || 'user';

        // Prevent infinite loops if already on the correct page
        if (role === 'admin') {
            if (!currentPath.includes('admin.html')) {
                console.log("[Auth] Redirecting Admin to Dashboard");
                window.location.href = 'admin.html';
            }
        } else {
            // Customer/User
            if (currentPath.includes('login.html') || currentPath.includes('admin.html')) {
                console.log("[Auth] Redirecting Customer to Shop");
                window.location.href = 'index.html';
            }
        }
    }

    /**
     * Fetch extended user profile (Role, Ban Status)
     */
    async fetchUserProfile(userId) {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) throw error;
            this.userProfile = data;
        } catch (error) {
            console.error("Error fetching profile:", error);
            // Fallback for new users who might not have a profile yet
            this.userProfile = { role: 'customer', is_banned: false };
        }
    }

    /**
     * Login with Google
     */
    async loginWithGoogle() {
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/index.html`
                }
            });
            if (error) throw error;
        } catch (error) {
            console.error("Login failed:", error);
            alert("Login failed: " + error.message);
        }
    }

    /**
     * Logout Function
     */
    async logout(message = "Logged out successfully") {
        await supabase.auth.signOut();
        this.currentUser = null;
        this.userProfile = null;
        this.updateGlobalState();
        window.showToast?.(message, 'info');
        
        // Redirect to home if on protected route
        if (window.location.pathname.includes('admin.html') || 
            window.location.pathname.includes('user-dashboard.html')) {
            window.location.href = 'index.html';
        }
    }

    /**
     * Update Window Globals for Backward Compatibility
     */
    updateGlobalState() {
        window.currentUser = this.currentUser;
        window.userProfile = this.userProfile;
        
        // Dispatch event for other scripts
        const event = new CustomEvent('auth:updated', { 
            detail: { user: this.currentUser, profile: this.userProfile } 
        });
        window.dispatchEvent(event);
    }

    /**
     * Subscribe to Auth Changes
     */
    subscribe(callback) {
        this.listeners.push(callback);
        // Immediate callback with current state
        if (!this.isLoading) callback(this.currentUser, this.userProfile);
    }

    notifyListeners() {
        this.listeners.forEach(cb => cb(this.currentUser, this.userProfile));
    }

    /**
     * Protect Routes (Admin/User)
     */
    protectRoute() {
        const path = window.location.pathname;
        
        // Wait for auth to load
        const check = setInterval(() => {
            if (this.isLoading) return;
            clearInterval(check);

            if (path.includes('admin.html')) {
                if (!this.currentUser || this.userProfile?.role !== 'admin') {
                    window.location.href = 'index.html';
                }
            } else if (path.includes('user-dashboard.html')) {
                if (!this.currentUser) {
                    window.location.href = 'login.html';
                }
            }
        }, 100);
    }
}

// Export Singleton
const authService = new AuthContext();
export default authService;
