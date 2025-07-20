# 🕌 Mosque Translation App - Complete Setup Guide

## 📋 Overview

This guide will help you set up the complete Mosque Translation App with MongoDB Atlas integration and authentication system. The app now supports dual user types (mosque accounts and individual users) with comprehensive backend functionality.

## 🎯 What You'll Achieve

After following this guide, you'll have:
- ✅ Fully functional backend server with authentication
- ✅ MongoDB Atlas database with proper schema
- ✅ Sample data for testing
- ✅ Email service for verification (optional)
- ✅ Real-time translation system
- ✅ Complete API endpoints for mosque and user management

## 🚀 Quick Start (5 Minutes)

### Step 1: Navigate to Server Directory
```bash
cd MosqueTranslationApp/server
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Run Setup Wizard
```bash
npm run setup
```

The setup wizard will guide you through:
1. **MongoDB Atlas Configuration** - Enter your connection string
2. **JWT Security Setup** - Auto-generate secure tokens
3. **Email Service** - Configure email verification (optional)
4. **Server Settings** - Port, CORS, and environment settings
5. **Database Testing** - Verify connection and create sample data

### Step 4: Start the Server
```bash
npm run dev
```

### Step 5: Test Everything
```bash
# In a new terminal
npm test
```

## 🗄️ MongoDB Atlas Setup (Detailed)

### 1. Create MongoDB Atlas Account
1. Go to https://cloud.mongodb.com
2. Sign up for a free account
3. Create a new organization and project

### 2. Create a Cluster
1. Click "Create a Cluster"
2. Choose "Shared" (free tier)
3. Select your preferred cloud provider and region
4. Click "Create Cluster" (takes 1-3 minutes)

### 3. Configure Database Access
1. Go to "Database Access" in the left sidebar
2. Click "Add New Database User"
3. Choose "Password" authentication
4. Enter username and password (save these!)
5. Set user privileges to "Read and write to any database"
6. Click "Add User"

### 4. Configure Network Access
1. Go to "Network Access" in the left sidebar
2. Click "Add IP Address"
3. Choose "Allow Access from Anywhere" (for development)
4. Or add your specific IP address for security
5. Click "Confirm"

### 5. Get Connection String
1. Go to "Clusters" and click "Connect"
2. Choose "Connect your application"
3. Select "Node.js" and version "4.1 or later"
4. Copy the connection string
5. Replace `<password>` with your database user password
6. Replace `<dbname>` with `mosque-translation-app`

Example connection string:
```
mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/mosque-translation-app?retryWrites=true&w=majority
```

## ⚙️ Manual Configuration

If you prefer manual setup instead of the wizard:

### 1. Create .env File
```bash
cp .env.example .env
```

### 2. Edit .env File
```env
# MongoDB Atlas Configuration
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/mosque-translation-app?retryWrites=true&w=majority

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d

# Server Configuration
PORT=3001
NODE_ENV=development

# Email Configuration (Optional)
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=noreply@mosquetranslationapp.com
```

### 3. Test Database Connection
```bash
npm run test-db
```

## 🧪 Testing Your Setup

### 1. Check Server Status
```bash
curl http://localhost:3001/api/status
```

Expected response:
```json
{
  "status": "running",
  "database": {
    "status": "connected",
    "isInitialized": true
  },
  "features": {
    "authentication": true,
    "databaseInitialized": true
  }
}
```

### 2. Test Authentication Endpoints
```bash
npm test
```

This will test:
- Mosque account registration
- Individual user registration
- Login functionality
- Token authentication
- Profile management

### 3. Test Sample Data
Visit these endpoints in your browser or with curl:

```bash
# Get nearby mosques
curl http://localhost:3001/api/mosques?lat=40.7128&lng=-74.0060

# Get active sessions
curl http://localhost:3001/api/sessions/active
```

## 📱 Frontend Integration

The backend is now ready for frontend integration. Key endpoints:

### Authentication
- `POST /api/auth/register-mosque` - Register mosque account
- `POST /api/auth/register-individual` - Register individual user
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile

### Mosque Discovery
- `GET /api/mosques` - Find nearby mosques
- `GET /api/sessions/active` - Get active translation sessions

### WebSocket Events
- `authenticate` - Authenticate socket connection
- `start_session` - Start translation session (mosque only)
- `join_session` - Join translation session
- `send_translation` - Send translation (mosque only)

## 🔧 Troubleshooting

### Database Connection Issues
1. **Check connection string format**
2. **Verify username/password**
3. **Ensure IP is whitelisted**
4. **Check network connectivity**

### Common Errors
- `MongoNetworkError`: Network access not configured
- `Authentication failed`: Wrong username/password
- `ENOTFOUND`: DNS resolution issues

### Debug Mode
```bash
DEBUG=* npm run dev
```

## 📊 Database Schema

The app creates these collections:
- **users** - Mosque accounts and individual users
- **sessions** - Translation sessions
- **translations** - Individual translation records

### Sample Data Created
- 3 sample mosque accounts
- 2 sample individual users
- Historical translation sessions
- Sample translations with Quranic verses

## 🔐 Security Features

- **JWT Authentication** with secure token generation
- **Password Hashing** using bcrypt (12 rounds)
- **Rate Limiting** to prevent abuse
- **Input Validation** on all endpoints
- **CORS Protection** with configurable origins
- **Security Headers** via Helmet.js

## 📧 Email Configuration (Optional)

For Gmail:
1. Enable 2-factor authentication
2. Generate an app password
3. Use app password in EMAIL_PASSWORD

For other providers:
- Update EMAIL_SERVICE in .env
- Check nodemailer documentation for settings

## 🚀 Production Deployment

Before deploying to production:

1. **Update Environment Variables**:
   ```env
   NODE_ENV=production
   JWT_SECRET=generate-a-new-secure-secret
   CORS_ORIGIN=https://yourdomain.com
   ```

2. **Secure MongoDB Atlas**:
   - Remove "Allow Access from Anywhere"
   - Add specific server IP addresses

3. **Enable SSL/HTTPS**
4. **Set up monitoring and logging**
5. **Configure backup strategy**

## 🤝 Support

If you encounter issues:
1. Check the troubleshooting section
2. Review server logs
3. Test individual components
4. Check MongoDB Atlas dashboard

## 📈 Next Steps

With the backend ready, you can now:
1. **Implement Frontend Authentication** - Create login/register screens
2. **Add Photo Upload** - Implement mosque photo management
3. **Enhance Settings** - Build comprehensive settings UI
4. **Add Personalization** - Implement user-specific features

---

**The backend authentication system is now fully configured and ready for production use!**

**May Allah bless this project and make it beneficial for the Muslim Ummah! 🤲**

*"And whoever does good deeds, whether male or female, while being a believer, those will enter Paradise." - Quran 4:124*
