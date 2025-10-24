# 📧 SMTP Configuration Guide

## 🚀 Quick Setup (Gmail - Recommended)

### Step 1: Enable Gmail App Password
1. Go to [Google Account Settings](https://myaccount.google.com/)
2. Navigate to **Security** → **2-Step Verification** (enable if not already)
3. Go to **Security** → **App passwords**
4. Select **Mail** and **Other (custom name)**
5. Enter "IG Nation App" as the name
6. Copy the 16-character app password (e.g., `abcd efgh ijkl mnop`)

### Step 2: Create Environment File
Create a file named `.env` in the `backend` folder with:

```bash
# Gmail SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-char-app-password
SMTP_FROM=your-email@gmail.com

# Other Settings
JWT_SECRET=change-this-secret-for-prod
FRONTEND_URL=http://localhost:3000
PORT=3000
```

### Step 3: Install dotenv Package
```bash
cd backend
npm install dotenv
```

### Step 4: Update server.js
Add this line at the top of `backend/server.js`:
```javascript
require('dotenv').config();
```

## 🔧 Alternative SMTP Providers

### Outlook/Hotmail
```bash
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@outlook.com
SMTP_PASS=your-password
```

### Yahoo Mail
```bash
SMTP_HOST=smtp.mail.yahoo.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@yahoo.com
SMTP_PASS=your-app-password
```

### Custom SMTP Server
```bash
SMTP_HOST=your-smtp-server.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-username
SMTP_PASS=your-password
```

## 🧪 Testing Email Configuration

1. Start the server: `cd backend && npm start`
2. Go to `http://localhost:3000`
3. Click "Forgot Password"
4. Enter your email
5. Check your inbox for the verification code

## 🔒 Security Notes

- Never commit `.env` files to version control
- Use app-specific passwords, not your main account password
- For production, use a dedicated email service like SendGrid or AWS SES

## 🐛 Troubleshooting

### "Authentication failed"
- Check your app password is correct
- Ensure 2-factor authentication is enabled
- Try generating a new app password

### "Connection timeout"
- Check your internet connection
- Verify SMTP_HOST and SMTP_PORT are correct
- Some networks block SMTP ports

### "Email not received"
- Check spam/junk folder
- Verify SMTP_FROM email address
- Wait a few minutes for delivery
































