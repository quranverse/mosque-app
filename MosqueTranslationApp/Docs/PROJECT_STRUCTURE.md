# Project Structure

This project has been reorganized into a clean frontend/backend structure:

## Directory Structure

```
MosqueTranslationApp/
├── frontend/                 # React Native/Expo frontend application
│   ├── src/                 # Source code
│   │   ├── components/      # Reusable UI components
│   │   ├── config/          # Configuration files
│   │   ├── hooks/           # Custom React hooks
│   │   ├── navigation/      # Navigation setup
│   │   ├── screens/         # Screen components
│   │   ├── services/        # API and external services
│   │   └── utils/           # Utility functions
│   ├── assets/              # Images, icons, and other static assets
│   ├── web-demo/            # Web demo files
│   ├── App.js               # Main application component
│   ├── index.js             # Entry point
│   ├── package.json         # Frontend dependencies
│   ├── app.json             # Expo configuration
│   ├── .env                 # Environment variables
│   └── node_modules/        # Frontend dependencies
│
├── backend/                 # Node.js/Express backend server
│   ├── config/              # Database and server configuration
│   ├── database/            # Database setup and migrations
│   ├── middleware/          # Express middleware
│   ├── models/              # Database models
│   ├── routes/              # API route handlers
│   ├── services/            # Business logic services
│   ├── server.js            # Main server file
│   ├── setup.js             # Database setup script
│   ├── package.json         # Backend dependencies
│   └── node_modules/        # Backend dependencies
│
├── Docs/                    # Documentation
│   ├── Dev/                 # Development documentation
│   └── pm/                  # Project management documentation
│
└── *.md                     # Various documentation files
```

## Running the Application

### Frontend (React Native/Expo)
```bash
cd frontend
npm install
npm start
```

### Backend (Node.js/Express)
```bash
cd backend
npm install
npm start
```

## Benefits of This Structure

1. **Clear Separation**: Frontend and backend code are completely separated
2. **Independent Development**: Teams can work on frontend and backend independently
3. **Separate Dependencies**: Each part has its own package.json and node_modules
4. **Easy Deployment**: Frontend and backend can be deployed separately
5. **Scalability**: Easier to scale and maintain as the project grows

## Migration Notes

All frontend files have been moved to the `frontend/` directory:
- `src/` → `frontend/src/`
- `App.js` → `frontend/App.js`
- `package.json` → `frontend/package.json`
- `.env` → `frontend/.env`
- `app.json` → `frontend/app.json`
- `assets/` → `frontend/assets/`
- `web-demo/` → `frontend/web-demo/`

All backend files have been moved to the `backend/` directory:
- `server/` contents → `backend/`
