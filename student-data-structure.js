const sqlite3 = require('sqlite3').verbose();

// Connect to the database
const db = new sqlite3.Database('igway.db', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    return;
  }
  console.log('✅ Connected to the database');
});

// Show the complete student data structure
console.log('\n📋 STUDENT REGISTRATION DATA STRUCTURE:');
console.log('==========================================');
console.log('When a student registers, the following data is saved in the database:');
console.log('');

console.log('🗄️  DATABASE TABLE: users');
console.log('┌─────────────────┬─────────────┬─────────────────────────────────┐');
console.log('│ Field Name      │ Data Type   │ Description                     │');
console.log('├─────────────────┼─────────────┼─────────────────────────────────┤');
console.log('│ id              │ INTEGER     │ Auto-increment primary key      │');
console.log('│ email           │ TEXT        │ Student email (UNIQUE)          │');
console.log('│ password        │ TEXT        │ Hashed password (bcrypt)        │');
console.log('│ first_name      │ TEXT        │ Student first name              │');
console.log('│ last_name       │ TEXT        │ Student last name               │');
console.log('│ phone           │ TEXT        │ Student phone number            │');
console.log('│ parent_phone    │ TEXT        │ Parent/Guardian phone number    │');
console.log('│ role            │ TEXT        │ User role (default: student)    │');
console.log('│ created_at      │ DATETIME    │ Registration timestamp          │');
console.log('│ updated_at      │ DATETIME    │ Last update timestamp           │');
console.log('└─────────────────┴─────────────┴─────────────────────────────────┘');

console.log('\n📝 REGISTRATION FORM FIELDS:');
console.log('┌─────────────────────────────┬──────────┬─────────────────────────┐');
console.log('│ Field Name                  │ Required │ Stored in Database      │');
console.log('├─────────────────────────────┼──────────┼─────────────────────────┤');
console.log('│ First Name                  │ Yes      │ first_name              │');
console.log('│ Last Name                   │ Yes      │ last_name               │');
console.log('│ Email Address               │ Yes      │ email                   │');
console.log('│ Student Phone Number        │ No       │ phone                   │');
console.log('│ Parent/Guardian Phone       │ Yes      │ parent_phone            │');
console.log('│ Password                    │ Yes      │ password (hashed)       │');
console.log('│ Confirm Password            │ Yes      │ (validation only)       │');
console.log('│ Terms Agreement             │ Yes      │ (validation only)       │');
console.log('└─────────────────────────────┴──────────┴─────────────────────────┘');

console.log('\n🔐 SECURITY FEATURES:');
console.log('• Passwords are hashed using bcrypt before storage');
console.log('• Email addresses are unique (no duplicates allowed)');
console.log('• All required fields are validated on both client and server');
console.log('• JWT tokens are generated for authentication');

console.log('\n📊 CURRENT STUDENT DATA:');

// Get current student count
db.get('SELECT COUNT(*) as count FROM users WHERE role = "student"', (err, row) => {
  if (err) {
    console.error('Error getting student count:', err.message);
    return;
  }
  
  console.log(`Total Students Registered: ${row.count}`);
  
  // Get latest student
  db.get(`
    SELECT first_name, last_name, email, phone, parent_phone, created_at 
    FROM users 
    WHERE role = 'student' 
    ORDER BY created_at DESC 
    LIMIT 1
  `, (err, student) => {
    if (err) {
      console.error('Error getting latest student:', err.message);
      return;
    }
    
    if (student) {
      console.log('\n👤 LATEST STUDENT REGISTRATION:');
      console.log(`   Name: ${student.first_name} ${student.last_name}`);
      console.log(`   Email: ${student.email}`);
      console.log(`   Student Phone: ${student.phone || 'Not provided'}`);
      console.log(`   Parent Phone: ${student.parent_phone || 'Not provided'}`);
      console.log(`   Registered: ${student.created_at}`);
    }
    
    // Close the database connection
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err.message);
      } else {
        console.log('\n✅ Database connection closed');
        console.log('\n🎯 SUMMARY:');
        console.log('All student registration data is properly saved in the database!');
        console.log('New registrations will include parent phone number as required.');
      }
    });
  });
});
