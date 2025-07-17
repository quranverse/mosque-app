# Mosque Translation App - Backend Server

## 🚀 Enhanced Authentication System Implementation

This is the enhanced backend server for the Mosque Translation App, now featuring a comprehensive authentication system with dual user types (mosque accounts and individual users), as outlined in the plan.md file.

## 📋 Implementation Status

### ✅ Phase 1: Authentication System (COMPLETED)
- [x] Welcome screen with user type selection (backend support)
- [x] Mosque registration form (complete API)
- [x] Individual user flow (simplified registration)
- [x] Basic authentication backend (JWT-based)
- [x] Secure password handling (bcrypt)
- [x] Email verification system
- [x] Password reset functionality
- [x] User profile management

## 🏗️ Architecture Overview

### Database Models
- **User Model** (`models/User.js`): Unified user model supporting both mosque and individual user types
- **Authentication Middleware** (`middleware/auth.js`): JWT-based authentication and authorization
- **Database Connection** (`database/database.js`): MongoDB connection with health checks

### API Endpoints

#### Authentication Routes (`/api/auth/`)
- `POST /register-mosque` - Register a new mosque account
- `POST /register-individual` - Register individual user (device-based)
- `POST /login` - User authentication
- `POST /refresh-token` - Refresh JWT token
- `GET /verify-email` - Email verification
- `POST /request-password-reset` - Request password reset
- `POST /reset-password` - Reset password with token
- `POST /change-password` - Change password (authenticated)
- `POST /logout` - User logout
- `DELETE /deactivate` - Deactivate account
- `GET /profile` - Get user profile
- `GET /status` - Check authentication status

#### Enhanced Features
- **Real-time Translation** with authentication support
- **Mosque Discovery** with account-based features
- **Session Management** with user tracking
- **Email Service** for verification and notifications

## 🔧 Configuration

### Environment Variables
Copy `.env.example` to `.env` and configure:

```bash
# Server Configuration
PORT=3001
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/mosque-translation-app

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d

# Email Configuration
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=noreply@mosquetranslationapp.com

# Security
CORS_ORIGIN=*
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or cloud)
- npm or yarn

### Installation
```bash
cd MosqueTranslationApp/server
npm install
```

### Database Setup
1. Install MongoDB locally or use MongoDB Atlas
2. Update `MONGODB_URI` in your `.env` file
3. The server will automatically create indexes and seed mock data in development

### Running the Server
```bash
# Production mode
npm start

# Development mode with auto-reload
npm run dev

# Run original mock server (for comparison)
npm run mock
```

### Testing Authentication
```bash
# Run authentication tests (requires server to be running)
node test-auth.js
```

## 📊 Features Implemented

### 🔐 Authentication System
- **JWT-based Authentication**: Secure token-based authentication
- **Dual User Types**: Support for mosque accounts and individual users
- **Email Verification**: Email verification for mosque accounts
- **Password Security**: Bcrypt hashing with configurable rounds
- **Rate Limiting**: Protection against brute force attacks
- **Session Management**: Secure session handling

### 🏛️ Mosque Account Features
- **Complete Registration**: Full mosque profile with location
- **Photo Upload Support**: Framework for mosque photo management
- **Service Configuration**: Configure offered services and languages
- **Analytics Tracking**: Track followers and translation sessions
- **Email Notifications**: Automated email notifications

### 👤 Individual User Features
- **Device-based Registration**: Simple registration without email
- **Mosque Following**: Follow multiple mosques
- **Preference Management**: Customizable app and notification settings
- **Location-based Discovery**: Find nearby mosques

### 🌐 Enhanced API Features
- **Geospatial Queries**: Find nearby mosques using MongoDB geospatial indexes
- **Real-time Updates**: WebSocket support with authentication
- **Comprehensive Validation**: Input validation and sanitization
- **Error Handling**: Comprehensive error handling and logging
- **Security Headers**: Helmet.js for security headers

## 🔒 Security Features

### Authentication Security
- **JWT Tokens**: Secure JSON Web Tokens with expiration
- **Password Hashing**: Bcrypt with configurable rounds
- **Rate Limiting**: Prevent brute force attacks
- **Input Validation**: Comprehensive input validation
- **CORS Protection**: Configurable CORS settings

### Data Security
- **Sensitive Data Filtering**: Automatic removal of sensitive fields
- **Database Indexes**: Optimized database queries
- **Environment Variables**: Secure configuration management
- **Graceful Shutdown**: Proper cleanup on server shutdown

## 📡 WebSocket Features

### Enhanced Socket.IO
- **Authentication Support**: Socket authentication with JWT
- **User Type Tracking**: Track authenticated user types
- **Session Management**: Enhanced session management with user data
- **Real-time Updates**: Live translation with authentication

### Socket Events
- `authenticate` - Authenticate socket connection
- `join_session` - Join translation session (enhanced)
- `start_session` - Start session (requires mosque auth)
- `end_session` - End session (requires mosque auth)
- `send_translation` - Send translation (requires mosque auth)

## 📧 Email Service

### Email Features
- **Verification Emails**: Beautiful HTML email templates
- **Password Reset**: Secure password reset emails
- **Welcome Emails**: Welcome emails for new mosque accounts
- **Notification Emails**: Follower notifications for mosques

### Email Templates
- Islamic-themed HTML templates
- Responsive design
- Quranic verses and Islamic greetings
- Professional branding

## 🗄️ Database Schema

### User Model Features
- **Unified Schema**: Single model for both user types
- **Geospatial Support**: Location-based queries
- **Flexible Settings**: Comprehensive preference management
- **Analytics Support**: Built-in analytics tracking
- **Relationship Management**: Mosque following system

### Indexes
- Email index for fast lookups
- Geospatial index for location queries
- User type index for filtering
- Compound indexes for complex queries

## 🧪 Testing

### Test Coverage
- Authentication endpoint testing
- User registration flows
- Login and token refresh
- Error handling validation

### Running Tests
```bash
# Start server in one terminal
npm run dev

# Run tests in another terminal
node test-auth.js
```

## 🔄 Migration from Mock Server

### Backward Compatibility
- All existing WebSocket events supported
- REST API endpoints maintained
- Mock data available in development
- Gradual migration path

### New Features
- Authentication-aware endpoints
- Enhanced mosque data
- User profile management
- Email notifications

## 🚀 Next Steps

### Phase 2: Photo Upload System
- Implement photo upload endpoints
- Image processing and optimization
- Photo gallery management
- CDN integration

### Phase 3: Enhanced Settings
- Comprehensive settings API
- Language configuration
- Notification preferences
- Account management UI

### Phase 4: Personalization Features
- Personalized mosque discovery
- Account-based following
- Customized prayer times
- Targeted notifications

## 📝 API Documentation

### Authentication Flow
1. **Mosque Registration**: POST `/api/auth/register-mosque`
2. **Email Verification**: GET `/api/auth/verify-email?token=...`
3. **Login**: POST `/api/auth/login`
4. **Access Protected Resources**: Include `Authorization: Bearer <token>` header

### Individual User Flow
1. **Device Registration**: POST `/api/auth/register-individual`
2. **Immediate Access**: Token provided immediately
3. **Mosque Following**: Use authenticated endpoints

## 🤝 Contributing

1. Follow the existing code structure
2. Add comprehensive error handling
3. Include input validation
4. Write tests for new features
5. Update documentation

## 📄 License

MIT License - see LICENSE file for details.

---

**May Allah bless this project and make it beneficial for the Muslim Ummah! 🤲**

*"And whoever does good deeds, whether male or female, while being a believer, those will enter Paradise." - Quran 4:124*
