# Frontend Guide: Displaying Product Variants

## 📋 Overview

Products in your e-commerce store can have **variants** (different storage, RAM, color, etc.). This guide shows you how to fetch and display variants on the frontend.

## 🔗 API Endpoints

### 1. Get Single Product (Recommended for Product Detail Page)

**Endpoint:**
```
GET /api/v1/products/:slug
```

**Example:**
```bash
GET /api/v1/products/iphone-15-pro
```

**Response includes:** Full product details with `variants` array ✅

---

### 2. Get All Products (For Product Listing)

**Endpoint:**
```
GET /api/v1/products
```

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 12)
- `category`: Filter by category slug
- `parent`: Filter by parent category
- `child`: Filter by child category
- `min_price`, `max_price`: Price range
- `in_stock`: Filter by stock availability
- `on_sale`: Filter sale products

**Example:**
```bash
GET /api/v1/products?page=1&limit=12&category=mobiles
```

**Response includes:** Products array, each with `variants` array ✅

---

## 📦 Variant Data Structure

### Variant Object Structure

```typescript
interface Variant {
  _id: string;              // Variant unique ID
  storage?: string;         // e.g., "64GB", "128GB", "256GB", "512GB", "1TB"
  ram?: string;             // e.g., "4GB", "6GB", "8GB", "12GB", "16GB"
  color?: string;           // e.g., "Black", "White", "Blue", "Red"
  bundle?: string;          // e.g., "With Charger", "Box Pack", "Premium Pack"
  warranty?: string;        // e.g., "1 Year", "6 Months", "2 Years"
  price: number;            // Variant-specific price (if different from main price)
  stock: number;            // Available stock for this variant
  sku: string;              // Variant SKU (e.g., "IPHO-128GB-BLK")
  image?: string;           // Variant-specific image URL (optional)
}
```

### Product Response Structure

```typescript
interface Product {
  _id: string;
  productName: string;
  slug: string;
  price: number;            // Base price
  salePrice?: number;       // Sale price (if on sale)
  variants: Variant[];      // Array of variants (empty if no variants)
  product_type: "simple" | "variable";
  quantity: number;          // Total quantity (sum of all variants if variable)
  in_stock: boolean;       // Overall stock status
  // ... other product fields
}
```

---

## 🎯 Frontend Implementation Guide

### Step 1: Fetch Product with Variants

#### Using Fetch API

```typescript
// Fetch single product by slug
const fetchProduct = async (slug: string) => {
  try {
    const response = await fetch(`/api/v1/products/${slug}`);
    const data = await response.json();
    
    if (data.status === 'success') {
      const product = data.data.product;
      
      // Check if product has variants
      const hasVariants = product.variants && product.variants.length > 0;
      
      return {
        product,
        hasVariants,
        variants: product.variants || []
      };
    }
  } catch (error) {
    console.error('Error fetching product:', error);
  }
};
```

#### Using React Query / TanStack Query

```typescript
import { useQuery } from '@tanstack/react-query';

const useProduct = (slug: string) => {
  return useQuery({
    queryKey: ['product', slug],
    queryFn: async () => {
      const response = await fetch(`/api/v1/products/${slug}`);
      const data = await response.json();
      return data.data.product;
    },
  });
};

// Usage in component
const ProductDetail = ({ slug }) => {
  const { data: product, isLoading } = useProduct(slug);
  
  const hasVariants = product?.variants?.length > 0;
  const variants = product?.variants || [];
  
  // ... render component
};
```

---

### Step 2: Display Variants in UI

#### Example: Variant Selection Component (React)

```tsx
import React, { useState } from 'react';

interface VariantSelectorProps {
  variants: Variant[];
  onVariantSelect: (variant: Variant) => void;
  selectedVariant?: Variant;
}

const VariantSelector: React.FC<VariantSelectorProps> = ({
  variants,
  onVariantSelect,
  selectedVariant
}) => {
  // Group variants by attributes
  const groupedVariants = groupVariantsByAttributes(variants);
  
  return (
    <div className="variant-selector">
      {/* Storage Options */}
      {groupedVariants.storage && (
        <div className="variant-group">
          <label>Storage:</label>
          <div className="variant-options">
            {groupedVariants.storage.map((storage) => (
              <button
                key={storage}
                className={`variant-option ${
                  selectedVariant?.storage === storage ? 'active' : ''
                }`}
                onClick={() => selectVariantByStorage(storage)}
              >
                {storage}
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* RAM Options */}
      {groupedVariants.ram && (
        <div className="variant-group">
          <label>RAM:</label>
          <div className="variant-options">
            {groupedVariants.ram.map((ram) => (
              <button
                key={ram}
                className={`variant-option ${
                  selectedVariant?.ram === ram ? 'active' : ''
                }`}
                onClick={() => selectVariantByRAM(ram)}
              >
                {ram}
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* Color Options */}
      {groupedVariants.color && (
        <div className="variant-group">
          <label>Color:</label>
          <div className="variant-options">
            {groupedVariants.color.map((color) => (
              <button
                key={color}
                className={`variant-option color-option ${
                  selectedVariant?.color === color ? 'active' : ''
                }`}
                style={{ backgroundColor: getColorCode(color) }}
                onClick={() => selectVariantByColor(color)}
                title={color}
              >
                {color}
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* Bundle Options */}
      {groupedVariants.bundle && (
        <div className="variant-group">
          <label>Bundle:</label>
          <select
            value={selectedVariant?.bundle || ''}
            onChange={(e) => selectVariantByBundle(e.target.value)}
          >
            <option value="">Select Bundle</option>
            {groupedVariants.bundle.map((bundle) => (
              <option key={bundle} value={bundle}>
                {bundle}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
};

// Helper function to group variants
const groupVariantsByAttributes = (variants: Variant[]) => {
  const grouped: {
    storage?: string[];
    ram?: string[];
    color?: string[];
    bundle?: string[];
    warranty?: string[];
  } = {};
  
  variants.forEach((variant) => {
    if (variant.storage && !grouped.storage?.includes(variant.storage)) {
      grouped.storage = [...(grouped.storage || []), variant.storage];
    }
    if (variant.ram && !grouped.ram?.includes(variant.ram)) {
      grouped.ram = [...(grouped.ram || []), variant.ram];
    }
    if (variant.color && !grouped.color?.includes(variant.color)) {
      grouped.color = [...(grouped.color || []), variant.color];
    }
    if (variant.bundle && !grouped.bundle?.includes(variant.bundle)) {
      grouped.bundle = [...(grouped.bundle || []), variant.bundle];
    }
    if (variant.warranty && !grouped.warranty?.includes(variant.warranty)) {
      grouped.warranty = [...(grouped.warranty || []), variant.warranty];
    }
  });
  
  return grouped;
};
```

---

### Step 3: Variant Selection Logic

```typescript
// State management for variant selection
const [selectedAttributes, setSelectedAttributes] = useState({
  storage: null,
  ram: null,
  color: null,
  bundle: null,
  warranty: null,
});

// Find matching variant based on selected attributes
const findMatchingVariant = (
  variants: Variant[],
  attributes: typeof selectedAttributes
): Variant | null => {
  return variants.find((variant) => {
    return (
      (!attributes.storage || variant.storage === attributes.storage) &&
      (!attributes.ram || variant.ram === attributes.ram) &&
      (!attributes.color || variant.color === attributes.color) &&
      (!attributes.bundle || variant.bundle === attributes.bundle) &&
      (!attributes.warranty || variant.warranty === attributes.warranty)
    );
  }) || null;
};

// Update selected variant when attributes change
useEffect(() => {
  const matchingVariant = findMatchingVariant(variants, selectedAttributes);
  if (matchingVariant) {
    onVariantSelect(matchingVariant);
  }
}, [selectedAttributes, variants]);
```

---

### Step 4: Display Variant Price & Stock

```tsx
const ProductPrice: React.FC<{ product: Product; variant?: Variant }> = ({
  product,
  variant
}) => {
  // Use variant price if selected, otherwise use product base price
  const displayPrice = variant?.price || product.price;
  const salePrice = product.on_sale ? (variant?.salePrice || product.salePrice) : null;
  
  return (
    <div className="product-price">
      {salePrice ? (
        <>
          <span className="original-price">${displayPrice}</span>
          <span className="sale-price">${salePrice}</span>
          <span className="discount">
            {Math.round(((displayPrice - salePrice) / displayPrice) * 100)}% OFF
          </span>
        </>
      ) : (
        <span className="price">${displayPrice}</span>
      )}
    </div>
  );
};

const StockStatus: React.FC<{ variant?: Variant; product: Product }> = ({
  variant,
  product
}) => {
  const stock = variant?.stock ?? product.quantity;
  const inStock = variant ? stock > 0 : product.in_stock;
  
  return (
    <div className={`stock-status ${inStock ? 'in-stock' : 'out-of-stock'}`}>
      {inStock ? (
        <span>In Stock ({stock} available)</span>
      ) : (
        <span>Out of Stock</span>
      )}
    </div>
  );
};
```

---

### Step 5: Complete Product Detail Page Example

```tsx
const ProductDetailPage: React.FC<{ slug: string }> = ({ slug }) => {
  const { data: product, isLoading } = useProduct(slug);
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
  const [selectedAttributes, setSelectedAttributes] = useState({
    storage: null,
    ram: null,
    color: null,
    bundle: null,
  });
  
  const hasVariants = product?.variants?.length > 0;
  
  // Find matching variant
  useEffect(() => {
    if (hasVariants && product.variants) {
      const matching = findMatchingVariant(product.variants, selectedAttributes);
      setSelectedVariant(matching);
    }
  }, [selectedAttributes, product]);
  
  if (isLoading) return <div>Loading...</div>;
  if (!product) return <div>Product not found</div>;
  
  // Use variant image if available, otherwise use product main image
  const displayImage = selectedVariant?.image || product.mainImage;
  const displayPrice = selectedVariant?.price || product.price;
  
  return (
    <div className="product-detail">
      {/* Product Image */}
      <div className="product-image">
        <img src={displayImage} alt={product.productName} />
      </div>
      
      {/* Product Info */}
      <div className="product-info">
        <h1>{product.productName}</h1>
        
        {/* Variant Selector */}
        {hasVariants && (
          <VariantSelector
            variants={product.variants}
            selectedVariant={selectedVariant}
            onVariantSelect={setSelectedVariant}
          />
        )}
        
        {/* Price */}
        <ProductPrice product={product} variant={selectedVariant} />
        
        {/* Stock Status */}
        <StockStatus variant={selectedVariant} product={product} />
        
        {/* Add to Cart Button */}
        <button
          disabled={!selectedVariant && hasVariants}
          onClick={() => addToCart(product, selectedVariant)}
        >
          {hasVariants && !selectedVariant
            ? 'Please select a variant'
            : 'Add to Cart'}
        </button>
      </div>
    </div>
  );
};
```

---

## 🛒 Add to Cart with Variants

```typescript
interface CartItem {
  productId: string;
  variantId?: string;  // Include variant ID if variant is selected
  quantity: number;
  price: number;
  variant?: Variant;   // Store variant details for display
}

const addToCart = (product: Product, variant?: Variant) => {
  const cartItem: CartItem = {
    productId: product._id,
    quantity: 1,
    price: variant?.price || product.price,
  };
  
  if (variant) {
    cartItem.variantId = variant._id;
    cartItem.variant = variant;
  }
  
  // Add to cart API call
  fetch('/api/v1/cart', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cartItem),
  });
};
```

---

## 📱 Product Listing with Variants

### Show Variant Options in Product Card

```tsx
const ProductCard: React.FC<{ product: Product }> = ({ product }) => {
  const hasVariants = product.variants?.length > 0;
  
  // Get unique variant attributes for display
  const variantOptions = hasVariants ? {
    storage: [...new Set(product.variants.map(v => v.storage).filter(Boolean))],
    color: [...new Set(product.variants.map(v => v.color).filter(Boolean))],
  } : null;
  
  return (
    <div className="product-card">
      <img src={product.mainImage} alt={product.productName} />
      <h3>{product.productName}</h3>
      
      {/* Show variant options if available */}
      {variantOptions && (
        <div className="variant-preview">
          {variantOptions.storage.length > 0 && (
            <span>Storage: {variantOptions.storage.join(', ')}</span>
          )}
          {variantOptions.color.length > 0 && (
            <span>Colors: {variantOptions.color.length}</span>
          )}
        </div>
      )}
      
      {/* Price Range (if variants have different prices) */}
      {hasVariants && product.variants.length > 1 ? (
        <div className="price-range">
          ${Math.min(...product.variants.map(v => v.price))} - 
          ${Math.max(...product.variants.map(v => v.price))}
        </div>
      ) : (
        <div className="price">${product.price}</div>
      )}
      
      <Link to={`/products/${product.slug}`}>View Details</Link>
    </div>
  );
};
```

---

## 🎨 CSS Styling Examples

```css
/* Variant Selector */
.variant-selector {
  margin: 20px 0;
}

.variant-group {
  margin-bottom: 15px;
}

.variant-group label {
  display: block;
  font-weight: bold;
  margin-bottom: 8px;
}

.variant-options {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.variant-option {
  padding: 8px 16px;
  border: 2px solid #ddd;
  background: white;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s;
}

.variant-option:hover {
  border-color: #007bff;
}

.variant-option.active {
  border-color: #007bff;
  background: #007bff;
  color: white;
}

.variant-option:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Color Options */
.color-option {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 3px solid transparent;
}

.color-option.active {
  border-color: #333;
  box-shadow: 0 0 0 2px white, 0 0 0 4px #333;
}

/* Stock Status */
.stock-status.in-stock {
  color: green;
}

.stock-status.out-of-stock {
  color: red;
}
```

---

## ✅ Best Practices

1. **Always Check for Variants**: Before displaying variant options, check if `product.variants` exists and has items
   ```typescript
   const hasVariants = product?.variants?.length > 0;
   ```

2. **Handle Missing Variants**: If no variant is selected but product has variants, disable "Add to Cart"
   ```typescript
   disabled={hasVariants && !selectedVariant}
   ```

3. **Show Variant-Specific Images**: Use variant image if available, fallback to product main image
   ```typescript
   const image = selectedVariant?.image || product.mainImage;
   ```

4. **Display Price Correctly**: Use variant price if selected, otherwise use product base price
   ```typescript
   const price = selectedVariant?.price || product.price;
   ```

5. **Check Stock Per Variant**: Show stock status based on selected variant
   ```typescript
   const stock = selectedVariant?.stock ?? product.quantity;
   ```

6. **Group Variants by Attributes**: Make it easier for users to select combinations
   ```typescript
   const grouped = groupVariantsByAttributes(variants);
   ```

---

## 🧪 Testing Checklist

- [ ] Product without variants displays correctly
- [ ] Product with variants shows variant selector
- [ ] Variant selection updates price
- [ ] Variant selection updates image (if variant has image)
- [ ] Variant selection updates stock status
- [ ] "Add to Cart" is disabled when no variant selected (for variable products)
- [ ] Cart includes variant ID when variant is selected
- [ ] Product listing shows variant options preview
- [ ] Price range displays correctly for products with multiple variants

---

## 📝 Summary

**API Endpoints:**
- `GET /api/v1/products/:slug` - Single product with variants ✅
- `GET /api/v1/products` - All products with variants ✅

**Key Points:**
- Variants are included automatically in product responses
- Check `product.variants.length > 0` to determine if product has variants
- Use variant-specific price, image, and stock when variant is selected
- Always validate variant selection before adding to cart

**The variants are already included in the API responses - you just need to display them!** 🚀

