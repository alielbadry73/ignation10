const sqlite3 = require('sqlite3').verbose();

// Connect to database
const db = new sqlite3.Database('../igway.db', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    return;
  }
  console.log('✅ Connected to the database');
});

// Clean up trial data
console.log('🧹 Cleaning up trial data...');

// 1. Remove duplicate courses (keep only first 6)
db.run('DELETE FROM courses WHERE id > 6', (err) => {
  if (err) {
    console.error('Error removing duplicate courses:', err.message);
  } else {
    console.log('✅ Removed duplicate courses');
  }
});

// 2. Remove orders with undefined student names
db.run('DELETE FROM orders WHERE student_name IS NULL OR student_name = "undefined"', (err) => {
  if (err) {
    console.error('Error removing orders with undefined names:', err.message);
  } else {
    console.log('✅ Removed orders with undefined student names');
  }
});

// 3. Remove any test users (if they exist)
db.run('DELETE FROM users WHERE email LIKE "%test%" OR email LIKE "%demo%" OR email LIKE "%sample%"', (err) => {
  if (err) {
    console.error('Error removing test users:', err.message);
  } else {
    console.log('✅ Removed test users');
  }
});

// 4. Remove any test students (if they exist)
db.run('DELETE FROM students WHERE email LIKE "%test%" OR email LIKE "%demo%" OR email LIKE "%sample%"', (err) => {
  if (err) {
    console.error('Error removing test students:', err.message);
  } else {
    console.log('✅ Removed test students');
  }
});

// 5. Remove any test teachers (if they exist)
db.run('DELETE FROM teachers WHERE email LIKE "%test%" OR email LIKE "%demo%" OR email LIKE "%sample%"', (err) => {
  if (err) {
    console.error('Error removing test teachers:', err.message);
  } else {
    console.log('✅ Removed test teachers');
  }
});

// 6. Clean up any orphaned enrollments
db.run('DELETE FROM enrollments WHERE user_id NOT IN (SELECT id FROM users) AND student_id NOT IN (SELECT id FROM students)', (err) => {
  if (err) {
    console.error('Error removing orphaned enrollments:', err.message);
  } else {
    console.log('✅ Removed orphaned enrollments');
  }
});

// 7. Clean up any orphaned order items
db.run('DELETE FROM order_items WHERE order_id NOT IN (SELECT id FROM orders)', (err) => {
  if (err) {
    console.error('Error removing orphaned order items:', err.message);
  } else {
    console.log('✅ Removed orphaned order items');
  }
});

// Show final counts
setTimeout(() => {
  console.log('\n📊 Final database counts:');
  
  db.get('SELECT COUNT(*) as count FROM users', (err, row) => {
    if (!err) console.log(`Users: ${row.count}`);
  });
  
  db.get('SELECT COUNT(*) as count FROM courses', (err, row) => {
    if (!err) console.log(`Courses: ${row.count}`);
  });
  
  db.get('SELECT COUNT(*) as count FROM orders', (err, row) => {
    if (!err) console.log(`Orders: ${row.count}`);
  });
  
  db.get('SELECT COUNT(*) as count FROM enrollments', (err, row) => {
    if (!err) console.log(`Enrollments: ${row.count}`);
  });
  
  // Close database connection
  setTimeout(() => {
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err.message);
      } else {
        console.log('\n✅ Database cleanup completed successfully!');
      }
    });
  }, 1000);
}, 2000);
