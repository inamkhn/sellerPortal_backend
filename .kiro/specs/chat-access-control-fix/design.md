# Design Document

## Overview

This design addresses the chat access control issues in the existing chat module by updating the role-based permission logic to properly handle USER, REFERRAL_MANAGER, and ADMIN roles. The solution focuses on modifying the existing `ChatService.findOrCreateConversation` method and related permission checks to implement the correct business rules.

## Architecture

The chat access control system follows a role-based approach with three distinct permission levels:

1. **Restricted Users** (USER, REFERRAL_MANAGER): Can only initiate conversations with ADMIN users
2. **Privileged Users** (ADMIN): Can initiate conversations with any user
3. **Unauthorized Users** (any other role): Cannot access chat functionality

The architecture maintains the existing conversation model where conversations are bidirectional between two users, with proper access validation at every interaction point.

## Components and Interfaces

### Modified Components

#### ChatService.findOrCreateConversation()
- **Current Issue**: Only handles USER role, ignores REFERRAL_MANAGER
- **Solution**: Update role checking logic to include both USER and REFERRAL_MANAGER roles
- **Input**: `userId: number, targetUserId?: number`
- **Output**: `Conversation` object with participant details
- **Validation**: Role-based access control with proper error handling

#### Role Permission Matrix
```typescript
interface ChatPermissions {
  USER: {
    canInitiateWith: [Role.ADMIN];
    requiresTargetUser: false;
  };
  REFERRAL_MANAGER: {
    canInitiateWith: [Role.ADMIN];
    requiresTargetUser: false;
  };
  ADMIN: {
    canInitiateWith: [Role.USER, Role.REFERRAL_MANAGER, Role.ADMIN];
    requiresTargetUser: true;
  };
}
```

### Unchanged Components

#### ChatController
- No changes required - existing endpoints handle role validation correctly
- JWT authentication and role guards remain unchanged

#### ChatGateway
- WebSocket authentication and authorization logic remains unchanged
- Existing conversation access validation is sufficient

#### Database Schema
- No schema changes required
- Existing Conversation and Message models support the required functionality

## Data Models

### Existing Models (No Changes)

#### User Model
```typescript
interface User {
  id: number;
  role: Role; // USER | REFERRAL_MANAGER | ADMIN
  // ... other fields
}
```

#### Conversation Model
```typescript
interface Conversation {
  id: number;
  user1Id: number; // Always the non-admin user when possible
  user2Id: number; // Admin user when applicable
  isActive: boolean;
  // ... other fields
}
```

## Error Handling

### Updated Error Scenarios

1. **Unauthorized Role Access**
   - **Trigger**: User with role other than USER, REFERRAL_MANAGER, or ADMIN attempts chat access
   - **Response**: `ForbiddenException` with message "Only users, referral managers, and admins can use chat"

2. **Invalid Target User for Restricted Roles**
   - **Trigger**: USER or REFERRAL_MANAGER attempts to chat with non-admin user
   - **Response**: `ForbiddenException` with message "Users and referral managers can only chat with admins"

3. **Missing Target User for Admin**
   - **Trigger**: ADMIN attempts to create conversation without specifying target user
   - **Response**: `BadRequestException` with message "Target user ID is required for admin users"

4. **No Available Admin**
   - **Trigger**: USER or REFERRAL_MANAGER attempts to create conversation but no admin exists
   - **Response**: `NotFoundException` with message "No admin available"

### Error Response Format
```typescript
interface ErrorResponse {
  success: false;
  message: string;
  error: string;
  statusCode: number;
}
```

## Testing Strategy

### Unit Tests

#### ChatService Tests
1. **Role Permission Tests**
   - Test USER can create conversation with admin
   - Test REFERRAL_MANAGER can create conversation with admin
   - Test ADMIN can create conversation with any role
   - Test unauthorized roles are rejected

2. **Target User Validation Tests**
   - Test USER/REFERRAL_MANAGER cannot target non-admin users
   - Test ADMIN requires target user ID
   - Test invalid target user IDs are handled

3. **Auto-Assignment Tests**
   - Test automatic admin assignment for USER/REFERRAL_MANAGER
   - Test behavior when no admin is available

#### Integration Tests
1. **End-to-End Conversation Creation**
   - Test complete conversation creation flow for each role
   - Test conversation access validation
   - Test message sending permissions

2. **WebSocket Integration**
   - Test WebSocket connection with different roles
   - Test conversation joining permissions
   - Test message broadcasting to authorized participants

### Test Data Setup
```typescript
const testUsers = {
  user: { id: 1, role: Role.USER },
  referralManager: { id: 2, role: Role.REFERRAL_MANAGER },
  admin: { id: 3, role: Role.ADMIN },
  unauthorized: { id: 4, role: 'INVALID_ROLE' }
};
```

### Expected Test Coverage
- **Unit Tests**: 95% coverage for ChatService methods
- **Integration Tests**: All role combinations and error scenarios
- **E2E Tests**: Complete user workflows for each role type

## Implementation Approach

### Phase 1: Core Logic Update
1. Update `findOrCreateConversation` method role checking logic
2. Add REFERRAL_MANAGER to allowed roles list
3. Update error messages for clarity

### Phase 2: Validation Enhancement
1. Add comprehensive role validation helper methods
2. Update existing permission checks to use new validation
3. Ensure consistent error handling across all methods

### Phase 3: Testing
1. Update existing unit tests to cover REFERRAL_MANAGER role
2. Add new test cases for edge scenarios
3. Verify integration tests pass with updated logic

### Backward Compatibility
- All existing API endpoints remain unchanged
- Existing conversations continue to work normally
- No database migrations required
- WebSocket events maintain same structure