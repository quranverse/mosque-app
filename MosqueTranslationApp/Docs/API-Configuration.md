# API Configuration Documentation

## Overview

The enhanced API configuration system automatically detects network changes and provides flexible environment-based configuration for the Mosque Translation App frontend.

## Environment Variables

### Frontend `.env` Configuration

Create or update `frontend/.env` with these variables:

```env
# Metro Configuration
RCT_METRO_PORT=3000

# API Configuration
BACKEND_PORT=8080
BACKEND_HOST=auto  # 'auto' for automatic detection, or specify IP like '192.168.1.100'

# Network Detection Settings
ENABLE_AUTO_IP_DETECTION=true
FALLBACK_IPS=10.0.143.126,172.20.10.2,192.168.1.1,192.168.0.1,10.0.2.2,localhost
CONNECTION_TIMEOUT=5000

# Tunnel Configuration (for public WiFi)
EXPO_TUNNEL_URL=
NGROK_URL=
ENABLE_TUNNEL_MODE=false

# Development Settings
NODE_ENV=development
DEBUG_NETWORK=true

# Production API URL
PRODUCTION_API_URL=https://your-production-api.com/api
```

## Automatic IP Detection

### How It Works

1. **Environment Check**: First checks if `BACKEND_HOST` is set to a specific IP
2. **Network Monitoring**: Listens for network changes using NetInfo
3. **Metro IP Extraction**: Attempts to extract IP from React Native bundle URL
4. **Fallback Testing**: Tests each fallback IP for backend connectivity
5. **Caching**: Caches successful connections for faster subsequent requests

### Network Change Detection

The system automatically detects when your device switches networks:

- **WiFi to Mobile Data**: Automatically refreshes IP detection
- **Different WiFi Networks**: Detects new network and finds new IP
- **Public WiFi**: Provides troubleshooting suggestions

## Tunnel Mode Support

### When to Use Tunnel Mode

Use tunnel mode when:
- Working on public WiFi with device isolation
- Backend and frontend are on different networks
- Firewall blocks direct IP connections

### Setup Options

#### Option 1: Expo Tunnel
```bash
expo start --tunnel
```

Then update `.env`:
```env
EXPO_TUNNEL_URL=https://abc123.exp.direct
ENABLE_TUNNEL_MODE=true
```

#### Option 2: ngrok
```bash
ngrok http 8080
```

Then update `.env`:
```env
NGROK_URL=https://abc123.ngrok.io
ENABLE_TUNNEL_MODE=true
```

## API Usage

### Basic Usage

```javascript
import { getApiBaseUrl } from './config/api.js';

const apiUrl = await getApiBaseUrl();
// Returns: http://192.168.1.100:8080/api (or tunnel URL)
```

### Handle Network Changes

```javascript
import { refreshApiUrl } from './config/api.js';

// Call when network changes detected
const newApiUrl = await refreshApiUrl();
```

### Troubleshooting

```javascript
import { troubleshootConnection } from './config/api.js';

const diagnostics = await troubleshootConnection();
console.log('Network status:', diagnostics);
```

## Configuration Management

### Runtime Configuration Updates

```javascript
import { updateEnvironmentConfig } from './config/api.js';

// Update backend host
updateEnvironmentConfig({
  BACKEND_HOST: '192.168.1.200',
  DEBUG_NETWORK: false
});
```

### Get Current Configuration

```javascript
import { getEnvironmentConfig } from './config/api.js';

const config = getEnvironmentConfig();
console.log('Current settings:', config);
```

## Troubleshooting

### Common Issues

1. **Connection Refused**: Backend not running or wrong port
2. **Network Unreachable**: Device isolation on public WiFi
3. **Timeout**: Slow network or firewall blocking

### Solutions

1. **Use Tunnel Mode**: For public WiFi issues
2. **Check Firewall**: Ensure port 8080 is open
3. **Verify Network**: Ensure devices on same network
4. **Restart Services**: Restart Metro bundler and backend

### Debug Mode

Enable debug logging:
```env
DEBUG_NETWORK=true
```

This will show detailed network detection logs in the console.

## Production Deployment

For production, set:
```env
NODE_ENV=production
PRODUCTION_API_URL=https://your-api-domain.com/api
```

The system will automatically use the production URL instead of IP detection.
