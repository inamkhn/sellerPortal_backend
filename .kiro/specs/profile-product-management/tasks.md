# Implementation Plan

- [x] 1. Extend ProfileService with product management methods


  - Create `addProductToProfile(userId: number, productId: number)` method
  - Create `removeProductFromProfile(userId: number, productId: number)` method
  - Create `getListedProducts(userId: number)` method to return full product details
  - Create `getListedProductsByAdmin(targetUserId: number)` method for admin access
  - Implement validation for product ownership, existence, and duplicate checking
  - Add proper error handling with appropriate exceptions
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 3.1, 3.2, 3.3, 3.4_



- [ ] 2. Create ProfileController endpoints for product management
  - Add POST endpoint to add product to profile listedProducts
  - Add DELETE endpoint to remove product from profile listedProducts  
  - Add GET endpoint to retrieve user's listed products with full details
  - Add admin GET endpoint to view any user's listed products


  - Include comprehensive Swagger documentation for all endpoints
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 3.1, 3.2, 3.3, 5.1, 5.2, 5.3_

- [ ] 3. Implement automatic profile synchronization in ProductsService
  - Modify product creation method to automatically add product to user's profile
  - Modify product deletion method to automatically remove product from user's profile
  - Add error handling to ensure primary operations don't fail if sync fails
  - _Requirements: 4.1, 4.2, 4.3_

- [ ] 4. Add comprehensive error handling and validation
  - Implement proper HTTP status codes for all error scenarios
  - Add input validation for product IDs and user permissions
  - Create consistent error response format matching existing API patterns
  - _Requirements: 1.2, 1.3, 1.4, 2.2, 5.2_

- [ ] 5. Write unit tests for ProfileService product management methods
  - Test adding products to profile with various scenarios (success, duplicate, not found, forbidden)
  - Test removing products from profile with various scenarios (success, not in list, not found)
  - Test retrieving listed products with full details and cleanup of orphaned references
  - Test admin access to any user's listed products
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 3.1, 3.2, 3.3, 3.4, 5.1, 5.2, 5.3_

- [ ] 6. Write unit tests for ProfileController product endpoints
  - Test all new endpoints with proper authentication and authorization
  - Test error handling and HTTP status codes
  - Test Swagger documentation and API responses
  - Test admin-only endpoints with role-based access control
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 3.1, 3.2, 3.3, 5.1, 5.2, 5.3_

- [x] 7. Write integration tests for automatic synchronization



  - Test that creating products automatically adds them to profile
  - Test that deleting products automatically removes them from profile
  - Test that sync failures don't break primary product operations
  - _Requirements: 4.1, 4.2, 4.3_

- [ ] 8. Update ProfileModule to export ProfileService for ProductsModule integration
  - Ensure ProfileService is properly exported for use in ProductsModule
  - Update ProductsModule to import ProfileModule for synchronization features
  - Verify dependency injection works correctly between modules
  - _Requirements: 4.1, 4.2, 4.3_