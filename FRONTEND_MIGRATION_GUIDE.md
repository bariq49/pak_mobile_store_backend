# Frontend Migration Guide: ID to Slug Migration

## 📋 Overview

The backend API has been updated to use **slugs** instead of **IDs** for fetching single products and categories. This guide helps you update your frontend dashboard to work with the new API structure.

---

## 🔄 What Changed in Backend

### ✅ Changed to Slug (GET operations):
1. **Get Single Category:** `GET /categories/:slug` (was `/:id`)
2. **Get Single Product:** `GET /products/:slug` (was `/:id`)
3. **Get Related Products:** `GET /products/:slug/related` (already was slug)

### ✅ Still Using ID (UPDATE/DELETE operations):
1. **Update Category:** `PATCH /categories/:id` (unchanged)
2. **Delete Category:** `DELETE /categories/:id` (unchanged)
3. **Update Product:** `PATCH /products/:id` (unchanged)
4. **Delete Product:** `DELETE /products/:id` (unchanged)
5. **Product Reviews:** `GET /products/:id/reviews` (unchanged)
6. **Create Review:** `POST /products/:id/reviews` (unchanged)

### ✅ Filtering (Query Parameters):
- All category filtering now uses **slugs** in query parameters
- `parent`, `child`, `sub_category`, `categories` all accept slugs

---

## 🎯 Frontend Changes Required

### 1. **Product Detail Page/Component**
**Before:**
```javascript
// ❌ OLD - Using ID
const productId = "6935d7e09d5ca65494f07199";
const response = await fetch(`/api/v1/products/${productId}`);
```

**After:**
```javascript
// ✅ NEW - Using Slug
const productSlug = "iphone-15-pro-max-256gb";
const response = await fetch(`/api/v1/products/${productSlug}`);
```

**What to Update:**
- Find all places where you fetch a single product by ID
- Replace with product slug
- Update route parameters in React Router/Vue Router/etc.
- Update navigation links to use slug instead of ID

---

### 2. **Category Detail Page/Component**
**Before:**
```javascript
// ❌ OLD - Using ID
const categoryId = "6935d7e09d5ca65494f07197";
const response = await fetch(`/api/v1/categories/${categoryId}`);
```

**After:**
```javascript
// ✅ NEW - Using Slug
const categorySlug = "smartphones";
const response = await fetch(`/api/v1/categories/${categorySlug}`);
```

**What to Update:**
- Find all places where you fetch a single category by ID
- Replace with category slug
- Update route parameters
- Update navigation links

---

### 3. **Product Listing/Filtering**
**Before:**
```javascript
// ❌ OLD - Using ID in query
const categoryId = "6935d7e09d5ca65494f07197";
const response = await fetch(`/api/v1/products?category=${categoryId}`);
```

**After:**
```javascript
// ✅ NEW - Using Slug in query
const categorySlug = "smartphones";
const response = await fetch(`/api/v1/products?parent=${categorySlug}`);
// OR
const response = await fetch(`/api/v1/products/categories?parent=${categorySlug}&child=iphone`);
```

**What to Update:**
- Update category filtering to use slugs
- Change query parameter names if needed (`category` → `parent` or use `categories` for multiple)
- Update filter components to work with slugs

---

### 4. **Navigation/Routing**
**Before:**
```javascript
// ❌ OLD - React Router example
<Link to={`/products/${product._id}`}>View Product</Link>
<Link to={`/categories/${category._id}`}>View Category</Link>

// Route definition
<Route path="/products/:id" component={ProductDetail} />
<Route path="/categories/:id" component={CategoryDetail} />
```

**After:**
```javascript
// ✅ NEW - Using Slug
<Link to={`/products/${product.slug}`}>View Product</Link>
<Link to={`/categories/${category.slug}`}>View Category</Link>

// Route definition
<Route path="/products/:slug" component={ProductDetail} />
<Route path="/categories/:slug" component={CategoryDetail} />
```

**What to Update:**
- Update all navigation links to use `slug` instead of `_id`
- Update route definitions to use `:slug` instead of `:id`
- Update route parameter extraction (use `slug` instead of `id`)

---

### 5. **State Management (Redux/Vuex/Zustand)**
**Before:**
```javascript
// ❌ OLD - Storing and using ID
const product = useSelector(state => state.products.items.find(p => p._id === productId));
dispatch(fetchProduct(productId));
```

**After:**
```javascript
// ✅ NEW - Using Slug
const product = useSelector(state => state.products.items.find(p => p.slug === productSlug));
dispatch(fetchProduct(productSlug));
```

**What to Update:**
- Update action creators to accept slug instead of ID
- Update selectors to find by slug
- Update state management logic

---

### 6. **API Service Layer**
**Before:**
```javascript
// ❌ OLD - API service
class ProductService {
  async getProduct(id) {
    return axios.get(`/api/v1/products/${id}`);
  }
  
  async getCategory(id) {
    return axios.get(`/api/v1/categories/${id}`);
  }
}
```

**After:**
```javascript
// ✅ NEW - Using Slug
class ProductService {
  async getProduct(slug) {
    return axios.get(`/api/v1/products/${slug}`);
  }
  
  async getCategory(slug) {
    return axios.get(`/api/v1/categories/${slug}`);
  }
  
  // Still use ID for update/delete
  async updateProduct(id, data) {
    return axios.patch(`/api/v1/products/${id}`, data);
  }
  
  async deleteProduct(id) {
    return axios.delete(`/api/v1/products/${id}`);
  }
}
```

**What to Update:**
- Rename parameters from `id` to `slug` for GET operations
- Keep `id` for UPDATE/DELETE operations
- Update all method calls throughout the app

---

### 7. **Form Handling (Edit Forms)**
**Important:** Edit/Update forms still use ID!

**Before:**
```javascript
// ❌ OLD - Using ID for both view and edit
const product = await fetchProduct(productId);
// ... edit form
await updateProduct(productId, formData);
```

**After:**
```javascript
// ✅ NEW - Slug for view, ID for update
const product = await fetchProduct(productSlug); // Use slug to fetch
// ... edit form
await updateProduct(product._id, formData); // Use ID to update
```

**What to Update:**
- Fetch product/category using slug
- Keep the `_id` from the fetched data
- Use `_id` when calling update/delete APIs

---

### 8. **Error Handling**
**Before:**
```javascript
// ❌ OLD
catch (error) {
  if (error.response?.status === 404) {
    console.error("Product not found with ID:", productId);
  }
}
```

**After:**
```javascript
// ✅ NEW
catch (error) {
  if (error.response?.status === 404) {
    console.error("Product not found with slug:", productSlug);
  }
}
```

---

## 🔍 Code Search Patterns

Use these patterns to find code that needs updating:

### Search for:
1. **Product fetching:**
   - `products/${` or `products/` + variable
   - `getProduct(id)` or `fetchProduct(id)`
   - `/products/:id` in routes
   - `productId` or `product._id` in navigation

2. **Category fetching:**
   - `categories/${` or `categories/` + variable
   - `getCategory(id)` or `fetchCategory(id)`
   - `/categories/:id` in routes
   - `categoryId` or `category._id` in navigation

3. **Filtering:**
   - `?category=` in query strings
   - `categoryId` in filter objects
   - Category dropdowns/selects that use IDs

---

## 📝 Step-by-Step Migration Checklist

### Phase 1: Identify All Affected Code
- [ ] Search for all `products/${` occurrences
- [ ] Search for all `categories/${` occurrences
- [ ] List all components that fetch single product/category
- [ ] List all routes that use `:id` parameter
- [ ] List all navigation links using IDs

### Phase 2: Update API Service Layer
- [ ] Update `getProduct()` to accept slug
- [ ] Update `getCategory()` to accept slug
- [ ] Keep `updateProduct()` and `deleteProduct()` using ID
- [ ] Keep `updateCategory()` and `deleteCategory()` using ID
- [ ] Update filtering methods to use slugs

### Phase 3: Update Components
- [ ] Update ProductDetail component
- [ ] Update CategoryDetail component
- [ ] Update ProductCard/ProductItem components (links)
- [ ] Update CategoryCard/CategoryItem components (links)
- [ ] Update filter components

### Phase 4: Update Routing
- [ ] Change route from `:id` to `:slug`
- [ ] Update route parameter extraction
- [ ] Update all navigation links
- [ ] Test deep linking with slugs

### Phase 5: Update State Management
- [ ] Update Redux/Vuex actions
- [ ] Update selectors
- [ ] Update state structure if needed

### Phase 6: Testing
- [ ] Test product detail page with slug
- [ ] Test category detail page with slug
- [ ] Test product filtering with slugs
- [ ] Test navigation between pages
- [ ] Test edit/update forms (should still use ID)
- [ ] Test delete operations (should still use ID)
- [ ] Test error handling (404 for invalid slugs)

---

## 🚨 Common Pitfalls to Avoid

### ❌ Don't Do This:
```javascript
// ❌ WRONG - Mixing slug and ID incorrectly
const product = await getProduct(productSlug);
await updateProduct(productSlug, data); // Wrong! Should use product._id
```

### ✅ Do This:
```javascript
// ✅ CORRECT - Slug for GET, ID for UPDATE/DELETE
const product = await getProduct(productSlug);
await updateProduct(product._id, data); // Correct!
```

### ❌ Don't Do This:
```javascript
// ❌ WRONG - Using ID in route when it should be slug
<Route path="/products/:id" />
const { id } = useParams();
const product = await getProduct(id); // Wrong if getProduct expects slug
```

### ✅ Do This:
```javascript
// ✅ CORRECT - Using slug in route
<Route path="/products/:slug" />
const { slug } = useParams();
const product = await getProduct(slug); // Correct!
```

---

## 🎨 Example: Complete Component Update

### Before (React Example):
```jsx
// ❌ OLD Component
import { useParams } from 'react-router-dom';

function ProductDetail() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  
  useEffect(() => {
    fetch(`/api/v1/products/${id}`)
      .then(res => res.json())
      .then(data => setProduct(data.data.product));
  }, [id]);
  
  const handleUpdate = () => {
    fetch(`/api/v1/products/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(formData)
    });
  };
  
  return <div>{product?.productName}</div>;
}
```

### After (React Example):
```jsx
// ✅ NEW Component
import { useParams } from 'react-router-dom';

function ProductDetail() {
  const { slug } = useParams(); // Changed from 'id' to 'slug'
  const [product, setProduct] = useState(null);
  
  useEffect(() => {
    fetch(`/api/v1/products/${slug}`) // Using slug
      .then(res => res.json())
      .then(data => setProduct(data.data.product));
  }, [slug]);
  
  const handleUpdate = () => {
    // Still use ID for update!
    fetch(`/api/v1/products/${product._id}`, { // Using product._id
      method: 'PATCH',
      body: JSON.stringify(formData)
    });
  };
  
  return <div>{product?.productName}</div>;
}
```

---

## 🔗 Related Products Component Update

### Before:
```jsx
// ❌ OLD
function RelatedProducts({ productId }) {
  const [products, setProducts] = useState([]);
  
  useEffect(() => {
    fetch(`/api/v1/products/${productId}/related`)
      .then(res => res.json())
      .then(data => setProducts(data.data.products));
  }, [productId]);
  
  return <div>{/* render products */}</div>;
}
```

### After:
```jsx
// ✅ NEW
function RelatedProducts({ productSlug }) { // Changed parameter name
  const [products, setProducts] = useState([]);
  
  useEffect(() => {
    fetch(`/api/v1/products/${productSlug}/related`) // Using slug
      .then(res => res.json())
      .then(data => setProducts(data.data.products));
  }, [productSlug]);
  
  return <div>{/* render products */}</div>;
}
```

---

## 📊 Data Flow Diagram

```
┌─────────────────┐
│  User Clicks    │
│  Product Link   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Navigate to    │
│  /products/     │
│  {slug}         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Extract slug   │
│  from URL       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Fetch Product  │
│  GET /products/ │
│  {slug}         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Display        │
│  Product        │
│  (has _id)      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  User Edits     │
│  Product        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Update Product │
│  PATCH /products/│
│  {_id}          │
└─────────────────┘
```

---

## 🧪 Testing Checklist

After migration, test these scenarios:

### Product Tests:
- [ ] Navigate to product detail page using slug URL
- [ ] Product detail page loads correctly
- [ ] Related products load correctly
- [ ] Edit product form works (uses ID internally)
- [ ] Delete product works (uses ID)
- [ ] Product links in listings use slug
- [ ] Breadcrumbs use slug
- [ ] Share URL uses slug (SEO friendly)

### Category Tests:
- [ ] Navigate to category detail page using slug URL
- [ ] Category detail page loads correctly
- [ ] Products filtered by category work
- [ ] Edit category form works (uses ID internally)
- [ ] Delete category works (uses ID)
- [ ] Category links use slug
- [ ] Category filtering in product listings works

### Filter Tests:
- [ ] Filter products by parent category slug
- [ ] Filter products by parent + child category slugs
- [ ] Filter products by subcategory slug
- [ ] Multiple category filters work
- [ ] Price range filters work
- [ ] Search functionality works

### Error Handling:
- [ ] Invalid slug returns 404
- [ ] Error messages are user-friendly
- [ ] Fallback/redirect works for old ID-based URLs (if implementing)

---

## 🚀 Migration Strategy

### Option 1: Big Bang (Recommended for Small Apps)
- Update all code at once
- Test thoroughly
- Deploy together with backend

### Option 2: Gradual Migration (For Large Apps)
1. **Phase 1:** Update API service layer
2. **Phase 2:** Update one feature at a time (e.g., products first, then categories)
3. **Phase 3:** Update routing
4. **Phase 4:** Update all navigation links
5. **Phase 5:** Full testing and deployment

### Option 3: Backward Compatibility (If Needed)
- Support both ID and slug temporarily
- Detect which one is used
- Gradually migrate to slug-only

---

## 💡 Pro Tips

1. **Keep ID for Internal Operations:**
   - Always keep `product._id` or `category._id` in state
   - Use it for update/delete operations
   - Use slug only for navigation and fetching

2. **URL Structure:**
   - Slugs make URLs SEO-friendly
   - Example: `/products/iphone-15-pro-max-256gb` vs `/products/6935d7e09d5ca65494f07199`

3. **Error Handling:**
   - Handle 404 errors gracefully
   - Show user-friendly messages
   - Consider redirecting old ID-based URLs to slug-based URLs

4. **Caching:**
   - Update cache keys if using slug-based caching
   - Clear old ID-based cache entries

5. **Analytics:**
   - Update tracking events if they reference IDs
   - Use slugs for better analytics readability

---

## 📞 Support

If you encounter issues during migration:

1. Check the backend API documentation: `API_TESTING_GUIDE.md`
2. Verify the slug format matches backend expectations
3. Test API endpoints directly using Postman/curl
4. Check browser console for API errors
5. Verify route parameters are correctly extracted

---

**Good luck with your migration! 🎉**

