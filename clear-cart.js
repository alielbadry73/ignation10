// Clear Cart Script - Run this in browser console to clear all cart data

console.log('🧹 Clearing all cart data...');

// Clear all cart-related localStorage items
localStorage.removeItem('cart');
localStorage.removeItem('favorites');
localStorage.removeItem('bookCart');
localStorage.removeItem('enrollCourse');
localStorage.removeItem('pendingCartAction');

console.log('✅ All cart data cleared from localStorage');

// Clear cart manager if available
if (window.cartManager) {
    window.cartManager.clearCart();
    console.log('✅ Cart manager cleared');
} else {
    console.log('⚠️ Cart manager not available');
}

// Force update cart count
if (window.updateCartCount) {
    window.updateCartCount();
    console.log('✅ Cart count updated');
}

// Reload page to ensure clean state
console.log('🔄 Reloading page...');
window.location.reload();






