# Category & Subcategory API Documentation

## Table of Contents
1. [Overview](#overview)
2. [Data Structure](#data-structure)
3. [API Endpoints](#api-endpoints)
4. [Authentication](#authentication)
5. [Field Descriptions](#field-descriptions)
6. [Request/Response Examples](#requestresponse-examples)
7. [Frontend Integration Guide](#frontend-integration-guide)

---

## Overview

The Category API provides a hierarchical category system for organizing products in your e-commerce store. Categories can have unlimited levels of subcategories, with automatic ancestor tracking and slug generation.

### Key Features:
- ✅ Hierarchical category structure (parent-child relationships)
- ✅ Automatic slug generation from category name
- ✅ Automatic ancestor path tracking
- ✅ Image upload support (thumbnail, banner, mobile, gallery)
- ✅ SEO fields (metaTitle, metaDescription)
- ✅ Category types (mega menu, normal)
- ✅ Active/inactive status
- ✅ Full CRUD operations
- ✅ Pagination and filtering
- ✅ Nested children population

---

## Data Structure

### Category Model

```javascript
{
  _id: "ObjectId",                    // Auto-generated MongoDB ID
  name: "String (required, unique)",  // Category name
  slug: "String (unique, auto-generated)", // URL-friendly slug
  type: "String (enum: 'mega' | 'normal')", // Category type
  parent: "ObjectId | null",          // Parent category ID (null for root categories)
  ancestors: ["ObjectId[]"],           // Auto-populated ancestor IDs
  description: "String (optional)",    // Category description
  metaTitle: "String (optional)",      // SEO meta title
  metaDescription: "String (optional)", // SEO meta description
  active: "Boolean (default: true)",   // Active status
  images: [                            // Image array
    {
      url: "String (required)",        // Cloudinary image URL
      altText: "String",               // Alt text for image
      width: "Number (optional)",
      height: "Number (optional)",
      type: "String (enum: 'thumbnail' | 'banner' | 'mobile' | 'gallery')"
    }
  ],
  popularityScore: "Number (default: 0)", // Popularity score
  createdBy: "ObjectId (required)",   // User ID who created
  updatedBy: "ObjectId (optional)",    // User ID who last updated
  createdAt: "Date (auto)",           // Creation timestamp
  updatedAt: "Date (auto)",            // Update timestamp
  children: ["Category[]"]             // Virtual field - populated subcategories
}
```

### Category Types:
- **`normal`**: Standard category (default)
- **`mega`**: Mega menu category (for large dropdown menus)

### Image Types:
- **`thumbnail`**: Small preview image
- **`banner`**: Large banner image
- **`mobile`**: Mobile-optimized image
- **`gallery`**: Gallery images (up to 5)

---

## API Endpoints

### Base URL
```
http://localhost:5000/api/v1/categories
```

---

## PUBLIC ENDPOINTS (No Authentication Required)

### 1. Get All Categories (with nested children)

**Endpoint:** `GET /api/v1/categories`

**Description:** Fetches all root categories (parent: null) with their nested subcategories recursively.

**Query Parameters:**
| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `type` | string | Filter by category type | `?type=mega` |
| `active` | boolean | Filter by active status | `?active=true` |
| `page` | number | Page number for pagination | `?page=1` |
| `limit` | number | Items per page | `?limit=10` |
| `sort` | string | Sort field | `?sort=name` |
| `fields` | string | Select specific fields | `?fields=name,slug` |

**Response:**
```json
{
  "status": "success",
  "message": "Categories fetched successfully with nested children and pagination",
  "data": {
    "categories": [
      {
        "_id": "6935d7e09d5ca65494f07197",
        "name": "Mobile Phones",
        "slug": "mobile-phones",
        "type": "mega",
        "parent": null,
        "ancestors": [],
        "description": "Latest smartphones",
        "active": true,
        "images": [
          {
            "url": "https://res.cloudinary.com/...",
            "altText": "Mobile Phones",
            "type": "thumbnail"
          }
        ],
        "children": [
          {
            "_id": "6935d7e09d5ca65494f07198",
            "name": "Smartphones",
            "slug": "smartphones",
            "parent": "6935d7e09d5ca65494f07197",
            "children": []
          }
        ],
        "createdAt": "2024-01-15T10:00:00.000Z",
        "updatedAt": "2024-01-15T10:00:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalItems": 50,
      "itemsPerPage": 10
    }
  }
}
```

---

### 2. Get Single Category by ID

**Endpoint:** `GET /api/v1/categories/:id`

**Description:** Fetches a single category by its MongoDB ObjectId with all nested children.

**URL Parameters:**
- `id` (required): MongoDB ObjectId of the category

**Response:**
```json
{
  "status": "success",
  "message": "Category fetched successfully with nested children",
  "data": {
    "category": {
      "_id": "6935d7e09d5ca65494f07197",
      "name": "Mobile Phones",
      "slug": "mobile-phones",
      "type": "mega",
      "parent": null,
      "ancestors": [],
      "description": "Latest smartphones",
      "active": true,
      "images": [...],
      "children": [...],
      "createdBy": {
        "_id": "6935d7e09d5ca65494f07199",
        "name": "Admin User",
        "email": "admin@example.com"
      },
      "createdAt": "2024-01-15T10:00:00.000Z",
      "updatedAt": "2024-01-15T10:00:00.000Z"
    }
  }
}
```

---

### 3. Get All Subcategories

**Endpoint:** `GET /api/v1/categories/subcategories`

**Description:** Fetches all subcategories (categories with a parent). Can be filtered by parent ID.

**Query Parameters:**
| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `parentId` | string | Filter by parent category ID | `?parentId=6935d7e09d5ca65494f07197` |
| `page` | number | Page number | `?page=1` |
| `limit` | number | Items per page | `?limit=10` |
| `sort` | string | Sort field | `?sort=name` |

**Response:**
```json
{
  "status": "success",
  "message": "Subcategories fetched successfully",
  "data": {
    "subCategories": [
      {
        "_id": "6935d7e09d5ca65494f07198",
        "name": "Smartphones",
        "slug": "smartphones",
        "parent": {
          "_id": "6935d7e09d5ca65494f07197",
          "name": "Mobile Phones",
          "slug": "mobile-phones",
          "type": "mega"
        },
        "ancestors": ["6935d7e09d5ca65494f07197"],
        "createdBy": {
          "name": "Admin User",
          "email": "admin@example.com"
        }
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 3,
      "totalItems": 25,
      "itemsPerPage": 10
    }
  }
}
```

---

## PROTECTED ENDPOINTS (Admin Authentication Required)

All protected endpoints require:
- **Authorization Header:** `Authorization: Bearer <admin_token>`
- **Role:** Admin user

---

### 4. Create Category

**Endpoint:** `POST /api/v1/categories`

**Description:** Creates a new root category (no parent).

**Content-Type:** `multipart/form-data` (for image uploads)

**Required Fields:**
- `name` (string): Category name

**Optional Fields:**
- `description` (string)
- `type` (string): `"mega"` or `"normal"` (default: `"normal"`)
- `active` (boolean): Default `true`
- `metaTitle` (string): SEO meta title
- `metaDescription` (string): SEO meta description
- `parent` (ObjectId): Parent category ID (usually null for root categories)
- `thumbnail` (file): Thumbnail image
- `banner` (file): Banner image
- `mobile` (file): Mobile image
- `gallery` (files): Up to 5 gallery images
- `altText` (string): Alt text for images

**Request Example (multipart/form-data):**
```
POST /api/v1/categories
Headers:
  Authorization: Bearer <admin_token>
  Content-Type: multipart/form-data

Form Data:
  name: "Mobile Phones"
  description: "Latest smartphones from all brands"
  type: "mega"
  active: true
  metaTitle: "Buy Mobile Phones Online"
  metaDescription: "Shop latest mobile phones at best prices"
  thumbnail: [file]
  banner: [file]
```

**Response:**
```json
{
  "status": "success",
  "message": "Category created successfully",
  "data": {
    "category": {
      "_id": "6935d7e09d5ca65494f07197",
      "name": "Mobile Phones",
      "slug": "mobile-phones",
      "type": "mega",
      "parent": null,
      "ancestors": [],
      "active": true,
      "images": [
        {
          "url": "https://res.cloudinary.com/.../thumbnail.jpg",
          "altText": "",
          "type": "thumbnail"
        }
      ],
      "createdBy": "6935d7e09d5ca65494f07199",
      "createdAt": "2024-01-15T10:00:00.000Z"
    }
  }
}
```

---

### 5. Update Category

**Endpoint:** `PATCH /api/v1/categories/:id`

**Description:** Updates an existing category by ID.

**Content-Type:** `multipart/form-data` (for image uploads)

**URL Parameters:**
- `id` (required): MongoDB ObjectId of the category

**Request Body:** Same as Create Category (all fields optional)

**Note:** Uploading new images will delete old images from Cloudinary.

**Response:**
```json
{
  "status": "success",
  "message": "Category updated successfully",
  "data": {
    "category": {
      "_id": "6935d7e09d5ca65494f07197",
      "name": "Updated Mobile Phones",
      "slug": "updated-mobile-phones",
      ...
    }
  }
}
```

---

### 6. Delete Category

**Endpoint:** `DELETE /api/v1/categories/:id`

**Description:** Deletes a category by ID. Also deletes associated images from Cloudinary.

**URL Parameters:**
- `id` (required): MongoDB ObjectId of the category

**Response:**
```json
{
  "status": "success",
  "message": "Category deleted successfully",
  "data": null
}
```

**Status Code:** `204 No Content`

---

### 7. Create Subcategory

**Endpoint:** `POST /api/v1/categories/:parentId/subcategories`

**Description:** Creates a new subcategory under a parent category. Supports both JSON and multipart/form-data.

**Content-Type:** `application/json` OR `multipart/form-data`

**URL Parameters:**
- `parentId` (required): MongoDB ObjectId of the parent category

**Required Fields:**
- `name` (string): Subcategory name

**Optional Fields:**
- `description` (string)
- `type` (string): `"mega"` or `"normal"`
- `active` (boolean): Default `true`
- `metaTitle` (string)
- `metaDescription` (string)
- `thumbnail` (file): For multipart requests
- `banner` (file): For multipart requests
- `mobile` (file): For multipart requests
- `gallery` (files): Up to 5 files

**Request Example (JSON):**
```json
POST /api/v1/categories/6935d7e09d5ca65494f07197/subcategories
Headers:
  Authorization: Bearer <admin_token>
  Content-Type: application/json

Body:
{
  "name": "Smartphones",
  "description": "Latest smartphones from iPhone, Samsung, Xiaomi",
  "type": "normal",
  "active": true,
  "metaTitle": "Buy Smartphones Online",
  "metaDescription": "Shop latest smartphones at best prices"
}
```

**Request Example (Multipart with Image):**
```
POST /api/v1/categories/6935d7e09d5ca65494f07197/subcategories
Headers:
  Authorization: Bearer <admin_token>
  Content-Type: multipart/form-data

Form Data:
  name: "Smartphones"
  description: "Latest smartphones"
  thumbnail: [file]
```

**Response:**
```json
{
  "status": "success",
  "message": "Subcategory created successfully",
  "data": {
    "subCategory": {
      "_id": "6935d7e09d5ca65494f07198",
      "name": "Smartphones",
      "slug": "smartphones",
      "parent": "6935d7e09d5ca65494f07197",
      "ancestors": ["6935d7e09d5ca65494f07197"],
      "createdBy": "6935d7e09d5ca65494f07199",
      "createdAt": "2024-01-15T10:00:00.000Z"
    }
  }
}
```

**Important Notes:**
- The `ancestors` array is automatically populated with all parent category IDs
- The `slug` is automatically generated from the name
- Parent category must exist, otherwise returns 404 error

---

### 8. Update Subcategory

**Endpoint:** `PATCH /api/v1/categories/subcategories/:id`

**Description:** Updates an existing subcategory by ID.

**Content-Type:** `multipart/form-data` (for image uploads)

**URL Parameters:**
- `id` (required): MongoDB ObjectId of the subcategory

**Request Body:** Same as Create Subcategory (all fields optional)

**Response:**
```json
{
  "status": "success",
  "message": "Subcategory updated successfully",
  "data": {
    "subCategory": {
      "_id": "6935d7e09d5ca65494f07198",
      "name": "Updated Smartphones",
      ...
    }
  }
}
```

---

### 9. Delete Subcategory

**Endpoint:** `DELETE /api/v1/categories/subcategories/:id`

**Description:** Deletes a subcategory by ID. Also deletes associated images from Cloudinary.

**URL Parameters:**
- `id` (required): MongoDB ObjectId of the subcategory

**Response:**
```json
{
  "status": "success",
  "message": "Subcategory deleted successfully",
  "data": null
}
```

**Status Code:** `204 No Content`

---

## Field Descriptions

### Required Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `name` | string | Category name (must be unique) | `"Mobile Phones"` |

### Optional Fields

| Field | Type | Description | Default | Example |
|-------|------|-------------|---------|---------|
| `description` | string | Category description | `null` | `"Latest smartphones"` |
| `type` | string | Category type | `"normal"` | `"mega"` or `"normal"` |
| `active` | boolean | Active status | `true` | `true` or `false` |
| `metaTitle` | string | SEO meta title | `null` | `"Buy Mobile Phones"` |
| `metaDescription` | string | SEO meta description | `null` | `"Shop latest phones"` |
| `parent` | ObjectId | Parent category ID | `null` | `"6935d7e09d5ca65494f07197"` |

### Auto-Generated Fields

| Field | Type | Description |
|-------|------|-------------|
| `_id` | ObjectId | MongoDB unique identifier |
| `slug` | string | URL-friendly slug (auto-generated from name) |
| `ancestors` | ObjectId[] | Array of all ancestor category IDs (auto-populated) |
| `createdAt` | Date | Creation timestamp |
| `updatedAt` | Date | Last update timestamp |

### Image Fields (Multipart Only)

| Field | Type | Max Count | Description |
|-------|------|----------|-------------|
| `thumbnail` | file | 1 | Thumbnail image (max 3MB) |
| `banner` | file | 1 | Banner image (max 3MB) |
| `mobile` | file | 1 | Mobile-optimized image (max 3MB) |
| `gallery` | file | 5 | Gallery images (max 3MB each) |
| `altText` | string | - | Alt text for all images |

---

## Request/Response Examples

### Example 1: Create Root Category (JSON-like structure)

```javascript
// Frontend Request
const formData = new FormData();
formData.append('name', 'Mobile Phones');
formData.append('description', 'Latest smartphones from all brands');
formData.append('type', 'mega');
formData.append('active', 'true');
formData.append('metaTitle', 'Buy Mobile Phones Online');
formData.append('metaDescription', 'Shop latest mobile phones');
formData.append('thumbnail', thumbnailFile);

fetch('http://localhost:5000/api/v1/categories', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${adminToken}`
  },
  body: formData
})
.then(res => res.json())
.then(data => console.log(data));
```

### Example 2: Create Subcategory (JSON)

```javascript
// Frontend Request
fetch('http://localhost:5000/api/v1/categories/6935d7e09d5ca65494f07197/subcategories', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${adminToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Smartphones',
    description: 'Latest smartphones',
    type: 'normal',
    active: true,
    metaTitle: 'Buy Smartphones',
    metaDescription: 'Shop latest smartphones'
  })
})
.then(res => res.json())
.then(data => console.log(data));
```

### Example 3: Get All Categories with Nested Children

```javascript
// Frontend Request
fetch('http://localhost:5000/api/v1/categories?active=true&page=1&limit=10')
  .then(res => res.json())
  .then(data => {
    // data.data.categories contains root categories with nested children
    data.data.categories.forEach(category => {
      console.log(category.name);
      if (category.children) {
        category.children.forEach(subcategory => {
          console.log('  -', subcategory.name);
        });
      }
    });
  });
```

### Example 4: Get Subcategories by Parent

```javascript
// Frontend Request
fetch('http://localhost:5000/api/v1/categories/subcategories?parentId=6935d7e09d5ca65494f07197')
  .then(res => res.json())
  .then(data => {
    // data.data.subCategories contains all subcategories
    data.data.subCategories.forEach(sub => {
      console.log(sub.name, '- Parent:', sub.parent.name);
    });
  });
```

---

## Frontend Integration Guide

### 1. Category Navigation Menu

**Use Case:** Display hierarchical category menu in navigation

```javascript
// Fetch all categories with nested children
const fetchCategories = async () => {
  const response = await fetch('http://localhost:5000/api/v1/categories?active=true');
  const data = await response.json();
  return data.data.categories; // Array of root categories with children
};

// Render navigation menu
const renderMenu = (categories) => {
  return categories.map(category => ({
    id: category._id,
    name: category.name,
    slug: category.slug,
    type: category.type,
    image: category.images?.find(img => img.type === 'thumbnail')?.url,
    children: category.children?.map(child => ({
      id: child._id,
      name: child.name,
      slug: child.slug,
      parent: child.parent
    }))
  }));
};
```

### 2. Category Breadcrumb

**Use Case:** Show category path in breadcrumb navigation

```javascript
// The ancestors array contains all parent category IDs
const buildBreadcrumb = (category) => {
  const breadcrumb = [];
  
  // Fetch ancestor details (you may need to fetch them separately)
  category.ancestors.forEach(ancestorId => {
    // Fetch ancestor category
    // Add to breadcrumb array
  });
  
  // Add current category
  breadcrumb.push({
    name: category.name,
    slug: category.slug
  });
  
  return breadcrumb;
};
```

### 3. Admin Category Management

**Use Case:** Admin panel for managing categories

```javascript
// Create Category
const createCategory = async (categoryData, imageFiles) => {
  const formData = new FormData();
  Object.keys(categoryData).forEach(key => {
    formData.append(key, categoryData[key]);
  });
  
  if (imageFiles.thumbnail) formData.append('thumbnail', imageFiles.thumbnail);
  if (imageFiles.banner) formData.append('banner', imageFiles.banner);
  
  const response = await fetch('http://localhost:5000/api/v1/categories', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminToken}`
    },
    body: formData
  });
  
  return await response.json();
};

// Create Subcategory
const createSubcategory = async (parentId, subcategoryData) => {
  const response = await fetch(
    `http://localhost:5000/api/v1/categories/${parentId}/subcategories`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(subcategoryData)
    }
  );
  
  return await response.json();
};

// Update Category
const updateCategory = async (categoryId, updates, imageFiles) => {
  const formData = new FormData();
  Object.keys(updates).forEach(key => {
    formData.append(key, updates[key]);
  });
  
  if (imageFiles) {
    Object.keys(imageFiles).forEach(key => {
      formData.append(key, imageFiles[key]);
    });
  }
  
  const response = await fetch(
    `http://localhost:5000/api/v1/categories/${categoryId}`,
    {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${adminToken}`
      },
      body: formData
    }
  );
  
  return await response.json();
};

// Delete Category
const deleteCategory = async (categoryId) => {
  const response = await fetch(
    `http://localhost:5000/api/v1/categories/${categoryId}`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    }
  );
  
  return response.status === 204 ? { success: true } : await response.json();
};
```

### 4. Category Filtering

**Use Case:** Filter products by category

```javascript
// Get all subcategories of a parent category
const getSubcategories = async (parentId) => {
  const response = await fetch(
    `http://localhost:5000/api/v1/categories/subcategories?parentId=${parentId}`
  );
  const data = await response.json();
  return data.data.subCategories;
};

// Use in product filter
const filterProductsByCategory = async (categoryId) => {
  // Get category and all its subcategories
  const category = await fetch(`http://localhost:5000/api/v1/categories/${categoryId}`)
    .then(res => res.json());
  
  // Get all subcategory IDs (including the category itself)
  const categoryIds = [
    categoryId,
    ...category.data.category.children.map(child => child._id)
  ];
  
  // Filter products by these category IDs
  // ... your product filtering logic
};
```

### 5. React Example Component

```jsx
import React, { useState, useEffect } from 'react';

const CategoryManager = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/v1/categories?active=true');
      const data = await response.json();
      setCategories(data.data.categories);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching categories:', error);
      setLoading(false);
    }
  };

  const createSubcategory = async (parentId, subcategoryData) => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(
        `http://localhost:5000/api/v1/categories/${parentId}/subcategories`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(subcategoryData)
        }
      );
      const data = await response.json();
      if (data.status === 'success') {
        fetchCategories(); // Refresh list
      }
      return data;
    } catch (error) {
      console.error('Error creating subcategory:', error);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1>Categories</h1>
      {categories.map(category => (
        <div key={category._id}>
          <h2>{category.name}</h2>
          {category.children && category.children.map(child => (
            <div key={child._id} style={{ marginLeft: '20px' }}>
              - {child.name}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export default CategoryManager;
```

---

## Error Responses

All endpoints return consistent error responses:

```json
{
  "status": "fail",
  "message": "Error message here",
  "error": {
    "statusCode": 400,
    "status": "fail",
    "isOperational": true
  }
}
```

### Common Error Codes:
- `400`: Bad Request (validation errors, invalid ID format)
- `401`: Unauthorized (missing/invalid token)
- `403`: Forbidden (not admin user)
- `404`: Not Found (category doesn't exist)
- `500`: Internal Server Error

---

## Important Notes

1. **Slug Generation**: Slugs are automatically generated from category names. If a slug already exists, a number suffix is added (e.g., `mobile-phones-1`).

2. **Ancestors Array**: The `ancestors` array is automatically populated when a subcategory is created. It contains all parent category IDs in order.

3. **Image Upload**: 
   - Maximum file size: 3MB per image
   - Supported formats: jpg, jpeg, png, gif, webp
   - Images are uploaded to Cloudinary
   - Old images are automatically deleted when updating

4. **Hierarchy Depth**: There's no limit on category hierarchy depth. You can have categories → subcategories → sub-subcategories → etc.

5. **Deleting Categories**: When deleting a category, associated images are deleted from Cloudinary. However, subcategories are NOT automatically deleted (you may want to add validation to prevent deleting categories with children).

6. **Pagination**: All list endpoints support pagination with `page` and `limit` query parameters.

7. **Filtering**: Use query parameters to filter categories by `type`, `active` status, or `parentId`.

---

## Testing Endpoints

### Using cURL

```bash
# Get all categories
curl http://localhost:5000/api/v1/categories

# Get single category
curl http://localhost:5000/api/v1/categories/6935d7e09d5ca65494f07197

# Create category (with image)
curl -X POST http://localhost:5000/api/v1/categories \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "name=Mobile Phones" \
  -F "description=Latest smartphones" \
  -F "thumbnail=@/path/to/image.jpg"

# Create subcategory (JSON)
curl -X POST http://localhost:5000/api/v1/categories/6935d7e09d5ca65494f07197/subcategories \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Smartphones","description":"Latest smartphones"}'
```

---

## Support

For issues or questions, refer to the backend codebase or contact the development team.

**Last Updated:** January 2024

