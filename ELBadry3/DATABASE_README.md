# IG Way Database Backend

## 🚀 Quick Start

### 1. Start the Backend Server
```bash
npm start
```
The server will run on `http://localhost:3000`

### 2. Access the Admin Panel
Visit: `http://localhost:3000/admin`

**Admin Login:**
- Email: `admin@igway.com`
- Password: `admin123`

## 📊 Database Access Methods

### Method 1: Admin Panel (Recommended)
- **URL:** `http://localhost:3000/admin`
- **Features:**
  - Search students by email/name
  - View student details and enrollments
  - Grant/revoke course access
  - Manage all students, courses, and orders
  - Real-time dashboard with statistics

### Method 2: API Endpoints
All API endpoints are available at `http://localhost:3000/api/`

#### Authentication
```bash
# Register new user
POST /api/register
{
  "email": "student@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890"
}

# Login
POST /api/login
{
  "email": "student@example.com",
  "password": "password123"
}
```

#### Student Management (Admin Only)
```bash
# Get all students
GET /api/admin/users

# Search students
GET /api/admin/users?search=john

# Get student enrollments
GET /api/admin/user/{userId}/enrollments

# Grant course access
POST /api/admin/grant-access
{
  "userId": 1,
  "courseId": 2
}

# Revoke course access
DELETE /api/admin/revoke-access
{
  "userId": 1,
  "courseId": 2
}
```

#### Courses
```bash
# Get all courses
GET /api/courses

# Get specific course
GET /api/courses/{id}
```

#### User Data
```bash
# Get user enrollments
GET /api/user/enrollments

# Get user favorites
GET /api/user/favorites

# Add to favorites
POST /api/user/favorites
{
  "courseId": 1
}
```

### Method 3: Direct Database Access
The database is stored in `igway.db` (SQLite file)

You can use any SQLite browser or command line tool:
```bash
# Command line
sqlite3 igway.db

# Then run SQL queries
SELECT * FROM users;
SELECT * FROM courses;
SELECT * FROM enrollments;
```

## 🗄️ Database Schema

### Tables Created:
1. **users** - Student and admin accounts
2. **courses** - Available courses
3. **enrollments** - Student course enrollments
4. **orders** - Purchase orders
5. **order_items** - Items in each order
6. **favorites** - Student favorite courses
7. **flashcards** - Study flashcards
8. **flashcard_questions** - Questions for flashcards

### Sample Data:
- 6 pre-loaded courses (Mathematics, Physics, Chemistry, Biology, English, Business)
- Admin user: `admin@igway.com` / `admin123`
- All tables are created automatically on first run

## 🔧 Admin Panel Features

### Dashboard
- Total students count
- Active courses count
- Total enrollments
- Revenue statistics
- Recent activity feed

### Student Management
- Search students by email or name
- View detailed student information
- See all student enrollments
- Grant/revoke course access
- View available courses for each student

### Course Management
- View all courses
- See course details and pricing
- Manage course status (active/inactive)

### Enrollment Management
- View all enrollments
- See enrollment status
- Quick access to student details

### Order Management
- View all purchase orders
- See payment status
- Track order details

## 🔐 Security Features

- JWT token authentication
- Password hashing with bcrypt
- Rate limiting (100 requests per 15 minutes)
- Admin role protection
- CORS enabled for frontend integration

## 📱 Frontend Integration

The frontend automatically connects to the backend when you include:
```html
<script src="js/api.js"></script>
```

### Key Features:
- Automatic login state management
- Real-time dashboard updates
- Course enrollment integration
- Favorites management
- Order processing

## 🚨 Important Notes

1. **Admin Access:** Only users with `role = 'admin'` can access admin endpoints
2. **Token Expiry:** JWT tokens expire after 24 hours
3. **Database:** SQLite database is created automatically
4. **File Uploads:** Screenshots are stored in `uploads/` directory
5. **Rate Limiting:** API has rate limiting to prevent abuse

## 🔄 Workflow for Course Access

1. Student registers/logs in through frontend
2. Student purchases course (creates order)
3. Admin reviews order in admin panel
4. Admin grants course access to student
5. Student sees course in their dashboard
6. Student can start learning!

## 🛠️ Development

### Adding New Features:
1. Add new API endpoints in `server.js`
2. Update admin panel in `admin-panel.html`
3. Update frontend integration in `js/api.js`

### Database Migrations:
Add new tables or columns in the `db.serialize()` block in `server.js`

## 📞 Support

If you need help with the database or admin panel, check:
1. Server logs in terminal
2. Browser console for frontend errors
3. Database file `igway.db` for data issues

The system is designed to be self-contained and easy to manage!
