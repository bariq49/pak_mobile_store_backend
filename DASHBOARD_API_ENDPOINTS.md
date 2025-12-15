# Dashboard API Endpoints - Frontend Integration Guide

## ✅ All Dashboard Endpoints Implemented

All 8 dashboard API endpoints have been created and are ready for frontend integration.

---

## 📊 Dashboard Endpoints Table

| # | Feature | Endpoint | Method | Status | Query Parameters |
|---|---------|----------|--------|--------|------------------|
| 1 | E-commerce Stats | `/api/v1/admin/dashboard/stats` | `GET` | ✅ Ready | None |
| 2 | Revenue Chart | `/api/v1/admin/dashboard/revenue` | `GET` | ✅ Ready | `period` (30days, 12months, custom), `startDate`, `endDate` |
| 3 | Customer Statistics | `/api/v1/admin/dashboard/customers` | `GET` | ✅ Ready | None |
| 4 | Transactions | `/api/v1/admin/dashboard/transactions` | `GET` | ✅ Ready | `page`, `limit`, `status`, `paymentMethod` |
| 5 | Orders | `/api/v1/admin/dashboard/orders` | `GET` | ✅ Ready | `page`, `limit`, `status`, `paymentStatus` |
| 6 | Top Products | `/api/v1/admin/dashboard/top-products` | `GET` | ✅ Ready | `limit`, `sortBy` (salesCount, revenue) |
| 7 | Top Customers | `/api/v1/admin/dashboard/top-customers` | `GET` | ✅ Ready | `limit`, `sortBy` (revenue, orders) |
| 8 | Visitors Chart | `/api/v1/admin/dashboard/visitors` | `GET` | ✅ Ready | `period` (30days, 12months) |

---

## 🔐 Authentication

**All endpoints require:**
- Authentication token in header: `Authorization: Bearer <token>`
- Admin role (`role: "admin"`)

**Example:**
```javascript
headers: {
  "Authorization": "Bearer your-admin-token-here",
  "Content-Type": "application/json"
}
```

---

## 📋 Endpoint Details

### 1. E-commerce Stats
**Endpoint:** `GET /api/v1/admin/dashboard/stats`

**Description:** Returns overall dashboard statistics including revenue, orders, customers, and products.

**Response:**
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
**Endpoint:** `GET /api/v1/admin/dashboard/revenue`

**Query Parameters:**
- `period` (optional): `"30days"` | `"12months"` | `"custom"` (default: `"30days"`)
- `startDate` (required if `period=custom`): ISO date string
- `endDate` (required if `period=custom`): ISO date string

**Example Requests:**
```
GET /api/v1/admin/dashboard/revenue?period=30days
GET /api/v1/admin/dashboard/revenue?period=12months
GET /api/v1/admin/dashboard/revenue?period=custom&startDate=2024-01-01&endDate=2024-01-31
```

**Response:**
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
      },
      {
        "date": "2024-01-02",
        "revenue": 18000,
        "orders": 30
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
**Endpoint:** `GET /api/v1/admin/dashboard/customers`

**Description:** Returns customer growth, active customers, and customer segments.

**Response:**
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
        },
        {
          "month": "2024-02",
          "count": 75
        }
      ]
    }
  }
}
```

---

### 4. Transactions
**Endpoint:** `GET /api/v1/admin/dashboard/transactions`

**Query Parameters:**
- `page` (optional): Page number (default: `1`)
- `limit` (optional): Items per page (default: `20`)
- `status` (optional): Filter by payment status (`pending`, `paid`, `failed`, `refunded`, `unpaid`)
- `paymentMethod` (optional): Filter by payment method (`cod`, `stripe`, `applepay`)

**Example Requests:**
```
GET /api/v1/admin/dashboard/transactions
GET /api/v1/admin/dashboard/transactions?page=1&limit=50
GET /api/v1/admin/dashboard/transactions?status=paid&paymentMethod=stripe
```

**Response:**
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
**Endpoint:** `GET /api/v1/admin/dashboard/orders`

**Query Parameters:**
- `page` (optional): Page number (default: `1`)
- `limit` (optional): Items per page (default: `20`)
- `status` (optional): Filter by order status (`processing`, `pending`, `shipped`, `delivered`, `cancelled`)
- `paymentStatus` (optional): Filter by payment status (`pending`, `paid`, `failed`, `refunded`, `unpaid`)

**Example Requests:**
```
GET /api/v1/admin/dashboard/orders
GET /api/v1/admin/dashboard/orders?page=1&limit=50&status=delivered
GET /api/v1/admin/dashboard/orders?paymentStatus=paid
```

**Response:**
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
**Endpoint:** `GET /api/v1/admin/dashboard/top-products`

**Query Parameters:**
- `limit` (optional): Number of products to return (default: `10`)
- `sortBy` (optional): Sort by `salesCount` or `revenue` (default: `salesCount`)

**Example Requests:**
```
GET /api/v1/admin/dashboard/top-products
GET /api/v1/admin/dashboard/top-products?limit=20&sortBy=revenue
GET /api/v1/admin/dashboard/top-products?sortBy=salesCount
```

**Response:**
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
**Endpoint:** `GET /api/v1/admin/dashboard/top-customers`

**Query Parameters:**
- `limit` (optional): Number of customers to return (default: `10`)
- `sortBy` (optional): Sort by `revenue` or `orders` (default: `revenue`)

**Example Requests:**
```
GET /api/v1/admin/dashboard/top-customers
GET /api/v1/admin/dashboard/top-customers?limit=20&sortBy=orders
GET /api/v1/admin/dashboard/top-customers?sortBy=revenue
```

**Response:**
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
**Endpoint:** `GET /api/v1/admin/dashboard/visitors`

**Query Parameters:**
- `period` (optional): `"30days"` | `"12months"` (default: `"30days"`)

**Note:** Visitor tracking is not yet implemented. This endpoint returns an empty structure. You'll need to implement visitor tracking separately.

**Example Requests:**
```
GET /api/v1/admin/dashboard/visitors
GET /api/v1/admin/dashboard/visitors?period=12months
```

**Response:**
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

## 🚀 Frontend Integration Examples

### Using Fetch API

```javascript
// Get dashboard stats
const getDashboardStats = async (token) => {
  const response = await fetch('http://localhost:5000/api/v1/admin/dashboard/stats', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  return await response.json();
};

// Get revenue chart
const getRevenueChart = async (token, period = '30days') => {
  const response = await fetch(
    `http://localhost:5000/api/v1/admin/dashboard/revenue?period=${period}`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );
  return await response.json();
};
```

### Using Axios

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api/v1/admin/dashboard',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Get dashboard stats
export const getDashboardStats = () => api.get('/stats');

// Get revenue chart
export const getRevenueChart = (period = '30days') => 
  api.get('/revenue', { params: { period } });

// Get top products
export const getTopProducts = (limit = 10, sortBy = 'salesCount') =>
  api.get('/top-products', { params: { limit, sortBy } });
```

---

## ✅ Implementation Checklist

- [x] All 8 endpoints created
- [x] Authentication and authorization implemented
- [x] Query parameters support
- [x] Pagination for list endpoints
- [x] Error handling
- [x] Response formatting
- [ ] Visitor tracking system (needs separate implementation)

---

## 📝 Notes

1. **Visitor Tracking:** The visitors endpoint is a placeholder. You'll need to implement a visitor tracking system separately (e.g., create a Visitor model, log visits in middleware).

2. **Performance:** All endpoints use MongoDB aggregation for efficient data processing.

3. **Pagination:** Transactions and Orders endpoints support pagination for better performance with large datasets.

4. **Filtering:** Multiple endpoints support filtering by status, payment method, etc.

5. **Sorting:** Top Products and Top Customers support different sorting options.

---

**All endpoints are ready for frontend integration! 🎉**

