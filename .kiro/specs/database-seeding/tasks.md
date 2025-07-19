# Implementation Plan

- [ ] 1. Set up seed script foundation and utilities


  - Create `prisma/seed.ts` file with basic structure and imports
  - Implement utility functions for data generation (referral codes, phone numbers, random prices)
  - Set up Prisma Client connection and error handling
  - _Requirements: 1.5, 3.4_

- [ ] 2. Implement user and profile seeding
  - Create `seedUsers()` function to generate admin and regular users
  - Implement password hashing for email/password users
  - Create `seedProfiles()` function with referral codes and bank account data
  - Write tests for user and profile creation
  - _Requirements: 1.1, 2.1_

- [ ] 3. Implement product catalog seeding
  - Create `seedProducts()` function with furniture categories and conditions
  - Generate realistic product titles, descriptions, and pricing
  - Implement photo URL generation and product tags
  - Add SKU generation and inventory quantities
  - _Requirements: 1.2, 2.2_

- [ ] 4. Implement order request seeding
  - Create `seedOrderRequests()` function with varied order statuses
  - Generate customer contact information and delivery details
  - Implement realistic order date distribution (past, present, future)
  - Link orders to existing users and products
  - _Requirements: 1.3, 2.3_

- [ ] 5. Implement payment and referral seeding
  - Create `seedPayments()` function with payment status distribution
  - Implement referral commission calculations (10% share)
  - Create `seedReferrals()` function for multi-level referral chains
  - Generate payment proof screenshot URLs
  - _Requirements: 1.4, 2.4_

- [ ] 6. Implement database reset and cleanup functionality
  - Add optional data cleanup before seeding
  - Implement transaction management for data consistency
  - Create summary logging for seeded record counts
  - Add error recovery and rollback mechanisms
  - _Requirements: 3.1, 3.2, 3.5_

- [ ] 7. Add comprehensive error handling and validation
  - Implement database connection validation
  - Add enum value validation before insertion
  - Handle unique constraint violations gracefully
  - Create detailed error messages and logging
  - _Requirements: 3.4_

- [ ] 8. Create seed script execution and testing
  - Test complete seeding process end-to-end
  - Verify all foreign key relationships are valid
  - Test idempotency (safe to run multiple times)
  - Validate seeded data meets schema constraints
  - _Requirements: 1.5, 3.3_

- [ ] 9. Fix ThrottlerModule configuration issue
  - Update ThrottlerModule configuration to use correct property names
  - Replace deprecated `ttl` and `limit` with current API
  - Test rate limiting functionality after configuration fix
  - _Requirements: Configuration fix_