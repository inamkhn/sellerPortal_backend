# Design Document

## Overview

This feature extends the existing Profile module to provide comprehensive management of the `listedProducts` field, creating a bridge between user profiles and their product listings. The design integrates with the existing NestJS architecture and leverages the current Profile and Products modules.

## Architecture

### Module Integration
- **Profile Module**: Extended with new endpoints for product management
- **Products Module**: Enhanced with automatic profile synchronization
- **Database Layer**: Utilizes existing Prisma service for data operations

### API Design Pattern
Following RESTful conventions with nested resource patterns:
- `POST /api/v1/profile/products/:productId` - Add product to profile
- `DELETE /api/v1/profile/products/:productId` - Remove product from profile  
- `GET /api/v1/profile/products` - Get all listed products
- `GET /api/v1/profile/:userId/products` - Admin endpoint to view user's products

## Components and Interfaces

### ProfileService Extensions

```typescript
interface ProfileProductOperations {
  addProductToProfile(userId: number, productId: number): Promise<Profile>;
  removeProductFromProfile(userId: number, productId: number): Promise<Profile>;
  getListedProducts(userId: number): Promise<ProductWithOwner[]>;
  getListedProductsByAdmin(targetUserId: number): Promise<ProductWithOwner[]>;
  syncProductToProfile(userId: number, productId: number): Promise<void>;
  unsyncProductFromProfile(userId: number, productId: number): Promise<void>;
}
```

### ProfileController Extensions

New endpoints will be added to the existing ProfileController:
- Product management endpoints with proper authentication and authorization
- Input validation using DTOs
- Comprehensive Swagger documentation
- Error handling with appropriate HTTP status codes

### DTOs

```typescript
// No additional DTOs needed - using existing productId as path parameter
// Responses will use existing Profile and ProductWithOwner interfaces
```

### Service Integration

The design will integrate with existing services:
- **ProfileService**: Core profile operations and product list management
- **ProductsService**: Product validation and retrieval
- **PrismaService**: Database operations

## Data Models

### Existing Schema Usage
The design leverages the existing Prisma schema:

```prisma
model Profile {
  // ... existing fields
  listedProducts String[] @default([]) @map("listed_products")
  // ... rest of model
}

model Product {
  // ... existing fields - no changes needed
}
```

### Data Flow
1. **Add Product**: Validate product ownership → Check for duplicates → Update profile array
2. **Remove Product**: Validate product exists in list → Remove from array → Update profile
3. **Get Products**: Retrieve product IDs from profile → Fetch full product details → Return enriched data
4. **Auto-sync**: Hook into product creation/deletion → Update profile automatically

## Error Handling

### Validation Errors
- **Product Not Found**: 404 when product doesn't exist
- **Forbidden Access**: 403 when user doesn't own the product
- **Duplicate Product**: 409 when product already in list
- **Product Not in List**: 404 when trying to remove non-existent product

### Error Response Format
Following existing API error patterns:
```typescript
{
  statusCode: number;
  message: string | string[];
  error: string;
}
```

### Graceful Degradation
- Auto-sync failures won't block primary operations
- Missing products in listed array will be filtered out
- Database transaction rollbacks for consistency

## Testing Strategy

### Unit Tests
- **ProfileService**: Test all new methods with various scenarios
- **ProfileController**: Test endpoint behavior and error handling
- **Integration**: Test service interactions and data consistency

### Test Scenarios
1. **Happy Path**: Successfully add/remove products
2. **Authorization**: Verify ownership checks
3. **Validation**: Test all error conditions
4. **Auto-sync**: Verify automatic profile updates
5. **Edge Cases**: Handle orphaned references and cleanup

### Test Data
- Mock users with different roles (USER, ADMIN)
- Sample products with various ownership scenarios
- Profile data with existing listed products

## Security Considerations

### Authentication & Authorization
- JWT authentication required for all endpoints
- User can only manage their own profile products
- Admin can view any user's listed products
- Product ownership validation before adding to profile

### Input Validation
- Product ID validation (numeric, positive)
- User ID validation for admin endpoints
- Rate limiting on profile modification endpoints

### Data Integrity
- Transactional operations to prevent inconsistent states
- Cleanup of orphaned product references
- Validation of product existence before operations

## Performance Considerations

### Database Optimization
- Indexed queries on profile.userId and product.id
- Batch operations for multiple product updates
- Efficient array operations for listedProducts field

### Caching Strategy
- Profile data caching for frequently accessed information
- Product details caching for listed products
- Cache invalidation on profile updates

### Scalability
- Pagination for large product lists
- Async operations for auto-sync functionality
- Optimized queries to minimize database load