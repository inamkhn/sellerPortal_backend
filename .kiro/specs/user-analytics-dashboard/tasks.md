# Implementation Plan

- [x] 1. Create DTOs and interfaces for user analytics


  - Create response DTOs for structured analytics data return
  - Define TypeScript interfaces for analytics data structures
  - Implement proper validation decorators for request/response types
  - _Requirements: 5.3, 6.3_



- [ ] 2. Implement UserAnalyticsService with core calculation methods
  - Create service class with dependency injection setup
  - Implement calculateTotalEarnings method using Prisma aggregation
  - Implement countUserProducts method with proper filtering

  - Implement countUserOrders method with join queries
  - _Requirements: 1.1, 1.2, 2.1, 3.1_

- [ ] 3. Implement referral statistics calculation
  - Create calculateReferralStats method in UserAnalyticsService
  - Query referrals table for user's referral count


  - Fetch user's referral code from profile table
  - Handle cases where profile doesn't exist
  - _Requirements: 4.1, 4.2, 4.4_

- [x] 4. Create UserAnalyticsController with authentication


  - Create controller class with proper routing and guards
  - Implement JWT authentication guard integration
  - Create GET endpoint for user analytics retrieval
  - Implement user context extraction from JWT token
  - _Requirements: 5.1, 5.2, 5.4_



- [ ] 5. Implement error handling and response formatting
  - Add proper error handling for database failures
  - Implement structured error response format
  - Handle authentication and authorization errors
  - Add input validation and sanitization


  - _Requirements: 5.4, 5.5_

- [ ] 6. Create comprehensive unit tests for service layer
  - Write tests for calculateTotalEarnings with various payment scenarios
  - Write tests for countUserProducts with different ownership patterns
  - Write tests for countUserOrders with various order statuses


  - Write tests for calculateReferralStats with and without referrals
  - Mock Prisma service calls for isolated testing
  - _Requirements: 1.1, 1.4, 2.1, 2.4, 3.1, 3.4, 4.1, 4.5_

- [ ] 7. Create unit tests for controller layer
  - Write tests for authentication guard integration
  - Write tests for successful analytics retrieval


  - Write tests for unauthorized access scenarios
  - Write tests for error response formatting
  - Mock UserAnalyticsService for controller testing



  - _Requirements: 5.1, 5.2, 5.4, 5.5_

- [ ] 8. Implement integration tests with database
  - Create test database setup with sample data
  - Write integration tests for complete analytics calculation flow
  - Test database query performance with realistic data volumes
  - Verify proper handling of edge cases (no data scenarios)
  - _Requirements: 1.4, 2.4, 3.4, 4.5, 6.1, 6.2_

- [ ] 9. Add analytics module to application structure
  - Create UserAnalyticsModule with proper imports and exports
  - Register service and controller in module
  - Import required dependencies (Prisma, JWT, etc.)
  - Add module to main application module
  - _Requirements: 5.1, 5.2_

- [ ] 10. Optimize database queries and add performance monitoring
  - Review and optimize Prisma queries for analytics calculations
  - Add query performance logging for monitoring
  - Implement proper error handling for database timeouts
  - Verify efficient use of existing database indexes
  - _Requirements: 6.1, 6.2, 6.3_