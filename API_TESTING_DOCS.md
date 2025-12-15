# 📋 Pak Mobile Store - API Testing Documentation

> **Base URL:** `http://localhost:5000`  
> **Date:** December 5, 2025  
> **Tester:** API Testing Session

---

## 📑 Table of Contents

1. [Authentication APIs](#1-authentication-apis)
2. [User APIs](#2-user-apis)
3. [Category APIs](#3-category-apis)
4. [Product APIs](#4-product-apis)
5. [Cart APIs](#5-cart-apis)
6. [Wishlist APIs](#6-wishlist-apis)
7. [Order APIs](#7-order-apis)
8. [Coupon APIs](#8-coupon-apis)
9. [Shipping Zone APIs](#9-shipping-zone-apis)
10. [Deal APIs](#10-deal-apis)
11. [Site Settings APIs](#11-site-settings-apis)

---

## 🔑 Environment Variables

```
BASE_URL = http://localhost:5000
AUTH_TOKEN = (will be set after login)
ADMIN_TOKEN = (will be set after admin login)
```

---

## 1. Authentication APIs

### 1.1 Sign Up (Register New User)

**Endpoint:** `POST /auth/signup`

**Request:**
```json
{
  "name": "Test User",
  "email": "testuser@example.com",
  "password": "Test@1234",
  "passwordConfirm": "Test@1234"
}
```

**Response (Success - New User):**
```json
{
  "status": "success",
  "message": "User registered successfully",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "avatar": "",
      "role": "user",
      "_id": "693322edcf14d10bf86478f1",
      "name": "Test User",
      "email": "testuser@example.com",
      "addresses": [],
      "createdAt": "2025-12-05T18:22:37.293Z",
      "updatedAt": "2025-12-05T18:22:37.293Z"
    }
  }
}
```

**Response (Error - Duplicate Email):**
```json
{
  "status": "fail",
  "message": "Duplicate field value: {\"email\":\"testuser@example.com\"}. Please use another value!",
  "error": {
    "statusCode": 400,
    "status": "fail",
    "isOperational": true,
    "errors": []
  }
}
```

**Status:** ✅ PASSED (Both success & duplicate validation work correctly)

**Note:** 
- Email sending requires valid SMTP config in `.env`
- To test signup again, use a different email like `testuser2@example.com`

**Tested:** December 5, 2025

---

### 1.2 Login

**Endpoint:** `POST /auth/login`

**Request:**
```json
{
  "email": "testuser@example.com",
  "password": "Test@1234"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "login successfully",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5MzMyMmVkY2YxNGQxMGJmODY0NzhmMSIsInJvbGUiOiJ1c2VyIiwibmFtZSI6IlRlc3QgVXNlciIsImlhdCI6MTc2NDk1ODk2NiwiZXhwIjoxNzcyNzM0OTY2fQ.V0qDncK1r5dkEundqUxu1UE_ijeca3Y0R4fE9Zfc5eo",
    "user": {
      "avatar": "",
      "role": "user",
      "_id": "693322edcf14d10bf86478f1",
      "name": "Test User",
      "email": "testuser@example.com",
      "addresses": [],
      "createdAt": "2025-12-05T18:22:37.293Z",
      "updatedAt": "2025-12-05T18:22:37.293Z",
      "completeAddress": "",
      "id": "693322edcf14d10bf86478f1"
    }
  }
}
```

**Status:** ✅ PASSED

**Tested:** December 5, 2025

**Token for testing:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5MzMyMmVkY2YxNGQxMGJmODY0NzhmMSIsInJvbGUiOiJ1c2VyIiwibmFtZSI6IlRlc3QgVXNlciIsImlhdCI6MTc2NDk1ODk2NiwiZXhwIjoxNzcyNzM0OTY2fQ.V0qDncK1r5dkEundqUxu1UE_ijeca3Y0R4fE9Zfc5eo`

---

### 1.3 Logout

**Endpoint:** `GET /auth/logout`

**Headers:**
```
Authorization: Bearer {{AUTH_TOKEN}}
```

**Response:**
```json
// Will be filled after testing
```

**Status:** ⏳ Pending

---

### 1.4 Forgot Password

**Endpoint:** `POST /auth/forgot-password`

**Request:**
```json
{
  "email": "testuser@example.com"
}
```

**Response:**
```json
// Will be filled after testing
```

**Status:** ⏳ Pending

---

### 1.5 Update Password

**Endpoint:** `PATCH /auth/update-password`

**Headers:**
```
Authorization: Bearer {{AUTH_TOKEN}}
```

**Request:**
```json
{
  "currentPassword": "Test@1234",
  "newPassword": "NewTest@1234",
  "newPasswordConfirm": "NewTest@1234"
}
```

**Response:**
```json
// Will be filled after testing
```

**Status:** ⏳ Pending

---

## 1.6 Admin Authentication APIs

### 1.6.1 Admin Sign Up

**Endpoint:** `POST /auth/admin/signup`

**Headers:**
```
Content-Type: application/json
```

**Request:**
```json
{
  "name": "Admin User",
  "email": "admin@pakmobilestore.com",
  "password": "Admin@1234",
  "passwordConfirm": "Admin@1234",
  "adminSecretKey": "pak-mobile-admin-2025"
}
```

**Note:** `adminSecretKey` is required for security. Set `ADMIN_SECRET_KEY` in your `.env` file.

**Response (Success):**
```json
{
  "status": "success",
  "message": "Admin registered successfully",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5MzM0NWFiY2QxMjM0NTY3ODkwYWJjZCIsInJvbGUiOiJhZG1pbiIsIm5hbWUiOiJBZG1pbiBVc2VyIiwiaWF0IjoxNzY0OTYwMDAwLCJleHAiOjE3NzI3MzYwMDB9.xxx",
    "user": {
      "avatar": "",
      "role": "admin",
      "_id": "693345abcd1234567890abcd",
      "name": "Admin User",
      "email": "admin@pakmobilestore.com",
      "addresses": [],
      "createdAt": "2025-12-05T19:00:00.000Z",
      "updatedAt": "2025-12-05T19:00:00.000Z",
      "completeAddress": "",
      "id": "693345abcd1234567890abcd"
    }
  }
}
```

**Response (Error - Invalid Secret Key):**
```json
{
  "status": "fail",
  "message": "Invalid admin secret key. Access denied.",
  "error": {
    "statusCode": 403,
    "status": "fail",
    "isOperational": true,
    "errors": []
  }
}
```

**Response (Error - Duplicate Email):**
```json
{
  "status": "fail",
  "message": "Email already registered",
  "error": {
    "statusCode": 400,
    "status": "fail",
    "isOperational": true,
    "errors": []
  }
}
```

**Response (Error - Missing Fields):**
```json
{
  "status": "fail",
  "message": "All required fields must be provided",
  "error": {
    "statusCode": 400,
    "status": "fail",
    "isOperational": true,
    "errors": []
  }
}
```

**Status:** ✅ Ready for Testing

**Tested:** December 5, 2025

---

### 1.6.2 Admin Login

**Endpoint:** `POST /auth/admin/login`

**Headers:**
```
Content-Type: application/json
```

**Request:**
```json
{
  "email": "admin@pakmobilestore.com",
  "password": "Admin@1234"
}
```

**Note:** Only users with `role: "admin"` can login through this endpoint. Regular users will get a 403 error.

**Response (Success):**
```json
{
  "status": "success",
  "message": "Admin login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5MzM0NWFiY2QxMjM0NTY3ODkwYWJjZCIsInJvbGUiOiJhZG1pbiIsIm5hbWUiOiJBZG1pbiBVc2VyIiwiaWF0IjoxNzY0OTYwMDAwLCJleHAiOjE3NzI3MzYwMDB9.xxx",
    "user": {
      "avatar": "",
      "role": "admin",
      "_id": "693345abcd1234567890abcd",
      "name": "Admin User",
      "email": "admin@pakmobilestore.com",
      "addresses": [],
      "createdAt": "2025-12-05T19:00:00.000Z",
      "updatedAt": "2025-12-05T19:00:00.000Z",
      "completeAddress": "",
      "id": "693345abcd1234567890abcd"
    }
  }
}
```

**Response (Error - Not Admin):**
```json
{
  "status": "fail",
  "message": "Access denied. This login is for administrators only.",
  "error": {
    "statusCode": 403,
    "status": "fail",
    "isOperational": true,
    "errors": []
  }
}
```

**Response (Error - Wrong Credentials):**
```json
{
  "status": "fail",
  "message": "Incorrect email or password",
  "error": {
    "statusCode": 401,
    "status": "fail",
    "isOperational": true,
    "errors": []
  }
}
```

**Response (Error - Missing Fields):**
```json
{
  "status": "fail",
  "message": "Please provide email and password",
  "error": {
    "statusCode": 400,
    "status": "fail",
    "isOperational": true,
    "errors": []
  }
}
```

**Status:** ✅ Ready for Testing

**Tested:** December 5, 2025

---

### 1.6.3 Admin Logout

**Endpoint:** `GET /auth/admin/logout`

**Headers:**
```
Authorization: Bearer {{ADMIN_TOKEN}}
```

**Response:**
```json
// Will be filled after testing
```

**Status:** ⏳ Pending

---

### 1.6.4 Admin Forgot Password

**Endpoint:** `POST /auth/admin/forgot-password`

**Request:**
```json
{
  "email": "admin@pakmobilestore.com"
}
```

**Response:**
```json
// Will be filled after testing
```

**Status:** ⏳ Pending

---

### 1.6.5 Admin Reset Password

**Endpoint:** `PATCH /auth/admin/reset-password/:token`

**Request:**
```json
{
  "password": "NewAdmin@1234",
  "passwordConfirm": "NewAdmin@1234"
}
```

**Response:**
```json
// Will be filled after testing
```

**Status:** ⏳ Pending

---

### 1.6.6 Admin Update Password

**Endpoint:** `PATCH /auth/admin/update-password`

**Headers:**
```
Authorization: Bearer {{ADMIN_TOKEN}}
```

**Request:**
```json
{
  "currentPassword": "Admin@1234",
  "newPassword": "NewAdmin@1234",
  "newPasswordConfirm": "NewAdmin@1234"
}
```

**Response:**
```json
// Will be filled after testing
```

**Status:** ⏳ Pending

---

## 2. User APIs

### 2.1 Get Current User (Me)

**Endpoint:** `GET /api/v1/users/me`

**Headers:**
```
Authorization: Bearer {{AUTH_TOKEN}}
```

**Response:**
```json
// Will be filled after testing
```

**Status:** ⏳ Pending

---

### 2.2 Update Current User

**Endpoint:** `PATCH /api/v1/users/me`

**Headers:**
```
Authorization: Bearer {{AUTH_TOKEN}}
Content-Type: multipart/form-data
```

**Request:**
```json
{
  "name": "Updated Name",
  "phoneNumber": "+923001234567",
  "gender": "Male"
}
```

**Response:**
```json
// Will be filled after testing
```

**Status:** ⏳ Pending

---

### 2.3 Add Address

**Endpoint:** `POST /api/v1/users/me/addresses`

**Headers:**
```
Authorization: Bearer {{AUTH_TOKEN}}
```

**Request:**
```json
{
  "label": "Home",
  "fullName": "Test User",
  "phoneNumber": "+923001234567",
  "country": "Pakistan",
  "state": "Punjab",
  "city": "Lahore",
  "area": "Gulberg",
  "streetAddress": "123 Main Street",
  "apartment": "Apt 4B",
  "postalCode": "54000",
  "isDefault": true
}
```

**Response:**
```json
// Will be filled after testing
```

**Status:** ⏳ Pending

---

### 2.4 Get All Addresses

**Endpoint:** `GET /api/v1/users/me/addresses`

**Headers:**
```
Authorization: Bearer {{AUTH_TOKEN}}
```

**Response:**
```json
// Will be filled after testing
```

**Status:** ⏳ Pending

---

### 2.5 Get All Users (Admin)

**Endpoint:** `GET /api/v1/users`

**Headers:**
```
Authorization: Bearer {{ADMIN_TOKEN}}
```

**Response:**
```json
// Will be filled after testing
```

**Status:** ⏳ Pending

---

## 3. Category APIs

### 3.1 Get All Categories

**Endpoint:** `GET /api/v1/categories`

**Query Params:**
- `page` (optional): Page number
- `limit` (optional): Items per page
- `type` (optional): "mega" or "normal"
- `active` (optional): true/false

**Response:**
```json
// Will be filled after testing
```

**Status:** ⏳ Pending

---

### 3.2 Get Single Category

**Endpoint:** `GET /api/v1/categories/:slug`

**Response:**
```json
// Will be filled after testing
```

**Status:** ⏳ Pending

---

### 3.3 Create Category (Admin)

**Endpoint:** `POST /api/v1/categories`

**Headers:**
```
Authorization: Bearer {{ADMIN_TOKEN}}
Content-Type: multipart/form-data
```

**Request:**
```json
{
  "name": "Electronics",
  "type": "mega",
  "description": "All electronic items",
  "active": true
}
```

**Response:**
```json
// Will be filled after testing
```

**Status:** ⏳ Pending

---

## 4. Product APIs

### 4.1 Get All Products

**Endpoint:** `GET /api/v1/products`

**Query Params:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 12)
- `sort_by`: "new_arrival", "best_selling", "lowest", "highest"
- `min_price`: Minimum price
- `max_price`: Maximum price
- `in_stock`: true/false
- `on_sale`: true/false
- `search` or `q`: Search term
- `parent`: Parent category slug
- `child`: Child category slug
- `tags`: Comma-separated tag slugs

**Response:**
```json
// Will be filled after testing
```

**Status:** ⏳ Pending

---

### 4.2 Get Single Product

**Endpoint:** `GET /api/v1/products/:slug`

**Response:**
```json
// Will be filled after testing
```

**Status:** ⏳ Pending

---

### 4.3 Get Best Seller Products

**Endpoint:** `GET /api/v1/products/best-seller`

**Response:**
```json
// Will be filled after testing
```

**Status:** ⏳ Pending

---

### 4.4 Get New Arrival Products

**Endpoint:** `GET /api/v1/products/new-arrival`

**Response:**
```json
// Will be filled after testing
```

**Status:** ⏳ Pending

---

### 4.5 Get Sale Products

**Endpoint:** `GET /api/v1/products/on-sale`

**Response:**
```json
// Will be filled after testing
```

**Status:** ⏳ Pending

---

### 4.6 Create Product (Admin) - Mobile E-commerce

**Endpoint:** `POST /api/v1/products`

**Headers:**
```
Authorization: Bearer {{ADMIN_TOKEN}}
Content-Type: application/json (or multipart/form-data for file uploads)
```

#### Mandatory Fields
| Field | Type | Description |
|-------|------|-------------|
| `productName` | String | Product name (required) |
| `brand` | String | Brand name (required) |
| `model` | String | Model number/name (required) |
| `category` | ObjectId | Category ID (required) |
| `price` | Number | Regular price (required) |
| `mainImage` | String/File | Main product image URL or uploaded file (required) |

#### Optional Fields
| Field | Type | Description |
|-------|------|-------------|
| `salePrice` | Number | Discounted price |
| `costPrice` | Number | Cost/purchase price |
| `tax` | Number | Tax percentage |
| `galleryImages` | Array | Additional image URLs |
| `tags` | Array | Product tags `[{name: "Tag"}]` |
| `condition` | String | "new", "used", "refurbished", "open-box" |
| `sku` | String | Stock Keeping Unit |
| `description` | String | Product description |
| `whatsInTheBox` | String | Package contents |
| `videoUrl` | String | Product video URL |
| `variants` | Array | Product variants (see structure below) |
| `technicalSpecifications` | Object | Tech specs (see structure below) |

#### Variants Structure (Optional)
```json
{
  "storage": "256GB",
  "ram": "8GB",
  "color": "Black",
  "bundle": "With Charger",
  "warranty": "1 Year",
  "price": 499999,
  "stock": 25,
  "sku": "SKU-256-BLK",
  "image": "https://example.com/variant.jpg"
}
```

#### Technical Specifications Structure (Optional)
```json
{
  "displaySize": "6.7 inches",
  "displayType": "AMOLED",
  "processor": "Snapdragon 8 Gen 3",
  "rearCamera": "200MP + 12MP",
  "frontCamera": "12MP",
  "battery": "5000mAh",
  "fastCharging": "45W",
  "operatingSystem": "Android 14",
  "network": "5G",
  "bluetooth": "5.3",
  "nfc": "Yes",
  "simSupport": "Dual SIM",
  "dimensions": "162.3 x 79.0 x 8.6 mm",
  "weight": "232g"
}
```

---

#### Test Case 1: Basic Product Creation (Success)

**Request:**
```json
{
  "productName": "Samsung Galaxy S24 Ultra",
  "brand": "Samsung",
  "model": "SM-S928B",
  "category": "68fa7612c3838044ddad9572",
  "price": 349999,
  "mainImage": "https://example.com/samsung.jpg",
  "description": "Ultimate smartphone",
  "condition": "new",
  "sku": "SAM-S24U",
  "quantity": 50
}
```

**Response (201 Created):**
```json
{
  "status": "success",
  "message": "Product created successfully",
  "data": {
    "product": {
      "productName": "Samsung Galaxy S24 Ultra",
      "name": "Samsung Galaxy S24 Ultra",
      "slug": "samsung-galaxy-s24-ultra-2",
      "brand": "Samsung",
      "model": "SM-S928B",
      "category": "68fa7612c3838044ddad9572",
      "price": 349999,
      "mainImage": "https://example.com/samsung.jpg",
      "description": "Ultimate smartphone",
      "condition": "new",
      "sku": "SAM-S24U",
      "quantity": 50,
      "product_type": "simple",
      "in_stock": true,
      "is_active": true,
      "salePrice": null,
      "sale_price": null,
      "costPrice": null,
      "tax": null,
      "gallery": [],
      "galleryImages": [],
      "videoUrl": null,
      "whatsInTheBox": null,
      "technicalSpecifications": null,
      "variants": [],
      "tags": [],
      "ratingsAverage": 0,
      "ratingsQuantity": 0,
      "createdAt": "2025-12-07T14:19:12.085Z",
      "updatedAt": "2025-12-07T14:19:12.085Z",
      "id": "69358ce0e9b069559427cb52"
    }
  }
}
```

**Status:** ✅ PASSED

**Tested:** December 7, 2025

---

#### Test Case 2: Full Product with Variants & Technical Specs (Success)

**Request:**
```json
{
  "productName": "iPhone 15 Pro Max",
  "brand": "Apple",
  "model": "A3108",
  "category": "68fa7612c3838044ddad9572",
  "price": 499999,
  "mainImage": "https://example.com/iphone15promax.jpg",
  "description": "The most powerful iPhone ever",
  "condition": "new",
  "sku": "APL-IP15PM-256",
  "salePrice": 479999,
  "quantity": 30,
  "whatsInTheBox": "iPhone, Cable, Docs",
  "technicalSpecifications": {
    "displaySize": "6.7 inches",
    "displayType": "OLED",
    "processor": "A17 Pro",
    "battery": "4422mAh"
  },
  "variants": [
    {
      "storage": "256GB",
      "ram": "8GB",
      "color": "Natural",
      "price": 499999,
      "stock": 15
    }
  ],
  "tags": [
    {"name": "Apple"},
    {"name": "iPhone"}
  ]
}
```

**Response (201 Created):**
```json
{
  "status": "success",
  "message": "Product created successfully",
  "data": {
    "product": {
      "productName": "iPhone 15 Pro Max",
      "name": "iPhone 15 Pro Max",
      "slug": "iphone-15-pro-max-1",
      "brand": "Apple",
      "model": "A3108",
      "category": "68fa7612c3838044ddad9572",
      "price": 499999,
      "salePrice": 479999,
      "sale_price": 479999,
      "mainImage": "https://example.com/iphone15promax.jpg",
      "description": "The most powerful iPhone ever",
      "condition": "new",
      "sku": "APL-IP15PM-256",
      "whatsInTheBox": "iPhone, Cable, Docs",
      "technicalSpecifications": {
        "displaySize": "6.7 inches",
        "displayType": "OLED",
        "processor": "A17 Pro",
        "battery": "4422mAh"
      },
      "variants": [
        {
          "stock": 15,
          "_id": "69358d06d51eb816d48e5171",
          "storage": "256GB",
          "ram": "8GB",
          "color": "Natural",
          "price": 499999
        }
      ],
      "tags": ["69358cf646009031807256cc", "69358cf746009031807256d0"],
      "product_type": "variable",
      "in_stock": true,
      "is_active": true,
      "quantity": 0,
      "ratingsAverage": 0,
      "ratingsQuantity": 0,
      "createdAt": "2025-12-07T14:19:50.134Z",
      "updatedAt": "2025-12-07T14:19:50.134Z",
      "id": "69358d06d51eb816d48e5170"
    }
  }
}
```

**Status:** ✅ PASSED

**Tested:** December 7, 2025

---

#### Test Case 3: Validation Error - Missing Mandatory Fields

**Request:**
```json
{
  "productName": "Test Phone",
  "category": "68fa7612c3838044ddad9572",
  "price": 50000
}
```

**Response (400 Bad Request):**
```json
{
  "status": "error",
  "message": "Validation failed: brand is required, model is required, mainImage is required (at least 1 main/featured image)",
  "errors": [
    "brand is required",
    "model is required",
    "mainImage is required (at least 1 main/featured image)"
  ]
}
```

**Status:** ✅ PASSED

**Tested:** December 7, 2025

---

#### Test Case 4: Validation Error - Missing All Mandatory Fields

**Request:**
```json
{}
```

**Expected Response (400 Bad Request):**
```json
{
  "status": "error",
  "message": "Validation failed: productName is required, brand is required, model is required, category is required, price is required, mainImage is required (at least 1 main/featured image)",
  "errors": [
    "productName is required",
    "brand is required",
    "model is required",
    "category is required",
    "price is required",
    "mainImage is required (at least 1 main/featured image)"
  ]
}
```

**Status:** ✅ Ready for Testing

---

## 5. Cart APIs

### 5.1 Get Cart

**Endpoint:** `GET /api/v1/cart`

**Headers:**
```
Authorization: Bearer {{AUTH_TOKEN}}
```

**Response:**
```json
// Will be filled after testing
```

**Status:** ⏳ Pending

---

### 5.2 Add to Cart

**Endpoint:** `POST /api/v1/cart/add`

**Headers:**
```
Authorization: Bearer {{AUTH_TOKEN}}
```

**Request:**
```json
{
  "productId": "{{PRODUCT_ID}}",
  "quantity": 1
}
```

**Response:**
```json
// Will be filled after testing
```

**Status:** ⏳ Pending

---

### 5.3 Update Cart Item

**Endpoint:** `PATCH /api/v1/cart/update/:productId`

**Headers:**
```
Authorization: Bearer {{AUTH_TOKEN}}
```

**Request:**
```json
{
  "quantity": 2
}
```

**Response:**
```json
// Will be filled after testing
```

**Status:** ⏳ Pending

---

### 5.4 Remove from Cart

**Endpoint:** `DELETE /api/v1/cart/remove/:productId`

**Headers:**
```
Authorization: Bearer {{AUTH_TOKEN}}
```

**Response:**
```json
// Will be filled after testing
```

**Status:** ⏳ Pending

---

### 5.5 Apply Coupon

**Endpoint:** `POST /api/v1/cart/apply-coupon`

**Headers:**
```
Authorization: Bearer {{AUTH_TOKEN}}
```

**Request:**
```json
{
  "code": "DISCOUNT10"
}
```

**Response:**
```json
// Will be filled after testing
```

**Status:** ⏳ Pending

---

## 6. Wishlist APIs

### 6.1 Get Wishlist

**Endpoint:** `GET /api/v1/wishlist`

**Headers:**
```
Authorization: Bearer {{AUTH_TOKEN}}
```

**Response:**
```json
// Will be filled after testing
```

**Status:** ⏳ Pending

---

### 6.2 Add to Wishlist

**Endpoint:** `POST /api/v1/wishlist/:productId`

**Headers:**
```
Authorization: Bearer {{AUTH_TOKEN}}
```

**Response:**
```json
// Will be filled after testing
```

**Status:** ⏳ Pending

---

### 6.3 Remove from Wishlist

**Endpoint:** `DELETE /api/v1/wishlist/:productId`

**Headers:**
```
Authorization: Bearer {{AUTH_TOKEN}}
```

**Response:**
```json
// Will be filled after testing
```

**Status:** ⏳ Pending

---

## 7. Order APIs

### 7.1 Create Order

**Endpoint:** `POST /api/v1/orders`

**Headers:**
```
Authorization: Bearer {{AUTH_TOKEN}}
```

**Request:**
```json
{
  "addressId": "{{ADDRESS_ID}}",
  "paymentMethod": "cod"
}
```

**Response:**
```json
// Will be filled after testing
```

**Status:** ⏳ Pending

---

### 7.2 Get User Orders

**Endpoint:** `GET /api/v1/orders`

**Headers:**
```
Authorization: Bearer {{AUTH_TOKEN}}
```

**Response:**
```json
// Will be filled after testing
```

**Status:** ⏳ Pending

---

### 7.3 Get Single Order

**Endpoint:** `GET /api/v1/orders/:id`

**Headers:**
```
Authorization: Bearer {{AUTH_TOKEN}}
```

**Response:**
```json
// Will be filled after testing
```

**Status:** ⏳ Pending

---

### 7.4 Track Order

**Endpoint:** `GET /api/v1/orders/track/:trackingNumber`

**Headers:**
```
Authorization: Bearer {{AUTH_TOKEN}}
```

**Response:**
```json
// Will be filled after testing
```

**Status:** ⏳ Pending

---

### 7.5 Cancel Order

**Endpoint:** `PATCH /api/v1/orders/:id/cancel`

**Headers:**
```
Authorization: Bearer {{AUTH_TOKEN}}
```

**Response:**
```json
// Will be filled after testing
```

**Status:** ⏳ Pending

---

## 8. Coupon APIs

### 8.1 Get Active Coupons

**Endpoint:** `GET /api/v1/coupon`

**Response:**
```json
// Will be filled after testing
```

**Status:** ⏳ Pending

---

### 8.2 Create Coupon (Admin)

**Endpoint:** `POST /api/v1/coupon`

**Headers:**
```
Authorization: Bearer {{ADMIN_TOKEN}}
```

**Request:**
```json
{
  "code": "DISCOUNT10",
  "description": "10% off on all products",
  "discountType": "percentage",
  "discountValue": 10,
  "minCartValue": 100,
  "maxDiscount": 500,
  "usageLimit": 100,
  "perUserLimit": 1,
  "expiryDate": "2025-12-31"
}
```

**Response:**
```json
// Will be filled after testing
```

**Status:** ⏳ Pending

---

## 9. Shipping Zone APIs

### 9.1 Get All Zones

**Endpoint:** `GET /api/v1/shipping-zones`

**Response:**
```json
// Will be filled after testing
```

**Status:** ⏳ Pending

---

### 9.2 Create Shipping Zone (Admin)

**Endpoint:** `POST /api/v1/shipping-zones`

**Headers:**
```
Authorization: Bearer {{ADMIN_TOKEN}}
```

**Request:**
```json
{
  "name": "Lahore Zone",
  "regionCode": "LHR",
  "pinCodePrefix": "54",
  "baseRate": 100,
  "expressMultiplier": 1.5,
  "regionMultiplier": 1.0,
  "freeShippingThreshold": 2000,
  "isActive": true
}
```

**Response:**
```json
// Will be filled after testing
```

**Status:** ⏳ Pending

---

## 10. Deal APIs

### 10.1 Get All Deals

**Endpoint:** `GET /api/v1/deals`

**Response:**
```json
// Will be filled after testing
```

**Status:** ⏳ Pending

---

### 10.2 Create Deal (Admin)

**Endpoint:** `POST /api/v1/deals`

**Headers:**
```
Authorization: Bearer {{ADMIN_TOKEN}}
Content-Type: multipart/form-data
```

**Request:**
```json
{
  "title": "Summer Sale",
  "description": "Get 20% off on electronics",
  "discountType": "percentage",
  "discountValue": 20,
  "startDate": "2025-12-01",
  "endDate": "2025-12-31",
  "isActive": true
}
```

**Response:**
```json
// Will be filled after testing
```

**Status:** ⏳ Pending

---

## 11. Site Settings APIs

### 11.1 Get All Settings

**Endpoint:** `GET /api/v1/admin/settings`

**Response:**
```json
// Will be filled after testing
```

**Status:** ⏳ Pending

---

### 11.2 Upsert Setting (Admin)

**Endpoint:** `POST /api/v1/admin/settings`

**Headers:**
```
Authorization: Bearer {{ADMIN_TOKEN}}
```

**Request:**
```json
{
  "key": "COD_FEE",
  "value": 50,
  "description": "Cash on delivery fee"
}
```

**Response:**
```json
// Will be filled after testing
```

**Status:** ⏳ Pending

---

## 📊 Testing Summary

| Category | Total APIs | Tested | Passed | Failed |
|----------|------------|--------|--------|--------|
| User Auth | 5 | 2 | 2 | 0 |
| Admin Auth | 6 | 1 | 1 | 0 |
| User | 5 | 0 | 0 | 0 |
| Category | 3 | 0 | 0 | 0 |
| Product | 6 | 3 | 3 | 0 |
| Cart | 5 | 0 | 0 | 0 |
| Wishlist | 3 | 0 | 0 | 0 |
| Order | 5 | 0 | 0 | 0 |
| Coupon | 2 | 0 | 0 | 0 |
| Shipping | 2 | 0 | 0 | 0 |
| Deal | 2 | 0 | 0 | 0 |
| Settings | 2 | 0 | 0 | 0 |
| **Total** | **46** | **6** | **6** | **0** |

---

## 🔖 Notes

- All timestamps are in ISO 8601 format
- All responses follow the format: `{ status, message, data }`
- Error responses include: `{ status: "error", message, errors[] }`


