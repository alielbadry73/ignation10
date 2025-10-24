# Parent Followup System - Documentation

## Overview
Automated system to send weekly and monthly progress reports to parents via email and WhatsApp.

## Database Tables

### 1. **assistants**
Teaching assistants who support teachers.
- Fields: id, first_name, last_name, email, subject, teacher_id, is_active
- Linked to teachers table

### 2. **parents**
Parent/guardian information.
- Fields: id, first_name, last_name, email, phone, whatsapp_number, is_active

### 3. **student_parents**
Links students to their parents/guardians.
- Fields: id, student_id, parent_id, relationship

### 4. **parent_followup_settings**
Parent communication preferences.
- Fields:
  - weekly_email, weekly_whatsapp (Boolean)
  - monthly_email, monthly_whatsapp (Boolean)
  - preferred_day, preferred_time
  - last_weekly_sent, last_monthly_sent

### 5. **student_progress**
Tracks student activities and scores.
- Fields: student_id, course_id, activity_type, activity_name, score, total_score, completed, time_spent

## API Endpoints

### Assistants
- `GET /api/admin/assistants` - Get all assistants
- `POST /api/admin/assistants` - Add new assistant

### Parents
- `GET /api/admin/parents` - Get all parents with their students
- `POST /api/admin/parents` - Add new parent
- `POST /api/admin/link-student-parent` - Link student to parent
- `POST /api/admin/parent-followup-settings` - Update followup preferences
- `GET /api/admin/parent-followup-settings/:parent_id` - Get parent settings

### Student Progress
- `POST /api/student/progress` - Track student activity
- `GET /api/parent/student-progress/:student_id` - Get student progress (for parents)

### Automated Followup
- `POST /api/admin/send-parent-followup` - Manually trigger followup (for testing)
  - Body: `{ "parent_id": 1, "type": "weekly" }` or `"monthly"`
- `GET /api/admin/parents-due-weekly` - Get parents scheduled for weekly report
- `GET /api/admin/parents-due-monthly` - Get parents due for monthly report

## Automated Scheduling

The system automatically:
1. **Checks daily at 9:00 AM** for parents due for reports
2. **Weekly Reports**: Sent on parent's preferred day (Monday-Sunday)
3. **Monthly Reports**: Sent on the 1st of each month
4. **Generates reports** including:
   - Student activities (quizzes, homework, flashcards)
   - Average scores
   - Time spent studying
   - Completion rates

## How to Use

### Admin Panel Management
1. Go to `http://localhost:3000/parent-followup-admin.html`
2. View all assistants and parents
3. Send manual weekly/monthly reports
4. See parents due for automated followups

### Testing Manual Followup
```javascript
// Example API call
fetch('http://localhost:3000/api/admin/send-parent-followup', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_ADMIN_TOKEN'
  },
  body: JSON.stringify({
    parent_id: 1,
    type: 'weekly' // or 'monthly'
  })
});
```

## Integration Points

### Email Integration (TODO)
To send actual emails, integrate with:
- Nodemailer (already installed)
- SMTP server (Gmail, SendGrid, etc.)
- Configure in server.js

### WhatsApp Integration (TODO)
To send WhatsApp messages, integrate with:
- Twilio WhatsApp API
- WhatsApp Business API
- Configure API credentials in server.js

## Sample Data
The system includes sample data:
- 4 assistants (linked to teachers)
- 5 parents (with email and WhatsApp numbers)
- Parent-student relationships
- Followup preferences (weekly/monthly, email/WhatsApp)

## Next Steps
1. Configure email SMTP settings
2. Set up WhatsApp API credentials
3. Customize email/WhatsApp templates
4. Add more detailed activity tracking
5. Create parent portal for self-service access



























































