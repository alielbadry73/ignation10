// Test script to verify favorites persistence
console.log('🧪 Testing Favorites Persistence...');

// Check if favorites exist in localStorage
const favorites = JSON.parse(localStorage.getItem('favorites')) || [];
console.log('📚 Current favorites in localStorage:', favorites);

// Add a test favorite if none exist
if (favorites.length === 0) {
    console.log('➕ Adding test favorite...');
    const testFavorites = ['mathematics', 'physics'];
    localStorage.setItem('favorites', JSON.stringify(testFavorites));
    console.log('✅ Test favorites added:', testFavorites);
} else {
    console.log('✅ Favorites already exist:', favorites);
}

// Verify the data persists
setTimeout(() => {
    const updatedFavorites = JSON.parse(localStorage.getItem('favorites')) || [];
    console.log('🔄 Favorites after 2 seconds:', updatedFavorites);
    
    if (updatedFavorites.length > 0) {
        console.log('✅ SUCCESS: Favorites are persisting!');
    } else {
        console.log('❌ FAILED: Favorites are being cleared');
    }
}, 2000);
