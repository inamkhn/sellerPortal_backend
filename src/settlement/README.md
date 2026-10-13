# Settlement Module

This module manages individual Settlement records (payment distributions).

## Overview

The Settlement module provides endpoints to view individual payment records that are created when an OrderSettlement is completed. Each Settlement represents a payment to a specific user (seller, referrer, or admin).

## Endpoints

### GET /settlements

Get all settlements with role-based filtering.

**Access Control:**

- **ADMIN**: Can see all settlements
- **REFERRAL_MANAGER**: Can see their own settlements + settlements of their referrals
- **USER**: Can only see their own settlements

**Query Parameters:**

- `status` (optional): Filter by settlement status (PENDING, PAID, CANCELLED)
- `settlementType` (optional): Filter by type (SELLER_PAYMENT, REFERRAL_PAYMENT, ADMIN_COMMISSION)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `search` (optional): Search by user name or email

**Example:**

```bash
GET /settlements?status=PENDING&page=1&limit=10
```

**Response:**

```json
{
  "data": [
    {
      "id": 1,
      "orderSettlementId": 1,
      "userId": 5,
      "settlementType": "SELLER_PAYMENT",
      "amount": "855.00",
      "status": "PENDING",
      "paidAt": null,
      "paymentProof": null,
      "notes": null,
      "createdAt": "2025-01-15T10:00:00Z",
      "updatedAt": "2025-01-15T10:00:00Z",
      "user": {
        "id": 5,
        "firstName": "John",
        "lastName": "Doe",
        "email": "john@example.com",
        "role": "USER"
      },
      "orderSettlement": {
        "id": 1,
        "orderRequestId": 10,
        "totalAmount": "1000.00",
        "orderRequest": {
          "id": 10,
          "decidedPrice": "1000.00",
          "status": "DELIVERED"
        }
      }
    }
  ],
  "meta": {
    "total": 25,
    "page": 1,
    "limit": 10,
    "totalPages": 3
  }
}
```

### GET /settlements/:id

Get a specific settlement by ID.

**Access Control:**

- **ADMIN**: Can access any settlement
- **REFERRAL_MANAGER**: Can access their own settlements or settlements of their referrals
- **USER**: Can only access their own settlements

**Example:**

```bash
GET /settlements/1
```

**Response:**

```json
{
  "id": 1,
  "orderSettlementId": 1,
  "userId": 5,
  "settlementType": "SELLER_PAYMENT",
  "amount": "855.00",
  "status": "PENDING",
  "paidAt": null,
  "paymentProof": null,
  "notes": null,
  "createdAt": "2025-01-15T10:00:00Z",
  "updatedAt": "2025-01-15T10:00:00Z",
  "user": {
    "id": 5,
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "role": "USER",
    "profile": {
      "fullName": "John Doe",
      "whatsappNumber": "+1234567890"
    }
  },
  "orderSettlement": {
    "id": 1,
    "orderRequestId": 10,
    "totalAmount": "1000.00",
    "orderRequest": {
      "id": 10,
      "decidedPrice": "1000.00",
      "status": "DELIVERED",
      "user": {
        "id": 5,
        "firstName": "John",
        "lastName": "Doe",
        "email": "john@example.com"
      }
    }
  }
}
```

## Settlement Types

- **SELLER_PAYMENT**: Payment to the seller (net amount after commissions)
- **REFERRAL_PAYMENT**: Payment to the referrer (commission)
- **ADMIN_COMMISSION**: Platform commission (auto-marked as PAID)

## Settlement Status

- **PENDING**: Payment not yet made
- **PAID**: Payment completed
- **CANCELLED**: Settlement cancelled

## Workflow

1. OrderRequest status changes to DELIVERED/PARTIALLY_DELIVERED
2. OrderSettlement is auto-created with placeholder values
3. Admin fills in OrderSettlement amounts via `/order-settlements` endpoint
4. Settlement records are created automatically (one for seller, one for referrer if exists, one for admin)
5. Admin can view and track these Settlement records via `/settlements` endpoints
6. Admin marks settlements as PAID when payments are completed (via OrderSettlement update endpoint)

## Related Modules

- **OrderSettlement Module**: Manages the financial breakdown of orders
- **OrderRequest Module**: Manages customer orders
