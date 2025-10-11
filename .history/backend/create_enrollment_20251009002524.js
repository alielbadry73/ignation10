const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');

// Create enrollment for your English course access
const enrollmentData = {
    user_id: 9, // Your user ID (required)
    student_id: 9, // Your user ID (optional)
    course_id: 4, // English course ID
    granted_by_admin: 1, // Admin ID
    is_active: 1,
    expires_at: null, // No expiration
    created_at: new Date().toISOString()
};

console.log('Creating enrollment for English course access...');

db.run(
    `INSERT INTO enrollments (
        user_id, student_id, course_id, granted_by_admin, is_active, expires_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
        enrollmentData.user_id,
        enrollmentData.student_id,
        enrollmentData.course_id,
        enrollmentData.granted_by_admin,
        enrollmentData.is_active,
        enrollmentData.expires_at,
        enrollmentData.created_at
    ],
    function(err) {
        if (err) {
            console.error('Error creating enrollment:', err);
        } else {
            console.log(`✅ Enrollment created successfully with ID: ${this.lastID}`);
            console.log(`Student ID: ${enrollmentData.student_id}`);
            console.log(`Course ID: ${enrollmentData.course_id}`);
            console.log(`Status: Active`);
        }
        db.close();
    }
);
