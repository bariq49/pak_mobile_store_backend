# Frontend Guide: Admin Profile Endpoint Update

## ✅ Backend Implementation Complete

**New Admin Endpoint Created:**
- `GET /api/v1/admin/me` - Get logged-in admin's profile

**Existing User Endpoint:**
- `GET /api/v1/users/me` - Get logged-in user's profile (users only)

---

## 🔧 Frontend Changes Required

### Problem
Currently, the dashboard calls `GET /api/v1/users/me` for admins, but this endpoint is now restricted to users with `role: "user"` only. Admins get 403 Forbidden.

### Solution
Update the frontend to call the correct endpoint based on the user's role.

---

## 📋 Implementation Steps

### Step 1: Update API Endpoint Configuration

**File:** `api/auth/auth.api.ts` (or wherever API endpoints are defined)

**Current Code:**
```typescript
export async function getCurrentUserApi() {
  const { data } = await http.get(API_RESOURCES.USER);
  return data?.data.user;
}
```

**Updated Code:**
```typescript
export async function getCurrentUserApi(role?: string) {
  // Determine endpoint based on role
  const endpoint = role === "admin" 
    ? API_RESOURCES.ADMIN_ME  // "/api/v1/admin/me"
    : API_RESOURCES.USER;     // "/api/v1/users/me"
  
  const { data } = await http.get(endpoint);
  return data?.data.user;
}
```

**Or Better - Create Separate Functions:**
```typescript
// User profile endpoint
export async function getCurrentUserApi() {
  const { data } = await http.get(API_RESOURCES.USER);
  return data?.data.user;
}

// Admin profile endpoint
export async function getCurrentAdminApi() {
  const { data } = await http.get(API_RESOURCES.ADMIN_ME);
  return data?.data.user;
}
```

---

### Step 2: Update API Resources Constants

**File:** `api-endpoints.ts` or similar

**Add:**
```typescript
export const API_RESOURCES = {
  // ... existing endpoints
  USER: "/api/v1/users/me",
  ADMIN_ME: "/api/v1/admin/me",  // ← Add this
  // ... other endpoints
};
```

---

### Step 3: Update Auth Provider/Context

**File:** `provider/auth.provider.tsx` or `context/auth.context.tsx`

**Option A: Check Role from Token/Login Response**

```typescript
// After login, store role in state/localStorage
const [userRole, setUserRole] = useState<string | null>(null);

// In login function, extract role from response
const handleLogin = async (credentials) => {
  const response = await loginApi(credentials);
  const role = response.user?.role; // "admin" or "user"
  setUserRole(role);
  // Store in localStorage if needed
  localStorage.setItem("userRole", role);
};

// In getCurrentUser query
const { data: user, isLoading, refetch } = useGetCurrentUserQuery({
  enabled: !!token && !isAuthRoute,
  // Use role to determine which endpoint to call
});
```

**Option B: Use Separate Hooks**

```typescript
// Create separate hooks for user and admin
const useGetCurrentUserQuery = () => {
  return useQuery({
    queryKey: ["currentUser"],
    queryFn: getCurrentUserApi,
    enabled: !!token && userRole === "user",
  });
};

const useGetCurrentAdminQuery = () => {
  return useQuery({
    queryKey: ["currentAdmin"],
    queryFn: getCurrentAdminApi,
    enabled: !!token && userRole === "admin",
  });
};

// In component
const userQuery = useGetCurrentUserQuery();
const adminQuery = useGetCurrentAdminQuery();
const { data: user } = userRole === "admin" ? adminQuery : userQuery;
```

**Option C: Smart Endpoint Selection (Recommended)**

```typescript
// In your auth provider
const getCurrentUser = async () => {
  if (!token) return null;
  
  try {
    // Get role from token (decode JWT) or from login response
    const role = getUserRoleFromToken(token); // Implement this helper
    
    // Call appropriate endpoint
    if (role === "admin") {
      return await getCurrentAdminApi();
    } else {
      return await getCurrentUserApi();
    }
  } catch (error) {
    // Handle error
    return null;
  }
};
```

---

### Step 4: Extract Role from Token (Helper Function)

**File:** `utils/auth.ts` or similar

```typescript
/**
 * Extract user role from JWT token
 * @param token - JWT token string
 * @returns "admin" | "user" | null
 */
export const getUserRoleFromToken = (token: string): string | null => {
  try {
    // JWT token structure: header.payload.signature
    const payload = token.split(".")[1];
    const decoded = JSON.parse(atob(payload));
    return decoded.role || null;
  } catch (error) {
    console.error("Error decoding token:", error);
    return null;
  }
};

/**
 * Extract user ID from JWT token
 */
export const getUserIdFromToken = (token: string): string | null => {
  try {
    const payload = token.split(".")[1];
    const decoded = JSON.parse(atob(payload));
    return decoded.id || null;
  } catch (error) {
    return null;
  }
};
```

---

### Step 5: Update Query Hook

**File:** `hooks/use-auth.ts` or `api/auth/auth.api.ts`

**Current:**
```typescript
export const useGetCurrentUserQuery = (options = {}) => {
  return useQuery({
    queryKey: ["currentUser"],
    queryFn: getCurrentUserApi,
    ...options,
  });
};
```

**Updated:**
```typescript
export const useGetCurrentUserQuery = (options = {}) => {
  const token = getToken(); // Get token from storage
  const role = getUserRoleFromToken(token);
  
  return useQuery({
    queryKey: ["currentUser", role],
    queryFn: () => {
      if (role === "admin") {
        return getCurrentAdminApi();
      }
      return getCurrentUserApi();
    },
    enabled: !!token && (options.enabled !== false),
    ...options,
  });
};
```

---

## 🎯 Recommended Implementation Pattern

### Pattern 1: Role-Based Endpoint Selection (Cleanest)

```typescript
// 1. Store role after login
const login = async (credentials) => {
  const response = await loginApi(credentials);
  const role = response.user.role;
  setUserRole(role);
  localStorage.setItem("userRole", role);
  return response;
};

// 2. Use role to determine endpoint
const getCurrentUser = async () => {
  const role = localStorage.getItem("userRole") || getUserRoleFromToken(token);
  
  if (role === "admin") {
    return await getCurrentAdminApi();
  }
  return await getCurrentUserApi();
};

// 3. In query hook
const { data: user } = useQuery({
  queryKey: ["currentUser"],
  queryFn: getCurrentUser,
  enabled: !!token,
});
```

### Pattern 2: Separate Hooks (More Explicit)

```typescript
// Create separate hooks
const useGetUser = () => useQuery({
  queryKey: ["user"],
  queryFn: getCurrentUserApi,
  enabled: userRole === "user",
});

const useGetAdmin = () => useQuery({
  queryKey: ["admin"],
  queryFn: getCurrentAdminApi,
  enabled: userRole === "admin",
});

// Use in component
const userQuery = useGetUser();
const adminQuery = useGetAdmin();
const user = userRole === "admin" ? adminQuery.data : userQuery.data;
```

---

## 📝 Complete Example Implementation

### 1. API File (`api/auth/auth.api.ts`)

```typescript
import http from "../http";
import { API_RESOURCES } from "../api-endpoints";

// User profile
export async function getCurrentUserApi() {
  const { data } = await http.get(API_RESOURCES.USER);
  return data?.data.user;
}

// Admin profile
export async function getCurrentAdminApi() {
  const { data } = await http.get(API_RESOURCES.ADMIN_ME);
  return data?.data.user;
}
```

### 2. Auth Provider (`provider/auth.provider.tsx`)

```typescript
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getCurrentUserApi, getCurrentAdminApi } from "@/api/auth/auth.api";
import { getUserRoleFromToken } from "@/utils/auth";

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [userRole, setUserRole] = useState<string | null>(null);

  // Extract role from token on mount
  useEffect(() => {
    if (token) {
      const role = getUserRoleFromToken(token);
      setUserRole(role);
    }
  }, [token]);

  // Get current user based on role
  const { data: user, isLoading, refetch } = useQuery({
    queryKey: ["currentUser", userRole],
    queryFn: async () => {
      if (userRole === "admin") {
        return await getCurrentAdminApi();
      }
      return await getCurrentUserApi();
    },
    enabled: !!token && !!userRole,
  });

  // ... rest of provider logic
};
```

### 3. Utils (`utils/auth.ts`)

```typescript
export const getUserRoleFromToken = (token: string): string | null => {
  if (!token) return null;
  
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    
    const decoded = JSON.parse(atob(payload));
    return decoded.role || null;
  } catch (error) {
    console.error("Error decoding token:", error);
    return null;
  }
};
```

---

## ✅ Testing Checklist

- [ ] Admin login → calls `/api/v1/admin/me` ✅
- [ ] User login → calls `/api/v1/users/me` ✅
- [ ] Admin cannot access `/api/v1/users/me` (403) ✅
- [ ] User cannot access `/api/v1/admin/me` (403) ✅
- [ ] Dashboard loads correctly after admin login ✅
- [ ] E-commerce site loads correctly after user login ✅

---

## 🚨 Important Notes

1. **Token Structure:** Ensure your JWT token includes the `role` field in the payload
2. **Error Handling:** Handle 403 errors gracefully (redirect to login)
3. **Role Storage:** Store role in state/localStorage after login for quick access
4. **Token Decoding:** Use a helper function to decode JWT (don't rely on backend response only)

---

## 📊 API Endpoints Summary

| Endpoint | Role | Purpose |
|----------|------|---------|
| `GET /api/v1/users/me` | `user` | Get user profile (e-commerce) |
| `GET /api/v1/admin/me` | `admin` | Get admin profile (dashboard) |

---

**Backend is ready! Update your frontend following this guide. 🚀**

