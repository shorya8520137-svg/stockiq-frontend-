# Vercel API Proxy Setup

This project uses Vercel rewrites to proxy API calls from the frontend to the backend server, eliminating CORS issues and providing a seamless same-origin experience.

## How It Works

### Frontend Calls
```javascript
// Frontend makes calls to relative paths
fetch("/api/auth/login", {
  method: "POST",
  credentials: "include",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ username, password })
});
```

### Vercel Rewrites
```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://13-201-222-24.nip.io/api/:path*"
    }
  ]
}
```

### Backend Receives
```
https://13-201-222-24.nip.io/api/auth/login
```

## Benefits

✅ **No CORS Issues** - Same origin requests  
✅ **HTTPS → HTTPS** - Secure connections  
✅ **No Domain Complexity** - Simple relative paths  
✅ **Easy Development** - Works in dev and production  
✅ **Credential Support** - Cookies and auth headers work seamlessly  

## Configuration Files

### vercel.json
```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://13-201-222-24.nip.io/api/:path*"
    }
  ]
}
```

### .env.local
```bash
# API Configuration - Using Vercel proxy
NEXT_PUBLIC_API_BASE=/api

# WebSocket Configuration (direct connection needed)
NEXT_PUBLIC_WS_URL=https://13-201-222-24.nip.io

# Backend server (for reference only - proxied through Vercel)
BACKEND_URL=https://13-201-222-24.nip.io
```

### API Configuration (src/services/api/config.js)
```javascript
const API_CONFIG = {
    BASE_URL: '/api', // Using Vercel proxy
    TIMEOUT: 30000,
    HEADERS: {
        'Content-Type': 'application/json',
    }
};
```

## WebSocket Considerations

WebSocket connections cannot be proxied through Vercel rewrites, so they connect directly to the backend:

```javascript
// WebSocket connects directly to backend
const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'https://13-201-222-24.nip.io';
this.socket = io(wsUrl, { /* options */ });
```

## Testing

Run the test script to verify proxy functionality:

```bash
node test-vercel-proxy.js
```

## Deployment

1. **Deploy to Vercel**: The `vercel.json` configuration is automatically applied
2. **Environment Variables**: Set in Vercel dashboard or via CLI
3. **Backend Availability**: Ensure backend server is running and accessible

## Troubleshooting

### Common Issues

1. **502 Bad Gateway**: Backend server is down or unreachable
2. **CORS Still Appearing**: Check if any hardcoded URLs remain
3. **WebSocket Connection Failed**: Check `NEXT_PUBLIC_WS_URL` environment variable

### Debug Steps

1. Check Vercel function logs
2. Verify backend server status
3. Test endpoints directly: `curl https://your-app.vercel.app/api/health`
4. Run the test script: `node test-vercel-proxy.js`

## Migration Checklist

- [x] Created `vercel.json` with rewrite rules
- [x] Updated API configuration to use `/api` paths
- [x] Updated all hardcoded backend URLs in components
- [x] Configured WebSocket URL separately
- [x] Updated environment variables
- [x] Created test script for verification

## Performance Notes

- **Slight Latency**: Proxy adds minimal overhead (~10-50ms)
- **Caching**: Vercel can cache API responses based on headers
- **Edge Functions**: Consider for geographically distributed APIs