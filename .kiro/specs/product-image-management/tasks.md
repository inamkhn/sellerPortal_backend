# Implementation Plan

- [x] 1. Fix type safety issues in UploadService



  - Update `extractPublicId` method to return `string | null` instead of unsafe type
  - Add proper null checking and filtering for public ID extraction
  - Update method signatures to ensure TypeScript type safety


  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 2. Implement enhanced public ID extraction utilities
  - Create `extractPublicIds` helper method for batch URL processing
  - Add validation for Cloudinary URL format before extraction
  - Implement safe filtering to remove null/undefined values from arrays
  - _Requirements: 4.5, 5.2, 5.4_

- [ ] 3. Update ProductsService photo management logic
  - Modify update method to handle photo replacement vs appending logic
  - Implement safe photo deletion with error recovery
  - Add photo limit enforcement (maximum 10 images)
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [ ] 4. Enhance error handling for image operations
  - Wrap Cloudinary operations in try-catch blocks with specific error handling
  - Implement graceful degradation for non-critical image operations
  - Add comprehensive logging for image operation success/failure
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ] 5. Complete product deletion image cleanup
  - Update remove method to safely extract and delete associated images
  - Implement error recovery for failed image deletions during product removal
  - Ensure product deletion continues even if image cleanup fails
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 6. Add comprehensive unit tests for image operations
  - Test `extractPublicId` with valid and invalid URLs
  - Test photo replacement and appending logic
  - Test error handling and recovery scenarios
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4_

- [ ] 7. Update API documentation and error responses
  - Update Swagger documentation for image upload capabilities
  - Document photo replacement behavior and limits
  - Add comprehensive error response examples
  - _Requirements: 1.4, 1.5, 4.4_