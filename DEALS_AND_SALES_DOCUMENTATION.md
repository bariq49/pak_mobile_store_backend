# Deals and Sales Backend Functionality Documentation

This document explains how deals and sales work in the backend system.

---

## 📋 Overview

The backend has **two separate systems** for handling discounts and promotions:

1. **Product-Level Sales** - Individual product sales (`on_sale` field)
2. **Deal System** - Campaign-based deals that can apply to multiple products/categories

---

## 🛍️ SYSTEM 1: Product-Level Sales

### What It Is:
Each product can have its own sale price and sale period. This is managed directly on the product.

### Product Model Fields:
```javascript
{
  price: Number,              // Regular price (required)
  salePrice: Number,          // Sale price (optional)
  sale_price: Number,         // Legacy field (synced with salePrice)
  on_sale: Boolean,           // Whether product is on sale
  sale_start: Date,           // Sale start date
  sale_end: Date,             // Sale end date
  salesCount: Number          // Number of times product was sold
}
```

### How It Works:
1. **Setting a Sale:**
   - Set `on_sale: true`
   - Set `salePrice` (must be less than `price`)
   - Set `sale_start` and `sale_end` dates
   - Product will show sale price during the date range

2. **Validation:**
   - `salePrice` must be less than `price`
   - If `on_sale` is true, both `sale_start` and `sale_end` are required

### API Endpoints:

#### 1. Get Products On Sale
**Endpoint:** `GET /api/v1/products/on-sale`

**Description:** Returns all products where `on_sale: true`

**Query Parameters:**
- All standard filtering options (category, price range, etc.)
- `page`, `limit` for pagination
- `sort_by` for sorting

**Example Request:**
```bash
GET /api/v1/products/on-sale?limit=20&sort_by=lowest
```

**Response:**
```json
{
  "status": "success",
  "message": "Deal products fetched successfully",
  "data": {
    "products": [
      {
        "_id": "...",
        "productName": "iPhone 15 Pro",
        "price": 45000,
        "salePrice": 42000,
        "on_sale": true,
        "sale_start": "2024-01-01T00:00:00.000Z",
        "sale_end": "2024-01-31T23:59:59.000Z",
        "salesCount": 150
      }
    ],
    "pagination": {...}
  }
}
```

#### 2. Get Top Sales Products
**Endpoint:** `GET /api/v1/products/top-sales`

**Description:** Returns top 10 products by `salesCount` (most sold products)

**Query Parameters:**
- `categoryId` (optional) - Filter by category
- `sellerId` (optional) - Filter by seller

**Example Request:**
```bash
GET /api/v1/products/top-sales?categoryId=6935d7e09d5ca65494f07197
```

**Response:**
```json
{
  "status": "success",
  "message": "Top sales products fetched successfully",
  "data": {
    "products": [
      {
        "_id": "...",
        "productName": "iPhone 15 Pro",
        "price": 45000,
        "salesCount": 150,
        "ratingsAverage": 4.5
      }
    ]
  }
}
```

**Fallback Logic:**
- If no products have `salesCount > 0`, it returns top-rated products instead

#### 3. Filter Products by Sale Status
**Endpoint:** `GET /api/v1/products?on_sale=true`

**Description:** Filter all products to show only those on sale

**Example Request:**
```bash
GET /api/v1/products?on_sale=true&min_price=20000&max_price=50000
```

---

## 🎯 SYSTEM 2: Deal System

### What It Is:
A separate deal/campaign system that can apply discounts to:
- Specific products
- Entire categories
- Entire subcategories
- All products globally

### Deal Model Structure:
```javascript
{
  title: String,                    // Deal title (required)
  description: String,               // Deal description
  image: {
    desktop: { url, public_id },
    mobile: { url, public_id }
  },
  btnText: String,                  // Button text for deal banner
  
  // Target Products/Categories
  products: [ObjectId],              // Specific products
  categories: [ObjectId],            // Entire categories
  subCategories: [ObjectId],         // Entire subcategories
  isGlobal: Boolean,                 // Apply to all products
  
  // Discount Details
  discountType: "percentage" | "fixed" | "flat",  // Required
  discountValue: Number,             // Required (e.g., 20 for 20% or 5000 for fixed)
  
  // Time Window
  startDate: Date,                  // Required
  endDate: Date,                    // Required
  
  // Status
  isActive: Boolean,                 // Auto-managed by cron job
  priority: Number,                 // Higher priority = applied first
  
  createdBy: ObjectId                // Admin who created it
}
```

### How It Works:

#### 1. **Discount Types:**
- **`percentage`**: Discount as percentage (e.g., `discountValue: 20` = 20% off)
- **`fixed` or `flat`**: Fixed amount discount (e.g., `discountValue: 5000` = Rs. 5000 off)

#### 2. **Deal Application Logic:**
When a product is fetched, the system:
1. Checks if product has its own sale (`on_sale: true`)
2. Checks all active deals that apply to the product
3. Applies the **best discount** (lowest final price wins)
4. Returns product with `finalPrice`, `activeDeal`, and `discountPercent`

#### 3. **Deal Priority:**
- Deals are sorted by `priority` (higher = first)
- If multiple deals apply, the one giving the best discount is used

#### 4. **Automatic Activation:**
- A cron job runs every 5 minutes
- Automatically activates deals when `startDate` is reached
- Automatically deactivates deals when `endDate` is passed

### API Endpoints:

#### 1. Create Deal (Admin Only)
**Endpoint:** `POST /api/v1/deals`

**Auth:** Required (Admin)

**Request Body (multipart/form-data):**
```
title: "Weekend Sale"
description: "Big weekend discounts"
discountType: percentage
discountValue: 25
startDate: 2024-01-15T00:00:00.000Z
endDate: 2024-01-20T23:59:59.000Z
products: ["productId1", "productId2"]
categories: ["categoryId1"]
subCategories: ["subCategoryId1"]
isGlobal: false
priority: 1
btnText: "Shop Now"
desktop: [file upload]
mobile: [file upload]
```

**Request Body (JSON alternative):**
```json
{
  "title": "Weekend Sale",
  "description": "Big weekend discounts on all smartphones",
  "discountType": "percentage",
  "discountValue": 25,
  "startDate": "2024-01-15T00:00:00.000Z",
  "endDate": "2024-01-20T23:59:59.000Z",
  "products": ["6935d7e09d5ca65494f07199"],
  "categories": ["6935d7e09d5ca65494f07197"],
  "subCategories": ["6935d7e09d5ca65494f07198"],
  "isGlobal": false,
  "priority": 1,
  "btnText": "Shop Now"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Deal created successfully",
  "data": {
    "deal": {
      "_id": "...",
      "title": "Weekend Sale",
      "discountType": "percentage",
      "discountValue": 25,
      "isActive": false,
      "startDate": "2024-01-15T00:00:00.000Z",
      "endDate": "2024-01-20T23:59:59.000Z"
    }
  }
}
```

#### 2. Get All Deals
**Endpoint:** `GET /api/v1/deals`

**Description:** Returns all deals with populated products and calculated discounted prices

**Query Parameters:**
- Standard pagination: `page`, `limit`
- Standard filtering: `sort_by`, etc.

**Example Request:**
```bash
GET /api/v1/deals?limit=10
```

**Response:**
```json
{
  "status": "success",
  "message": "Deals fetched successfully",
  "data": {
    "deals": [
      {
        "_id": "...",
        "title": "Weekend Sale",
        "description": "Big weekend discounts",
        "discountType": "percentage",
        "discountValue": 25,
        "startDate": "2024-01-15T00:00:00.000Z",
        "endDate": "2024-01-20T23:59:59.000Z",
        "isActive": true,
        "products": [
          {
            "_id": "...",
            "name": "iPhone 15 Pro",
            "price": 45000,
            "sale_price": 42000,
            "discountedPrice": 33750,  // Calculated: 45000 - (45000 * 25%)
            "category": {...},
            "image": {...}
          }
        ],
        "categories": [...],
        "subCategories": [...]
      }
    ],
    "pagination": {...}
  }
}
```

**Note:** The API automatically calculates `discountedPrice` for all products in the deal.

#### 3. Get Single Deal
**Endpoint:** `GET /api/v1/deals/:id`

**Description:** Returns a single deal by ID

**Example Request:**
```bash
GET /api/v1/deals/6935d7e09d5ca65494f07199
```

**Response:**
```json
{
  "status": "success",
  "message": "Deal fetched successfully",
  "data": {
    "deal": {
      "_id": "...",
      "title": "Weekend Sale",
      "products": [...],
      "categories": [...],
      "subCategories": [...]
    }
  }
}
```

---

## 🔄 How Deals Apply to Products

### Deal Application Logic (from `dealUtils.js`):

```javascript
// 1. Get all active deals
const deals = await getActiveDeals(); // isActive: true, within date range

// 2. For each product:
//    a. Check if product has its own sale
//    b. Check all deals that apply:
//       - isGlobal = true (applies to all)
//       - product._id in deal.products
//       - product.category in deal.categories
//       - product.subCategory in deal.subCategories
//    c. Calculate discount for each applicable deal
//    d. Use the best discount (lowest final price)

// 3. Return product with:
//    - basePrice (original price)
//    - finalPrice (after best discount)
//    - activeDeal (the deal being applied)
//    - discountPercent (calculated percentage)
```

### Example Calculation:

**Product:**
- `price: 45000`
- `salePrice: 42000` (product's own sale)
- `on_sale: true`

**Active Deal:**
- `discountType: "percentage"`
- `discountValue: 25`
- Applies to this product

**Calculation:**
1. Product's own sale: `42000`
2. Deal discount: `45000 - (45000 * 25%) = 33750`
3. **Best price wins:** `33750` (deal is better)
4. Final result: `finalPrice: 33750`, `activeDeal: {...}`, `discountPercent: 25`

---

## ⚙️ Automatic Deal Management

### Cron Job (`deal.cron.js`):
- **Runs every 5 minutes**
- **Activates deals:** Sets `isActive: true` when `startDate <= now <= endDate`
- **Deactivates deals:** Sets `isActive: false` when `endDate < now` or `startDate > now`

**No manual activation needed!** Deals automatically become active/inactive based on dates.

---

## 📊 Summary: Product Sales vs Deals

| Feature | Product Sales | Deals |
|---------|---------------|-------|
| **Scope** | Single product | Multiple products/categories |
| **Management** | Per product | Campaign-based |
| **Discount Type** | Fixed sale price | Percentage or fixed amount |
| **Time Control** | Manual dates | Automatic (cron job) |
| **Priority** | N/A | Yes (priority field) |
| **Best Discount** | Product sale price | Best deal wins |
| **API Endpoint** | `/products/on-sale` | `/deals` |

---

## 🎯 Use Cases

### Product Sales (`on_sale`):
- ✅ Quick sale on a single product
- ✅ Flash sales
- ✅ Product-specific promotions
- ✅ Simple price reductions

### Deals System:
- ✅ Store-wide sales (use `isGlobal: true`)
- ✅ Category-wide promotions
- ✅ Seasonal campaigns
- ✅ Multi-product bundles
- ✅ Complex discount strategies
- ✅ Banner/promotional campaigns

---

## 🔍 Frontend Integration Guide

### For "On Sale" Products:
```javascript
// Get all products on sale
const response = await fetch('/api/v1/products/on-sale?limit=20');
const { products } = response.data;

// Display sale price
products.forEach(product => {
  const displayPrice = product.salePrice || product.price;
  const originalPrice = product.price;
  const discount = ((originalPrice - displayPrice) / originalPrice * 100).toFixed(0);
});
```

### For Deals:
```javascript
// Get all active deals
const response = await fetch('/api/v1/deals');
const { deals } = response.data;

// Display deal products with discounted prices
deals.forEach(deal => {
  deal.products.forEach(product => {
    // product.discountedPrice is already calculated by backend
    const finalPrice = product.discountedPrice;
    const originalPrice = product.price;
  });
});
```

### For Product Detail Page:
```javascript
// When fetching a product, deals are automatically applied
// The backend calculates the best price
// You can show:
// - product.price (original)
// - product.salePrice (if on_sale)
// - product.finalPrice (after deals, if using dealUtils)
// - product.activeDeal (which deal is applied)
```

---

## 🚨 Important Notes

1. **Deal Priority:**
   - Higher `priority` number = checked first
   - Best discount (lowest final price) wins

2. **Deal Activation:**
   - Deals are automatically activated/deactivated by cron job
   - No need to manually set `isActive`
   - Cron runs every 5 minutes

3. **Product Sale vs Deal:**
   - If product has `on_sale: true` AND a deal applies, the **best discount wins**
   - System compares both and uses the lower price

4. **Global Deals:**
   - `isGlobal: true` applies to ALL products
   - Use carefully! Can affect entire store

5. **Date Validation:**
   - `startDate` must be before `endDate`
   - Deals outside date range are automatically inactive

---

## 📝 API Testing Examples

### Test Product Sale:
```bash
# Get products on sale
curl http://localhost:5000/api/v1/products/on-sale

# Get top sales products
curl http://localhost:5000/api/v1/products/top-sales
```

### Test Deals:
```bash
# Get all deals
curl http://localhost:5000/api/v1/deals

# Get single deal
curl http://localhost:5000/api/v1/deals/DEAL_ID

# Create deal (Admin)
curl -X POST http://localhost:5000/api/v1/deals \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Weekend Sale",
    "discountType": "percentage",
    "discountValue": 25,
    "startDate": "2024-01-15T00:00:00.000Z",
    "endDate": "2024-01-20T23:59:59.000Z",
    "isGlobal": false
  }'
```

---

**This covers all the deals and sales functionality in your backend! 🎉**

