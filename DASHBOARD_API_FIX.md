# Dashboard API 404 and CORS Fix

## Issues Fixed

### 1. CORS Configuration
- **Problem**: CORS was blocking requests from Vercel dashboard
- **Fix**: 
  - Added `https://pak-mobile-store-backend.vercel.app` to allowed origins
  - Added support for all `*.vercel.app` domains
  - Added environment variables `CLIENT_URL` and `ADMIN_DASHBOARD_URL` support
  - Added better error logging for blocked origins

### 2. Route Accessibility
- **Problem**: Dashboard routes returning 404 on Vercel
- **Fix**:
  - Verified routes are mounted at both `/api/v1/admin/dashboard` and `/api/v1/dashboard`
  - Added health check endpoint at `/api/v1/dashboard/health` (no auth required) for testing
  - Verified all controller functions exist and match route definitions

## Testing Endpoints

### Health Check (No Auth Required)
```
GET /api/v1/dashboard/health
GET /api/v1/admin/dashboard/health
```

### Dashboard Endpoints (Auth Required - Admin Only)
```
GET /api/v1/dashboard/stats
GET /api/v1/dashboard/revenue
GET /api/v1/dashboard/customers
GET /api/v1/dashboard/transactions
GET /api/v1/dashboard/orders
GET /api/v1/dashboard/top-products
GET /api/v1/dashboard/top-customers
GET /api/v1/dashboard/visitors
```

All endpoints also work with `/api/v1/admin/dashboard/` prefix.

## Authentication

All dashboard endpoints (except `/health`) require:
1. **Authentication**: Valid JWT token in:
   - `Authorization: Bearer <token>` header, OR
   - `admin_token` cookie, OR
   - `user_token` cookie (legacy), OR
   - `jwt` cookie (legacy)
2. **Authorization**: User must have `role: "admin"`

## Troubleshooting

### If you still get 404 errors:

1. **Check route mounting order**:
   - Routes must be mounted before the catch-all `app.all("*", ...)` handler
   - Verify in `src/app.js` that dashboard routes are registered

2. **Check Vercel deployment**:
   - Ensure all files are deployed correctly
   - Check Vercel build logs for errors
   - Verify environment variables are set

3. **Test health endpoint**:
   ```bash
   curl https://pak-mobile-store-backend.vercel.app/api/v1/dashboard/health
   ```
   Should return: `{"status":"success","message":"Dashboard routes are working",...}`

4. **Check authentication**:
   - Verify admin token is being sent
   - Check browser DevTools → Network → Request Headers
   - Ensure cookies are being sent (check `credentials: true` in CORS)

### If you get CORS errors:

1. **Check origin**:
   - Verify your frontend URL is in the allowed origins list
   - Check browser console for the exact origin being blocked
   - Look for CORS warning logs in backend console

2. **Check credentials**:
   - Ensure `credentials: true` is set in frontend fetch/axios calls
   - Example:
     ```javascript
     fetch(url, {
       credentials: 'include',
       headers: {
         'Authorization': `Bearer ${token}`
       }
     })
     ```

3. **Check environment variables**:
   - Set `CLIENT_URL` in Vercel environment variables
   - Set `ADMIN_DASHBOARD_URL` if needed
   - Redeploy after setting environment variables

## Environment Variables

Add these to your Vercel project:
```
CLIENT_URL=https://your-ecommerce-site.com
ADMIN_DASHBOARD_URL=https://pak-mobile-admin-dashboard.vercel.app
```

## Next Steps

1. **Deploy the updated code** to Vercel
2. **Test the health endpoint** first (no auth required)
3. **Test authenticated endpoints** with proper admin token
4. **Check browser console** for any remaining CORS errors
5. **Verify cookies are being sent** in requests

## Files Modified

1. `src/app.js` - Updated CORS configuration
2. `src/routes/dashboard.routes.js` - Added health check endpoint

