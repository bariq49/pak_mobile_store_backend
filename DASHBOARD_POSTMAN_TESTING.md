# Dashboard API Endpoints - Postman Testing Guide

## 🔐 Authentication Setup

**Before testing, you need an admin token:**

1. **Login as Admin:**
   ```
   POST http://localhost:5000/auth/admin/login
   
   Body (JSON):
   {
     "email": "admin@pakmobilestore.com",
     "password": "your-admin-password"
   }
   ```

2. **Copy the token from response:**
   ```json
   {
     "data": {
       "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
     }
   }
   ```

3. **Add to Postman Environment:**
   - Create variable: `admin_token`
   - Set value to the token from login response

---

## 📋 Postman Collection Setup

### Headers (Add to all requests):
```
Authorization: Bearer {{admin_token}}
Content-Type: application/json
```

---

## 🧪 Endpoint Testing

### 1. E-commerce Stats
**Request:**
```
GET http://localhost:5000/api/v1/admin/dashboard/stats
```

**Headers:**
```
Authorization: Bearer YOUR_ADMIN_TOKEN_HERE
Content-Type: application/json
```

**No Query Parameters**

**Expected Response:**
```json
{
  "status": "success",
  "message": "Dashboard statistics fetched successfully",
  "data": {
    "stats": {
      "revenue": {
        "total": 500000,
        "today": 5000,
        "monthly": 150000
      },
      "orders": {
        "total": 1250,
        "today": 15,
        "monthly": 450,
        "pending": 25,
        "paid": 1200
      },
      "customers": {
        "total": 850,
        "newToday": 5,
        "newThisMonth": 120
      },
      "products": {
        "total": 500,
        "outOfStock": 25,
        "inStock": 475
      }
    }
  }
}
```

---

### 2. Revenue Chart
**Request:**
```
GET http://localhost:5000/api/v1/admin/dashboard/revenue?period=30days
```

**Headers:**
```
Authorization: Bearer YOUR_ADMIN_TOKEN_HERE
Content-Type: application/json
```

**Query Parameters (Optional):**
- `period`: `30days` | `12months` | `custom`
- `startDate`: Required if `period=custom` (format: `2024-01-01`)
- `endDate`: Required if `period=custom` (format: `2024-01-31`)

**Test Cases:**

**Case 1: Last 30 Days**
```
GET http://localhost:5000/api/v1/admin/dashboard/revenue?period=30days
```

**Case 2: Last 12 Months**
```
GET http://localhost:5000/api/v1/admin/dashboard/revenue?period=12months
```

**Case 3: Custom Date Range**
```
GET http://localhost:5000/api/v1/admin/dashboard/revenue?period=custom&startDate=2024-01-01&endDate=2024-01-31
```

**Expected Response:**
```json
{
  "status": "success",
  "message": "Revenue chart data fetched successfully",
  "data": {
    "revenueData": [
      {
        "date": "2024-01-01",
        "revenue": 15000,
        "orders": 25
      }
    ],
    "period": "30days",
    "startDate": "2024-01-01T00:00:00.000Z",
    "endDate": "2024-01-31T23:59:59.999Z"
  }
}
```

---

### 3. Customer Statistics
**Request:**
```
GET http://localhost:5000/api/v1/admin/dashboard/customers
```

**Headers:**
```
Authorization: Bearer YOUR_ADMIN_TOKEN_HERE
Content-Type: application/json
```

**No Query Parameters**

**Expected Response:**
```json
{
  "status": "success",
  "message": "Customer statistics fetched successfully",
  "data": {
    "stats": {
      "total": 850,
      "new": {
        "today": 5,
        "thisWeek": 35,
        "thisMonth": 120,
        "thisYear": 850
      },
      "active": 650,
      "segments": {
        "oneOrder": 200,
        "multipleOrders": 450,
        "noOrders": 200
      },
      "growth": [
        {
          "month": "2024-01",
          "count": 50
        }
      ]
    }
  }
}
```

---

### 4. Transactions
**Request:**
```
GET http://localhost:5000/api/v1/admin/dashboard/transactions
```

**Headers:**
```
Authorization: Bearer YOUR_ADMIN_TOKEN_HERE
Content-Type: application/json
```

**Query Parameters (Optional):**
- `page`: Page number (default: `1`)
- `limit`: Items per page (default: `20`)
- `status`: `pending` | `paid` | `failed` | `refunded` | `unpaid`
- `paymentMethod`: `cod` | `stripe` | `applepay`

**Test Cases:**

**Case 1: Default (First Page)**
```
GET http://localhost:5000/api/v1/admin/dashboard/transactions
```

**Case 2: With Pagination**
```
GET http://localhost:5000/api/v1/admin/dashboard/transactions?page=1&limit=50
```

**Case 3: Filter by Status**
```
GET http://localhost:5000/api/v1/admin/dashboard/transactions?status=paid
```

**Case 4: Filter by Payment Method**
```
GET http://localhost:5000/api/v1/admin/dashboard/transactions?paymentMethod=stripe
```

**Case 5: Combined Filters**
```
GET http://localhost:5000/api/v1/admin/dashboard/transactions?status=paid&paymentMethod=stripe&page=1&limit=20
```

**Expected Response:**
```json
{
  "status": "success",
  "message": "Transactions fetched successfully",
  "data": {
    "transactions": [
      {
        "id": "...",
        "orderNumber": "ORD-2024-000001",
        "customer": {
          "name": "John Doe",
          "email": "john@example.com"
        },
        "amount": 15000,
        "status": "paid",
        "paymentMethod": "stripe",
        "orderStatus": "delivered",
        "date": "2024-01-15T10:30:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1250,
      "pages": 63
    }
  }
}
```

---

### 5. Dashboard Orders
**Request:**
```
GET http://localhost:5000/api/v1/admin/dashboard/orders
```

**Headers:**
```
Authorization: Bearer YOUR_ADMIN_TOKEN_HERE
Content-Type: application/json
```

**Query Parameters (Optional):**
- `page`: Page number (default: `1`)
- `limit`: Items per page (default: `20`)
- `status`: `processing` | `pending` | `shipped` | `delivered` | `cancelled`
- `paymentStatus`: `pending` | `paid` | `failed` | `refunded` | `unpaid`

**Test Cases:**

**Case 1: Default (First Page)**
```
GET http://localhost:5000/api/v1/admin/dashboard/orders
```

**Case 2: With Pagination**
```
GET http://localhost:5000/api/v1/admin/dashboard/orders?page=1&limit=50
```

**Case 3: Filter by Order Status**
```
GET http://localhost:5000/api/v1/admin/dashboard/orders?status=delivered
```

**Case 4: Filter by Payment Status**
```
GET http://localhost:5000/api/v1/admin/dashboard/orders?paymentStatus=paid
```

**Case 5: Combined Filters**
```
GET http://localhost:5000/api/v1/admin/dashboard/orders?status=delivered&paymentStatus=paid&page=1&limit=20
```

**Expected Response:**
```json
{
  "status": "success",
  "message": "Dashboard orders fetched successfully",
  "data": {
    "orders": [
      {
        "id": "...",
        "orderNumber": "ORD-2024-000001",
        "trackingNumber": "EMB-12345-ABC",
        "customer": {
          "name": "John Doe",
          "email": "john@example.com"
        },
        "items": [
          {
            "name": "iPhone 15 Pro",
            "quantity": 1,
            "price": 15000,
            "product": {
              "name": "iPhone 15 Pro",
              "slug": "iphone-15-pro",
              "image": "https://..."
            }
          }
        ],
        "totalAmount": 15000,
        "orderStatus": "delivered",
        "paymentStatus": "paid",
        "paymentMethod": "stripe",
        "shippingAddress": {...},
        "createdAt": "2024-01-15T10:30:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1250,
      "pages": 63
    }
  }
}
```

---

### 6. Top Products
**Request:**
```
GET http://localhost:5000/api/v1/admin/dashboard/top-products
```

**Headers:**
```
Authorization: Bearer YOUR_ADMIN_TOKEN_HERE
Content-Type: application/json
```

**Query Parameters (Optional):**
- `limit`: Number of products (default: `10`)
- `sortBy`: `salesCount` | `revenue` (default: `salesCount`)

**Test Cases:**

**Case 1: Default (Top 10 by Sales Count)**
```
GET http://localhost:5000/api/v1/admin/dashboard/top-products
```

**Case 2: Top 20 Products**
```
GET http://localhost:5000/api/v1/admin/dashboard/top-products?limit=20
```

**Case 3: Top Products by Revenue**
```
GET http://localhost:5000/api/v1/admin/dashboard/top-products?sortBy=revenue
```

**Case 4: Top 20 by Revenue**
```
GET http://localhost:5000/api/v1/admin/dashboard/top-products?limit=20&sortBy=revenue
```

**Expected Response:**
```json
{
  "status": "success",
  "message": "Top products fetched successfully",
  "data": {
    "topProducts": [
      {
        "product": {
          "_id": "...",
          "name": "iPhone 15 Pro",
          "slug": "iphone-15-pro",
          "price": 15000,
          "salePrice": 14000,
          "mainImage": "https://...",
          "salesCount": 250,
          "category": {
            "name": "Mobiles",
            "slug": "mobiles"
          }
        },
        "revenue": 3500000,
        "totalSold": 250,
        "orderCount": 200
      }
    ]
  }
}
```

---

### 7. Top Customers
**Request:**
```
GET http://localhost:5000/api/v1/admin/dashboard/top-customers
```

**Headers:**
```
Authorization: Bearer YOUR_ADMIN_TOKEN_HERE
Content-Type: application/json
```

**Query Parameters (Optional):**
- `limit`: Number of customers (default: `10`)
- `sortBy`: `revenue` | `orders` (default: `revenue`)

**Test Cases:**

**Case 1: Default (Top 10 by Revenue)**
```
GET http://localhost:5000/api/v1/admin/dashboard/top-customers
```

**Case 2: Top 20 Customers**
```
GET http://localhost:5000/api/v1/admin/dashboard/top-customers?limit=20
```

**Case 3: Top Customers by Order Count**
```
GET http://localhost:5000/api/v1/admin/dashboard/top-customers?sortBy=orders
```

**Case 4: Top 20 by Orders**
```
GET http://localhost:5000/api/v1/admin/dashboard/top-customers?limit=20&sortBy=orders
```

**Expected Response:**
```json
{
  "status": "success",
  "message": "Top customers fetched successfully",
  "data": {
    "topCustomers": [
      {
        "user": {
          "_id": "...",
          "name": "John Doe",
          "email": "john@example.com",
          "phoneNumber": "+1234567890",
          "createdAt": "2024-01-01T00:00:00.000Z"
        },
        "totalSpent": 150000,
        "orderCount": 25,
        "lastOrderDate": "2024-01-15T10:30:00.000Z"
      }
    ]
  }
}
```

---

### 8. Visitors Chart
**Request:**
```
GET http://localhost:5000/api/v1/admin/dashboard/visitors
```

**Headers:**
```
Authorization: Bearer YOUR_ADMIN_TOKEN_HERE
Content-Type: application/json
```

**Query Parameters (Optional):**
- `period`: `30days` | `12months` (default: `30days`)

**Test Cases:**

**Case 1: Default (Last 30 Days)**
```
GET http://localhost:5000/api/v1/admin/dashboard/visitors
```

**Case 2: Last 12 Months**
```
GET http://localhost:5000/api/v1/admin/dashboard/visitors?period=12months
```

**Expected Response:**
```json
{
  "status": "success",
  "message": "Visitors chart data fetched successfully",
  "data": {
    "visitorData": [],
    "period": "30days",
    "startDate": "2024-01-01T00:00:00.000Z",
    "endDate": "2024-01-31T23:59:59.999Z",
    "note": "Visitor tracking not implemented. Please add visitor tracking system."
  }
}
```

---

## 📝 Quick Copy-Paste URLs for Postman

### Base URL:
```
http://localhost:5000/api/v1/admin/dashboard
```

### All Endpoints:

1. **Stats:**
   ```
   GET http://localhost:5000/api/v1/admin/dashboard/stats
   ```

2. **Revenue Chart (30 days):**
   ```
   GET http://localhost:5000/api/v1/admin/dashboard/revenue?period=30days
   ```

3. **Revenue Chart (12 months):**
   ```
   GET http://localhost:5000/api/v1/admin/dashboard/revenue?period=12months
   ```

4. **Customers:**
   ```
   GET http://localhost:5000/api/v1/admin/dashboard/customers
   ```

5. **Transactions:**
   ```
   GET http://localhost:5000/api/v1/admin/dashboard/transactions?page=1&limit=20
   ```

6. **Orders:**
   ```
   GET http://localhost:5000/api/v1/admin/dashboard/orders?page=1&limit=20
   ```

7. **Top Products:**
   ```
   GET http://localhost:5000/api/v1/admin/dashboard/top-products?limit=10&sortBy=salesCount
   ```

8. **Top Customers:**
   ```
   GET http://localhost:5000/api/v1/admin/dashboard/top-customers?limit=10&sortBy=revenue
   ```

9. **Visitors:**
   ```
   GET http://localhost:5000/api/v1/admin/dashboard/visitors?period=30days
   ```

---

## 🔧 Postman Environment Variables

**Create these variables in Postman:**

1. **base_url**: `http://localhost:5000`
2. **admin_token**: `YOUR_TOKEN_FROM_LOGIN`

**Then use in requests:**
```
GET {{base_url}}/api/v1/admin/dashboard/stats
```

**Headers:**
```
Authorization: Bearer {{admin_token}}
```

---

## ✅ Testing Checklist

- [ ] Get admin token from login
- [ ] Test Stats endpoint
- [ ] Test Revenue Chart (30 days)
- [ ] Test Revenue Chart (12 months)
- [ ] Test Revenue Chart (custom range)
- [ ] Test Customer Statistics
- [ ] Test Transactions (default)
- [ ] Test Transactions (with filters)
- [ ] Test Orders (default)
- [ ] Test Orders (with filters)
- [ ] Test Top Products (by salesCount)
- [ ] Test Top Products (by revenue)
- [ ] Test Top Customers (by revenue)
- [ ] Test Top Customers (by orders)
- [ ] Test Visitors Chart

---

## 🚨 Common Errors

### 401 Unauthorized
**Cause:** Missing or invalid token
**Solution:** Login again and get a fresh token

### 403 Forbidden
**Cause:** User doesn't have admin role
**Solution:** Use admin account to login

### 404 Not Found
**Cause:** Wrong endpoint URL
**Solution:** Check the URL matches exactly

### 500 Internal Server Error
**Cause:** Database connection issue or query error
**Solution:** Check server logs and database connection

---

**All endpoints are ready for testing! 🚀**


