# Frontend Update Prompt Template

Copy and customize this prompt to give to your frontend developer or AI assistant:

---

## 🎯 PROMPT FOR FRONTEND DEVELOPER/AI ASSISTANT

```
I need to update my frontend dashboard to work with the updated backend API. The backend has been changed to use SLUGS instead of IDs for fetching single products and categories.

CRITICAL CHANGES:
1. GET single product: Changed from /products/:id to /products/:slug
2. GET single category: Changed from /categories/:id to /categories/:slug
3. UPDATE/DELETE operations: Still use ID (no change)
4. Filtering: Now uses slugs in query parameters (parent, child, sub_category)

WHAT I NEED:
1. Update all API calls that fetch single products to use slug instead of id
2. Update all API calls that fetch single categories to use slug instead of id
3. Update all route definitions from :id to :slug for product/category detail pages
4. Update all navigation links to use slug instead of _id
5. Keep UPDATE and DELETE operations using ID (they haven't changed)
6. Update filtering logic to use slugs in query parameters
7. Ensure error handling works with slugs

IMPORTANT RULES:
- Use SLUG for: GET operations, navigation, routing, filtering
- Use ID for: UPDATE operations, DELETE operations, reviews
- When fetching a product/category by slug, keep the _id from the response for update/delete operations

FILES TO CHECK:
- API service files (axios/fetch wrappers)
- Product detail components
- Category detail components
- Product listing/filtering components
- Route definitions
- Navigation components
- State management (Redux/Vuex/Zustand if used)

TESTING REQUIREMENTS:
- Test product detail page loads with slug
- Test category detail page loads with slug
- Test edit forms still work (they use ID internally)
- Test delete operations still work (they use ID)
- Test filtering with category slugs
- Test navigation between pages

Please:
1. Search the codebase for all occurrences of:
   - "products/${" or "products/" + variable
   - "categories/${" or "categories/" + variable
   - Route definitions with ":id" for products/categories
   - Navigation links using product._id or category._id

2. Update each occurrence according to the rules above

3. Provide a summary of all changes made

4. Ensure backward compatibility is maintained where needed (if old URLs with IDs exist, handle them gracefully)
```

---

## 📋 QUICK REFERENCE FOR DEVELOPER

### What Changed:
- ✅ GET `/products/:slug` (was `/:id`)
- ✅ GET `/categories/:slug` (was `/:id`)
- ✅ Filtering uses slugs: `?parent=smartphones&child=iphone`
- ❌ UPDATE/DELETE still use ID (no change)

### Code Patterns to Find:
```javascript
// Search for these patterns:
/products/${id}
/categories/${id}
getProduct(id)
fetchProduct(id)
product._id in links
category._id in links
:id in routes
```

### Update Pattern:
```javascript
// BEFORE:
const product = await getProduct(productId);
<Link to={`/products/${product._id}`}>

// AFTER:
const product = await getProduct(productSlug);
<Link to={`/products/${product.slug}`}>
// But keep product._id for update/delete!
```

---

## 🤖 AI ASSISTANT PROMPT (More Detailed)

```
I'm migrating my frontend dashboard from using MongoDB ObjectIds to using slugs for fetching single products and categories. The backend API has been updated accordingly.

BACKEND CHANGES SUMMARY:
- GET /products/:slug (changed from :id)
- GET /categories/:slug (changed from :id)
- GET /products/:slug/related (already was slug)
- PATCH /products/:id (unchanged - still uses ID)
- DELETE /products/:id (unchanged - still uses ID)
- PATCH /categories/:id (unchanged - still uses ID)
- DELETE /categories/:id (unchanged - still uses ID)
- Filtering: ?parent=slug&child=slug (uses slugs)

MY FRONTEND STACK:
[Specify: React/Vue/Angular/etc., routing library, state management, API client]

WHAT I NEED:
1. Comprehensive code search to find all ID-based product/category fetching
2. Update API service methods to use slug for GET operations
3. Update route definitions (e.g., :id → :slug)
4. Update all navigation links and components
5. Update filtering logic to use slugs
6. Ensure UPDATE/DELETE still use ID from fetched data
7. Add proper error handling for invalid slugs
8. Test all affected functionality

CONSTRAINTS:
- Don't break existing UPDATE/DELETE functionality
- Maintain backward compatibility if possible
- Ensure SEO-friendly URLs (slugs are better)
- Handle 404 errors gracefully

DELIVERABLES:
1. Updated code files with changes
2. List of all files modified
3. Testing checklist
4. Migration notes for any breaking changes

Please analyze my codebase and provide a comprehensive update plan, then implement the changes systematically.
```

---

## 📝 CUSTOMIZATION TIPS

Before using the prompt, customize it with:

1. **Your Tech Stack:**
   - Framework (React, Vue, Angular, etc.)
   - Routing library (React Router, Vue Router, etc.)
   - State management (Redux, Vuex, Zustand, Context API, etc.)
   - API client (Axios, Fetch, Apollo, etc.)

2. **Your Project Structure:**
   - Where are API services located?
   - Where are components located?
   - Where are routes defined?

3. **Specific Requirements:**
   - Do you need backward compatibility?
   - Any specific error handling requirements?
   - Any analytics/tracking that needs updating?

4. **Testing Preferences:**
   - Unit tests to update?
   - E2E tests to update?
   - Manual testing checklist?

---

## 🎯 EXAMPLE: Customized Prompt

```
I need to update my React + TypeScript dashboard that uses:
- React Router v6
- Redux Toolkit for state management
- Axios for API calls
- Component structure: src/components/, src/services/, src/store/

The backend API has changed:
- GET /products/:slug (was /:id)
- GET /categories/:slug (was /:id)
- UPDATE/DELETE still use ID

Please:
1. Find all API calls in src/services/api.ts
2. Update ProductDetail and CategoryDetail components in src/components/
3. Update routes in src/App.tsx
4. Update Redux actions in src/store/slices/
5. Update all Link components to use slug
6. Ensure TypeScript types are updated
7. Update unit tests in src/__tests__/

Focus on:
- src/services/productService.ts
- src/services/categoryService.ts
- src/components/Product/ProductDetail.tsx
- src/components/Category/CategoryDetail.tsx
- src/store/slices/productSlice.ts
```

---

**Use this template and customize it based on your specific frontend setup!**

