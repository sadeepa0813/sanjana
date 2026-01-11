// ==========================================
// FILE: src/scripts/feedback.js
// PURPOSE: Feedback system logic
// DEPENDENCIES: supabase
// ==========================================

import supabase from '../services/supabase.js';

// Feedback System Functionality
let currentFilter = 'all';
let currentPage = 1;
let hasMoreReviews = true;
let selectedRating = 0;

// Expose functions to window
window.initFeedbackSystem = initFeedbackSystem;
window.likeReview = likeReview;
window.reportReview = reportReview;
window.deleteReview = deleteReview;

// Initialize Feedback System
async function initFeedbackSystem() {
    // Load products for dropdown
    await loadProductsForReview();
    
    // Setup rating stars
    setupRatingStars();
    
    // Load reviews
    await loadReviews();
    
    // Setup filters
    setupFilters();
    
    // Setup form submission
    setupReviewForm();
}

async function loadProductsForReview() {
    const select = document.getElementById('review-product');
    if (!select) return;

    try {
        const { data: products, error } = await supabase
            .from('products')
            .select('id, name')
            .order('name');

        if (error) throw error;

        select.innerHTML = '<option value="">Choose a product...</option>';
        
        products?.forEach(product => {
            const option = document.createElement('option');
            option.value = product.id;
            option.textContent = product.name;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading products:', error);
    }
}

function setupRatingStars() {
    const stars = document.querySelectorAll('#rating-stars .star');
    const ratingInput = document.getElementById('review-rating');
    const ratingText = document.getElementById('rating-text');
    
    const ratingTexts = [
        'Click stars to rate',
        'Poor - Not satisfied',
        'Fair - Could be better',
        'Good - Meets expectations',
        'Very Good - Happy with purchase',
        'Excellent - Exceeded expectations'
    ];
    
    stars.forEach(star => {
        star.addEventListener('click', function() {
            const rating = parseInt(this.dataset.rating);
            selectedRating = rating;
            ratingInput.value = rating;
            
            // Update star display
            stars.forEach((s, index) => {
                if (index < rating) {
                    s.classList.add('active');
                    s.classList.remove('inactive');
                } else {
                    s.classList.remove('active');
                    s.classList.add('inactive');
                }
            });
            
            // Update text
            ratingText.textContent = ratingTexts[rating];
        });
        
        star.addEventListener('mouseover', function() {
            const rating = parseInt(this.dataset.rating);
            stars.forEach((s, index) => {
                if (index < rating) {
                    s.classList.add('active');
                    s.classList.remove('inactive');
                } else {
                    s.classList.remove('active');
                    s.classList.add('inactive');
                }
            });
            ratingText.textContent = ratingTexts[rating];
        });
        
        star.addEventListener('mouseout', function() {
            stars.forEach((s, index) => {
                if (index < selectedRating) {
                    s.classList.add('active');
                    s.classList.remove('inactive');
                } else {
                    s.classList.remove('active');
                    s.classList.add('inactive');
                }
            });
            ratingText.textContent = ratingTexts[selectedRating];
        });
    });
    
    // Initialize stars as inactive
    stars.forEach(star => {
        star.classList.add('inactive');
    });
}

async function loadReviews() {
    const list = document.getElementById('reviews-list');
    if (!list) return;

    if (currentPage === 1) {
        list.innerHTML = '<div class="text-center py-10"><div class="animate-spin inline-block w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full"></div></div>';
    }

    try {
        let query = supabase
            .from('reviews')
            .select(`
                *,
                products (name, image_url),
                profiles (email, full_name)
            `)
            .order('created_at', { ascending: false })
            .range((currentPage - 1) * 5, currentPage * 5 - 1);

        // Apply filters
        if (currentFilter !== 'all') {
            if (currentFilter === 'verified') {
                query = query.eq('is_verified_purchase', true);
            } else {
                query = query.eq('rating', parseInt(currentFilter));
            }
        }

        const { data: reviews, error } = await query;

        if (error) throw error;

        if (currentPage === 1) {
            list.innerHTML = '';
        }

        if (!reviews || reviews.length === 0) {
            if (currentPage === 1) {
                list.innerHTML = '<div class="text-center py-10 text-slate-400">No reviews found. Be the first to review!</div>';
            } else {
                hasMoreReviews = false;
                document.getElementById('load-more-reviews').classList.add('hidden');
            }
            return;
        }

        // Update stats
        await updateReviewStats();

        // Render reviews
        reviews.forEach(review => {
            const reviewElement = createReviewElement(review);
            list.appendChild(reviewElement);
        });

        // Update load more button
        hasMoreReviews = reviews.length === 5;
        const loadMoreBtn = document.getElementById('load-more-reviews');
        if (loadMoreBtn) {
            loadMoreBtn.classList.toggle('hidden', !hasMoreReviews);
        }

        if (window.initIcons) window.initIcons();
        else if (typeof lucide !== 'undefined') lucide.createIcons();
    } catch (error) {
        console.error('Error loading reviews:', error);
        list.innerHTML = '<div class="text-center py-10 text-red-400">Error loading reviews</div>';
    }
}

function createReviewElement(review) {
    const product = review.products;
    const user = review.profiles;
    
    const div = document.createElement('div');
    div.className = 'review-card rounded-xl p-6';
    
    // Create stars HTML
    let starsHtml = '';
    for (let i = 1; i <= 5; i++) {
        if (i <= review.rating) {
            starsHtml += '<i data-lucide="star" class="w-5 h-5 text-yellow-400 fill-yellow-400"></i>';
        } else {
            starsHtml += '<i data-lucide="star" class="w-5 h-5 text-slate-600"></i>';
        }
    }
    
    div.innerHTML = `
        <div class="flex justify-between items-start mb-4">
            <div>
                <div class="flex items-center gap-2 mb-2">
                    ${starsHtml}
                    ${review.is_verified_purchase ? `
                        <span class="verified-badge text-xs text-white px-2 py-1 rounded-full flex items-center gap-1">
                            <i data-lucide="check-circle" class="w-3 h-3"></i> Verified Purchase
                        </span>
                    ` : ''}
                </div>
                <h4 class="font-bold text-lg">${product?.name || 'Product'}</h4>
                <p class="text-slate-400 text-sm">Reviewed by ${user?.full_name || user?.email?.split('@')[0] || 'User'}</p>
            </div>
            <span class="text-sm text-slate-500">${timeAgo(review.created_at)}</span>
        </div>
        
        ${product?.image_url ? `
            <div class="mb-4">
                <img src="${product.image_url}" alt="${product.name}" class="w-20 h-20 rounded-lg object-cover">
            </div>
        ` : ''}
        
        <p class="text-slate-300 mb-4">${review.comment || 'No comment provided.'}</p>
        
        <div class="flex justify-between items-center pt-4 border-t border-white/5">
            <div class="flex items-center gap-4">
                <button onclick="likeReview(${review.id})" class="flex items-center gap-1 text-slate-400 hover:text-cyan-400">
                    <i data-lucide="thumbs-up" class="w-4 h-4"></i>
                    <span class="text-sm">Helpful</span>
                </button>
                <button onclick="reportReview(${review.id})" class="flex items-center gap-1 text-slate-400 hover:text-red-400">
                    <i data-lucide="flag" class="w-4 h-4"></i>
                    <span class="text-sm">Report</span>
                </button>
            </div>
            ${user?.id === window.currentUser?.id ? `
                <button onclick="deleteReview(${review.id})" class="text-red-400 hover:text-red-300 text-sm">
                    Delete
                </button>
            ` : ''}
        </div>
    `;
    
    return div;
}

async function updateReviewStats() {
    try {
        // Get total reviews
        const { count: totalCount } = await supabase
            .from('reviews')
            .select('*', { count: 'exact', head: true });

        document.getElementById('total-reviews').textContent = totalCount || 0;

        // Get verified reviews count
        const { count: verifiedCount } = await supabase
            .from('reviews')
            .select('*', { count: 'exact', head: true })
            .eq('is_verified_purchase', true);

        document.getElementById('verified-reviews').textContent = `${verifiedCount || 0} verified`;

        // Get rating distribution
        const { data: ratingData } = await supabase
            .from('reviews')
            .select('rating');

        if (ratingData) {
            const distribution = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0};
            ratingData.forEach(r => distribution[r.rating]++);
            
            const total = Object.values(distribution).reduce((a, b) => a + b, 0);
            const average = total > 0 ? 
                (ratingData.reduce((sum, r) => sum + r.rating, 0) / total).toFixed(1) : '0.0';
            
            document.getElementById('average-rating').textContent = average;
            
            // Update distribution bars
            for (let i = 1; i <= 5; i++) {
                const count = distribution[i] || 0;
                const percentage = total > 0 ? (count / total) * 100 : 0;
                
                document.getElementById(`count-${i}`).textContent = count;
                document.getElementById(`bar-${i}`).style.width = `${percentage}%`;
            }
        }
    } catch (error) {
        console.error('Error updating review stats:', error);
    }
}

function setupFilters() {
    const filterButtons = document.querySelectorAll('[data-filter]');
    
    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Update active button
            filterButtons.forEach(btn => {
                btn.classList.remove('border-cyan-500/50', 'text-cyan-400', 'bg-cyan-500/10');
                btn.classList.add('border-slate-700', 'text-slate-400');
            });
            
            this.classList.add('border-cyan-500/50', 'text-cyan-400', 'bg-cyan-500/10');
            this.classList.remove('border-slate-700', 'text-slate-400');
            
            // Update filter and reload reviews
            currentFilter = this.dataset.filter;
            currentPage = 1;
            loadReviews();
        });
    });
}

function setupReviewForm() {
    const form = document.getElementById('submit-review-form');
    if (!form) return;

    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        if (!window.currentUser) {
            window.showToast('Please login to submit a review', 'error');
            setTimeout(() => window.location.href = 'login.html', 1500);
            return;
        }
        
        const productId = document.getElementById('review-product').value;
        const rating = parseInt(document.getElementById('review-rating').value);
        const comment = document.getElementById('review-comment').value;
        const isVerified = document.getElementById('review-verified').checked;
        
        if (!productId) {
            window.showToast('Please select a product', 'error');
            return;
        }
        
        if (rating < 1 || rating > 5) {
            window.showToast('Please select a rating', 'error');
            return;
        }
        
        if (!comment.trim()) {
            window.showToast('Please write a review comment', 'error');
            return;
        }
        
        const btn = this.querySelector('button[type="submit"]');
        const originalText = btn.textContent;
        btn.disabled = true;
        btn.textContent = 'Submitting...';
        
        try {
            const { error } = await supabase
                .from('reviews')
                .insert([{
                    product_id: productId,
                    user_id: window.currentUser.id,
                    rating: rating,
                    comment: comment.trim(),
                    is_verified_purchase: isVerified
                }])
                .upsert({ onConflict: 'product_id,user_id' });
            
            if (error) throw error;
            
            window.showToast('Review submitted successfully!', 'success');
            
            // Reset form
            this.reset();
            selectedRating = 0;
            document.getElementById('review-rating').value = 0;
            document.getElementById('rating-text').textContent = 'Click stars to rate';
            
            // Reset stars
            const stars = document.querySelectorAll('#rating-stars .star');
            stars.forEach(star => {
                star.classList.remove('active');
                star.classList.add('inactive');
            });
            
            // Reload reviews
            currentPage = 1;
            await loadReviews();
            await updateReviewStats();
        } catch (error) {
            window.showToast('Error submitting review: ' + error.message, 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = originalText;
        }
    });
}

// Review Actions
async function likeReview(reviewId) {
    if (!window.currentUser) {
        window.showToast('Please login to like reviews', 'error');
        return;
    }
    
    window.showToast('Thanks for your feedback!', 'success');
    // Implement like functionality
}

async function reportReview(reviewId) {
    const reason = prompt('Please enter reason for reporting this review:');
    if (!reason) return;
    
    try {
        // Store report in database (you need a reports table)
        window.showToast('Review reported. Thank you for your feedback.', 'success');
    } catch (error) {
        window.showToast('Error reporting review', 'error');
    }
}

async function deleteReview(reviewId) {
    if (!confirm('Are you sure you want to delete your review?')) return;
    
    try {
        const { error } = await supabase
            .from('reviews')
            .delete()
            .eq('id', reviewId)
            .eq('user_id', window.currentUser.id);
        
        if (error) throw error;
        
        window.showToast('Review deleted', 'success');
        
        // Reload reviews
        currentPage = 1;
        await loadReviews();
        await updateReviewStats();
    } catch (error) {
        window.showToast('Error deleting review: ' + error.message, 'error');
    }
}

// Load more reviews
document.getElementById('load-more-reviews')?.addEventListener('click', function() {
    if (hasMoreReviews) {
        currentPage++;
        loadReviews();
    }
});

// Utility function
function timeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    let interval = Math.floor(seconds / 31536000);
    if (interval >= 1) return interval + "y ago";

    interval = Math.floor(seconds / 2592000);
    if (interval >= 1) return interval + "mo ago";

    interval = Math.floor(seconds / 86400);
    if (interval >= 1) return interval + "d ago";

    interval = Math.floor(seconds / 3600);
    if (interval >= 1) return interval + "h ago";

    interval = Math.floor(seconds / 60);
    if (interval >= 1) return interval + "m ago";

    return "Just now";
}
