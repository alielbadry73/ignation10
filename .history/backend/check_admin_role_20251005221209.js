const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('../igway.db', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    return;
  }
  console.log('✅ Connected to the database');
});

db.get('SELECT * FROM users WHERE email = "admin@igway.com"', (err, user) => {
  if (err) {
    console.error('Error getting admin user:', err.message);
    return;
  }
  
  if (!user) {
    console.log('❌ Admin user not found!');
    return;
  }
  
  console.log('Admin user details:');
  console.log('- ID:', user.id);
  console.log('- Email:', user.email);
  console.log('- Role:', user.role);
  console.log('- First Name:', user.first_name);
  console.log('- Last Name:', user.last_name);
  console.log('- Username:', user.username);
  console.log('- Password hash:', user.password ? 'Present' : 'Missing');
  
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err.message);
    } else {
      console.log('✅ Database connection closed');
    }
  });
});
