# API Testing Guide - Products & Categories

This document provides comprehensive testing endpoints, request bodies, and examples for all Product and Category APIs.

**Base URL:** `http://localhost:5000/api/v1`

**Authentication:** Most endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer YOUR_JWT_TOKEN
```

---

## 📁 CATEGORY APIs

### 1. Get All Categories
**Endpoint:** `GET /categories`  
**Auth:** Not required  
**Description:** Fetch all categories with nested children

**Request:**
```bash
GET http://localhost:5000/api/v1/categories
```

**Response Example:**
```json
{
  "status": "success",
  "message": "Categories fetched successfully with nested children and pagination",
  "data": {
    "categories": [...],
    "pagination": {...}
  }
}
```

---

### 2. Get Single Category by Slug
**Endpoint:** `GET /categories/:slug`  
**Auth:** Not required  
**Description:** Fetch a single category by its slug (not ID)

**Request:**
```bash
GET http://localhost:5000/api/v1/categories/smartphones
```

**Test Examples:**
```bash
# Using curl
curl -X GET http://localhost:5000/api/v1/categories/smartphones

# Using PowerShell
Invoke-RestMethod -Uri "http://localhost:5000/api/v1/categories/smartphones" -Method GET
```

**Response Example:**
```json
{
  "status": "success",
  "message": "Category fetched successfully with nested children",
  "data": {
    "category": {
      "_id": "...",
      "name": "Smartphones",
      "slug": "smartphones",
      "children": [...]
    }
  }
}
```

---

### 3. Create Category
**Endpoint:** `POST /categories`  
**Auth:** Required (Admin only)  
**Description:** Create a new category

**Request Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: multipart/form-data
```

**Request Body (multipart/form-data):**
```
name: Smartphones
description: Latest smartphones from all brands
type: normal
active: true
metaTitle: Buy Smartphones Online | Best Mobile Phones
metaDescription: Shop latest smartphones at best prices
image: [file upload]
```

**Request Body (JSON alternative - if no image):**
```json
{
  "name": "Smartphones",
  "description": "Latest smartphones from all brands including iPhone, Samsung, Xiaomi",
  "type": "normal",
  "active": true,
  "metaTitle": "Buy Smartphones Online | Best Mobile Phones",
  "metaDescription": "Shop latest smartphones at best prices with warranty and fast delivery"
}
```

**Test Examples:**
```bash
# Using curl with JSON
curl -X POST http://localhost:5000/api/v1/categories \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Smartphones",
    "description": "Latest smartphones from all brands",
    "type": "normal",
    "active": true
  }'

# Using PowerShell
$token = "YOUR_JWT_TOKEN"
$body = @{
  name = "Smartphones"
  description = "Latest smartphones from all brands"
  type = "normal"
  active = $true
} | ConvertTo-Json
$headers = @{
  "Authorization" = "Bearer $token"
  "Content-Type" = "application/json"
}
Invoke-RestMethod -Uri "http://localhost:5000/api/v1/categories" -Method POST -Body $body -Headers $headers
```

---

### 4. Update Category
**Endpoint:** `PATCH /categories/:id`  
**Auth:** Required (Admin only)  
**Description:** Update an existing category by ID

**Request:**
```bash
PATCH http://localhost:5000/api/v1/categories/6935d7e09d5ca65494f07197
```

**Request Body (multipart/form-data or JSON):**
```json
{
  "name": "Updated Smartphones",
  "description": "Updated description",
  "active": false
}
```

**Test Example:**
```bash
curl -X PATCH http://localhost:5000/api/v1/categories/6935d7e09d5ca65494f07197 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Updated Smartphones", "active": false}'
```

---

### 5. Delete Category
**Endpoint:** `DELETE /categories/:id`  
**Auth:** Required (Admin only)  
**Description:** Delete a category by ID

**Request:**
```bash
DELETE http://localhost:5000/api/v1/categories/6935d7e09d5ca65494f07197
```

**Test Example:**
```bash
curl -X DELETE http://localhost:5000/api/v1/categories/6935d7e09d5ca65494f07197 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 6. Create Subcategory
**Endpoint:** `POST /categories/:parentId/subcategories`  
**Auth:** Required (Admin only)  
**Description:** Create a subcategory under a parent category

**Request:**
```bash
POST http://localhost:5000/api/v1/categories/6935d7e09d5ca65494f07197/subcategories
```

**Request Body:**
```json
{
  "name": "iPhone",
  "description": "Apple iPhone smartphones",
  "type": "normal",
  "active": true,
  "metaTitle": "Buy iPhone Online",
  "metaDescription": "Shop latest iPhone models"
}
```

**Test Example:**
```bash
curl -X POST http://localhost:5000/api/v1/categories/6935d7e09d5ca65494f07197/subcategories \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "iPhone",
    "description": "Apple iPhone smartphones",
    "active": true
  }'
```

---

### 7. Update Subcategory
**Endpoint:** `PATCH /categories/subcategories/:id`  
**Auth:** Required (Admin only)  
**Description:** Update a subcategory by ID

**Request:**
```bash
PATCH http://localhost:5000/api/v1/categories/subcategories/6935d7e09d5ca65494f07198
```

**Request Body:**
```json
{
  "name": "Updated iPhone",
  "active": false
}
```

---

### 8. Delete Subcategory
**Endpoint:** `DELETE /categories/subcategories/:id`  
**Auth:** Required (Admin only)  
**Description:** Delete a subcategory by ID

**Request:**
```bash
DELETE http://localhost:5000/api/v1/categories/subcategories/6935d7e09d5ca65494f07198
```

---

## 📦 PRODUCT APIs

### 1. Get All Products (with Filters)
**Endpoint:** `GET /products`  
**Auth:** Not required  
**Description:** Fetch all products with filtering, sorting, and pagination

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 12)
- `categories` - Filter by category slugs (comma-separated): `categories=smartphones,tablets`
- `parent` - Filter by parent category slug: `parent=smartphones`
- `child` - Filter by child category slug: `child=iphone`
- `sub_category` - Filter by subcategory slug: `sub_category=iphone`
- `tags` - Filter by tag slugs (comma-separated): `tags=premium,new`
- `min_price` - Minimum price: `min_price=10000`
- `max_price` - Maximum price: `max_price=50000`
- `in_stock` - Filter in-stock products: `in_stock=true`
- `on_sale` - Filter on-sale products: `on_sale=true`
- `search` or `q` - Search term: `search=iphone`
- `sort_by` - Sort option: `new_arrival`, `best_selling`, `lowest`, `highest`

**Request Examples:**
```bash
# Get all products
GET http://localhost:5000/api/v1/products

# Filter by category slug
GET http://localhost:5000/api/v1/products?parent=smartphones

# Filter by parent and child category slugs
GET http://localhost:5000/api/v1/products?parent=smartphones&child=iphone

# Filter by subcategory slug
GET http://localhost:5000/api/v1/products?sub_category=iphone

# Filter by price range
GET http://localhost:5000/api/v1/products?min_price=20000&max_price=50000

# Search products
GET http://localhost:5000/api/v1/products?search=iphone

# Sort by price (lowest first)
GET http://localhost:5000/api/v1/products?sort_by=lowest

# Combined filters
GET http://localhost:5000/api/v1/products?parent=smartphones&min_price=20000&max_price=50000&in_stock=true&sort_by=lowest&page=1&limit=12
```

**Test Example:**
```bash
curl "http://localhost:5000/api/v1/products?parent=smartphones&min_price=20000&max_price=50000&sort_by=lowest"
```

---

### 2. Get Single Product by Slug
**Endpoint:** `GET /products/:slug`  
**Auth:** Not required  
**Description:** Fetch a single product by its slug (not ID)

**Request:**
```bash
GET http://localhost:5000/api/v1/products/iphone-15-pro-max-256gb
```

**Test Examples:**
```bash
# Using curl
curl -X GET http://localhost:5000/api/v1/products/iphone-15-pro-max-256gb

# Using PowerShell
Invoke-RestMethod -Uri "http://localhost:5000/api/v1/products/iphone-15-pro-max-256gb" -Method GET
```

**Response Example:**
```json
{
  "status": "success",
  "message": "Product fetched successfully",
  "data": {
    "product": {
      "_id": "...",
      "productName": "iPhone 15 Pro Max",
      "slug": "iphone-15-pro-max-256gb",
      "price": 45000,
      "category": {...},
      "subCategory": {...},
      "additional_info": [...]
    }
  }
}
```

---

### 3. Get Related Products
**Endpoint:** `GET /products/:slug/related`  
**Auth:** Not required  
**Description:** Get related products based on a product slug

**Request:**
```bash
GET http://localhost:5000/api/v1/products/iphone-15-pro-max-256gb/related
```

**Query Parameters:**
- `parent` - Override parent category slug
- `child` - Override child category slug
- `page`, `limit`, `sort_by` - Pagination and sorting

**Test Example:**
```bash
curl "http://localhost:5000/api/v1/products/iphone-15-pro-max-256gb/related?limit=8"
```

---

### 4. Create Product
**Endpoint:** `POST /products`  
**Auth:** Required (Admin only)  
**Description:** Create a new product with images

**Request Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: multipart/form-data
```

**Request Body (multipart/form-data):**
```
productName: iPhone 15 Pro Max
brand: Apple
model: iPhone 15 Pro Max
category: 6935d7e09d5ca65494f07197 (or category name/slug)
subCategory: 6935d7e09d5ca65494f07198 (optional)
price: 45000
salePrice: 42000 (optional)
tax: 18 (optional)
quantity: 50
mainImage: [file upload]
galleryImages: [file uploads - multiple]
description: Latest iPhone with advanced features (optional)
condition: new (optional)
tags: premium,new,flagship (optional - comma-separated)
videoUrl: https://youtube.com/watch?v=... (optional)
whatsInTheBox: iPhone, Charger, Cable (optional)
additional_info: {"displaySize":"6.7 inches","processor":"A17 Pro","battery":"4441 mAh"} (optional)
variants: [JSON string] (optional)
```

**Variants JSON Structure (optional):**
```json
[
  {
    "storage": "256GB",
    "ram": "8GB",
    "color": "Natural Titanium",
    "bundle": "Standard",
    "warranty": "1 Year",
    "price": 45000,
    "stock": 25,
    "sku": "APPLE-256-NT",
    "image": [file upload - optional]
  },
  {
    "storage": "512GB",
    "ram": "8GB",
    "color": "Blue Titanium",
    "price": 55000,
    "stock": 15
  }
]
```

**Minimal Request Example:**
```json
{
  "productName": "Test Phone",
  "brand": "Samsung",
  "model": "Galaxy S24",
  "category": "6935d7e09d5ca65494f07197",
  "price": 50000,
  "quantity": 10
}
```

**Full Request Example (JSON - for testing without images):**
```json
{
  "productName": "iPhone 15 Pro Max",
  "brand": "Apple",
  "model": "iPhone 15 Pro Max",
  "category": "6935d7e09d5ca65494f07197",
  "subCategory": "6935d7e09d5ca65494f07198",
  "price": 45000,
  "salePrice": 42000,
  "tax": 18,
  "quantity": 50,
  "description": "Latest iPhone with A17 Pro chip",
  "condition": "new",
  "tags": "premium,new,flagship",
  "whatsInTheBox": "iPhone, Charger, Cable, Manual",
  "videoUrl": "https://youtube.com/watch?v=example",
  "additional_info": "{\"displaySize\":\"6.7 inches\",\"processor\":\"A17 Pro\",\"battery\":\"4441 mAh\",\"rearCamera\":\"48MP\",\"frontCamera\":\"12MP\"}",
  "variants": "[{\"storage\":\"256GB\",\"ram\":\"8GB\",\"color\":\"Natural Titanium\",\"price\":45000,\"stock\":25},{\"storage\":\"512GB\",\"ram\":\"8GB\",\"color\":\"Blue Titanium\",\"price\":55000,\"stock\":15}]"
}
```

**Test Example (PowerShell - JSON only):**
```powershell
$token = "YOUR_JWT_TOKEN"
$body = @{
  productName = "Test Phone"
  brand = "Samsung"
  model = "Galaxy S24"
  category = "6935d7e09d5ca65494f07197"
  price = 50000
  quantity = 10
} | ConvertTo-Json
$headers = @{
  "Authorization" = "Bearer $token"
  "Content-Type" = "application/json"
}
Invoke-RestMethod -Uri "http://localhost:5000/api/v1/products" -Method POST -Body $body -Headers $headers
```

---

### 5. Update Product
**Endpoint:** `PATCH /products/:id`  
**Auth:** Required (Admin only)  
**Description:** Update an existing product by ID

**Request:**
```bash
PATCH http://localhost:5000/api/v1/products/6935d7e09d5ca65494f07199
```

**Request Body:** Same structure as create product (all fields optional)

**Test Example:**
```bash
curl -X PATCH http://localhost:5000/api/v1/products/6935d7e09d5ca65494f07199 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "price": 48000,
    "salePrice": 45000,
    "quantity": 30
  }'
```

---

### 6. Delete Product
**Endpoint:** `DELETE /products/:id`  
**Auth:** Required (Admin only)  
**Description:** Delete a product by ID

**Request:**
```bash
DELETE http://localhost:5000/api/v1/products/6935d7e09d5ca65494f07199
```

**Test Example:**
```bash
curl -X DELETE http://localhost:5000/api/v1/products/6935d7e09d5ca65494f07199 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 7. Get Products by Category
**Endpoint:** `GET /products/category`  
**Auth:** Not required  
**Description:** Get products filtered by category with query filters

**Query Parameters:** Same as `/products` endpoint

**Request:**
```bash
GET http://localhost:5000/api/v1/products/category?parent=smartphones&min_price=20000
```

---

### 8. Get Products by Category and Subcategories
**Endpoint:** `GET /products/categories`  
**Auth:** Not required  
**Description:** Get products by parent and/or child category slugs

**Query Parameters:**
- `parent` - Parent category slug (required if filtering)
- `child` - Child category slug (optional)
- All other filters from `/products` endpoint

**Request Examples:**
```bash
# By parent category slug
GET http://localhost:5000/api/v1/products/categories?parent=smartphones

# By parent and child category slugs
GET http://localhost:5000/api/v1/products/categories?parent=smartphones&child=iphone

# With additional filters
GET http://localhost:5000/api/v1/products/categories?parent=smartphones&child=iphone&min_price=30000&max_price=60000
```

---

### 9. Get Best Seller Products
**Endpoint:** `GET /products/best-seller`  
**Auth:** Not required

**Request:**
```bash
GET http://localhost:5000/api/v1/products/best-seller?limit=10
```

---

### 10. Get New Arrival Products
**Endpoint:** `GET /products/new-arrival`  
**Auth:** Not required

**Request:**
```bash
GET http://localhost:5000/api/v1/products/new-arrival?limit=10
```

---

### 11. Get On Sale Products
**Endpoint:** `GET /products/on-sale`  
**Auth:** Not required

**Request:**
```bash
GET http://localhost:5000/api/v1/products/on-sale?limit=10
```

---

### 12. Get Top Sales Products
**Endpoint:** `GET /products/top-sales`  
**Auth:** Not required

**Request:**
```bash
GET http://localhost:5000/api/v1/products/top-sales?limit=10
```

---

## 💬 REVIEW APIs

### 1. Get Product Reviews
**Endpoint:** `GET /products/:id/reviews`  
**Auth:** Not required  
**Description:** Get reviews for a product by product ID

**Request:**
```bash
GET http://localhost:5000/api/v1/products/6935d7e09d5ca65494f07199/reviews
```

---

### 2. Create Review
**Endpoint:** `POST /products/:id/reviews`  
**Auth:** Required  
**Description:** Create a review for a product by product ID

**Request:**
```bash
POST http://localhost:5000/api/v1/products/6935d7e09d5ca65494f07199/reviews
```

**Request Body:**
```json
{
  "rating": 5,
  "comment": "Great product! Highly recommended."
}
```

---

## 📋 SUMMARY OF CHANGES

### Category APIs:
- ✅ **Get single category:** Now uses `slug` instead of `id`
- ✅ **Update/Delete category:** Still uses `id` (as required)
- ✅ **Create subcategory:** Uses `parentId` (already implemented)

### Product APIs:
- ✅ **Get single product:** Now uses `slug` instead of `id`
- ✅ **Get related products:** Already uses `slug` (no change needed)
- ✅ **Update/Delete product:** Still uses `id` (as required)
- ✅ **Filter products:** Now supports `slug` in query parameters (parent, child, sub_category, categories, tags)
- ✅ **Product reviews:** Still uses `id` (as required)

---

## 🧪 QUICK TESTING CHECKLIST

### Category Tests:
- [ ] Get all categories
- [ ] Get single category by slug
- [ ] Create category (admin)
- [ ] Update category by ID (admin)
- [ ] Delete category by ID (admin)
- [ ] Create subcategory with parentId (admin)
- [ ] Update subcategory by ID (admin)
- [ ] Delete subcategory by ID (admin)

### Product Tests:
- [ ] Get all products
- [ ] Get single product by slug
- [ ] Get related products by slug
- [ ] Filter products by category slug (parent)
- [ ] Filter products by category slugs (parent + child)
- [ ] Filter products by subcategory slug
- [ ] Filter products by tags (slugs)
- [ ] Filter products by price range
- [ ] Search products
- [ ] Create product (admin)
- [ ] Update product by ID (admin)
- [ ] Delete product by ID (admin)
- [ ] Get product reviews by product ID
- [ ] Create review by product ID

---

## 🔑 IMPORTANT NOTES

1. **Slug vs ID Usage:**
   - **Slug:** Used for GET operations (read-only, public endpoints)
   - **ID:** Used for UPDATE/DELETE operations (admin endpoints)

2. **Filtering with Slugs:**
   - All category filtering now uses slugs in query parameters
   - `parent`, `child`, `sub_category`, `categories` all accept slugs
   - The system automatically converts slugs to ObjectIds internally

3. **Route Order:**
   - More specific routes (like `/:slug/related`, `/:id/reviews`) come before general routes (`/:slug`)
   - This prevents route conflicts

4. **Authentication:**
   - Public endpoints (GET) don't require authentication
   - Admin endpoints (POST, PATCH, DELETE) require Bearer token
   - Review creation requires user authentication

---

## 🚀 TESTING WITH POSTMAN/INSOMNIA

Import these endpoints into your API client:

**Base URL:** `http://localhost:5000/api/v1`

**Collection Structure:**
```
Categories/
  ├── GET All Categories
  ├── GET Category by Slug
  ├── POST Create Category (Admin)
  ├── PATCH Update Category by ID (Admin)
  ├── DELETE Category by ID (Admin)
  ├── POST Create Subcategory (Admin)
  ├── PATCH Update Subcategory by ID (Admin)
  └── DELETE Subcategory by ID (Admin)

Products/
  ├── GET All Products (with filters)
  ├── GET Product by Slug
  ├── GET Related Products by Slug
  ├── GET Products by Category
  ├── GET Products by Categories (parent/child)
  ├── GET Best Seller Products
  ├── GET New Arrival Products
  ├── GET On Sale Products
  ├── GET Top Sales Products
  ├── POST Create Product (Admin)
  ├── PATCH Update Product by ID (Admin)
  └── DELETE Product by ID (Admin)

Reviews/
  ├── GET Product Reviews by ID
  └── POST Create Review by Product ID
```

---

**Happy Testing! 🎉**

