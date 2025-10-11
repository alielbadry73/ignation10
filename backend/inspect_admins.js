const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, 'database.sqlite'), sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error('Failed to open DB:', err.message);
    process.exit(1);
  }
});

function print(title, obj) {
  console.log('---', title, '---');
  console.log(JSON.stringify(obj, null, 2));
}

db.serialize(() => {
  db.all(`SELECT id, first_name, last_name, email, role, password FROM users WHERE role = 'admin'`, (err, rows) => {
    if (err) { console.error('Error querying users admin:', err.message); } else {
      print('users (role=admin)', rows || []);
    }
  });

  db.all(`SELECT id, username, email, password, full_name FROM students LIMIT 20`, (err, rows) => {
    if (err) { console.error('Error querying students:', err.message); } else {
      print('students (sample)', rows || []);
    }
  });

  db.all(`SELECT id, username, email, password, full_name FROM teachers LIMIT 20`, (err, rows) => {
    if (err) { console.error('Error querying teachers:', err.message); } else {
      print('teachers (sample)', rows || []);
    }
  });

  // Also show any users table rows for debugging
  db.all(`SELECT id, first_name, last_name, email, role, password FROM users LIMIT 20`, (err, rows) => {
    if (err) { console.error('Error querying users:', err.message); } else {
      print('users (sample)', rows || []);
    }
    db.close();
  });
});
