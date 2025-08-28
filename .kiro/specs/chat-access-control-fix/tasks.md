# Implementation Plan

- [x] 1. Update role validation logic in ChatService



  - Modify the `findOrCreateConversation` method to include REFERRAL_MANAGER role in the allowed roles check
  - Update the business rule comment to reflect that both users and referral managers can chat with admins
  - Replace the hardcoded `Role.USER` check with a more flexible approach that includes both USER and REFERRAL_MANAGER roles


  - _Requirements: 1.1, 1.2, 2.1, 2.2, 4.1, 4.2_

- [ ] 2. Enhance error handling and messages
  - Update error messages to be more inclusive of both USER and REFERRAL_MANAGER roles
  - Change "Sellers can only chat with admins" to "Users and referral managers can only chat with admins"



  - Update "Only sellers and admins can use chat" to "Only users, referral managers, and admins can use chat"
  - Ensure consistent error messaging across all validation points
  - _Requirements: 2.3, 4.1, 4.3_



- [ ] 3. Create role validation helper methods
  - Add a private helper method `isRestrictedRole(role: Role): boolean` to check if role is USER or REFERRAL_MANAGER
  - Add a private helper method `canInitiateConversation(userRole: Role, targetRole?: Role): boolean` for comprehensive role validation
  - Refactor existing role checks to use these helper methods for better maintainability
  - _Requirements: 4.1, 4.2_



- [ ] 4. Update unit tests for ChatService
  - Add test cases for REFERRAL_MANAGER role in conversation creation scenarios
  - Update existing test descriptions and assertions to include referral manager role
  - Add test case for REFERRAL_MANAGER attempting to chat with non-admin user (should fail)


  - Add test case for REFERRAL_MANAGER auto-assignment to admin when no target specified
  - Verify all existing USER role tests still pass with the updated logic
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3_

- [x] 5. Add integration tests for role-based access control



  - Create test cases that verify end-to-end conversation creation for REFERRAL_MANAGER role
  - Test WebSocket connection and message sending permissions for REFERRAL_MANAGER users
  - Verify that unauthorized roles are properly rejected at all entry points
  - Test conversation access validation for all role combinations
  - _Requirements: 3.1, 3.2, 4.1, 5.1, 5.2, 5.3, 5.4_

- [ ] 6. Verify and update ChatController role guards
  - Review existing role-based guards to ensure they properly handle REFERRAL_MANAGER role
  - Verify that JWT authentication correctly identifies REFERRAL_MANAGER users
  - Test all chat endpoints with REFERRAL_MANAGER role to ensure proper access
  - Ensure admin-only endpoints still restrict access appropriately
  - _Requirements: 3.1, 3.2, 4.1_

- [ ] 7. Update ChatGateway WebSocket authentication
  - Verify that WebSocket JWT guard properly handles REFERRAL_MANAGER role
  - Test WebSocket connection, conversation joining, and message sending for REFERRAL_MANAGER users
  - Ensure typing indicators and read receipts work correctly for REFERRAL_MANAGER users
  - Verify that conversation access validation in WebSocket events includes REFERRAL_MANAGER role
  - _Requirements: 5.1, 5.2, 5.3_