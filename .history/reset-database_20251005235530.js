const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Connect to database
const db = new sqlite3.Database('../igway.db');

console.log('🗑️  Starting database reset...');

// Delete all data from all tables
const tables = [
    'users',
    'teachers', 
    'courses',
    'enrollments',
    'orders',
    'order_items',
    'favorites',
    'flashcards',
    'flashcard_questions',
    'lectures',
    'password_resets'
];

let completed = 0;

tables.forEach(table => {
    db.run(`DELETE FROM ${table}`, (err) => {
        if (err) {
            if (err.message.includes('no such table')) {
                console.log(`⚠️  Table ${table} doesn't exist, skipping...`);
            } else {
                console.error(`❌ Error deleting from ${table}:`, err.message);
            }
        } else {
            console.log(`✅ Cleared table: ${table}`);
        }
        
        completed++;
        if (completed === tables.length) {
            console.log('\n🎉 Database reset complete!');
            console.log('📊 All user data, courses, orders, and other records have been removed.');
            console.log('🔄 You can now start fresh with the admin panel.');
            
            db.close((err) => {
                if (err) {
                    console.error('Error closing database:', err);
                } else {
                    console.log('🔒 Database connection closed.');
                }
            });
        }
    });
});
