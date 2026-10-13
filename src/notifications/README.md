# Notifications Module

A comprehensive real-time notification system with WebSocket support for instant delivery.

## Quick Start

### 1. Import the Module

The module is already imported in `app.module.ts`.

### 2. Use in Your Services

```typescript
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class YourService {
  constructor(private notificationsService: NotificationsService) {}

  async someMethod() {
    // Send a notification
    await this.notificationsService.createNotification({
      userId: 1,
      type: 'ORDER_UPDATE',
      title: 'Order Confirmed',
      message: 'Your order has been confirmed!',
      actionUrl: '/orders/123',
      referenceId: 123,
    });
  }
}
```

### 3. Frontend Connection

```typescript
import { io } from 'socket.io-client';

const socket = io('http://localhost:4000/notifications', {
  auth: { token: yourJwtToken },
});

socket.on('notification', (notification) => {
  console.log('New notification:', notification);
});
```

## Key Features

- ✅ Real-time WebSocket notifications
- ✅ REST API for CRUD operations
- ✅ User-specific & role-based notifications
- ✅ Bulk notifications
- ✅ Read/Unread tracking
- ✅ Admin dashboard with stats

## Common Use Cases

### Send to Single User

```typescript
await notificationsService.createNotification({
  userId: 5,
  type: 'ANNOUNCEMENT',
  title: 'Welcome!',
  message: 'Welcome to our platform!',
});
```

### Send to Multiple Users

```typescript
await notificationsService.createBulkNotifications({
  userIds: [1, 2, 3, 4, 5],
  type: 'SYSTEM',
  title: 'Maintenance Notice',
  message: 'System will be down for maintenance.',
});
```

### Send to All Users by Role

```typescript
await notificationsService.createNotificationByRole(
  'USER',
  'ANNOUNCEMENT',
  'New Feature',
  'Check out our new feature!',
);
```

### Send to All Users (Except Admins)

```typescript
await notificationsService.createNotificationForAllUsers(
  'ANNOUNCEMENT',
  'Holiday Sale',
  'Get 20% off this weekend!',
);
```

## API Endpoints

### User Endpoints

- `GET /notifications` - Get user notifications
- `GET /notifications/unread` - Get unread notifications
- `GET /notifications/unread/count` - Get unread count
- `PATCH /notifications/:id/read` - Mark as read
- `PATCH /notifications/read-all` - Mark all as read
- `DELETE /notifications/:id` - Delete notification

### Admin Endpoints

- `POST /notifications` - Create notification
- `POST /notifications/bulk` - Create bulk notifications
- `GET /notifications/admin/all` - Get all notifications
- `GET /notifications/admin/stats` - Get statistics

## WebSocket Events

### Client → Server

- `ping` - Health check

### Server → Client

- `connected` - Connection established
- `notification` - New notification received
- `unreadCount` - Unread count updated
- `notificationRead` - Notification marked as read
- `allNotificationsRead` - All notifications marked as read
- `pong` - Response to ping

## Notification Types

- `NEW_MESSAGE` - Chat messages
- `ORDER_UPDATE` - Order status changes
- `SETTLEMENT_UPDATE` - Settlement updates
- `SYSTEM` - System notifications
- `REFERRAL` - Referral notifications
- `PRODUCT` - Product notifications
- `ANNOUNCEMENT` - Announcements

## Documentation

See [NOTIFICATIONS_API.md](./NOTIFICATIONS_API.md) for complete API documentation.

## Testing

```bash
# Test WebSocket connection
npm run test:e2e notifications

# Test REST API
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:4000/notifications
```

## Environment Variables

```env
JWT_SECRET=your_secret_key
JWT_EXPIRATION=7d
```

## Dependencies

- `@nestjs/websockets` - WebSocket support
- `@nestjs/platform-socket.io` - Socket.IO adapter
- `socket.io` - WebSocket library

## Architecture

```
notifications/
├── dto/                          # Data Transfer Objects
│   ├── create-notification.dto.ts
│   ├── get-notifications.dto.ts
│   └── index.ts
├── notifications/                # WebSocket Gateway
│   └── notifications.gateway.ts
├── notifications.controller.ts   # REST API Controller
├── notifications.service.ts      # Business Logic
├── notifications.module.ts       # Module Definition
├── NOTIFICATIONS_API.md          # API Documentation
└── README.md                     # This file
```

## Support

For issues or questions, please refer to the API documentation or contact the development team.
