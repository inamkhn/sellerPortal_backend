# Requirements Document

## Introduction

The chat module currently has incorrect access control logic that prevents REFERRAL_MANAGER users from initiating conversations with admins. The system needs to be updated to properly implement the business rule where normal users (USER role) and referral managers (REFERRAL_MANAGER role) can only chat with admin users, while admin users can chat with anyone.

## Requirements

### Requirement 1

**User Story:** As a user with USER role, I want to be able to initiate conversations only with admin users, so that I can get support and assistance from administrators.

#### Acceptance Criteria

1. WHEN a USER attempts to create a conversation without specifying a target user THEN the system SHALL automatically find and assign an available admin user
2. WHEN a USER attempts to create a conversation with a specific target user THEN the system SHALL verify the target user has ADMIN role
3. IF the target user is not an admin THEN the system SHALL reject the request with a forbidden error
4. WHEN a USER successfully creates a conversation with an admin THEN the system SHALL return the conversation details

### Requirement 2

**User Story:** As a referral manager, I want to be able to initiate conversations only with admin users, so that I can communicate about referral-related matters and get administrative support.

#### Acceptance Criteria

1. WHEN a REFERRAL_MANAGER attempts to create a conversation without specifying a target user THEN the system SHALL automatically find and assign an available admin user
2. WHEN a REFERRAL_MANAGER attempts to create a conversation with a specific target user THEN the system SHALL verify the target user has ADMIN role
3. IF the target user is not an admin THEN the system SHALL reject the request with a forbidden error
4. WHEN a REFERRAL_MANAGER successfully creates a conversation with an admin THEN the system SHALL return the conversation details

### Requirement 3

**User Story:** As an admin user, I want to be able to initiate conversations with any user in the system, so that I can provide support and communicate with all users regardless of their role.

#### Acceptance Criteria

1. WHEN an ADMIN attempts to create a conversation THEN the system SHALL require a target user ID to be specified
2. WHEN an ADMIN provides a valid target user ID THEN the system SHALL create or retrieve the conversation regardless of the target user's role
3. IF the target user ID is invalid or user doesn't exist THEN the system SHALL return a not found error
4. WHEN an ADMIN successfully creates a conversation THEN the system SHALL return the conversation details

### Requirement 4

**User Story:** As a system administrator, I want to ensure that users with unauthorized roles cannot access the chat system, so that the chat functionality remains secure and controlled.

#### Acceptance Criteria

1. WHEN a user with any role other than USER, REFERRAL_MANAGER, or ADMIN attempts to use chat functionality THEN the system SHALL reject the request with a forbidden error
2. WHEN checking user permissions for chat access THEN the system SHALL validate the user's role against the allowed roles list
3. IF a user's role is not in the allowed roles list THEN the system SHALL prevent access to all chat endpoints and WebSocket events

### Requirement 5

**User Story:** As a user participating in a conversation, I want to ensure that only authorized participants can access conversation messages and details, so that my communications remain private and secure.

#### Acceptance Criteria

1. WHEN a user attempts to access a conversation THEN the system SHALL verify the user is a participant in that conversation
2. WHEN a user attempts to send a message to a conversation THEN the system SHALL verify the user has access to that conversation
3. WHEN a user attempts to view conversation messages THEN the system SHALL verify the user is authorized to access that conversation
4. IF a user is not a participant in a conversation THEN the system SHALL reject all access attempts with a forbidden error