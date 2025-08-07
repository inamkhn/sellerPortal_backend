# Requirements Document

## Introduction

This feature enhances the existing product management system to support comprehensive image handling for product updates and deletions. The system should allow users to upload new images when updating products, manage existing images (replace or append), and automatically clean up images when products are deleted.

## Requirements

### Requirement 1

**User Story:** As a product owner, I want to upload new images when updating my product, so that I can keep my product listing current with fresh photos.

#### Acceptance Criteria

1. WHEN a user updates a product with new image files THEN the system SHALL upload the new images to Cloudinary
2. WHEN new images are uploaded THEN the system SHALL validate file types (JPEG, PNG, WebP only)
3. WHEN new images are uploaded THEN the system SHALL validate file sizes (maximum 5MB per image)
4. WHEN more than 10 images are uploaded THEN the system SHALL reject the request with an appropriate error message
5. WHEN image upload fails THEN the system SHALL return a clear error message without updating the product

### Requirement 2

**User Story:** As a product owner, I want to choose whether new images replace existing ones or are added to them, so that I have control over my product's image gallery.

#### Acceptance Criteria

1. WHEN a user sets replacePhotos to true THEN the system SHALL delete all existing images from Cloudinary before adding new ones
2. WHEN a user sets replacePhotos to false or omits it THEN the system SHALL append new images to existing ones
3. WHEN appending images would exceed 10 total images THEN the system SHALL limit the total to 10 images
4. WHEN replacing images THEN the system SHALL handle Cloudinary deletion errors gracefully without failing the update

### Requirement 3

**User Story:** As a product owner, I want my product's images to be automatically deleted when I delete the product, so that I don't have orphaned images consuming storage.

#### Acceptance Criteria

1. WHEN a product is deleted THEN the system SHALL identify all associated image URLs
2. WHEN deleting a product THEN the system SHALL extract Cloudinary public IDs from image URLs
3. WHEN deleting a product THEN the system SHALL delete all associated images from Cloudinary
4. WHEN image deletion fails THEN the system SHALL log the error but continue with product deletion
5. WHEN a product has no images THEN the system SHALL delete the product without attempting image cleanup

### Requirement 4

**User Story:** As a system administrator, I want proper error handling for image operations, so that image failures don't break core product functionality.

#### Acceptance Criteria

1. WHEN Cloudinary operations fail THEN the system SHALL log detailed error information
2. WHEN image deletion fails during product updates THEN the system SHALL continue with the product update
3. WHEN image deletion fails during product deletion THEN the system SHALL continue with the product deletion
4. WHEN image upload fails THEN the system SHALL return appropriate HTTP error codes and messages
5. WHEN extracting public IDs from malformed URLs THEN the system SHALL handle the error gracefully

### Requirement 5

**User Story:** As a developer, I want type-safe image URL processing, so that the system is reliable and maintainable.

#### Acceptance Criteria

1. WHEN extracting public IDs from Cloudinary URLs THEN the system SHALL return a string type
2. WHEN processing image URLs THEN the system SHALL handle empty or invalid URLs safely
3. WHEN calling image deletion methods THEN the system SHALL use properly typed parameters
4. WHEN filtering public IDs THEN the system SHALL remove empty or invalid IDs
5. WHEN handling image operations THEN the system SHALL maintain TypeScript type safety