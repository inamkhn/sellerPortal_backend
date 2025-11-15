# Notifications API Documentation

## Overview

The Notifications module provides a comprehensive real-time notification system using WebSocket (Socket.IO) for instant delivery and REST API for CRUD operations.

## Features

- ✅ Real-time notifications via WebSocket
- ✅ REST API for notification management
- ✅ User-specific notifications
- ✅ Role-based notifications
- ✅ Bulk notifications
- ✅ Read/Unread status tracking
- ✅ Notification types (ANNOUNCEMENT, ORDER_UPDATE, SETTLEMENT_UPDATE, etc.)
- ✅ Pagination support
- ✅ Admin dashboard with statistics

---

## WebSocket Connection

### Endpoint

```
ws://localhost:4000/notifications
```

### Connection

**Client-side (Frontend):**

```typescript
import { io } from 'socket.io-client';

const socket = io('http://localhost:4000/notifications', {
  auth: {
    token: 'YOUR_JWT_TOKEN',
  },
  transports: ['websocket'],
});

// Connection events
socket.on('connected', (data) => {
  console.log('Connected:', data);
});

// Listen for notifications
socket.on('notification', (notification) => {
  console.log('New notification:', notification);
  // Show toast, update UI, etc.
});

// Listen for unread count updates
socket.on('unreadCount', ({ count }) => {
  console.log('Unread count:', count);
});

// Listen for notification read events
socket.on('notificationRead', ({ notificationId }) => {
  console.log('Notification read:', notificationId);
});

// Listen for all notifications read
socket.on('allNotificationsRead', () => {
  console.log('All notifications marked as read');
});

// Ping/Pong for connection health
socket.emit('ping');
socket.on('pong', (data) => {
  console.log('Pong:', data);
});
```

---

## REST API Endpoints

### Base URL

```
http://localhost:4000/notifications
```

All endpoints require authentication via JWT Bearer token.

---

## User Endpoints

### 1. Get User Notifications

Get paginated notifications for the authenticated user.

**Endpoint:** `GET /notifications`

**Query Parameters:**

- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `type` (optional): Filter by notification type
- `isRead` (optional): Filter by read status (true/false)

**Response:**

```json
{
  "data": [
    {
      "id": 1,
      "userId": 5,
      "type": "ANNOUNCEMENT",
      "title": "New Announcement",
      "message": "Check out our latest updates!",
      "isRead": false,
      "actionUrl": "/announcements/1",
      "referenceId": 1,
      "metadata": { "priority": "HIGH" },
      "createdAt": "2024-01-15T10:00:00Z",
      "readAt": null
    }
  ],
  "total": 50,
  "page": 1,
  "limit": 20,
  "totalPages": 3
}
```

---

### 2. Get Unread Notifications

Get all unread notifications for the authenticated user.

**Endpoint:** `GET /notifications/unread`

**Response:**

```json
[
  {
    "id": 1,
    "userId": 5,
    "type": "ANNOUNCEMENT",
    "title": "New Announcement",
    "message": "Check out our latest updates!",
    "isRead": false,
    "actionUrl": "/announcements/1",
    "referenceId": 1,
    "metadata": { "priority": "HIGH" },
    "createdAt": "2024-01-15T10:00:00Z",
    "readAt": null
  }
]
```

---

### 3. Get Unread Count

Get the count of unread notifications.

**Endpoint:** `GET /notifications/unread/count`

**Response:**

```json
{
  "count": 5
}
```

---

### 4. Get Notification by ID

Get a specific notification.

**Endpoint:** `GET /notifications/:id`

**Response:**

```json
{
  "id": 1,
  "userId": 5,
  "type": "ANNOUNCEMENT",
  "title": "New Announcement",
  "message": "Check out our latest updates!",
  "isRead": false,
  "actionUrl": "/announcements/1",
  "referenceId": 1,
  "metadata": { "priority": "HIGH" },
  "createdAt": "2024-01-15T10:00:00Z",
  "readAt": null
}
```

---

### 5. Mark Notification as Read

Mark a specific notification as read.

**Endpoint:** `PATCH /notifications/:id/read`

**Response:**

```json
{
  "id": 1,
  "userId": 5,
  "type": "ANNOUNCEMENT",
  "title": "New Announcement",
  "message": "Check out our latest updates!",
  "isRead": true,
  "actionUrl": "/announcements/1",
  "referenceId": 1,
  "metadata": { "priority": "HIGH" },
  "createdAt": "2024-01-15T10:00:00Z",
  "readAt": "2024-01-15T10:30:00Z"
}
```

---

### 6. Mark All Notifications as Read

Mark all notifications as read for the authenticated user.

**Endpoint:** `PATCH /notifications/read-all`

**Response:**

```json
{
  "count": 5,
  "message": "Marked 5 notifications as read"
}
```

---

### 7. Delete Notification

Delete a specific notification.

**Endpoint:** `DELETE /notifications/:id`

**Response:**

```json
{
  "success": true,
  "message": "Notification deleted successfully"
}
```

---

### 8. Delete All Notifications

Delete all notifications for the authenticated user.

**Endpoint:** `DELETE /notifications`

**Response:**

```json
{
  "count": 10,
  "message": "Deleted 10 notifications"
}
```

---

## Admin Endpoints

### 1. Create Notification (Admin Only)

Create a notification for a specific user.

**Endpoint:** `POST /notifications`

**Request Body:**

```json
{
  "userId": 5,
  "type": "ANNOUNCEMENT",
  "title": "New Announcement",
  "message": "Check out our latest updates!",
  "actionUrl": "/announcements/1",
  "referenceId": 1,
  "metadata": { "priority": "HIGH" }
}
```

**Response:**

```json
{
  "id": 1,
  "userId": 5,
  "type": "ANNOUNCEMENT",
  "title": "New Announcement",
  "message": "Check out our latest updates!",
  "isRead": false,
  "actionUrl": "/announcements/1",
  "referenceId": 1,
  "metadata": { "priority": "HIGH" },
  "createdAt": "2024-01-15T10:00:00Z",
  "readAt": null,
  "user": {
    "id": 5,
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe"
  }
}
```

---

### 2. Create Bulk Notifications (Admin Only)

Create notifications for multiple users.

**Endpoint:** `POST /notifications/bulk`

**Request Body:**

```json
{
  "userIds": [1, 2, 3, 4, 5],
  "type": "ANNOUNCEMENT",
  "title": "System Maintenance",
  "message": "System will be down for maintenance on Sunday.",
  "actionUrl": "/announcements/2",
  "referenceId": 2,
  "metadata": { "priority": "URGENT" }
}
```

**Response:**

```json
{
  "count": 5,
  "notifications": [
    {
      "id": 1,
      "userId": 1,
      "type": "ANNOUNCEMENT",
      "title": "System Maintenance",
      "message": "System will be down for maintenance on Sunday.",
      "isRead": false,
      "createdAt": "2024-01-15T10:00:00Z"
    }
    // ... more notifications
  ]
}
```

---

### 3. Get All Notifications (Admin Only)

Get all notifications with user details.

**Endpoint:** `GET /notifications/admin/all`

**Query Parameters:**

- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `type` (optional): Filter by notification type
- `isRead` (optional): Filter by read status

**Response:**

```json
{
  "data": [
    {
      "id": 1,
      "userId": 5,
      "type": "ANNOUNCEMENT",
      "title": "New Announcement",
      "message": "Check out our latest updates!",
      "isRead": false,
      "createdAt": "2024-01-15T10:00:00Z",
      "user": {
        "id": 5,
        "email": "user@example.com",
        "firstName": "John",
        "lastName": "Doe",
        "role": "USER"
      }
    }
  ],
  "total": 100,
  "page": 1,
  "limit": 20,
  "totalPages": 5
}
```

---

### 4. Get Notification Statistics (Admin Only)

Get notification statistics and metrics.

**Endpoint:** `GET /notifications/admin/stats`

**Response:**

```json
{
  "total": 1000,
  "unread": 150,
  "read": 850,
  "byType": [
    { "type": "ANNOUNCEMENT", "count": 300 },
    { "type": "ORDER_UPDATE", "count": 400 },
    { "type": "SETTLEMENT_UPDATE", "count": 200 },
    { "type": "SYSTEM", "count": 100 }
  ],
  "connectedUsers": 45
}
```

---

## Notification Types

```typescript
enum NotificationType {
  NEW_MESSAGE = 'NEW_MESSAGE',
  ORDER_UPDATE = 'ORDER_UPDATE',
  SETTLEMENT_UPDATE = 'SETTLEMENT_UPDATE',
  SYSTEM = 'SYSTEM',
  REFERRAL = 'REFERRAL',
  PRODUCT = 'PRODUCT',
  ANNOUNCEMENT = 'ANNOUNCEMENT',
}
```

---

## Usage Examples

### Example 1: Send Notification When Order Status Changes

```typescript
// In your orders service
async updateOrderStatus(orderId: number, status: OrderStatus) {
  const order = await this.prisma.orderRequest.update({
    where: { id: orderId },
    data: { status },
    include: { user: true }
  });

  // Send notification
  await this.notificationsService.createNotification({
    userId: order.userId,
    type: 'ORDER_UPDATE',
    title: 'Order Status Updated',
    message: `Your order #${orderId} status has been updated to ${status}`,
    actionUrl: `/orders/${orderId}`,
    referenceId: orderId,
    metadata: { status, orderId }
  });

  return order;
}
```

---

### Example 2: Send Notification to All Users by Role

```typescript
// Send notification to all referral managers
await this.notificationsService.createNotificationByRole(
  'REFERRAL_MANAGER',
  'SYSTEM',
  'New Feature Available',
  'Check out the new referral dashboard!',
  {
    actionUrl: '/dashboard',
    metadata: { feature: 'referral-dashboard' },
  },
);
```

---

### Example 3: Send Notification to All Users (Except Admins)

```typescript
await this.notificationsService.createNotificationForAllUsers(
  'ANNOUNCEMENT',
  'Holiday Sale',
  'Get 20% off on all products this weekend!',
  {
    actionUrl: '/products',
    metadata: { discount: 20 },
  },
);
```

---

## Frontend Integration

### React Hook Example

```typescript
// hooks/useNotifications.ts
import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './useAuth';

export function useNotifications() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { token } = useAuth();

  useEffect(() => {
    if (!token) return;

    const newSocket = io('http://localhost:4000/notifications', {
      auth: { token },
      transports: ['websocket'],
    });

    newSocket.on('connected', (data) => {
      console.log('Connected to notifications:', data);
    });

    newSocket.on('notification', (notification) => {
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);

      // Show toast notification
      toast.info(notification.title, {
        description: notification.message,
      });
    });

    newSocket.on('unreadCount', ({ count }) => {
      setUnreadCount(count);
    });

    newSocket.on('notificationRead', ({ notificationId }) => {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n)),
      );
    });

    newSocket.on('allNotificationsRead', () => {
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [token]);

  return { socket, notifications, unreadCount };
}
```

---

## Error Handling

All endpoints return standard error responses:

```json
{
  "statusCode": 404,
  "message": "Notification not found",
  "error": "Not Found"
}
```

Common status codes:

- `200`: Success
- `201`: Created
- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `500`: Internal Server Error

---

## Best Practices

1. **Always handle WebSocket disconnections** and implement reconnection logic
2. **Use notification types** consistently across your application
3. **Include actionUrl** to make notifications actionable
4. **Use metadata** for additional context
5. **Clean up old notifications** periodically
6. **Test real-time delivery** in different network conditions
7. **Implement notification preferences** for users
8. **Rate limit** notification creation to prevent spam

---

## Security

- All endpoints require JWT authentication
- Admin endpoints require ADMIN role
- Users can only access their own notifications
- WebSocket connections are authenticated via JWT
- CORS is configured for security

---

## Performance Considerations

- Notifications are paginated to prevent large payloads
- WebSocket connections are managed efficiently
- Database queries are optimized with indexes
- Real-time updates are sent only to connected users
- Bulk operations are used for multiple notifications

---

## Future Enhancements

- [ ] Notification preferences per user
- [ ] Email notifications for important events
- [ ] Push notifications for mobile apps
- [ ] Notification templates
- [ ] Scheduled notifications
- [ ] Notification groups/categories
- [ ] Rich media support (images, videos)
- [ ] Notification sound customization
