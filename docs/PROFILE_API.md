# Profile API Documentation

This document describes the Profile API endpoints for managing user profiles in the Furniture Marketplace application.

## Overview

The Profile API allows authenticated users to create, read, update, and delete their profiles. Each user can have only one profile, which contains additional information beyond the basic user account data.

## Authentication

All profile endpoints require JWT authentication. Include the access token in the Authorization header:

```
Authorization: Bearer <your-access-token>
```

### Role-Based Access Control

Some endpoints have additional role requirements:

- **Delete Profile**: Requires ADMIN role
- **All other endpoints**: Available to all authenticated users (USER and ADMIN roles)

## Endpoints

### 1. Create Profile

**POST** `/api/v1/profile`

Creates a new profile for the authenticated user.

#### Request Body

```json
{
  "fullName": "John Doe",
  "address": "123 Main Street, Karachi, Pakistan",
  "whatsappNumber": "+923001234567",
  "bankAccount": "EASYPAISA",
  "accountNumber": "03001234567",
  "facebookLink": "https://facebook.com/johndoe",
  "dubizzleLink": "https://dubizzle.com/users/johndoe",
  "referralCode": "ABC12345"
}
```

#### Field Validations

- **fullName** (optional): 2-100 characters
- **address** (optional): 5-500 characters
- **whatsappNumber** (optional): International format (e.g., +923001234567)
- **bankAccount** (optional): EASYPAISA, JAZZCASH, BANK_ACCOUNT, OTHER
- **accountNumber** (optional): 5-50 characters
- **facebookLink** (optional): Valid Facebook profile URL
- **dubizzleLink** (optional): Valid Dubizzle profile URL
- **referralCode** (required): Exactly 8 characters, uppercase letters and numbers only

#### Response (201 Created)

```json
{
  "id": 1,
  "userId": 1,
  "fullName": "John Doe",
  "address": "123 Main Street, Karachi, Pakistan",
  "whatsappNumber": "+923001234567",
  "bankAccount": "EASYPAISA",
  "accountNumber": "03001234567",
  "facebookLink": "https://facebook.com/johndoe",
  "dubizzleLink": "https://dubizzle.com/users/johndoe",
  "verified": false,
  "referralCode": "ABC12345",
  "referredBy": null,
  "listedProducts": [],
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "USER"
  }
}
```

#### Error Responses

- **409 Conflict**: User already has a profile or referral code is taken
- **400 Bad Request**: Invalid input data
- **401 Unauthorized**: Invalid or missing access token

### 2. Get Profile

**GET** `/api/v1/profile`

Retrieves the profile of the authenticated user.

#### Response (200 OK)

```json
{
  "id": 1,
  "userId": 1,
  "fullName": "John Doe",
  "address": "123 Main Street, Karachi, Pakistan",
  "whatsappNumber": "+923001234567",
  "bankAccount": "EASYPAISA",
  "accountNumber": "03001234567",
  "facebookLink": "https://facebook.com/johndoe",
  "dubizzleLink": "https://dubizzle.com/users/johndoe",
  "verified": false,
  "referralCode": "ABC12345",
  "referredBy": null,
  "listedProducts": [],
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "USER",
    "isVerified": true
  },
  "referrer": null
}
```

#### Error Responses

- **404 Not Found**: Profile not found
- **401 Unauthorized**: Invalid or missing access token

### 3. Update Profile

**PUT** `/api/v1/profile`

Updates the profile of the authenticated user. All fields are optional.

#### Request Body

```json
{
  "fullName": "John Doe Updated",
  "address": "456 Updated Street, Karachi, Pakistan",
  "whatsappNumber": "+923009876543",
  "bankAccount": "JAZZCASH",
  "accountNumber": "03009876543",
  "facebookLink": "https://facebook.com/johndoe.updated",
  "dubizzleLink": "https://dubizzle.com/users/johndoe.updated",
  "verified": true,
  "referralCode": "XYZ98765",
  "referredBy": 2,
  "listedProducts": ["product-1", "product-2", "product-3"]
}
```

#### Field Validations

- **fullName** (optional): 2-100 characters
- **address** (optional): 5-500 characters
- **whatsappNumber** (optional): International format (e.g., +923001234567)
- **bankAccount** (optional): EASYPAISA, JAZZCASH, BANK_ACCOUNT, OTHER
- **accountNumber** (optional): 5-50 characters
- **facebookLink** (optional): Valid Facebook profile URL
- **dubizzleLink** (optional): Valid Dubizzle profile URL
- **verified** (optional): Boolean - Profile verification status (admin only)
- **referralCode** (optional): Exactly 8 characters, uppercase letters and numbers only
- **referredBy** (optional): Valid user ID of the referrer (cannot be self)
- **listedProducts** (optional): Array of product IDs that the user has listed

#### Response (200 OK)

```json
{
  "id": 1,
  "userId": 1,
  "fullName": "John Doe Updated",
  "address": "456 Updated Street, Karachi, Pakistan",
  "whatsappNumber": "+923009876543",
  "bankAccount": "JAZZCASH",
  "accountNumber": "03009876543",
  "facebookLink": "https://facebook.com/johndoe.updated",
  "dubizzleLink": "https://dubizzle.com/users/johndoe.updated",
  "verified": true,
  "referralCode": "XYZ98765",
  "referredBy": 2,
  "listedProducts": ["product-1", "product-2", "product-3"],
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T12:00:00.000Z",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "USER"
  },
  "referrer": {
    "id": 2,
    "email": "referrer@example.com",
    "firstName": "Jane",
    "lastName": "Smith"
  }
}
```

#### Error Responses

- **404 Not Found**: Profile not found
- **409 Conflict**: Referral code is already taken
- **400 Bad Request**: Invalid input data
- **401 Unauthorized**: Invalid or missing access token

### 4. Delete Profile (Admin Only)

**DELETE** `/api/v1/profile`

Deletes the profile of the authenticated user. **Only admin users can delete profiles.**

#### Authentication Requirements

- Valid JWT access token
- Admin role (ADMIN) required

#### Response (204 No Content)

No response body.

#### Error Responses

- **404 Not Found**: Profile not found
- **401 Unauthorized**: Invalid or missing access token
- **403 Forbidden**: Insufficient permissions - Admin role required

### 5. Generate Referral Code

**GET** `/api/v1/profile/generate-referral-code`

Generates a unique 8-character referral code that can be used when creating or updating a profile.

#### Response (200 OK)

```json
{
  "referralCode": "XYZ98765"
}
```

#### Error Responses

- **401 Unauthorized**: Invalid or missing access token

## Bank Account Types

The following bank account types are supported:

- `EASYPAISA`
- `JAZZCASH`
- `BANK_ACCOUNT`
- `OTHER`

## Referral System

- Each profile must have a unique referral code
- Referral codes are exactly 8 characters long
- Only uppercase letters (A-Z) and numbers (0-9) are allowed
- Use the generate referral code endpoint to get a unique code
- The referral system tracks who referred whom for commission purposes

## Profile Verification

- Profiles start as unverified (`verified: false`)
- Admin users can verify profiles through the admin panel
- Verified profiles may have additional privileges in the marketplace

## Usage Examples

### Creating a Profile with cURL

```bash
curl -X POST http://localhost:3001/api/v1/profile \
  -H "Authorization: Bearer your-access-token" \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "John Doe",
    "address": "123 Main Street, Karachi, Pakistan",
    "whatsappNumber": "+923001234567",
    "bankAccount": "EASYPAISA",
    "accountNumber": "03001234567",
    "referralCode": "ABC12345"
  }'
```

### Getting Profile with JavaScript

```javascript
const response = await fetch('http://localhost:3001/api/v1/profile', {
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  }
});

const profile = await response.json();
console.log(profile);
```

### Updating Profile with JavaScript

```javascript
const response = await fetch('http://localhost:3001/api/v1/profile', {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    fullName: 'Updated Name',
    bankAccount: 'JAZZCASH'
  })
});

const updatedProfile = await response.json();
```

## Error Handling

All endpoints return consistent error responses:

```json
{
  "statusCode": 400,
  "message": ["Error message 1", "Error message 2"],
  "error": "Bad Request"
}
```

Common HTTP status codes:
- `200` - Success
- `201` - Created
- `204` - No Content
- `400` - Bad Request
- `401` - Unauthorized
- `404` - Not Found
- `409` - Conflict

## Integration with Other APIs

The Profile API integrates with:

- **Auth API**: Requires authentication tokens
- **Users API**: Links profiles to user accounts
- **Products API**: Profiles can list products for sale
- **Orders API**: Profiles are used for order processing
- **Referrals API**: Tracks referral relationships
- **Payments API**: Bank account information for payments