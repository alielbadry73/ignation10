# IG Nation Learning Platform - Backend Documentation

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Installation & Setup

1. **Install Dependencies**
   ```bash
   npm run install-deps
   ```

2. **Start the Backend Server**
   ```bash
   npm start
   ```
   Or directly:
   ```bash
   cd backend && node server.js
   ```

3. **Access the Admin Panel**
   - URL: http://localhost:3000/admin-panel.html
   - Email: admin@ignation.com
   - Password: admin123

## 🏗️ Backend Architecture

### Technology Stack
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: SQLite3
- **Authentication**: JWT (JSON Web Tokens)
- **Security**: Helmet, CORS, Rate Limiting
- **Password Hashing**: bcryptjs

### Project Structure
```
backend/
├── server.js              # Main server file
├── package.json           # Dependencies
└── database.sqlite        # SQLite database (auto-created)
```

## 🗄️ Database Schema

### Tables

#### Users Table
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  phone TEXT,
  role TEXT DEFAULT 'student',
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### Courses Table
```sql
CREATE TABLE courses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  instructor TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  duration TEXT,
  level TEXT,
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### Orders Table
```sql
CREATE TABLE orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  payment_method TEXT,
  status TEXT DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users (id)
);
```

#### Enrollments Table
```sql
CREATE TABLE enrollments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  course_id INTEGER NOT NULL,
  enrolled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  status TEXT DEFAULT 'active',
  FOREIGN KEY (user_id) REFERENCES users (id),
  FOREIGN KEY (course_id) REFERENCES courses (id),
  UNIQUE(user_id, course_id)
);
```

## 🔌 API Endpoints

### Authentication
- `POST /api/login` - Admin/User login
- `POST /api/register` - User registration (if needed)

### Public Routes
- `GET /api/courses` - Get all active courses
- `GET /api/health` - Health check

### Admin Routes (Require Authentication)
- `GET /api/admin/students` - Get all students
- `GET /api/admin/orders` - Get all orders
- `GET /api/admin/teachers` - Get all teachers
- `GET /api/admin/enrollments` - Get all enrollments
- `POST /api/admin/approve-order` - Approve order and grant access
- `POST /api/admin/grant-access` - Manually grant course access
- `DELETE /api/admin/revoke-access` - Revoke course access

## 🔐 Authentication

### JWT Token Structure
```json
{
  "id": 1,
  "email": "admin@ignation.com",
  "role": "admin",
  "iat": 1234567890,
  "exp": 1234654290
}
```

### Headers Required
```
Authorization: Bearer <your-jwt-token>
Content-Type: application/json
```

## 📊 Sample Data

The backend automatically seeds the database with sample data:

### Sample Users
- **Admin**: admin@ignation.com / admin123
- **Students**: john@example.com, sarah@example.com, mike@example.com, emma@example.com, david@example.com
- **Password**: password123 (for all students)

### Sample Courses
- Mathematics IGCSE - £299
- Physics IGCSE - £299
- Chemistry IGCSE - £299
- Biology IGCSE - £299
- English IGCSE - £249

### Sample Teachers
- Dr. Michael Smith (Mathematics)
- Prof. Sarah Johnson (Physics)
- Dr. Robert Brown (Chemistry)
- Dr. Lisa Wilson (Biology)
- Ms. Jennifer Davis (English)

## 🛡️ Security Features

1. **Password Hashing**: All passwords are hashed using bcryptjs
2. **JWT Authentication**: Secure token-based authentication
3. **Rate Limiting**: 100 requests per 15 minutes per IP
4. **CORS Protection**: Cross-origin resource sharing protection
5. **Helmet Security**: Security headers and protection
6. **Input Validation**: Server-side validation for all inputs

## 🔧 Configuration

### Environment Variables
- `PORT`: Server port (default: 3000)
- `JWT_SECRET`: JWT signing secret (default: 'your-super-secret-jwt-key-change-in-production')

### Database
- SQLite database file: `backend/database.sqlite`
- Auto-created on first run
- Sample data seeded automatically

## 🚀 Deployment

### Production Setup
1. Set environment variables:
   ```bash
   export JWT_SECRET="your-super-secure-secret-key"
   export PORT=3000
   ```

2. Install dependencies:
   ```bash
   npm run install-deps
   ```

3. Start the server:
   ```bash
   npm start
   ```

### Docker (Optional)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY backend/package*.json ./
RUN npm install
COPY backend/ .
EXPOSE 3000
CMD ["node", "server.js"]
```

## 📝 API Usage Examples

### Login
```javascript
const response = await fetch('http://localhost:3000/api/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'admin@ignation.com',
    password: 'admin123'
  })
});
const data = await response.json();
```

### Get Students (Admin)
```javascript
const response = await fetch('http://localhost:3000/api/admin/students', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const students = await response.json();
```

### Approve Order
```javascript
const response = await fetch('http://localhost:3000/api/admin/approve-order', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    orderId: 1
  })
});
```

## 🐛 Troubleshooting

### Common Issues

1. **Port 3000 already in use**
   ```bash
   # Kill process using port 3000
   netstat -ano | findstr :3000
   taskkill /PID <PID_NUMBER> /F
   ```

2. **Database connection error**
   - Check if SQLite3 is installed
   - Ensure write permissions in backend directory

3. **Module not found errors**
   ```bash
   cd backend
   npm install
   ```

4. **CORS errors**
   - Check if frontend is running on same domain
   - Verify CORS configuration in server.js

### Logs
The server logs important information to console:
- Server startup
- Database initialization
- API requests
- Errors and warnings

## 📞 Support

For issues or questions:
1. Check the console logs
2. Verify database connection
3. Test API endpoints with Postman/curl
4. Check browser developer tools for frontend errors

## 🔄 Updates

To update the backend:
1. Stop the server (Ctrl+C)
2. Pull latest changes
3. Run `npm run install-deps` if new dependencies
4. Restart with `npm start`

---

**IG Nation Learning Platform Backend** - Built with ❤️ for education



























































