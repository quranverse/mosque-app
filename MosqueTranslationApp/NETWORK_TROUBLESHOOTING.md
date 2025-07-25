# Network Connectivity Troubleshooting Guide

## Issue Summary
The React Native app was failing to connect to the backend server, showing "Network request failed" errors when trying to load:
- Supported languages
- Active sessions  
- Mosque data

## Root Cause
The Android emulator couldn't reach the backend server due to network/firewall restrictions.

## Fixes Applied

### 1. ✅ Enhanced Error Handling
- **TranslationScreen**: Now uses `ApiService` instead of direct `fetch()` calls
- **Fallback Data**: Added proper fallback data that matches real database structure
- **Graceful Degradation**: App continues to work even when network fails
- **Network Status Indicator**: Added visual indicator showing connection status

### 2. ✅ Improved API Calls
- **MultiLanguageTranslationService**: Enhanced with better error handling and fallback languages
- **Proper Service Usage**: All API calls now go through `ApiService` for consistent error handling
- **Cache Support**: Languages are cached for offline use

### 3. ✅ Backend Server Configuration
- **Network Binding**: Server now listens on `0.0.0.0:8080` (all interfaces) instead of just localhost
- **CORS Enabled**: Proper CORS headers for cross-origin requests
- **Email Service**: Fixed and working correctly

### 4. ✅ Connection Setup Script
- **setup-android-connection.bat**: Automated script to set up ADB port forwarding
- **Multiple Fallback Options**: Script provides alternative solutions if ADB fails

## Solutions to Try (in order)

### Option 1: ADB Port Forwarding (Recommended)
1. Run the setup script: `setup-android-connection.bat`
2. Or manually run: `adb reverse tcp:8080 tcp:8080`
3. App should now connect to `http://localhost:8080/api`

### Option 2: Disable Windows Firewall (Temporary)
1. Open Windows Settings → Update & Security → Windows Security → Firewall & network protection
2. Turn off firewall for your current network (temporarily)
3. Try the app again

### Option 3: Add Firewall Exception
1. Open Windows Defender Firewall with Advanced Security (as Administrator)
2. Click Inbound Rules → New Rule
3. Choose Port → TCP → Specific local ports: 8080
4. Allow the connection → Apply to all profiles

### Option 4: Use Direct IP Address
Update the Android configuration in `frontend/src/config/api.js`:
```javascript
} else if (Platform.OS === 'android') {
  return 'http://10.0.129.101:8080/api';
}
```

## Testing Connectivity

### In the App
- Look for the network status indicator in the header (green dot = connected)
- Tap the network status to retry connection
- Check console logs for detailed error messages

### Manual Testing
```bash
# Test from host machine
curl http://localhost:8080/api/status

# Test from network
curl http://10.0.129.101:8080/api/status

# Test login
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"zakariaelouali05@gmail.com","password":"zakaria05"}'
```

## Current Status
- ✅ Backend server: Running on port 8080, accessible on all interfaces
- ✅ Email service: Working correctly
- ✅ Database: Connected with real mosque data
- ✅ API endpoints: All tested and working
- ✅ Frontend: Enhanced with fallback data and better error handling
- ⚠️ Network connectivity: Needs one of the solutions above

## Fallback Data
If network fails, the app now shows:
- **Mosques**: Real mosque data from database (Central Mosque, Islamic Center of Queens, Masjid abo malik)
- **Languages**: Complete list of supported languages with proper grouping
- **Sessions**: Empty array (no mock sessions to avoid confusion)

## Next Steps
1. Try Option 1 (ADB port forwarding) first
2. If that fails, try Option 2 (disable firewall temporarily)
3. Once connected, test login with: `zakariaelouali05@gmail.com` / `zakaria05`
4. The app should work normally with real data from the database

## Debug Information
- **API Base URL**: `http://localhost:8080/api` (Android) / `http://10.0.129.101:8080/api` (iOS)
- **WebSocket URL**: `http://localhost:8080` (Android) / `http://10.0.129.101:8080` (iOS)
- **Server Status**: Check at `http://localhost:8080/api/status`
- **Network Status**: Visible in app header with color-coded indicator
