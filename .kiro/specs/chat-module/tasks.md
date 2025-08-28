# Implementation Plan

- [x] 1. Install WebSocket dependencies and configure module structure


  - Install @nestjs/websockets, @nestjs/platform-socket.io, and socket.io packages
  - Create chat module directory structure with controller, service, gateway, and DTOs
  - _Requirements: 1.1, 7.2_



- [ ] 2. Create core DTOs and entities for chat functionality
  - Implement CreateMessageDto with validation for message content and type
  - Create ConversationQueryDto for pagination and filtering parameters


  - Build MessageEntity and ConversationEntity response classes with proper serialization
  - _Requirements: 2.2, 4.2, 10.4_

- [x] 3. Implement WebSocket authentication guard


  - Create WsJwtGuard that extends CanActivate for WebSocket connections
  - Implement JWT token extraction from WebSocket handshake
  - Add token validation logic using existing AuthService
  - _Requirements: 7.1, 10.3_



- [ ] 4. Build Chat Service with conversation management
  - Implement findUserConversations method to retrieve user's conversations with pagination
  - Create findOrCreateConversation method that handles user-admin conversation creation
  - Add getConversationById method with permission validation
  - Implement conversation archiving functionality for admins


  - _Requirements: 1.2, 1.3, 5.1, 9.1, 9.2_

- [ ] 5. Implement message operations in Chat Service
  - Create getConversationMessages method with pagination and ordering
  - Implement createMessage method for text messages with validation
  - Add createImageMessage method for handling image attachments


  - Build markMessagesAsRead functionality with proper permission checks
  - _Requirements: 2.1, 2.3, 3.1, 4.1, 8.1, 8.2_

- [ ] 6. Create Chat Controller with REST API endpoints
  - Implement GET /conversations endpoint with user filtering and pagination


  - Add GET /conversations/:id endpoint with permission validation
  - Create GET /conversations/:id/messages endpoint for message history
  - Implement POST /conversations/:id/messages endpoint for sending messages
  - Add PATCH /conversations/:id/read endpoint for marking messages as read
  - _Requirements: 4.3, 5.2, 6.2, 8.3_


- [ ] 7. Build file upload endpoint for chat attachments
  - Create POST /conversations/:id/upload endpoint using existing upload service
  - Implement file type validation for images (jpg, jpeg, png, gif)
  - Add file size validation (5MB limit) and security checks
  - Integrate with createImageMessage service method

  - _Requirements: 3.1, 3.2, 3.4, 10.2_

- [ ] 8. Implement Chat Gateway for real-time messaging
  - Create ChatGateway class with WebSocket decorators and authentication
  - Implement handleConnection and handleDisconnect methods
  - Add joinConversation and leaveConversation event handlers
  - Create sendMessage event handler with real-time broadcasting
  - _Requirements: 7.1, 7.2, 7.3_

- [ ] 9. Add real-time message broadcasting and notifications
  - Implement message-received event broadcasting to conversation participants
  - Add typing indicators with typing-start and typing-stop events
  - Create message-read event broadcasting for read receipts
  - Ensure proper room management for conversation isolation
  - _Requirements: 7.1, 7.4, 8.4_

- [ ] 10. Create admin-specific endpoints and functionality
  - Implement GET /admin/conversations endpoint for viewing all conversations
  - Add conversation statistics endpoint for admin dashboard
  - Create PATCH /conversations/:id/archive endpoint for conversation archiving
  - Implement proper admin role validation using existing RolesGuard
  - _Requirements: 5.1, 5.3, 9.1, 9.3_

- [ ] 11. Add comprehensive input validation and security measures
  - Implement message content sanitization to prevent XSS attacks
  - Add rate limiting for message sending to prevent spam
  - Create conversation permission validation middleware
  - Implement malicious file scanning for uploaded attachments
  - _Requirements: 10.1, 10.2, 10.3, 10.4_

- [ ] 12. Write unit tests for Chat Service
  - Test conversation creation and retrieval methods
  - Validate message creation with different message types
  - Test permission validation for conversation access
  - Verify read status updates and archiving functionality
  - _Requirements: 1.1, 2.1, 8.1, 9.1_

- [ ] 13. Write unit tests for Chat Controller
  - Test all REST API endpoints with proper authentication
  - Validate request/response DTOs and error handling
  - Test file upload integration and validation


  - Verify admin-only endpoint access controls
  - _Requirements: 4.1, 6.1, 10.3_

- [ ] 14. Write unit tests for Chat Gateway
  - Test WebSocket connection handling and authentication


  - Validate event emission and reception
  - Test room management and message broadcasting
  - Verify proper error handling for WebSocket operations
  - _Requirements: 7.1, 7.2, 8.4_

- [ ] 15. Create integration tests for real-time messaging
  - Test complete message flow from sending to receiving
  - Validate WebSocket connection lifecycle management
  - Test multiple client connections and room isolation
  - Verify message persistence and real-time delivery
  - _Requirements: 7.3, 7.4_

- [ ] 16. Add Chat Module to main application
  - Import ChatModule in AppModule with proper dependencies
  - Configure WebSocket adapter in main.ts for Socket.io
  - Update CORS configuration to support WebSocket connections
  - Add chat endpoints to Swagger documentation
  - _Requirements: 1.1, 7.2_

- [ ] 17. Create database migration for chat system
  - Generate Prisma migration for Conversation and Message models
  - Add proper indexes for performance optimization
  - Verify foreign key constraints and cascade operations
  - Run migration and validate database schema
  - _Requirements: 1.2, 2.1_

- [ ] 18. Write end-to-end tests for complete chat workflows
  - Test user initiating conversation with admin
  - Validate complete message sending and receiving flow
  - Test file attachment upload and sharing
  - Verify admin conversation management workflows
  - _Requirements: 1.1, 2.1, 3.1, 5.1_