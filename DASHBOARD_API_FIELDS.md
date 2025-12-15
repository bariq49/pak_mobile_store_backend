# Dashboard API Response Fields

Complete field documentation for all dashboard API endpoints.

---

## 1. Top Products API

**Endpoint:** `GET /api/v1/admin/dashboard/top-products`

**Query Parameters:**
- `limit` (optional, default: 10) - Number of products to return
- `sortBy` (optional, default: "salesCount") - Sort by: "salesCount" or "revenue"

### Response Structure

```json
{
  "status": "success",
  "message": "Top products fetched successfully",
  "data": {
    "topProducts": [
      {
        "product": {
          "_id": "string (ObjectId)",
          "name": "string",
          "slug": "string",
          "price": "number",
          "salePrice": "number (if on sale)",
          "mainImage": "string (URL)",
          "salesCount": "number",
          "category": {
            "_id": "string (ObjectId)",
            "name": "string",
            "slug": "string"
          }
        },
        "revenue": "number (total revenue from this product)",
        "totalSold": "number (total quantity sold)",
        "orderCount": "number (number of orders containing this product)",
        "salesCount": "number (same as product.salesCount, for convenience)"
      }
    ]
  }
}
```

### Field Details

**When `sortBy = "salesCount"` (default):**
- `product` - Full product object with selected fields
- `salesCount` - Number of times product was sold (from product model)
- `revenue` - Always `0` (not calculated in this mode)
- `totalSold` - Same as `salesCount`
- `orderCount` - Always `0` (not calculated in this mode)

**When `sortBy = "revenue"`:**
- `product` - Full product object with selected fields
- `revenue` - Total revenue generated from this product (sum of all order items)
- `totalSold` - Total quantity sold across all orders
- `orderCount` - Number of orders that included this product
- `salesCount` - From product model (may differ from totalSold)

---

## 2. Top Customers API

**Endpoint:** `GET /api/v1/admin/dashboard/top-customers`

**Query Parameters:**
- `limit` (optional, default: 10) - Number of customers to return
- `sortBy` (optional, default: "revenue") - Sort by: "revenue" or "orders"

### Response Structure

```json
{
  "status": "success",
  "message": "Top customers fetched successfully",
  "data": {
    "topCustomers": [
      {
        "user": {
          "_id": "string (ObjectId)",
          "name": "string",
          "email": "string",
          "phoneNumber": "string (if available)",
          "createdAt": "string (ISO date)"
        },
        "totalSpent": "number (total amount spent by customer)",
        "orderCount": "number (total number of orders placed)",
        "lastOrderDate": "string (ISO date of most recent order)"
      }
    ]
  }
}
```

### Field Details

**When `sortBy = "revenue"` (default):**
- `user` - Customer user object with basic info
- `totalSpent` - Total amount spent (only from paid orders)
- `orderCount` - Total number of orders placed
- `lastOrderDate` - Date of most recent order

**When `sortBy = "orders"`:**
- `user` - Customer user object with basic info
- `totalSpent` - Total amount spent (includes all orders, not just paid)
- `orderCount` - Total number of orders placed
- `lastOrderDate` - Date of most recent order

**Note:** `user` can be `null` if the user account was deleted but orders still exist.

---

## 3. Visitors Chart API

**Endpoint:** `GET /api/v1/admin/dashboard/visitors`

**Query Parameters:**
- `period` (optional, default: "30days") - Time period: "30days" or "12months"

### Response Structure

```json
{
  "status": "success",
  "message": "Visitors chart data fetched successfully",
  "data": {
    "visitorData": [],
    "period": "string (30days or 12months)",
    "startDate": "string (ISO date)",
    "endDate": "string (ISO date)",
    "note": "string (Visitor tracking not implemented. Please add visitor tracking system.)"
  }
}
```

### Field Details

**Current Status:** Visitor tracking is **NOT implemented**. This endpoint returns an empty array.

**Fields:**
- `visitorData` - **Empty array** (placeholder for future implementation)
- `period` - The time period requested
- `startDate` - Start date of the period
- `endDate` - End date of the period (current date)
- `note` - Informational message about implementation status

**Future Implementation:**
To implement visitor tracking, you would need to:
1. Create a Visitor model
2. Log visits in middleware
3. Aggregate visitor data by date
4. Return data in format: `[{ date: "YYYY-MM-DD", visitors: number, pageViews: number }]`

---

## 4. Additional Dashboard Endpoints

### Dashboard Statistics
**Endpoint:** `GET /api/v1/admin/dashboard/stats`

```json
{
  "status": "success",
  "message": "Dashboard statistics fetched successfully",
  "data": {
    "stats": {
      "revenue": {
        "total": "number",
        "today": "number",
        "monthly": "number"
      },
      "orders": {
        "total": "number",
        "today": "number",
        "monthly": "number",
        "pending": "number",
        "paid": "number"
      },
      "customers": {
        "total": "number",
        "newToday": "number",
        "newThisMonth": "number"
      },
      "products": {
        "total": "number",
        "outOfStock": "number",
        "inStock": "number"
      }
    }
  }
}
```

### Revenue Chart
**Endpoint:** `GET /api/v1/admin/dashboard/revenue?period=30days`

```json
{
  "status": "success",
  "message": "Revenue chart data fetched successfully",
  "data": {
    "revenueData": [
      {
        "date": "YYYY-MM-DD",
        "revenue": "number",
        "orders": "number"
      }
    ],
    "period": "string",
    "startDate": "string (ISO date)",
    "endDate": "string (ISO date)"
  }
}
```

### Customer Statistics
**Endpoint:** `GET /api/v1/admin/dashboard/customers`

```json
{
  "status": "success",
  "message": "Customer statistics fetched successfully",
  "data": {
    "stats": {
      "total": "number",
      "new": {
        "today": "number",
        "thisWeek": "number",
        "thisMonth": "number",
        "thisYear": "number"
      },
      "active": "number (customers with at least one order)",
      "segments": {
        "oneOrder": "number",
        "multipleOrders": "number",
        "noOrders": "number"
      },
      "growth": [
        {
          "month": "YYYY-MM",
          "count": "number"
        }
      ]
    }
  }
}
```

### Transactions
**Endpoint:** `GET /api/v1/admin/dashboard/transactions?page=1&limit=20`

```json
{
  "status": "success",
  "message": "Transactions fetched successfully",
  "data": {
    "transactions": [
      {
        "id": "string (ObjectId)",
        "orderNumber": "string",
        "customer": {
          "name": "string",
          "email": "string"
        },
        "amount": "number",
        "status": "string (paymentStatus)",
        "paymentMethod": "string",
        "orderStatus": "string",
        "date": "string (ISO date)"
      }
    ],
    "pagination": {
      "page": "number",
      "limit": "number",
      "total": "number",
      "pages": "number"
    }
  }
}
```

### Dashboard Orders
**Endpoint:** `GET /api/v1/admin/dashboard/orders?page=1&limit=20`

```json
{
  "status": "success",
  "message": "Dashboard orders fetched successfully",
  "data": {
    "orders": [
      {
        "id": "string (ObjectId)",
        "orderNumber": "string",
        "trackingNumber": "string",
        "customer": {
          "name": "string",
          "email": "string"
        },
        "items": [
          {
            "name": "string",
            "quantity": "number",
            "price": "number",
            "product": {
              "name": "string",
              "slug": "string",
              "image": "string (URL or null)"
            }
          }
        ],
        "totalAmount": "number",
        "orderStatus": "string",
        "paymentStatus": "string",
        "paymentMethod": "string",
        "shippingAddress": "object",
        "createdAt": "string (ISO date)"
      }
    ],
    "pagination": {
      "page": "number",
      "limit": "number",
      "total": "number",
      "pages": "number"
    }
  }
}
```

---

## Notes

1. **Popular Products**: There is no separate "popular products" endpoint. Use the "top products" endpoint with `sortBy=revenue` or `sortBy=salesCount` to get popular products.

2. **Visitor Tracking**: Currently not implemented. The visitors endpoint returns an empty array with a note.

3. **Authentication**: All endpoints require admin authentication via JWT token (cookie or Authorization header).

4. **Data Types**: 
   - All numbers are actual numbers (not strings)
   - Dates are ISO 8601 format strings
   - ObjectIds are strings
   - URLs are strings

5. **Null Values**: Some fields may be `null` if data doesn't exist (e.g., deleted users, missing images).

