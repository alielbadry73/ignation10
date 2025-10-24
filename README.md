# WorldCourse Backend API

A comprehensive backend API for the WorldCourse educational platform built with Node.js, Express, and MongoDB.

## Features

- **User Management**: Registration, authentication, profile management
- **Course Management**: Create, update, and manage courses
- **Assignment System**: Create and grade assignments with multiple question types
- **Quiz System**: Timed quizzes with auto-grading and manual review
- **Exam System**: Scheduled exams with time limits and late submission handling
- **Todo Lists**: Personal and shared todo lists with task management
- **Community Forum**: Discussion posts, comments, and voting system
- **Admin Panel**: Comprehensive admin dashboard with analytics
- **File Upload**: Support for file submissions in assignments/quizzes/exams
- **Real-time Features**: WebSocket support for live updates
- **Security**: JWT authentication, rate limiting, input validation

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **File Upload**: Multer
- **Validation**: Express-validator
- **Security**: Helmet, CORS, Rate Limiting
- **Environment**: dotenv

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd worldcourse-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp config.env.example config.env
   ```
   
   Edit `config.env` with your configuration:
   ```env
   PORT=3001
   NODE_ENV=development
   MONGODB_URI=mongodb://localhost:27017/worldcourse
   JWT_SECRET=your-super-secret-jwt-key
   JWT_EXPIRES_IN=7d
   CORS_ORIGIN=http://localhost:3000
   ```

4. **Start MongoDB**
   ```bash
   # Using MongoDB service
   sudo systemctl start mongod
   
   # Or using Docker
   docker run -d -p 27017:27017 --name mongodb mongo:latest
   ```

5. **Run the application**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout user
- `POST /api/auth/refresh` - Refresh JWT token

### Users
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `POST /api/users/change-password` - Change password
- `GET /api/users/courses` - Get user's enrolled courses
- `GET /api/users/assignments` - Get user's assignments
- `GET /api/users/leaderboard` - Get course leaderboard
- `GET /api/users/statistics` - Get user statistics

### Courses
- `GET /api/courses` - Get all courses
- `GET /api/courses/:id` - Get specific course
- `POST /api/courses` - Create course (Teacher/Admin)
- `PUT /api/courses/:id` - Update course (Teacher/Admin)
- `DELETE /api/courses/:id` - Delete course (Teacher/Admin)
- `POST /api/courses/:id/enroll` - Enroll in course
- `POST /api/courses/:id/unenroll` - Unenroll from course
- `POST /api/courses/:id/review` - Add course review

### Assignments
- `GET /api/assignments` - Get assignments
- `GET /api/assignments/:id` - Get specific assignment
- `POST /api/assignments` - Create assignment (Teacher/Admin)
- `POST /api/assignments/:id/submit` - Submit assignment
- `PUT /api/assignments/:id/grade` - Grade assignment (Teacher/Admin)
- `GET /api/assignments/:id/submissions` - Get submissions (Teacher/Admin)

### Quizzes
- `GET /api/quizzes` - Get quizzes
- `GET /api/quizzes/:id` - Get specific quiz
- `POST /api/quizzes` - Create quiz (Teacher/Admin)
- `POST /api/quizzes/:id/submit` - Submit quiz
- `PUT /api/quizzes/:id/grade` - Grade quiz (Teacher/Admin)
- `GET /api/quizzes/:id/submissions` - Get submissions (Teacher/Admin)

### Exams
- `GET /api/exams` - Get exams
- `GET /api/exams/:id` - Get specific exam
- `POST /api/exams` - Create exam (Teacher/Admin)
- `POST /api/exams/:id/start` - Start exam
- `POST /api/exams/:id/submit` - Submit exam
- `PUT /api/exams/:id/grade` - Grade exam (Teacher/Admin)
- `GET /api/exams/:id/submissions` - Get submissions (Teacher/Admin)

### Todo Lists
- `GET /api/todos` - Get user's todo lists
- `GET /api/todos/:id` - Get specific todo list
- `POST /api/todos` - Create todo list
- `PUT /api/todos/:id` - Update todo list
- `DELETE /api/todos/:id` - Delete todo list
- `POST /api/todos/:id/tasks` - Add task to todo list
- `PUT /api/todos/:id/tasks/:taskId` - Update task
- `DELETE /api/todos/:id/tasks/:taskId` - Delete task
- `POST /api/todos/:id/archive` - Archive/unarchive todo list

### Community
- `GET /api/community/posts` - Get community posts
- `GET /api/community/posts/:id` - Get specific post with comments
- `POST /api/community/posts` - Create post
- `POST /api/community/posts/:id/comments` - Add comment
- `POST /api/community/posts/:id/vote` - Vote on post
- `POST /api/community/posts/:id/resolve` - Mark post as resolved
- `GET /api/community/tags` - Get popular tags
- `GET /api/community/stats` - Get community statistics

### Admin
- `GET /api/admin/dashboard` - Get admin dashboard
- `GET /api/admin/users` - Get all users
- `GET /api/admin/users/:id` - Get specific user
- `PUT /api/admin/users/:id` - Update user
- `DELETE /api/admin/users/:id` - Deactivate user
- `GET /api/admin/courses` - Get all courses
- `PUT /api/admin/courses/:id` - Update course
- `DELETE /api/admin/courses/:id` - Deactivate course
- `GET /api/admin/assignments` - Get all assignments
- `GET /api/admin/quizzes` - Get all quizzes
- `GET /api/admin/exams` - Get all exams
- `GET /api/admin/todos` - Get all todo lists
- `GET /api/admin/analytics` - Get platform analytics

## Database Models

### User
- Personal information (name, email, password)
- Role-based access (student, teacher, admin)
- Course enrollments and achievements
- Points and level system

### Course
- Course details (title, description, subject, level)
- Instructor assignment
- Student enrollments with progress tracking
- Reviews and ratings

### Assignment/Quiz/Exam
- Question management with multiple types
- Auto-grading for multiple choice questions
- Manual grading for text/file questions
- Submission tracking and grading

### TodoList
- Personal and shared todo lists
- Task management with priorities and due dates
- Course association

## Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt for password security
- **Input Validation**: Comprehensive input validation and sanitization
- **Rate Limiting**: API rate limiting to prevent abuse
- **CORS**: Cross-origin resource sharing configuration
- **Helmet**: Security headers for Express
- **Role-based Access**: Different access levels for students, teachers, and admins

## Error Handling

- Centralized error handling middleware
- Consistent error response format
- Detailed error messages for development
- Graceful error handling for production

## Development

### Scripts
```bash
npm start          # Start production server
npm run dev        # Start development server with nodemon
npm test           # Run tests
```

### Environment Variables
- `PORT`: Server port (default: 3001)
- `NODE_ENV`: Environment (development/production)
- `MONGODB_URI`: MongoDB connection string
- `JWT_SECRET`: Secret key for JWT tokens
- `JWT_EXPIRES_IN`: JWT token expiration time
- `CORS_ORIGIN`: Allowed CORS origin

## API Response Format

All API responses follow a consistent format:

```json
{
  "status": "success|error",
  "message": "Response message",
  "data": {
    // Response data
  },
  "pagination": {
    // Pagination info (when applicable)
  }
}
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please contact the development team or create an issue in the repository.




























































