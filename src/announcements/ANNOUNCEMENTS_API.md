# Announcements API Documentation

## Overview

The Announcements module allows admins to create system-wide announcements that are automatically sent as notifications to all users (except the admin who created it). Users can view announcements relevant to their role.

## Endpoints

### 1. Create Announcement (Admin Only)

**POST** `/api/announcements`

Creates a new announcement and automatically sends notifications to all users except the admin.

**Headers:**

```
Authorization: Bearer <admin_token>
```

**Request Body:**

```json
{
  "title": "System Maintenance Notice",
  "message": "The system will be under maintenance on Sunday from 2 AM to 4 AM.",
  "priority": "HIGH",
  "targetRole": "USER",
  "expiresAt": "2024-12-31T23:59:59Z"
}
```

**Fields:**

- `title` (required): Announcement title
- `message` (required): Announcement message content
- `priority` (optional): `LOW`, `NORMAL`, `HIGH`, `URGENT` (default: `NORMAL`)
- `targetRole` (optional): `USER`, `ADMIN`, `REFERRAL_MANAGER` (null = all users)
- `expiresAt` (optional): ISO 8601 date string for expiration

**Response (201):**

```json
{
  "id": 1,
  "adminId": 5,
  "title": "System Maintenance Notice",
  "message": "The system will be under maintenance on Sunday from 2 AM to 4 AM.",
  "priority": "HIGH",
  "targetRole": "USER",
  "isActive": true,
  "createdAt": "2024-01-15T10:00:00Z",
  "updatedAt": "2024-01-15T10:00:00Z",
  "expiresAt": "2024-12-31T23:59:59Z",
  "notificationsSent": 150
}
```

**Behavior:**

- Creates announcement in database
- Automatically creates notifications for all users except the admin
- If `targetRole` is specified, only users with that role receive notifications
- Returns the number of notifications sent

---

### 2. Get Announcements (All Users)

**GET** `/api/announcements`

Returns active, non-expired announcements relevant to the current user's role.

**Headers:**

```
Authorization: Bearer <user_token>
```

**Query Parameters:**

- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `priority` (optional): Filter by priority (`LOW`, `NORMAL`, `HIGH`, `URGENT`)
- `isActive` (optional): Filter by active status (default: true)

**Example:**

```
GET /api/announcements?page=1&limit=10&priority=HIGH
```

**Response (200):**

```json
{
  "data": [
    {
      "id": 1,
      "title": "System Maintenance Notice",
      "message": "The system will be under maintenance on Sunday from 2 AM to 4 AM.",
      "priority": "HIGH",
      "targetRole": null,
      "createdAt": "2024-01-15T10:00:00Z",
      "expiresAt": "2024-12-31T23:59:59Z"
    },
    {
      "id": 2,
      "title": "New Feature Released",
      "message": "Check out our new chat feature!",
      "priority": "NORMAL",
      "targetRole": "USER",
      "createdAt": "2024-01-14T15:30:00Z",
      "expiresAt": null
    }
  ],
  "total": 2,
  "page": 1,
  "limit": 10,
  "totalPages": 1
}
```

**Behavior:**

- Shows only active announcements
- Filters out expired announcements
- Shows announcements with `targetRole = null` OR matching user's role
- Sorted by priority (desc) then creation date (desc)

---

### 3. Get All Announcements (Admin Only)

**GET** `/api/announcements/admin/all`

Returns all announcements including inactive and expired ones.

**Headers:**

```
Authorization: Bearer <admin_token>
```

**Query Parameters:**

- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `priority` (optional): Filter by priority
- `isActive` (optional): Filter by active status

**Example:**

```
GET /api/announcements/admin/all?isActive=false
```

**Response (200):**

```json
{
  "data": [
    {
      "id": 1,
      "adminId": 5,
      "title": "System Maintenance Notice",
      "message": "The system will be under maintenance...",
      "priority": "HIGH",
      "targetRole": "USER",
      "isActive": true,
      "createdAt": "2024-01-15T10:00:00Z",
      "updatedAt": "2024-01-15T10:00:00Z",
      "expiresAt": "2024-12-31T23:59:59Z",
      "_count": {}
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20,
  "totalPages": 1
}
```

---

### 4. Get Announcement by ID

**GET** `/api/announcements/:id`

Returns a specific announcement by ID.

**Headers:**

```
Authorization: Bearer <user_token>
```

**Response (200):**

```json
{
  "id": 1,
  "adminId": 5,
  "title": "System Maintenance Notice",
  "message": "The system will be under maintenance...",
  "priority": "HIGH",
  "targetRole": "USER",
  "isActive": true,
  "createdAt": "2024-01-15T10:00:00Z",
  "updatedAt": "2024-01-15T10:00:00Z",
  "expiresAt": "2024-12-31T23:59:59Z"
}
```

**Response (404):**

```json
{
  "statusCode": 404,
  "message": "Announcement not found"
}
```

---

### 5. Update Announcement (Admin Only)

**PATCH** `/api/announcements/:id`

Updates an existing announcement.

**Headers:**

```
Authorization: Bearer <admin_token>
```

**Request Body (all fields optional):**

```json
{
  "title": "Updated Title",
  "message": "Updated message",
  "priority": "URGENT",
  "targetRole": "REFERRAL_MANAGER",
  "isActive": false,
  "expiresAt": "2024-12-31T23:59:59Z"
}
```

**Response (200):**

```json
{
  "id": 1,
  "adminId": 5,
  "title": "Updated Title",
  "message": "Updated message",
  "priority": "URGENT",
  "targetRole": "REFERRAL_MANAGER",
  "isActive": false,
  "createdAt": "2024-01-15T10:00:00Z",
  "updatedAt": "2024-01-15T11:00:00Z",
  "expiresAt": "2024-12-31T23:59:59Z"
}
```

**Note:** Updating an announcement does NOT send new notifications to users.

---

### 6. Delete Announcement (Admin Only)

**DELETE** `/api/announcements/:id`

Deletes an announcement and all related notifications.

**Headers:**

```
Authorization: Bearer <admin_token>
```

**Response (200):**

```json
{
  "success": true,
  "message": "Announcement deleted successfully"
}
```

**Response (404):**

```json
{
  "statusCode": 404,
  "message": "Announcement not found"
}
```

**Behavior:**

- Deletes the announcement from database
- Automatically deletes all related notifications

---

## Priority Levels

- `LOW`: General information, non-urgent
- `NORMAL`: Standard announcements (default)
- `HIGH`: Important updates that need attention
- `URGENT`: Critical announcements requiring immediate attention

## Target Roles

- `null`: Announcement visible to all users
- `USER`: Only visible to regular users
- `ADMIN`: Only visible to admins
- `REFERRAL_MANAGER`: Only visible to referral managers

## Notification Behavior

When an announcement is created:

1. System creates the announcement record
2. Queries all users except the admin who created it
3. If `targetRole` is specified, filters users by that role
4. Creates a notification for each target user with:
   - Type: `ANNOUNCEMENT`
   - Title: Announcement title
   - Message: Announcement message
   - Reference ID: Announcement ID
   - Metadata: Priority and announcement ID

## Error Responses

**401 Unauthorized:**

```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

**403 Forbidden (Non-admin trying to access admin endpoints):**

```json
{
  "statusCode": 403,
  "message": "Forbidden resource"
}
```

**404 Not Found:**

```json
{
  "statusCode": 404,
  "message": "Announcement not found"
}
```

**400 Bad Request:**

```json
{
  "statusCode": 400,
  "message": ["title should not be empty", "message should not be empty"],
  "error": "Bad Request"
}
```

## Usage Examples

### Example 1: Create urgent announcement for all users

```bash
curl -X POST http://localhost:3000/api/announcements \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Emergency Maintenance",
    "message": "System will be down for 1 hour starting now",
    "priority": "URGENT"
  }'
```

### Example 2: Create announcement for specific role

```bash
curl -X POST http://localhost:3000/api/announcements \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Manager Training Session",
    "message": "All referral managers must attend training on Friday",
    "priority": "HIGH",
    "targetRole": "REFERRAL_MANAGER",
    "expiresAt": "2024-02-01T00:00:00Z"
  }'
```

### Example 3: Get user announcements

```bash
curl -X GET "http://localhost:3000/api/announcements?page=1&limit=10" \
  -H "Authorization: Bearer <user_token>"
```

### Example 4: Deactivate announcement

```bash
curl -X PATCH http://localhost:3000/api/announcements/1 \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "isActive": false
  }'
```

### Example 5: Delete announcement

```bash
curl -X DELETE http://localhost:3000/api/announcements/1 \
  -H "Authorization: Bearer <admin_token>"
```

## Testing

To test the endpoints:

1. **Create an announcement as admin:**
   - Login as admin to get token
   - POST to `/api/announcements` with announcement data
   - Verify `notificationsSent` count in response

2. **Check notifications were created:**
   - Login as a regular user
   - GET `/api/notifications` to see the announcement notification

3. **View announcements as user:**
   - GET `/api/announcements` to see active announcements
   - Verify only relevant announcements are shown

4. **Update announcement:**
   - PATCH `/api/announcements/:id` to modify
   - Verify changes are reflected

5. **Delete announcement:**
   - DELETE `/api/announcements/:id`
   - Verify notifications are also deleted

## Database Schema

The announcement uses the existing Prisma schema:

```prisma
model Announcement {
  id         Int                  @id @default(autoincrement())
  adminId    Int                  @map("admin_id")
  title      String
  message    String               @db.Text
  priority   AnnouncementPriority @default(NORMAL)
  targetRole Role?                @map("target_role")
  isActive   Boolean              @default(true) @map("is_active")
  createdAt  DateTime             @default(now()) @map("created_at")
  updatedAt  DateTime             @updatedAt @map("updated_at")
  expiresAt  DateTime?            @map("expires_at")
}
```

## Notes

- Announcements are automatically filtered by expiration date for regular users
- Admins can see all announcements including expired ones via `/admin/all` endpoint
- Creating an announcement automatically sends notifications - no separate API call needed
- Deleting an announcement also deletes all related notifications
- Updating an announcement does NOT resend notifications
