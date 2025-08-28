# Requirements Document

## Introduction

The chat module will enable real-time communication between users and administrators in the furniture marketplace platform. This feature will facilitate customer support, order discussions, and general inquiries. The system will support one-on-one conversations between non-admin users (USER or REFERRAL_MANAGER roles) and administrators, with message history, read receipts, and file attachments.

## Requirements

### Requirement 1

**User Story:** As a user, I want to initiate a conversation with an administrator, so that I can get support for my orders or general inquiries.

#### Acceptance Criteria

1. WHEN a user clicks on "Contact Support" THEN the system SHALL create or retrieve an existing conversation with an available administrator
2. WHEN a conversation is created THEN the system SHALL assign user1Id as the non-admin user and user2Id as the admin user
3. IF no conversation exists between the user and admin THEN the system SHALL create a new conversation record
4. WHEN a conversation is created THEN the system SHALL set isActive to true by default

### Requirement 2

**User Story:** As a user, I want to send text messages in a conversation, so that I can communicate my questions or concerns.

#### Acceptance Criteria

1. WHEN a user sends a text message THEN the system SHALL store the message with messageType as TEXT
2. WHEN a message is sent THEN the system SHALL record the senderId, conversationId, and content
3. WHEN a message is created THEN the system SHALL set isRead to false and createdAt to current timestamp
4. WHEN a message is sent THEN the system SHALL update the conversation's updatedAt timestamp

### Requirement 3

**User Story:** As a user, I want to send image attachments in conversations, so that I can share product photos or screenshots for better communication.

#### Acceptance Criteria

1. WHEN a user uploads an image THEN the system SHALL validate the file type (jpg, jpeg, png, gif)
2. WHEN an image is uploaded THEN the system SHALL store it securely and return a URL
3. WHEN an image message is sent THEN the system SHALL set messageType to IMAGE and store the URL in attachmentUrl
4. WHEN an image is uploaded THEN the system SHALL limit file size to 5MB maximum

### Requirement 4

**User Story:** As a user, I want to view my conversation history, so that I can reference previous discussions.

#### Acceptance Criteria

1. WHEN a user requests conversation history THEN the system SHALL return messages ordered by createdAt ascending
2. WHEN retrieving messages THEN the system SHALL include sender information and message metadata
3. WHEN displaying messages THEN the system SHALL show read status and timestamps
4. WHEN a user accesses a conversation THEN the system SHALL mark unread messages as read

### Requirement 5

**User Story:** As an administrator, I want to view all active conversations, so that I can manage customer support efficiently.

#### Acceptance Criteria

1. WHEN an admin requests conversations THEN the system SHALL return all active conversations
2. WHEN listing conversations THEN the system SHALL include the last message and unread count
3. WHEN displaying conversations THEN the system SHALL show user information and conversation metadata
4. WHEN an admin views conversations THEN the system SHALL order them by most recent activity first

### Requirement 6

**User Story:** As an administrator, I want to respond to user messages, so that I can provide support and assistance.

#### Acceptance Criteria

1. WHEN an admin sends a message THEN the system SHALL store it with the admin as senderId
2. WHEN an admin responds THEN the system SHALL update the conversation's updatedAt timestamp
3. WHEN an admin sends a message THEN the system SHALL support both text and image message types
4. WHEN an admin message is sent THEN the system SHALL set isRead to false for the recipient

### Requirement 7

**User Story:** As a user, I want to receive real-time notifications for new messages, so that I can respond promptly to administrator communications.

#### Acceptance Criteria

1. WHEN a new message is received THEN the system SHALL send a real-time notification to the recipient
2. WHEN a message is sent THEN the system SHALL emit a WebSocket event to connected clients
3. WHEN a user is offline THEN the system SHALL store the message for retrieval when they reconnect
4. WHEN a notification is sent THEN the system SHALL include message content and sender information

### Requirement 8

**User Story:** As a user, I want to mark messages as read, so that I can track which messages I have already seen.

#### Acceptance Criteria

1. WHEN a user views a message THEN the system SHALL mark it as read (isRead = true)
2. WHEN a message is marked as read THEN the system SHALL set the readAt timestamp
3. WHEN marking messages as read THEN the system SHALL only update messages where the user is the recipient
4. WHEN messages are marked as read THEN the system SHALL update the read status in real-time

### Requirement 9

**User Story:** As an administrator, I want to archive or deactivate conversations, so that I can manage the conversation list effectively.

#### Acceptance Criteria

1. WHEN an admin archives a conversation THEN the system SHALL set isActive to false
2. WHEN a conversation is deactivated THEN the system SHALL preserve all message history
3. WHEN listing conversations THEN the system SHALL filter out inactive conversations by default
4. WHEN a conversation is archived THEN the system SHALL prevent new messages from being sent

### Requirement 10

**User Story:** As a system administrator, I want to ensure message data is properly validated and secured, so that the chat system maintains data integrity and security.

#### Acceptance Criteria

1. WHEN a message is created THEN the system SHALL validate that the sender is a participant in the conversation
2. WHEN file attachments are uploaded THEN the system SHALL scan for malicious content
3. WHEN accessing conversations THEN the system SHALL verify user permissions and ownership
4. WHEN storing messages THEN the system SHALL sanitize content to prevent XSS attacks