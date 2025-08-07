# Products API Documentation

This document describes the Products API endpoints for managing product listings in the Furniture Marketplace application.

## Overview

The Products API allows authenticated users to create, read, update, and delete product listings. Users can only modify their own products, while admins have additional privileges.

## Authentication

All product endpoints require JWT authentication. Include the access token in the Authorization header:

```
Authorization: Bearer <your-access-token>
```

## Endpoints

### 1. Create Product with Image Upload

**POST** `/api/v1/products`

Creates a new product listing for the authenticated user with automatic image upload to Cloudinary.

**Content-Type**: `multipart/form-data`

#### Form Data Fields

```
title: "Comfortable Leather Sofa"
description: "A beautiful and comfortable leather sofa perfect for your living room"
price: 25000.50
category: "SOFAS"
condition: "LIKE_NEW"
brand: "IKEA"
colors: ["Brown", "Black", "White"] (as JSON string or separate fields)
location: "Karachi, Pakistan"
material: "Leather"
productTags: ["furniture", "living-room", "comfortable"] (as JSON string or separate fields)
quantity: 1
sku: "SOFA-001"
photos: [File1, File2, File3] // Up to 10 image files (5MB each)
```

#### Example with cURL

```bash
curl -X POST http://localhost:3001/api/v1/products \
  -H "Authorization: Bearer your-access-token" \
  -F "title=Comfortable Leather Sofa" \
  -F "description=A beautiful sofa" \
  -F "price=25000.50" \
  -F "category=SOFAS" \
  -F "condition=LIKE_NEW" \
  -F "brand=IKEA" \
  -F "location=Karachi, Pakistan" \
  -F "photos=@/path/to/image1.jpg" \
  -F "photos=@/path/to/image2.jpg"
```

#### Field Validations

- **title** (required): 3-200 characters
- **description** (optional): Max 2000 characters
- **price** (required): Positive decimal with up to 2 decimal places
- **category** (required): BEDS, CHAIRS, TABLES, SOFAS, WARDROBES, DINING_SETS, OFFICE_FURNITURE, DECORATIVE_ITEMS, LIGHTING, STORAGE, DRESSER, OTHER
- **condition** (required): NEW, LIKE_NEW, GOOD, FAIR, SECOND_HAND
- **photos** (optional): Array of photo URL strings
- **brand** (optional): Max 100 characters
- **colors** (optional): Array of color strings
- **location** (optional): Max 200 characters
- **material** (optional): Max 100 characters
- **productTags** (optional): Array of tag strings
- **quantity** (optional): Integer 1-1000, default 1
- **sku** (optional): Max 50 characters, must be unique

#### Response (201 Created)

```json
{
  "id": 1,
  "ownerId": 1,
  "title": "Comfortable Leather Sofa",
  "description": "A beautiful and comfortable leather sofa perfect for your living room",
  "price": 25000.50,
  "category": "SOFAS",
  "condition": "LIKE_NEW",
  "photos": ["https://example.com/photo1.jpg", "https://example.com/photo2.jpg"],
  "brand": "IKEA",
  "colors": ["Brown", "Black", "White"],
  "location": "Karachi, Pakistan",
  "material": "Leather",
  "productTags": ["furniture", "living-room", "comfortable"],
  "quantity": 1,
  "sku": "SOFA-001",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "owner": {
    "id": 1,
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe"
  }
}
```

### 2. Get All Products

**GET** `/api/v1/products`

Retrieves a paginated list of all products with filtering and search capabilities.

#### Query Parameters

- **page** (optional): Page number, default 1
- **limit** (optional): Items per page (1-100), default 10
- **search** (optional): Search in title and description
- **category** (optional): Filter by category
- **condition** (optional): Filter by condition
- **minPrice** (optional): Minimum price filter
- **maxPrice** (optional): Maximum price filter
- **location** (optional): Filter by location
- **brand** (optional): Filter by brand
- **sortBy** (optional): Sort field (price, createdAt, title), default createdAt
- **sortOrder** (optional): Sort order (asc, desc), default desc

#### Example Request

```
GET /api/v1/products?page=1&limit=10&category=SOFAS&minPrice=1000&maxPrice=50000&search=leather&sortBy=price&sortOrder=asc
```

#### Response (200 OK)

```json
{
  "products": [
    {
      "id": 1,
      "ownerId": 1,
      "title": "Comfortable Leather Sofa",
      "description": "A beautiful and comfortable leather sofa",
      "price": 25000.50,
      "category": "SOFAS",
      "condition": "LIKE_NEW",
      "photos": ["https://example.com/photo1.jpg"],
      "brand": "IKEA",
      "colors": ["Brown"],
      "location": "Karachi, Pakistan",
      "material": "Leather",
      "productTags": ["furniture"],
      "quantity": 1,
      "sku": "SOFA-001",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "owner": {
        "id": 1,
        "email": "user@example.com",
        "firstName": "John",
        "lastName": "Doe"
      }
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 10,
  "totalPages": 1
}
```

### 3. Get My Products

**GET** `/api/v1/products/my-products`

Retrieves all products owned by the authenticated user.

#### Query Parameters

Same as "Get All Products" but filtered to user's products only.

#### Response (200 OK)

Same format as "Get All Products" but only includes user's products.

### 4. Get Product by ID

**GET** `/api/v1/products/{id}`

Retrieves a specific product by its ID.

#### Response (200 OK)

```json
{
  "id": 1,
  "ownerId": 1,
  "title": "Comfortable Leather Sofa",
  "description": "A beautiful and comfortable leather sofa",
  "price": 25000.50,
  "category": "SOFAS",
  "condition": "LIKE_NEW",
  "photos": ["https://example.com/photo1.jpg"],
  "brand": "IKEA",
  "colors": ["Brown"],
  "location": "Karachi, Pakistan",
  "material": "Leather",
  "productTags": ["furniture"],
  "quantity": 1,
  "sku": "SOFA-001",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "owner": {
    "id": 1,
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe"
  }
}
```

### 5. Update Product

**PUT** `/api/v1/products/{id}`

Updates a product. Only the product owner can update their products.

#### Request Body

Same as Create Product, but all fields are optional.

#### Response (200 OK)

Same format as Create Product with updated values.

### 6. Delete Product

**DELETE** `/api/v1/products/{id}`

Deletes a product. Only the product owner or admin can delete products.

#### Response (204 No Content)

No response body.

### 7. Get Product Statistics (Admin Only)

**GET** `/api/v1/products/stats`

Retrieves comprehensive product statistics. Only accessible to admin users.

#### Response (200 OK)

```json
{
  "totalProducts": 150,
  "productsByCategory": {
    "SOFAS": 45,
    "BEDS": 30,
    "CHAIRS": 25,
    "TABLES": 20,
    "WARDROBES": 15,
    "OTHER": 15
  },
  "productsByCondition": {
    "NEW": 60,
    "LIKE_NEW": 40,
    "GOOD": 30,
    "FAIR": 15,
    "SECOND_HAND": 5
  },
  "averagePrice": 15750.25
}
```

## Product Categories

- `BEDS` - Beds and bedroom furniture
- `CHAIRS` - All types of chairs
- `TABLES` - Dining tables, coffee tables, etc.
- `SOFAS` - Sofas and couches
- `WARDROBES` - Wardrobes and closets
- `DINING_SETS` - Complete dining room sets
- `OFFICE_FURNITURE` - Office desks, chairs, etc.
- `DECORATIVE_ITEMS` - Decorative furniture pieces
- `LIGHTING` - Lamps and lighting fixtures
- `STORAGE` - Storage furniture
- `DRESSER` - Dressers and vanities
- `OTHER` - Other furniture items

## Product Conditions

- `NEW` - Brand new, unused
- `LIKE_NEW` - Excellent condition, barely used
- `GOOD` - Good condition with minor wear
- `FAIR` - Fair condition with visible wear
- `SECOND_HAND` - Used condition

## Error Responses

All endpoints return consistent error responses:

```json
{
  "statusCode": 400,
  "message": ["Error message 1", "Error message 2"],
  "error": "Bad Request"
}
```

Common HTTP status codes:
- `200` - Success
- `201` - Created
- `204` - No Content
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict

## Usage Examples

### Creating a Product with cURL

```bash
curl -X POST http://localhost:3001/api/v1/products \
  -H "Authorization: Bearer your-access-token" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Comfortable Leather Sofa",
    "description": "A beautiful sofa",
    "price": 25000.50,
    "category": "SOFAS",
    "condition": "LIKE_NEW",
    "brand": "IKEA",
    "location": "Karachi, Pakistan"
  }'
```

### Searching Products with JavaScript

```javascript
const response = await fetch('http://localhost:3001/api/v1/products?search=sofa&category=SOFAS&minPrice=1000&maxPrice=50000', {
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  }
});

const data = await response.json();
console.log(data.products);
```

### Getting User's Products

```javascript
const response = await fetch('http://localhost:3001/api/v1/products/my-products', {
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  }
});

const myProducts = await response.json();
```

## Integration with Other APIs

The Products API integrates with:

- **Auth API**: Requires authentication tokens
- **Users API**: Links products to user accounts
- **Profile API**: Product owners must have profiles
- **Orders API**: Products can be ordered
- **Payments API**: Products are part of payment transactions

## Best Practices

1. **Image URLs**: Store product images on a CDN and reference URLs
2. **Search Optimization**: Use relevant product tags for better searchability
3. **Pricing**: Always use decimal format for accurate pricing
4. **SKU Management**: Use unique SKUs for inventory tracking
5. **Categories**: Choose appropriate categories for better discoverability
6. **Descriptions**: Write detailed descriptions for better user experience