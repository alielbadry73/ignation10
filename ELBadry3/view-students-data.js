const sqlite3 = require('sqlite3').verbose();

// Connect to the database
const db = new sqlite3.Database('igway.db', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    return;
  }
  console.log('✅ Connected to the database');
});

// View all student data
db.all(`
  SELECT 
    id,
    first_name,
    last_name,
    email,
    phone,
    parent_phone,
    role,
    created_at,
    updated_at
  FROM users 
  WHERE role = 'student'
  ORDER BY created_at DESC
`, (err, rows) => {
  if (err) {
    console.error('Error fetching students:', err.message);
    return;
  }
  
  console.log('\n📚 STUDENT REGISTRATION DATA:');
  console.log('=====================================');
  
  if (rows.length === 0) {
    console.log('No students found in database');
  } else {
    rows.forEach((student, index) => {
      console.log(`\n👤 Student #${index + 1}:`);
      console.log(`   ID: ${student.id}`);
      console.log(`   Name: ${student.first_name} ${student.last_name}`);
      console.log(`   Email: ${student.email}`);
      console.log(`   Student Phone: ${student.phone || 'Not provided'}`);
      console.log(`   Parent Phone: ${student.parent_phone || 'Not provided'}`);
      console.log(`   Role: ${student.role}`);
      console.log(`   Registered: ${student.created_at}`);
      console.log(`   Last Updated: ${student.updated_at}`);
    });
  }
  
  console.log('\n📊 SUMMARY:');
  console.log(`Total Students: ${rows.length}`);
  
  // Close the database connection
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err.message);
    } else {
      console.log('\n✅ Database connection closed');
    }
  });
});
