const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bodyParser = require('body-parser');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

// Email configuration (using Gmail SMTP as example)
const emailTransporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'your-email@gmail.com',
    pass: process.env.EMAIL_PASSWORD || 'your-app-password'
  }
});

// WhatsApp configuration (using Twilio as example)
const WHATSAPP_CONFIG = {
  accountSid: process.env.TWILIO_ACCOUNT_SID || 'your-twilio-account-sid',
  authToken: process.env.TWILIO_AUTH_TOKEN || 'your-twilio-auth-token',
  fromNumber: process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886'
};

// Helper function to send email
async function sendEmail(to, subject, htmlContent) {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER || 'your-email@gmail.com',
      to: to,
      subject: subject,
      html: htmlContent
    };

    const result = await emailTransporter.sendMail(mailOptions);
    console.log(`📧 Email sent successfully to ${to}:`, result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('❌ Error sending email:', error);
    return { success: false, error: error.message };
  }
}

// Helper function to send WhatsApp message (using Twilio)
async function sendWhatsAppMessage(to, message) {
  try {
    // Note: This requires Twilio SDK installation: npm install twilio
    // For now, we'll simulate the functionality
    console.log(`📱 WhatsApp message would be sent to ${to}:`);
    console.log(`Message: ${message}`);
    
    // In a real implementation, you would use:
    // const twilio = require('twilio');
    // const client = twilio(WHATSAPP_CONFIG.accountSid, WHATSAPP_CONFIG.authToken);
    // const result = await client.messages.create({
    //   from: WHATSAPP_CONFIG.fromNumber,
    //   to: `whatsapp:${to}`,
    //   body: message
    // });
    
    return { success: true, messageId: 'simulated-message-id' };
  } catch (error) {
    console.error('❌ Error sending WhatsApp message:', error);
    return { success: false, error: error.message };
  }
}

// Helper function to generate student progress report
async function generateProgressReport(parentId, type = 'weekly') {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT 
        u.first_name || ' ' || u.last_name as student_name,
        c.title as course_name,
        sp.activity_type,
        sp.activity_name,
        sp.score,
        sp.total_score,
        sp.completed,
        sp.time_spent,
        sp.created_at
      FROM student_parents sp_link
      JOIN users u ON sp_link.student_id = u.id
      LEFT JOIN student_progress sp ON u.id = sp.student_id
      LEFT JOIN courses c ON sp.course_id = c.id
      WHERE sp_link.parent_id = ?
      AND sp.created_at >= date('now', '-${type === 'weekly' ? '7' : '30'} days')
      ORDER BY sp.created_at DESC
    `;
    
    db.all(query, [parentId], (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      
      // Group data by student
      const studentsData = {};
      rows.forEach(row => {
        if (!studentsData[row.student_name]) {
          studentsData[row.student_name] = {
            name: row.student_name,
            activities: [],
            totalTime: 0,
            averageScore: 0,
            completedActivities: 0
          };
        }
        
        if (row.activity_name) {
          studentsData[row.student_name].activities.push(row);
          studentsData[row.student_name].totalTime += row.time_spent || 0;
          if (row.completed) {
            studentsData[row.student_name].completedActivities++;
          }
        }
      });
      
      // Calculate average scores
      Object.values(studentsData).forEach(student => {
        if (student.activities.length > 0) {
          const totalScore = student.activities.reduce((sum, activity) => 
            sum + (activity.score || 0), 0);
          const totalMaxScore = student.activities.reduce((sum, activity) => 
            sum + (activity.total_score || 0), 0);
          student.averageScore = totalMaxScore > 0 ? (totalScore / totalMaxScore * 100).toFixed(1) : 0;
        }
      });
      
      resolve(studentsData);
    });
  });
}

// Helper function to generate email HTML content
function generateEmailHTML(progressData, type = 'weekly') {
  const period = type === 'weekly' ? 'Weekly' : 'Monthly';
  const students = Object.values(progressData);
  
  if (students.length === 0) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1e3d6f;">${period} Student Progress Report</h2>
        <p>Dear Parent,</p>
        <p>This is your ${period.toLowerCase()} progress report from IG Nation Learning Platform.</p>
        <p><strong>No activity recorded</strong> for your students during this period.</p>
        <p>Best regards,<br>IG Nation Team</p>
      </div>
    `;
  }
  
  let html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1e3d6f;">${period} Student Progress Report</h2>
      <p>Dear Parent,</p>
      <p>Here's your ${period.toLowerCase()} progress report from IG Nation Learning Platform:</p>
  `;
  
  students.forEach(student => {
    html += `
      <div style="border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin: 20px 0; background-color: #f9f9f9;">
        <h3 style="color: #1e3d6f; margin-top: 0;">${student.name}</h3>
        <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
          <div>
            <strong>Average Score:</strong> ${student.averageScore}%
          </div>
          <div>
            <strong>Study Time:</strong> ${Math.round(student.totalTime / 60)} minutes
          </div>
          <div>
            <strong>Activities Completed:</strong> ${student.completedActivities}
          </div>
        </div>
        <h4>Recent Activities:</h4>
        <ul>
    `;
    
    student.activities.slice(0, 5).forEach(activity => {
      html += `
        <li>
          ${activity.activity_name} (${activity.activity_type})
          ${activity.score !== null ? `- Score: ${activity.score}/${activity.total_score}` : ''}
          ${activity.completed ? '✅' : '⏳'}
        </li>
      `;
    });
    
    html += `
        </ul>
      </div>
    `;
  });
  
  html += `
      <p>Keep encouraging your student to maintain consistent study habits!</p>
      <p>Best regards,<br>IG Nation Team</p>
    </div>
  `;
  
  return html;
}

// Helper function to generate WhatsApp message content
function generateWhatsAppMessage(progressData, type = 'weekly') {
  const period = type === 'weekly' ? 'Weekly' : 'Monthly';
  const students = Object.values(progressData);
  
  if (students.length === 0) {
    return `📊 *${period} Student Progress Report - IG Nation*

Dear Parent,

This is your ${period.toLowerCase()} progress report.

❌ No activity recorded for your students during this period.

Best regards,
IG Nation Team`;
  }
  
  let message = `📊 *${period} Student Progress Report - IG Nation*

Dear Parent,

Here's your ${period.toLowerCase()} progress report:\n`;
  
  students.forEach(student => {
    message += `
👤 *${student.name}*
📈 Average Score: ${student.averageScore}%
⏰ Study Time: ${Math.round(student.totalTime / 60)} minutes
✅ Activities Completed: ${student.completedActivities}

Recent Activities:`;
    
    student.activities.slice(0, 3).forEach(activity => {
      const status = activity.completed ? '✅' : '⏳';
      const score = activity.score !== null ? ` (${activity.score}/${activity.total_score})` : '';
      message += `\n• ${activity.activity_name}${score} ${status}`;
    });
    
    message += '\n';
  });
  
  message += `
Keep encouraging your student to maintain consistent study habits!

Best regards,
IG Nation Team`;
  
  return message;
}

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://code.iconify.design"],
      scriptSrcAttr: ["'unsafe-inline'"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdn.jsdelivr.net"],
      imgSrc: ["'self'", "data:", "https:", "https://img.youtube.com"],
      connectSrc: ["'self'", "https://cdn.jsdelivr.net", "https://api.simplesvg.com", "https://code.iconify.design", "https://api.iconify.design", "https://api.unisvg.com"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'", "https:", "blob:"],
      frameSrc: ["'self'", "https://www.youtube.com", "https://player.vimeo.com"],
    },
  },
}));
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Serve static files from parent directory
app.use(express.static(path.join(__dirname, '..')));

// Database setup
const db = new sqlite3.Database('./database.sqlite', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database');
    initializeDatabase();
  }
});

// Initialize database tables
function initializeDatabase() {
  const createTables = `
    -- Users table
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      phone TEXT,
      role TEXT DEFAULT 'student',
      is_active BOOLEAN DEFAULT 1,
      points INTEGER DEFAULT 0,
      last_login DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Courses table
    CREATE TABLE IF NOT EXISTS courses (
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

    -- Orders table
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      total_amount DECIMAL(10,2) NOT NULL,
      payment_method TEXT,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    );

    -- Order items table
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      course_id INTEGER NOT NULL,
      quantity INTEGER DEFAULT 1,
      price DECIMAL(10,2) NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders (id),
      FOREIGN KEY (course_id) REFERENCES courses (id)
    );

    -- Enrollments table
    CREATE TABLE IF NOT EXISTS enrollments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      course_id INTEGER NOT NULL,
      enrolled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      status TEXT DEFAULT 'active',
      FOREIGN KEY (user_id) REFERENCES users (id),
      FOREIGN KEY (course_id) REFERENCES courses (id),
      UNIQUE(user_id, course_id)
    );

    -- Teachers table
    CREATE TABLE IF NOT EXISTS teachers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      subject TEXT NOT NULL,
      experience_years INTEGER DEFAULT 0,
      is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Assistants table (Teaching Assistants)
    CREATE TABLE IF NOT EXISTS assistants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      subject TEXT NOT NULL,
      teacher_id INTEGER,
      is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (teacher_id) REFERENCES teachers (id)
    );

    -- Parents table
    CREATE TABLE IF NOT EXISTS parents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT,
      whatsapp_number TEXT,
      is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Student-Parent relationship table
    CREATE TABLE IF NOT EXISTS student_parents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      parent_id INTEGER NOT NULL,
      relationship TEXT DEFAULT 'parent',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES users (id),
      FOREIGN KEY (parent_id) REFERENCES parents (id),
      UNIQUE(student_id, parent_id)
    );

    -- Parent Followup Settings table
    CREATE TABLE IF NOT EXISTS parent_followup_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      parent_id INTEGER NOT NULL,
      weekly_email BOOLEAN DEFAULT 1,
      weekly_whatsapp BOOLEAN DEFAULT 0,
      monthly_email BOOLEAN DEFAULT 1,
      monthly_whatsapp BOOLEAN DEFAULT 0,
      preferred_day TEXT DEFAULT 'Monday',
      preferred_time TEXT DEFAULT '09:00',
      last_weekly_sent DATETIME,
      last_monthly_sent DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (parent_id) REFERENCES parents (id),
      UNIQUE(parent_id)
    );

    -- Student Progress Tracking table
    CREATE TABLE IF NOT EXISTS student_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      course_id INTEGER NOT NULL,
      activity_type TEXT NOT NULL,
      activity_name TEXT,
      score DECIMAL(5,2),
      total_score DECIMAL(5,2),
      completed BOOLEAN DEFAULT 0,
      time_spent INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES users (id),
      FOREIGN KEY (course_id) REFERENCES courses (id)
    );

    -- Mathematics Subject Database
    CREATE TABLE IF NOT EXISTS mathematics_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      activity_type TEXT NOT NULL,
      topic TEXT,
      score DECIMAL(5,2),
      total_score DECIMAL(5,2),
      accuracy DECIMAL(5,2),
      time_spent INTEGER DEFAULT 0,
      flashcards_correct INTEGER DEFAULT 0,
      flashcards_wrong INTEGER DEFAULT 0,
      homework_completed INTEGER DEFAULT 0,
      quizzes_completed INTEGER DEFAULT 0,
      exams_completed INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES users (id)
    );

    -- Physics Subject Database
    CREATE TABLE IF NOT EXISTS physics_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      activity_type TEXT NOT NULL,
      topic TEXT,
      score DECIMAL(5,2),
      total_score DECIMAL(5,2),
      accuracy DECIMAL(5,2),
      time_spent INTEGER DEFAULT 0,
      flashcards_correct INTEGER DEFAULT 0,
      flashcards_wrong INTEGER DEFAULT 0,
      homework_completed INTEGER DEFAULT 0,
      quizzes_completed INTEGER DEFAULT 0,
      exams_completed INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES users (id)
    );

    -- Chemistry Subject Database
    CREATE TABLE IF NOT EXISTS chemistry_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      activity_type TEXT NOT NULL,
      topic TEXT,
      score DECIMAL(5,2),
      total_score DECIMAL(5,2),
      accuracy DECIMAL(5,2),
      time_spent INTEGER DEFAULT 0,
      flashcards_correct INTEGER DEFAULT 0,
      flashcards_wrong INTEGER DEFAULT 0,
      homework_completed INTEGER DEFAULT 0,
      quizzes_completed INTEGER DEFAULT 0,
      exams_completed INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES users (id)
    );

    -- Teacher Lectures table
    CREATE TABLE IF NOT EXISTS teacher_lectures (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      teacher_id INTEGER NOT NULL,
      subject TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      video_url TEXT,
      pdf_url TEXT,
      duration INTEGER DEFAULT 0,
      type TEXT DEFAULT 'video', -- 'video', 'pdf-only'
      is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (teacher_id) REFERENCES teachers (id)
    );

    -- Teacher Assignments table
    CREATE TABLE IF NOT EXISTS teacher_assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      teacher_id INTEGER NOT NULL,
      subject TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      instructions TEXT,
      due_date DATETIME,
      points INTEGER DEFAULT 100,
      is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (teacher_id) REFERENCES teachers (id)
    );

    -- Teacher Exams table
    CREATE TABLE IF NOT EXISTS teacher_exams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      teacher_id INTEGER NOT NULL,
      subject TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      duration INTEGER DEFAULT 60, -- in minutes
      total_questions INTEGER DEFAULT 0,
      total_points INTEGER DEFAULT 100,
      is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (teacher_id) REFERENCES teachers (id)
    );

    -- Teacher Quizzes table
    CREATE TABLE IF NOT EXISTS teacher_quizzes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      teacher_id INTEGER NOT NULL,
      subject TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      duration INTEGER DEFAULT 30, -- in minutes
      total_questions INTEGER DEFAULT 0,
      total_points INTEGER DEFAULT 50,
      is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (teacher_id) REFERENCES teachers (id)
    );

    -- Assignment Submissions table
    CREATE TABLE IF NOT EXISTS assignment_submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      assignment_id INTEGER NOT NULL,
      submission_text TEXT,
      file_url TEXT,
      submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      grade INTEGER,
      feedback TEXT,
      status TEXT DEFAULT 'submitted', -- 'submitted', 'graded', 'returned'
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES users (id),
      FOREIGN KEY (assignment_id) REFERENCES teacher_assignments (id)
    );

    -- Quiz Submissions table
    CREATE TABLE IF NOT EXISTS quiz_submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      quiz_id INTEGER NOT NULL,
      answers TEXT, -- JSON string of answers
      score INTEGER DEFAULT 0,
      total_score INTEGER DEFAULT 0,
      submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      time_taken INTEGER DEFAULT 0, -- in seconds
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES users (id),
      FOREIGN KEY (quiz_id) REFERENCES teacher_quizzes (id)
    );
  `;

  db.exec(createTables, (err) => {
    if (err) {
      console.error('Error creating tables:', err.message);
    } else {
      console.log('Database tables initialized');
      
      // Add quantity column to order_items if it doesn't exist
      db.run(`ALTER TABLE order_items ADD COLUMN quantity INTEGER DEFAULT 1;`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
          console.error('Error adding quantity column:', err);
        }
      });
      
      seedDatabase();
    }
  });
}

// Seed database with sample data
function seedDatabase() {
  // Check if data already exists
  db.get("SELECT COUNT(*) as count FROM users", (err, row) => {
    if (err) {
      console.error('Error checking users:', err.message);
      return;
    }
    
    if (row.count > 0) {
      console.log('Database already seeded');
      return;
    }

    // Hash passwords
    const hashedPassword = bcrypt.hashSync('password123', 10);
    const adminPassword = bcrypt.hashSync('admin123', 10);

    const seedData = `
      -- Insert admin user
      INSERT INTO users (first_name, last_name, email, password, role) 
      VALUES ('Admin', 'User', 'admin@ignation.com', '${adminPassword}', 'admin');

      -- Insert sample students (only Ahmed Zaher and Saad Samir)
      INSERT INTO users (first_name, last_name, email, password, phone) VALUES
      ('Ahmed', 'Zaher', 'ahmed.zaher@example.com', '${hashedPassword}', '01040450811'),
      ('Saad', 'Samir', 'saad.samir@example.com', '${hashedPassword}', '01040450819');

      -- Insert sample courses
      INSERT INTO courses (title, description, instructor, price, duration, level) VALUES
      ('Mathematics IGCSE', 'Complete IGCSE Mathematics course covering all topics', 'Dr. Smith', 299.00, '12 months', 'IGCSE'),
      ('Physics IGCSE', 'Comprehensive Physics course for IGCSE students', 'Prof. Johnson', 299.00, '12 months', 'IGCSE'),
      ('Chemistry IGCSE', 'In-depth Chemistry course with practical applications', 'Dr. Brown', 299.00, '12 months', 'IGCSE'),
      ('Biology IGCSE', 'Complete Biology course with lab simulations', 'Dr. Wilson', 299.00, '12 months', 'IGCSE'),
      ('English IGCSE', 'Language and Literature course for IGCSE', 'Ms. Davis', 249.00, '10 months', 'IGCSE');

      -- Insert sample teachers
      INSERT INTO teachers (first_name, last_name, email, subject, experience_years) VALUES
      ('Dr. Michael', 'Smith', 'm.smith@ignation.com', 'Mathematics', 15),
      ('Prof. Sarah', 'Johnson', 's.johnson@ignation.com', 'Physics', 12),
      ('Dr. Robert', 'Brown', 'r.brown@ignation.com', 'Chemistry', 18),
      ('Dr. Lisa', 'Wilson', 'l.wilson@ignation.com', 'Biology', 10),
      ('Ms. Jennifer', 'Davis', 'j.davis@ignation.com', 'English', 8);

      -- Insert sample assistants
      INSERT INTO assistants (first_name, last_name, email, subject, teacher_id) VALUES
      ('Alex', 'Martinez', 'a.martinez@ignation.com', 'Mathematics', 1),
      ('Emily', 'Chen', 'e.chen@ignation.com', 'Physics', 2),
      ('James', 'Taylor', 'j.taylor@ignation.com', 'Chemistry', 3),
      ('Sophie', 'Anderson', 's.anderson@ignation.com', 'Mathematics', 1);

      -- Insert sample parents
      INSERT INTO parents (first_name, last_name, email, phone, whatsapp_number) VALUES
      ('Peter', 'Smith', 'peter.smith@parent.com', '+44 7111 222333', '+44 7111 222333'),
      ('Mary', 'Johnson', 'mary.johnson@parent.com', '+44 7222 333444', '+44 7222 333444'),
      ('Thomas', 'Brown', 'thomas.brown@parent.com', '+44 7333 444555', '+44 7333 444555'),
      ('Linda', 'Wilson', 'linda.wilson@parent.com', '+44 7444 555666', '+44 7444 555666'),
      ('Richard', 'Lee', 'richard.lee@parent.com', '+44 7555 666777', '+44 7555 666777');

      -- Link students to parents
      INSERT INTO student_parents (student_id, parent_id, relationship) VALUES
      (2, 1, 'Father'),
      (3, 2, 'Mother'),
      (4, 3, 'Father'),
      (5, 4, 'Mother'),
      (6, 5, 'Father');

      -- Insert parent followup settings
      INSERT INTO parent_followup_settings (parent_id, weekly_email, weekly_whatsapp, monthly_email, monthly_whatsapp, preferred_day) VALUES
      (1, 1, 1, 1, 0, 'Monday'),
      (2, 1, 0, 1, 1, 'Friday'),
      (3, 1, 1, 1, 1, 'Monday'),
      (4, 1, 0, 1, 0, 'Wednesday'),
      (5, 1, 1, 1, 1, 'Monday');

      -- Insert sample orders (for Ahmed Zaher and Saad Samir)
      INSERT INTO orders (user_id, total_amount, payment_method, status) VALUES
      (2, 299.00, 'Credit Card', 'completed'),
      (3, 598.00, 'PayPal', 'completed');

      -- Insert sample order items (for Ahmed Zaher and Saad Samir)
      INSERT INTO order_items (order_id, course_id, price) VALUES
      (1, 1, 299.00),
      (2, 1, 299.00),
      (2, 2, 299.00);

      -- Insert sample enrollments (for Ahmed Zaher and Saad Samir)
      INSERT INTO enrollments (user_id, course_id, status) VALUES
      (2, 1, 'active'),
      (3, 1, 'active'),
      (3, 2, 'active');
    `;

    db.exec(seedData, (err) => {
      if (err) {
        console.error('Error seeding database:', err.message);
      } else {
        console.log('Database seeded with sample data');
      }
    });
  });
}

// Authentication middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

// Admin authentication middleware
function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

// Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'IG Nation API is running' });
});

// Authentication routes

// Register new user
app.post('/api/register', async (req, res) => {
  const { first_name, last_name, email, password, phone, parent_phone } = req.body;

  if (!first_name || !last_name || !email || !password) {
    return res.status(400).json({ error: 'All required fields must be provided' });
  }

  try {
    // Check if user already exists
    db.get('SELECT * FROM users WHERE email = ?', [email], async (err, existingUser) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (existingUser) {
        return res.status(400).json({ error: 'Email already registered' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Insert new user
      db.run(
        `INSERT INTO users (first_name, last_name, email, password, phone, parent_phone, role) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [first_name, last_name, email.toLowerCase(), hashedPassword, phone, parent_phone, 'student'],
        function(err) {
          if (err) {
            console.error('Registration error:', err);
            return res.status(500).json({ error: 'Failed to create account' });
          }

          const userId = this.lastID;

          // Create parent if parent phone provided
          if (parent_phone) {
            db.run(
              `INSERT INTO parents (first_name, last_name, email, phone, whatsapp_number) 
               VALUES (?, ?, ?, ?, ?)`,
              [`${first_name}'s Parent`, 'Guardian', `parent_${email}`, parent_phone, parent_phone],
              function(parentErr) {
                if (!parentErr && this.lastID) {
                  // Link student to parent
                  db.run(
                    `INSERT INTO student_parents (student_id, parent_id, relationship) VALUES (?, ?, ?)`,
                    [userId, this.lastID, 'Parent/Guardian']
                  );
                }
              }
            );
          }

          // Generate JWT token
          const token = jwt.sign(
            { id: userId, email: email.toLowerCase(), role: 'student' },
            JWT_SECRET,
            { expiresIn: '7d' }
          );

          res.status(201).json({
            message: 'Registration successful',
            token,
            user: {
              id: userId,
              first_name: first_name,
              last_name: last_name,
              email: email.toLowerCase(),
              role: 'student'
            }
          });
        }
      );
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  db.get(
    'SELECT * FROM users WHERE email = ?',
    [email],
    (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      bcrypt.compare(password, user.password, (err, isMatch) => {
        if (err) {
          return res.status(500).json({ error: 'Authentication error' });
        }

        if (!isMatch) {
          return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
          { id: user.id, email: user.email, role: user.role },
          JWT_SECRET,
          { expiresIn: '24h' }
        );

        res.json({
          token,
          user: {
            id: user.id,
            first_name: user.first_name,
            last_name: user.last_name,
            email: user.email,
            role: user.role
          }
        });
      });
    }
  );
});

// Public routes
app.get('/api/courses', (req, res) => {
  db.all('SELECT * FROM courses WHERE is_active = 1', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

// Admin routes
// Create new order (student purchases courses)
app.post('/api/orders', authenticateToken, (req, res) => {
  const { courses, totalAmount, paymentMethod, paymentScreenshot } = req.body;
  const userId = req.user.id;

  if (!courses || courses.length === 0 || !totalAmount || !paymentMethod) {
    return res.status(400).json({ error: 'Missing required order information' });
  }

  // Insert order
  db.run(
    'INSERT INTO orders (user_id, total_amount, payment_method, status) VALUES (?, ?, ?, ?)',
    [userId, totalAmount, paymentMethod, 'pending'],
    function(err) {
      if (err) {
        console.error('Error creating order:', err);
        return res.status(500).json({ error: 'Failed to create order' });
      }

      const orderId = this.lastID;

      // Insert order items (without quantity column for now)
      const orderItemsQuery = 'INSERT INTO order_items (order_id, course_id, price) VALUES (?, ?, ?)';
      
      console.log(`Creating order ${orderId} with ${courses.length} items:`, courses);
      
      courses.forEach((course, index) => {
        console.log(`Adding item ${index + 1}:`, course);
        
        if (!course.id) {
          console.error('Course ID is missing for item:', course);
          return;
        }
        
        db.run(orderItemsQuery, [orderId, course.id, course.price], (err) => {
          if (err) {
            console.error('Error adding order item:', err);
            console.error('Course data:', course);
          } else {
            console.log(`Successfully added order item: course ${course.id} for order ${orderId}`);
          }
        });
      });

      res.status(201).json({
        message: 'Order created successfully',
        orderId: orderId,
        status: 'pending'
      });
    }
  );
});

app.get('/api/admin/orders', authenticateToken, requireAdmin, (req, res) => {
  const query = `
    SELECT 
      o.id,
      o.user_id,
      u.first_name,
      u.last_name,
      o.total_amount,
      o.payment_method,
      o.status,
      o.created_at,
      GROUP_CONCAT(c.title, ', ') as course_titles
    FROM orders o
    JOIN users u ON o.user_id = u.id
    LEFT JOIN order_items oi ON o.id = oi.order_id
    LEFT JOIN courses c ON oi.course_id = c.id
    GROUP BY o.id
    ORDER BY o.created_at DESC
  `;

  db.all(query, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

// Get detailed order information with course details
app.get('/api/admin/orders/:orderId', authenticateToken, requireAdmin, (req, res) => {
  const orderId = req.params.orderId;
  
  // Get order basic info
  const orderQuery = `
    SELECT 
      o.id,
      o.user_id,
      u.first_name,
      u.last_name,
      o.total_amount,
      o.payment_method,
      o.status,
      o.created_at
    FROM orders o
    JOIN users u ON o.user_id = u.id
    WHERE o.id = ?
  `;

  db.get(orderQuery, [orderId], (err, order) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Get order items with course details
    const itemsQuery = `
      SELECT 
        oi.id,
        oi.course_id,
        oi.quantity,
        oi.price,
        c.title,
        c.instructor
      FROM order_items oi
      LEFT JOIN courses c ON oi.course_id = c.id
      WHERE oi.order_id = ?
    `;

    db.all(itemsQuery, [orderId], (err, items) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      res.json({
        ...order,
        items: items
      });
    });
  });
});

// Approve order and grant access (admin only)
app.post('/api/admin/approve-order', authenticateToken, requireAdmin, (req, res) => {
  const { orderId } = req.body;

  if (!orderId) {
    return res.status(400).json({ error: 'Order ID required' });
  }

  // Get order details
  db.get('SELECT * FROM orders WHERE id = ?', [orderId], (err, order) => {
    if (err || !order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Update order status
    db.run('UPDATE orders SET status = ? WHERE id = ?', ['completed', orderId], (err) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to update order status' });
      }

      // Get all courses from this order
      db.all('SELECT course_id FROM order_items WHERE order_id = ?', [orderId], (err, items) => {
        if (err) {
          console.error('Error getting order items:', err);
          return res.status(500).json({ error: 'Failed to get order items' });
        }

        console.log(`Order ${orderId} has ${items.length} items:`, items);

        if (items.length === 0) {
          console.error(`No order items found for order ${orderId}`);
          console.log('Order details:', order);
          console.log('Available order items query result:', items);
          return res.status(400).json({ 
            error: 'No courses found in this order. Please check if the order was created properly.' 
          });
        }

        // Create enrollments for each course
        let enrollmentsCreated = 0;
        items.forEach(item => {
          if (item.course_id) {
            db.run(
              'INSERT OR IGNORE INTO enrollments (user_id, course_id, status) VALUES (?, ?, ?)',
              [order.user_id, item.course_id, 'active'],
              (err) => {
                if (err) {
                  console.error('Error creating enrollment:', err);
                } else {
                  enrollmentsCreated++;
                  console.log(`Created enrollment for user ${order.user_id}, course ${item.course_id}`);
                }
              }
            );
          } else {
            console.error('Invalid course_id in order item:', item);
          }
        });

        res.json({
          message: 'Order approved and access granted',
          orderId: orderId,
          enrollmentsCreated: enrollmentsCreated
        });
      });
    });
  });
});

// Get all students
app.get('/api/admin/students', authenticateToken, requireAdmin, (req, res) => {
  db.all('SELECT * FROM users WHERE role = "student" ORDER BY created_at DESC', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

app.get('/api/admin/teachers', authenticateToken, requireAdmin, (req, res) => {
  db.all('SELECT * FROM teachers ORDER BY created_at DESC', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

// Public leaderboard endpoint (no authentication required)
app.get('/api/leaderboard', (req, res) => {
  db.all('SELECT id, first_name, last_name, points FROM users WHERE role = "student" ORDER BY points DESC', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

// Analytics endpoints
app.get('/api/analytics/overview', (req, res) => {
  // Get basic analytics data
  const analytics = {
    visitors: 1247,
    users: 89,
    courses: 3,
    sessionTime: 12.5,
    visitorsTrend: 12.5,
    usersTrend: 8.3,
    coursesTrend: 0,
    sessionTrend: 15.2
  };
  res.json(analytics);
});

app.get('/api/analytics/traffic', (req, res) => {
  const traffic = {
    pageViews: [
      { page: 'Home', views: 450 },
      { page: 'Courses', views: 320 },
      { page: 'Physics', views: 180 },
      { page: 'Mathematics', views: 150 },
      { page: 'Chemistry', views: 120 },
      { page: 'Community', views: 90 }
    ],
    sources: [
      { source: 'Direct', percentage: 40 },
      { source: 'Google', percentage: 35 },
      { source: 'Social Media', percentage: 15 },
      { source: 'Referrals', percentage: 7 },
      { source: 'Email', percentage: 3 }
    ]
  };
  res.json(traffic);
});

app.get('/api/analytics/users', (req, res) => {
  const users = {
    ageDistribution: [
      { age: '13-17', count: 32 },
      { age: '18-24', count: 45 },
      { age: '25-34', count: 12 },
      { age: '35-44', count: 8 },
      { age: '45+', count: 3 }
    ],
    registrationTrend: [
      { week: 'Week 1', registrations: 5 },
      { week: 'Week 2', registrations: 12 },
      { week: 'Week 3', registrations: 18 },
      { week: 'Week 4', registrations: 25 }
    ]
  };
  res.json(users);
});

app.get('/api/analytics/courses', (req, res) => {
  const courses = {
    popularity: [
      { course: 'Physics', enrollments: 45 },
      { course: 'Mathematics', enrollments: 38 },
      { course: 'Chemistry', enrollments: 22 }
    ],
    enrollmentTrend: [
      { month: 'Jan', physics: 10, mathematics: 8, chemistry: 5 },
      { month: 'Feb', physics: 15, mathematics: 12, chemistry: 8 },
      { month: 'Mar', physics: 20, mathematics: 18, chemistry: 12 },
      { month: 'Apr', physics: 25, mathematics: 22, chemistry: 15 },
      { month: 'May', physics: 30, mathematics: 28, chemistry: 18 },
      { month: 'Jun', physics: 35, mathematics: 32, chemistry: 22 }
    ]
  };
  res.json(courses);
});

app.get('/api/analytics/engagement', (req, res) => {
  const engagement = {
    activity: [
      { hour: '00:00', users: 5 },
      { hour: '04:00', users: 2 },
      { hour: '08:00', users: 15 },
      { hour: '12:00', users: 25 },
      { hour: '16:00', users: 20 },
      { hour: '20:00', users: 12 }
    ],
    features: [
      { feature: 'Lectures', usage: 35 },
      { feature: 'Quizzes', usage: 25 },
      { feature: 'Homework', usage: 20 },
      { feature: 'Community', usage: 15 },
      { feature: 'Leaderboard', usage: 5 }
    ]
  };
  res.json(engagement);
});

// Update student endpoint
app.put('/api/admin/update-student', authenticateToken, requireAdmin, (req, res) => {
  const { studentId, first_name, last_name, email, phone, role, is_active } = req.body;

  if (!studentId) {
    return res.status(400).json({ error: 'Student ID is required' });
  }

  // Check if student exists
  db.get('SELECT * FROM users WHERE id = ?', [studentId], (err, student) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Update student
    const updateQuery = `
      UPDATE users 
      SET first_name = ?, last_name = ?, email = ?, phone = ?, role = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    
    db.run(updateQuery, [first_name, last_name, email, phone, role, is_active, studentId], function(err) {
      if (err) {
        console.error('Error updating student:', err);
        return res.status(500).json({ error: 'Failed to update student' });
      }
      
      res.json({ 
        success: true, 
        message: 'Student updated successfully',
        changes: this.changes
      });
    });
  });
});

// Update student points endpoint
app.put('/api/admin/update-student-points', authenticateToken, requireAdmin, (req, res) => {
  const { studentId, points, action } = req.body; // action: 'add', 'set', 'subtract'

  if (!studentId || points === undefined) {
    return res.status(400).json({ error: 'Student ID and points are required' });
  }

  // Check if student exists
  db.get('SELECT * FROM users WHERE id = ?', [studentId], (err, student) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    let newPoints = student.points || 0;
    
    switch (action) {
      case 'add':
        newPoints += parseInt(points);
        break;
      case 'subtract':
        newPoints = Math.max(0, newPoints - parseInt(points));
        break;
      case 'set':
      default:
        newPoints = parseInt(points);
        break;
    }

    // Update student points
    const updateQuery = `
      UPDATE users 
      SET points = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    
    db.run(updateQuery, [newPoints, studentId], function(err) {
      if (err) {
        console.error('Error updating student points:', err);
        return res.status(500).json({ error: 'Failed to update student points' });
      }
      
      res.json({ 
        success: true, 
        message: 'Student points updated successfully',
        newPoints: newPoints,
        changes: this.changes
      });
    });
  });
});

// Update teacher endpoint
app.put('/api/admin/update-teacher', authenticateToken, requireAdmin, (req, res) => {
  const { teacherId, first_name, last_name, email, subject, experience, phone, is_active } = req.body;

  if (!teacherId) {
    return res.status(400).json({ error: 'Teacher ID is required' });
  }

  // Check if teacher exists
  db.get('SELECT * FROM teachers WHERE id = ?', [teacherId], (err, teacher) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    // Update teacher
    const updateQuery = `
      UPDATE teachers 
      SET first_name = ?, last_name = ?, email = ?, subject = ?, experience = ?, phone = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    
    db.run(updateQuery, [first_name, last_name, email, subject, experience, phone, is_active, teacherId], function(err) {
      if (err) {
        console.error('Error updating teacher:', err);
        return res.status(500).json({ error: 'Failed to update teacher' });
      }
      
      res.json({ 
        success: true, 
        message: 'Teacher updated successfully',
        changes: this.changes
      });
    });
  });
});

// Update course endpoint
app.put('/api/admin/update-course', authenticateToken, requireAdmin, (req, res) => {
  const { courseId, title, description, instructor, price, duration, level, is_active } = req.body;

  if (!courseId) {
    return res.status(400).json({ error: 'Course ID is required' });
  }

  // Check if course exists
  db.get('SELECT * FROM courses WHERE id = ?', [courseId], (err, course) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Update course
    const updateQuery = `
      UPDATE courses 
      SET title = ?, description = ?, instructor = ?, price = ?, duration = ?, level = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    
    db.run(updateQuery, [title, description, instructor, price, duration, level, is_active, courseId], function(err) {
      if (err) {
        console.error('Error updating course:', err);
        return res.status(500).json({ error: 'Failed to update course' });
      }
      
      res.json({ 
        success: true, 
        message: 'Course updated successfully',
        changes: this.changes
      });
    });
  });
});

app.get('/api/admin/enrollments', authenticateToken, requireAdmin, (req, res) => {
  const query = `
    SELECT 
      e.id,
      e.user_id,
      e.course_id,
      u.first_name,
      u.last_name,
      c.title as course_title,
      c.instructor,
      c.price,
      e.enrolled_at,
      e.status
    FROM enrollments e
    JOIN users u ON e.user_id = u.id
    JOIN courses c ON e.course_id = c.id
    ORDER BY e.enrolled_at DESC
  `;

  db.all(query, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

app.post('/api/admin/approve-order', authenticateToken, requireAdmin, (req, res) => {
  const { orderId } = req.body;

  if (!orderId) {
    return res.status(400).json({ error: 'Order ID is required' });
  }

  // Start transaction
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');

    // Update order status
    db.run(
      'UPDATE orders SET status = ? WHERE id = ?',
      ['completed', orderId],
      function(err) {
        if (err) {
          db.run('ROLLBACK');
          return res.status(500).json({ error: 'Failed to update order' });
        }

        // Get order items
        db.all(
          'SELECT course_id FROM order_items WHERE order_id = ?',
          [orderId],
          (err, items) => {
            if (err) {
              db.run('ROLLBACK');
              return res.status(500).json({ error: 'Failed to get order items' });
            }

            // Get user ID from order
            db.get(
              'SELECT user_id FROM orders WHERE id = ?',
              [orderId],
              (err, order) => {
                if (err) {
                  db.run('ROLLBACK');
                  return res.status(500).json({ error: 'Failed to get order details' });
                }

                // Create enrollments for each course
                const enrollPromises = items.map(item => {
                  return new Promise((resolve, reject) => {
                    db.run(
                      'INSERT OR IGNORE INTO enrollments (user_id, course_id, status) VALUES (?, ?, ?)',
                      [order.user_id, item.course_id, 'active'],
                      (err) => {
                        if (err) reject(err);
                        else resolve();
                      }
                    );
                  });
                });

                Promise.all(enrollPromises)
                  .then(() => {
                    db.run('COMMIT');
                    res.json({ message: 'Order approved and enrollments created' });
                  })
                  .catch((err) => {
                    db.run('ROLLBACK');
                    res.status(500).json({ error: 'Failed to create enrollments' });
                  });
              }
            );
          }
        );
      }
    );
  });
});

app.post('/api/admin/grant-access', authenticateToken, requireAdmin, (req, res) => {
  const { userId, courseId } = req.body;

  if (!userId || !courseId) {
    return res.status(400).json({ error: 'User ID and Course ID are required' });
  }

  db.run(
    'INSERT OR IGNORE INTO enrollments (user_id, course_id, status) VALUES (?, ?, ?)',
    [userId, courseId, 'active'],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to grant access' });
      }
      res.json({ message: 'Access granted successfully' });
    }
  );
});

// Get enrolled courses for current user
app.get('/api/my-enrollments', authenticateToken, (req, res) => {
  const query = `
    SELECT c.id, c.title, c.instructor, c.price, e.enrolled_at, e.status
    FROM enrollments e
    INNER JOIN courses c ON e.course_id = c.id
    WHERE e.user_id = ? AND e.status = 'active'
    ORDER BY e.enrolled_at DESC
  `;
  
  db.all(query, [req.user.id], (err, rows) => {
    if (err) {
      console.error('Error fetching enrollments:', err);
      return res.status(500).json({ error: 'Database error', details: err.message });
    }
    res.json(rows);
  });
});

// Get user pending orders
app.get('/api/my-pending-orders', authenticateToken, (req, res) => {
  const userId = req.user.id;
  
  const query = `
    SELECT 
      o.id,
      o.total_amount,
      o.payment_method,
      o.status,
      o.created_at,
      GROUP_CONCAT(c.title, ', ') as course_titles
    FROM orders o
    LEFT JOIN order_items oi ON o.id = oi.order_id
    LEFT JOIN courses c ON oi.course_id = c.id
    WHERE o.user_id = ? AND o.status = 'pending'
    GROUP BY o.id
    ORDER BY o.created_at DESC
  `;

  db.all(query, [userId], (err, rows) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

app.post('/api/admin/revoke-access', authenticateToken, requireAdmin, (req, res) => {
  const { userId, courseId } = req.body;

  console.log('Revoke access request:', { userId, courseId });

  if (!userId || !courseId) {
    return res.status(400).json({ error: 'User ID and Course ID are required' });
  }

  db.run(
    'UPDATE enrollments SET status = ? WHERE user_id = ? AND course_id = ?',
    ['inactive', userId, courseId],
    function(err) {
      if (err) {
        console.error('Database error revoking access:', err);
        return res.status(500).json({ error: 'Failed to revoke access: ' + err.message });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Enrollment not found' });
      }
      
      console.log('Access revoked successfully for user', userId, 'course', courseId);
      res.json({ message: 'Access revoked successfully' });
    }
  );
});

// Delete enrollment permanently
app.post('/api/admin/delete-enrollment', authenticateToken, requireAdmin, (req, res) => {
  const { enrollmentId } = req.body;

  if (!enrollmentId) {
    return res.status(400).json({ error: 'Enrollment ID is required' });
  }

  db.run(
    'DELETE FROM enrollments WHERE id = ?',
    [enrollmentId],
    function(err) {
      if (err) {
        console.error('Database error deleting enrollment:', err);
        return res.status(500).json({ error: 'Failed to delete enrollment' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Enrollment not found' });
      }
      
      console.log('Enrollment deleted successfully:', enrollmentId);
      res.json({ message: 'Enrollment deleted successfully' });
    }
  );
});

// Delete order permanently
app.post('/api/admin/delete-order', authenticateToken, requireAdmin, (req, res) => {
  const { orderId } = req.body;

  if (!orderId) {
    return res.status(400).json({ error: 'Order ID is required' });
  }

  // First delete order items
  db.run('DELETE FROM order_items WHERE order_id = ?', [orderId], (err) => {
    if (err) {
      console.error('Error deleting order items:', err);
      return res.status(500).json({ error: 'Failed to delete order items' });
    }

    // Then delete the order
    db.run('DELETE FROM orders WHERE id = ?', [orderId], function(err) {
      if (err) {
        console.error('Error deleting order:', err);
        return res.status(500).json({ error: 'Failed to delete order' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Order not found' });
      }
      
      console.log('Order deleted successfully:', orderId);
      res.json({ message: 'Order and all related items deleted successfully' });
    });
  });
});

// ========== ASSISTANTS API ==========

// Get all assistants
app.get('/api/admin/assistants', authenticateToken, requireAdmin, (req, res) => {
  const query = `
    SELECT a.*, t.first_name || ' ' || t.last_name as teacher_name 
    FROM assistants a
    LEFT JOIN teachers t ON a.teacher_id = t.id
    ORDER BY a.created_at DESC
  `;
  
  db.all(query, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

// Add new assistant
app.post('/api/admin/assistants', authenticateToken, requireAdmin, (req, res) => {
  const { first_name, last_name, email, subject, teacher_id } = req.body;
  
  db.run(
    'INSERT INTO assistants (first_name, last_name, email, subject, teacher_id) VALUES (?, ?, ?, ?, ?)',
    [first_name, last_name, email, subject, teacher_id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to create assistant' });
      }
      res.json({ id: this.lastID, message: 'Assistant added successfully' });
    }
  );
});

// ========== PARENTS API ==========

// Get all parents with their students
app.get('/api/admin/parents', authenticateToken, requireAdmin, (req, res) => {
  const query = `
    SELECT p.*, 
      GROUP_CONCAT(u.first_name || ' ' || u.last_name) as students
    FROM parents p
    LEFT JOIN student_parents sp ON p.id = sp.parent_id
    LEFT JOIN users u ON sp.student_id = u.id
    GROUP BY p.id
    ORDER BY p.created_at DESC
  `;
  
  db.all(query, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

// Get parent for a specific student
app.get('/api/admin/student/:student_id/parent', authenticateToken, requireAdmin, (req, res) => {
  const query = `
    SELECT p.*, sp.relationship
    FROM parents p
    INNER JOIN student_parents sp ON p.id = sp.parent_id
    WHERE sp.student_id = ?
    LIMIT 1
  `;
  
  db.get(query, [req.params.student_id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(row || null);
  });
});

// Add new parent
app.post('/api/admin/parents', authenticateToken, requireAdmin, (req, res) => {
  const { first_name, last_name, email, phone, whatsapp_number } = req.body;
  
  db.run(
    'INSERT INTO parents (first_name, last_name, email, phone, whatsapp_number) VALUES (?, ?, ?, ?, ?)',
    [first_name, last_name, email, phone, whatsapp_number],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to create parent' });
      }
      res.json({ id: this.lastID, message: 'Parent added successfully' });
    }
  );
});

// Link student to parent
app.post('/api/admin/link-student-parent', authenticateToken, requireAdmin, (req, res) => {
  const { student_id, parent_id, relationship } = req.body;
  
  db.run(
    'INSERT INTO student_parents (student_id, parent_id, relationship) VALUES (?, ?, ?)',
    [student_id, parent_id, relationship || 'parent'],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to link student to parent' });
      }
      res.json({ message: 'Student linked to parent successfully' });
    }
  );
});

// Update parent followup settings
app.post('/api/admin/parent-followup-settings', authenticateToken, requireAdmin, (req, res) => {
  const { parent_id, weekly_email, weekly_whatsapp, monthly_email, monthly_whatsapp, preferred_day, preferred_time } = req.body;
  
  const query = `
    INSERT INTO parent_followup_settings 
    (parent_id, weekly_email, weekly_whatsapp, monthly_email, monthly_whatsapp, preferred_day, preferred_time)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(parent_id) DO UPDATE SET
      weekly_email = excluded.weekly_email,
      weekly_whatsapp = excluded.weekly_whatsapp,
      monthly_email = excluded.monthly_email,
      monthly_whatsapp = excluded.monthly_whatsapp,
      preferred_day = excluded.preferred_day,
      preferred_time = excluded.preferred_time,
      updated_at = CURRENT_TIMESTAMP
  `;
  
  db.run(query, [parent_id, weekly_email, weekly_whatsapp, monthly_email, monthly_whatsapp, preferred_day, preferred_time],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to update followup settings' });
      }
      res.json({ message: 'Followup settings updated successfully' });
    }
  );
});

// Get parent followup settings
app.get('/api/admin/parent-followup-settings/:parent_id', authenticateToken, requireAdmin, (req, res) => {
  db.get(
    'SELECT * FROM parent_followup_settings WHERE parent_id = ?',
    [req.params.parent_id],
    (err, row) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(row || {});
    }
  );
});

// ========== SUBJECT-SPECIFIC DATA API ==========

// Save mathematics activity
app.post('/api/mathematics/activity', authenticateToken, (req, res) => {
  const { activity_type, topic, score, total_score, accuracy, time_spent, flashcards_correct, flashcards_wrong, homework_completed, quizzes_completed, exams_completed } = req.body;
  const student_id = req.user.id;
  
  db.run(
    `INSERT INTO mathematics_data 
    (student_id, activity_type, topic, score, total_score, accuracy, time_spent, flashcards_correct, flashcards_wrong, homework_completed, quizzes_completed, exams_completed)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [student_id, activity_type, topic, score, total_score, accuracy, time_spent, flashcards_correct || 0, flashcards_wrong || 0, homework_completed || 0, quizzes_completed || 0, exams_completed || 0],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to save mathematics activity' });
      }
      res.json({ id: this.lastID, message: 'Mathematics activity saved successfully' });
    }
  );
});

// Get mathematics data for a student
app.get('/api/mathematics/student/:student_id', authenticateToken, (req, res) => {
  db.all(
    'SELECT * FROM mathematics_data WHERE student_id = ? ORDER BY created_at DESC',
    [req.params.student_id],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(rows);
    }
  );
});

// Save physics activity
app.post('/api/physics/activity', authenticateToken, (req, res) => {
  const { activity_type, topic, score, total_score, accuracy, time_spent, flashcards_correct, flashcards_wrong, homework_completed, quizzes_completed, exams_completed } = req.body;
  const student_id = req.user.id;
  
  db.run(
    `INSERT INTO physics_data 
    (student_id, activity_type, topic, score, total_score, accuracy, time_spent, flashcards_correct, flashcards_wrong, homework_completed, quizzes_completed, exams_completed)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [student_id, activity_type, topic, score, total_score, accuracy, time_spent, flashcards_correct || 0, flashcards_wrong || 0, homework_completed || 0, quizzes_completed || 0, exams_completed || 0],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to save physics activity' });
      }
      res.json({ id: this.lastID, message: 'Physics activity saved successfully' });
    }
  );
});

// Get physics data for a student
app.get('/api/physics/student/:student_id', authenticateToken, (req, res) => {
  db.all(
    'SELECT * FROM physics_data WHERE student_id = ? ORDER BY created_at DESC',
    [req.params.student_id],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(rows);
    }
  );
});

// Save chemistry activity
app.post('/api/chemistry/activity', authenticateToken, (req, res) => {
  const { activity_type, topic, score, total_score, accuracy, time_spent, flashcards_correct, flashcards_wrong, homework_completed, quizzes_completed, exams_completed } = req.body;
  const student_id = req.user.id;
  
  db.run(
    `INSERT INTO chemistry_data 
    (student_id, activity_type, topic, score, total_score, accuracy, time_spent, flashcards_correct, flashcards_wrong, homework_completed, quizzes_completed, exams_completed)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [student_id, activity_type, topic, score, total_score, accuracy, time_spent, flashcards_correct || 0, flashcards_wrong || 0, homework_completed || 0, quizzes_completed || 0, exams_completed || 0],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to save chemistry activity' });
      }
      res.json({ id: this.lastID, message: 'Chemistry activity saved successfully' });
    }
  );
});

// Get chemistry data for a student
app.get('/api/chemistry/student/:student_id', authenticateToken, (req, res) => {
  db.all(
    'SELECT * FROM chemistry_data WHERE student_id = ? ORDER BY created_at DESC',
    [req.params.student_id],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(rows);
    }
  );
});

// ========== STUDENT PROGRESS API ==========

// Track student activity/progress
app.post('/api/student/progress', authenticateToken, (req, res) => {
  const { course_id, activity_type, activity_name, score, total_score, completed, time_spent } = req.body;
  const student_id = req.user.id;
  
  db.run(
    `INSERT INTO student_progress 
    (student_id, course_id, activity_type, activity_name, score, total_score, completed, time_spent)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [student_id, course_id, activity_type, activity_name, score, total_score, completed, time_spent],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to save progress' });
      }
      res.json({ id: this.lastID, message: 'Progress saved successfully' });
    }
  );
});

// Get student progress summary for parents
app.get('/api/parent/student-progress/:student_id', authenticateToken, (req, res) => {
  const query = `
    SELECT 
      sp.*,
      c.title as course_title,
      u.first_name || ' ' || u.last_name as student_name
    FROM student_progress sp
    LEFT JOIN courses c ON sp.course_id = c.id
    LEFT JOIN users u ON sp.student_id = u.id
    WHERE sp.student_id = ?
    ORDER BY sp.created_at DESC
    LIMIT 100
  `;
  
  db.all(query, [req.params.student_id], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

// ========== AUTOMATED FOLLOWUP SYSTEM ==========

// Function to generate weekly report for a student
function generateWeeklyReport(studentId, callback) {
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  
  const query = `
    SELECT 
      activity_type,
      activity_name,
      COUNT(*) as activities_count,
      AVG(score) as avg_score,
      SUM(time_spent) as total_time,
      SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) as completed_count
    FROM student_progress
    WHERE student_id = ? AND created_at >= ?
    GROUP BY activity_type
  `;
  
  db.all(query, [studentId, oneWeekAgo], (err, stats) => {
    if (err) {
      return callback(err, null);
    }
    callback(null, stats);
  });
}

// Function to generate monthly report
function generateMonthlyReport(studentId, callback) {
  const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  
  const query = `
    SELECT 
      c.title as course_name,
      COUNT(*) as activities_count,
      AVG(sp.score) as avg_score,
      SUM(sp.time_spent) as total_time,
      SUM(CASE WHEN sp.completed = 1 THEN 1 ELSE 0 END) as completed_count
    FROM student_progress sp
    LEFT JOIN courses c ON sp.course_id = c.id
    WHERE sp.student_id = ? AND sp.created_at >= ?
    GROUP BY sp.course_id
  `;
  
  db.all(query, [studentId, oneMonthAgo], (err, stats) => {
    if (err) {
      return callback(err, null);
    }
    callback(null, stats);
  });
}

// Send parent followup (manual trigger for testing)
app.post('/api/admin/send-parent-followup', authenticateToken, requireAdmin, (req, res) => {
  const { parent_id, type } = req.body; // type: 'weekly' or 'monthly'
  
  // Get parent details and their children
  db.get('SELECT * FROM parents WHERE id = ?', [parent_id], (err, parent) => {
    if (err || !parent) {
      return res.status(500).json({ error: 'Parent not found' });
    }
    
    // Get linked students
    db.all(
      `SELECT u.*, sp.relationship 
       FROM users u 
       JOIN student_parents sp ON u.id = sp.student_id 
       WHERE sp.parent_id = ?`,
      [parent_id],
      (err, students) => {
        if (err) {
          return res.status(500).json({ error: 'Failed to get students' });
        }
        
        // Generate reports for each student
        const reports = [];
        let processed = 0;
        
        students.forEach(student => {
          const reportFn = type === 'weekly' ? generateWeeklyReport : generateMonthlyReport;
          
          reportFn(student.id, (err, stats) => {
            processed++;
            
            if (!err && stats) {
              reports.push({
                student: `${student.first_name} ${student.last_name}`,
                stats: stats
              });
            }
            
            if (processed === students.length) {
              // Prepare email/WhatsApp content
              const reportContent = {
                parent_name: `${parent.first_name} ${parent.last_name}`,
                parent_email: parent.email,
                parent_whatsapp: parent.whatsapp_number,
                report_type: type,
                generated_date: new Date().toISOString(),
                students_reports: reports
              };
              
              // Update last sent timestamp
              const updateField = type === 'weekly' ? 'last_weekly_sent' : 'last_monthly_sent';
              db.run(
                `UPDATE parent_followup_settings SET ${updateField} = CURRENT_TIMESTAMP WHERE parent_id = ?`,
                [parent_id]
              );
              
              // In a real implementation, you would send email/WhatsApp here
              console.log('📧 Sending followup to:', parent.email);
              console.log('📊 Report:', reportContent);
              
              res.json({ 
                message: `${type.charAt(0).toUpperCase() + type.slice(1)} followup sent successfully`,
                report: reportContent
              });
            }
          });
        });
      }
    );
  });
});

// Get parents due for weekly followup
app.get('/api/admin/parents-due-weekly', authenticateToken, requireAdmin, (req, res) => {
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  
  const query = `
    SELECT p.*, pfs.*
    FROM parents p
    JOIN parent_followup_settings pfs ON p.id = pfs.parent_id
    WHERE p.is_active = 1 
    AND (pfs.weekly_email = 1 OR pfs.weekly_whatsapp = 1)
    AND pfs.preferred_day = ?
    AND (pfs.last_weekly_sent IS NULL OR date(pfs.last_weekly_sent) < date('now', '-7 days'))
  `;
  
  db.all(query, [today], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

// Get parents due for monthly followup
app.get('/api/admin/parents-due-monthly', authenticateToken, requireAdmin, (req, res) => {
  const query = `
    SELECT p.*, pfs.*
    FROM parents p
    JOIN parent_followup_settings pfs ON p.id = pfs.parent_id
    WHERE p.is_active = 1 
    AND (pfs.monthly_email = 1 OR pfs.monthly_whatsapp = 1)
    AND (pfs.last_monthly_sent IS NULL OR date(pfs.last_monthly_sent) < date('now', '-30 days'))
  `;
  
  db.all(query, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

// Automated scheduled task to send followups
function scheduleParentFollowups() {
  console.log('🔄 Checking for parent followups to send...');
  
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  
  // Check weekly followups
  const weeklyQuery = `
    SELECT p.id, p.email, p.whatsapp_number, pfs.weekly_email, pfs.weekly_whatsapp
    FROM parents p
    JOIN parent_followup_settings pfs ON p.id = pfs.parent_id
    WHERE p.is_active = 1 
    AND (pfs.weekly_email = 1 OR pfs.weekly_whatsapp = 1)
    AND pfs.preferred_day = ?
    AND (pfs.last_weekly_sent IS NULL OR date(pfs.last_weekly_sent) < date('now', '-7 days'))
  `;
  
  db.all(weeklyQuery, [today], (err, parents) => {
    if (!err && parents && parents.length > 0) {
      console.log(`📧 Found ${parents.length} parents due for weekly followup`);
      parents.forEach(async (parent) => {
        // Send weekly followup
        console.log(`Sending weekly report to parent ID ${parent.id}`);
        
        try {
          // Generate progress report
          const progressData = await generateProgressReport(parent.id, 'weekly');
          
          // Send email if enabled
          if (parent.weekly_email && parent.email) {
            const emailSubject = 'Weekly Student Progress Report - IG Nation';
            const emailHtml = generateEmailHTML(progressData, 'weekly');
            await sendEmail(parent.email, emailSubject, emailHtml);
          }
          
          // Send WhatsApp if enabled
          if (parent.weekly_whatsapp && parent.whatsapp_number) {
            const whatsappMessage = generateWhatsAppMessage(progressData, 'weekly');
            await sendWhatsAppMessage(parent.whatsapp_number, whatsappMessage);
          }
          
          // Update last sent timestamp
          db.run(
            'UPDATE parent_followup_settings SET last_weekly_sent = CURRENT_TIMESTAMP WHERE parent_id = ?',
            [parent.id]
          );
          
        } catch (error) {
          console.error(`Error sending weekly followup to parent ${parent.id}:`, error);
        }
      });
    }
  });
  
  // Check monthly followups (send on 1st of month)
  const dayOfMonth = new Date().getDate();
  if (dayOfMonth === 1) {
    const monthlyQuery = `
      SELECT p.id, p.email, p.whatsapp_number, pfs.monthly_email, pfs.monthly_whatsapp
      FROM parents p
      JOIN parent_followup_settings pfs ON p.id = pfs.parent_id
      WHERE p.is_active = 1 
      AND (pfs.monthly_email = 1 OR pfs.monthly_whatsapp = 1)
      AND (pfs.last_monthly_sent IS NULL OR date(pfs.last_monthly_sent) < date('now', '-30 days'))
    `;
    
    db.all(monthlyQuery, (err, parents) => {
      if (!err && parents && parents.length > 0) {
        console.log(`📧 Found ${parents.length} parents due for monthly followup`);
        parents.forEach(async (parent) => {
          // Send monthly followup
          console.log(`Sending monthly report to parent ID ${parent.id}`);
          
          try {
            // Generate progress report
            const progressData = await generateProgressReport(parent.id, 'monthly');
            
            // Send email if enabled
            if (parent.monthly_email && parent.email) {
              const emailSubject = 'Monthly Student Progress Report - IG Nation';
              const emailHtml = generateEmailHTML(progressData, 'monthly');
              await sendEmail(parent.email, emailSubject, emailHtml);
            }
            
            // Send WhatsApp if enabled
            if (parent.monthly_whatsapp && parent.whatsapp_number) {
              const whatsappMessage = generateWhatsAppMessage(progressData, 'monthly');
              await sendWhatsAppMessage(parent.whatsapp_number, whatsappMessage);
            }
            
            // Update last sent timestamp
            db.run(
              'UPDATE parent_followup_settings SET last_monthly_sent = CURRENT_TIMESTAMP WHERE parent_id = ?',
              [parent.id]
            );
            
          } catch (error) {
            console.error(`Error sending monthly followup to parent ${parent.id}:`, error);
          }
        });
      }
    });
  }
}

// Schedule followup checks every day at 9:00 AM
const schedule = require('node-schedule');
const rule = new schedule.RecurrenceRule();
rule.hour = 9;
rule.minute = 0;

// DISABLED: Parent followup automation
// const job = schedule.scheduleJob(rule, function() {
//   console.log('⏰ Running scheduled parent followup check...');
//   scheduleParentFollowups();
// });

// DISABLED: Also run check immediately on server start (for testing)
// setTimeout(() => {
//   console.log('🚀 Running initial parent followup check...');
//   scheduleParentFollowups();
// }, 5000);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Teacher Content Management API Endpoints
// Note: These endpoints work without authentication for demo purposes
// In production, you should implement proper teacher authentication

// Get all lectures for a teacher
app.get('/api/teacher/lectures', (req, res) => {
  const teacherId = 1; // Default teacher ID for demo
  const { subject } = req.query;
  
  let query = 'SELECT * FROM teacher_lectures WHERE teacher_id = ? AND is_active = 1';
  let params = [teacherId];
  
  if (subject) {
    query += ' AND subject = ?';
    params.push(subject);
  }
  
  query += ' ORDER BY created_at DESC';
  
  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

// Create a new lecture
app.post('/api/teacher/lectures', (req, res) => {
  const teacherId = 1; // Default teacher ID for demo
  const { subject, title, description, video_url, pdf_url, duration, type } = req.body;
  
  const query = `
    INSERT INTO teacher_lectures (teacher_id, subject, title, description, video_url, pdf_url, duration, type)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;
  
  db.run(query, [teacherId, subject, title, description, video_url, pdf_url, duration, type], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ id: this.lastID, message: 'Lecture created successfully' });
  });
});

// Update a lecture
app.put('/api/teacher/lectures/:id', (req, res) => {
  const lectureId = req.params.id;
  const teacherId = 1; // Default teacher ID for demo
  const { title, description, video_url, pdf_url, duration, type } = req.body;
  
  const query = `
    UPDATE teacher_lectures 
    SET title = ?, description = ?, video_url = ?, pdf_url = ?, duration = ?, type = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND teacher_id = ?
  `;
  
  db.run(query, [title, description, video_url, pdf_url, duration, type, lectureId, teacherId], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Lecture not found' });
    }
    res.json({ message: 'Lecture updated successfully' });
  });
});

// Delete a lecture
app.delete('/api/teacher/lectures/:id', authenticateToken, (req, res) => {
  const lectureId = req.params.id;
  const teacherId = req.user.id;
  
  const query = 'UPDATE teacher_lectures SET is_active = 0 WHERE id = ? AND teacher_id = ?';
  
  db.run(query, [lectureId, teacherId], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Lecture not found' });
    }
    res.json({ message: 'Lecture deleted successfully' });
  });
});

// Get all assignments for a teacher
app.get('/api/teacher/assignments', authenticateToken, (req, res) => {
  const teacherId = req.user.id;
  const { subject } = req.query;
  
  let query = 'SELECT * FROM teacher_assignments WHERE teacher_id = ? AND is_active = 1';
  let params = [teacherId];
  
  if (subject) {
    query += ' AND subject = ?';
    params.push(subject);
  }
  
  query += ' ORDER BY created_at DESC';
  
  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

// Create a new assignment
app.post('/api/teacher/assignments', authenticateToken, (req, res) => {
  const teacherId = req.user.id;
  const { subject, title, description, instructions, due_date, points } = req.body;
  
  const query = `
    INSERT INTO teacher_assignments (teacher_id, subject, title, description, instructions, due_date, points)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  
  db.run(query, [teacherId, subject, title, description, instructions, due_date, points], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ id: this.lastID, message: 'Assignment created successfully' });
  });
});

// Update an assignment
app.put('/api/teacher/assignments/:id', authenticateToken, (req, res) => {
  const assignmentId = req.params.id;
  const teacherId = req.user.id;
  const { title, description, instructions, due_date, points } = req.body;
  
  const query = `
    UPDATE teacher_assignments 
    SET title = ?, description = ?, instructions = ?, due_date = ?, points = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND teacher_id = ?
  `;
  
  db.run(query, [title, description, instructions, due_date, points, assignmentId, teacherId], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Assignment not found' });
    }
    res.json({ message: 'Assignment updated successfully' });
  });
});

// Delete an assignment
app.delete('/api/teacher/assignments/:id', authenticateToken, (req, res) => {
  const assignmentId = req.params.id;
  const teacherId = req.user.id;
  
  const query = 'UPDATE teacher_assignments SET is_active = 0 WHERE id = ? AND teacher_id = ?';
  
  db.run(query, [assignmentId, teacherId], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Assignment not found' });
    }
    res.json({ message: 'Assignment deleted successfully' });
  });
});

// Get all exams for a teacher
app.get('/api/teacher/exams', authenticateToken, (req, res) => {
  const teacherId = req.user.id;
  const { subject } = req.query;
  
  let query = 'SELECT * FROM teacher_exams WHERE teacher_id = ? AND is_active = 1';
  let params = [teacherId];
  
  if (subject) {
    query += ' AND subject = ?';
    params.push(subject);
  }
  
  query += ' ORDER BY created_at DESC';
  
  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

// Create a new exam
app.post('/api/teacher/exams', authenticateToken, (req, res) => {
  const teacherId = req.user.id;
  const { subject, title, description, duration, total_questions, total_points } = req.body;
  
  const query = `
    INSERT INTO teacher_exams (teacher_id, subject, title, description, duration, total_questions, total_points)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  
  db.run(query, [teacherId, subject, title, description, duration, total_questions, total_points], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ id: this.lastID, message: 'Exam created successfully' });
  });
});

// Update an exam
app.put('/api/teacher/exams/:id', authenticateToken, (req, res) => {
  const examId = req.params.id;
  const teacherId = req.user.id;
  const { title, description, duration, total_questions, total_points } = req.body;
  
  const query = `
    UPDATE teacher_exams 
    SET title = ?, description = ?, duration = ?, total_questions = ?, total_points = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND teacher_id = ?
  `;
  
  db.run(query, [title, description, duration, total_questions, total_points, examId, teacherId], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Exam not found' });
    }
    res.json({ message: 'Exam updated successfully' });
  });
});

// Delete an exam
app.delete('/api/teacher/exams/:id', authenticateToken, (req, res) => {
  const examId = req.params.id;
  const teacherId = req.user.id;
  
  const query = 'UPDATE teacher_exams SET is_active = 0 WHERE id = ? AND teacher_id = ?';
  
  db.run(query, [examId, teacherId], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Exam not found' });
    }
    res.json({ message: 'Exam deleted successfully' });
  });
});

// Get all quizzes for a teacher
app.get('/api/teacher/quizzes', authenticateToken, (req, res) => {
  const teacherId = req.user.id;
  const { subject } = req.query;
  
  let query = 'SELECT * FROM teacher_quizzes WHERE teacher_id = ? AND is_active = 1';
  let params = [teacherId];
  
  if (subject) {
    query += ' AND subject = ?';
    params.push(subject);
  }
  
  query += ' ORDER BY created_at DESC';
  
  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

// Create a new quiz
app.post('/api/teacher/quizzes', authenticateToken, (req, res) => {
  const teacherId = req.user.id;
  const { subject, title, description, duration, total_questions, total_points } = req.body;
  
  const query = `
    INSERT INTO teacher_quizzes (teacher_id, subject, title, description, duration, total_questions, total_points)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  
  db.run(query, [teacherId, subject, title, description, duration, total_questions, total_points], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ id: this.lastID, message: 'Quiz created successfully' });
  });
});

// Update a quiz
app.put('/api/teacher/quizzes/:id', authenticateToken, (req, res) => {
  const quizId = req.params.id;
  const teacherId = req.user.id;
  const { title, description, duration, total_questions, total_points } = req.body;
  
  const query = `
    UPDATE teacher_quizzes 
    SET title = ?, description = ?, duration = ?, total_questions = ?, total_points = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND teacher_id = ?
  `;
  
  db.run(query, [title, description, duration, total_questions, total_points, quizId, teacherId], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Quiz not found' });
    }
    res.json({ message: 'Quiz updated successfully' });
  });
});

// Delete a quiz
app.delete('/api/teacher/quizzes/:id', authenticateToken, (req, res) => {
  const quizId = req.params.id;
  const teacherId = req.user.id;
  
  const query = 'UPDATE teacher_quizzes SET is_active = 0 WHERE id = ? AND teacher_id = ?';
  
  db.run(query, [quizId, teacherId], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Quiz not found' });
    }
    res.json({ message: 'Quiz deleted successfully' });
  });
});

// Get assignment submissions for grading
app.get('/api/teacher/assignment-submissions', authenticateToken, (req, res) => {
  const teacherId = req.user.id;
  const { assignment_id, status } = req.query;
  
  let query = `
    SELECT s.*, u.first_name, u.last_name, u.email, ta.title as assignment_title, ta.subject
    FROM assignment_submissions s
    JOIN users u ON s.student_id = u.id
    JOIN teacher_assignments ta ON s.assignment_id = ta.id
    WHERE ta.teacher_id = ?
  `;
  let params = [teacherId];
  
  if (assignment_id) {
    query += ' AND s.assignment_id = ?';
    params.push(assignment_id);
  }
  
  if (status) {
    query += ' AND s.status = ?';
    params.push(status);
  }
  
  query += ' ORDER BY s.submitted_at DESC';
  
  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

// Grade an assignment submission
app.put('/api/teacher/grade-assignment/:id', authenticateToken, (req, res) => {
  const submissionId = req.params.id;
  const teacherId = req.user.id;
  const { grade, feedback, status } = req.body;
  
  const query = `
    UPDATE assignment_submissions 
    SET grade = ?, feedback = ?, status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND assignment_id IN (
      SELECT id FROM teacher_assignments WHERE teacher_id = ?
    )
  `;
  
  db.run(query, [grade, feedback, status, submissionId, teacherId], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Submission not found' });
    }
    res.json({ message: 'Assignment graded successfully' });
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 IG Nation Backend Server running on http://localhost:${PORT}`);
  console.log(`📊 Admin Panel: http://localhost:${PORT}/admin-panel.html`);
  console.log(`🔐 Admin Login: admin@ignation.com / admin123`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err.message);
    } else {
      console.log('Database connection closed');
    }
    process.exit(0);
  });
});
