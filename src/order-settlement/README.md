# Order Settlement API Endpoints

## Overview

This module handles order settlements for sellers, referrers, and admins. It manages the complete settlement lifecycle from creation to payment recording.

## Base URL

`/order-settlements`

---

## Admin Endpoints

### 1. Create Settlement

**POST** `/order-settlements/admin`

Creates a new settlement for a delivered order.

**Authorization:** Admin only

**Request Body:**

```json
{
  "orderRequestId": 1,
  "productCost": 35000,
  "adminCommission": 7500,
  "notes": "Settlement for delivered order"
}
```

**Response:**

```json
{
  "orderSettlement": {
    "id": 1,
    "orderRequestId": 1,
    "totalAmount": 50000,
    "productCost": 35000,
    "adminCommission": 7500,
    "grossSellerAmount": 7500,
    "referralCommission": 750,
    "referralCommissionRate": 10,
    "isFixedCommission": true,
    "netSellerAmount": 6750,
    "referrerId": 2,
    "referrerRole": "USER",
    "status": "PENDING",
    "createdAt": "2024-10-15T10:30:00Z"
  },
  "settlements": [
    {
      "id": 1,
      "settlementType": "SELLER_PAYMENT",
      "amount": 6750,
      "status": "PENDING"
    },
    {
      "id": 2,
      "settlementType": "REFERRAL_PAYMENT",
      "amount": 750,
      "status": "PENDING"
    },
    {
      "id": 3,
      "settlementType": "ADMIN_COMMISSION",
      "amount": 7500,
      "status": "PAID"
    }
  ]
}
```

---

### 2. Get All Settlements

**GET** `/order-settlements/admin`

Retrieves all settlements with pagination and filtering.

**Authorization:** Admin only

**Query Parameters:**

- `status` (optional): Filter by status (PENDING, PAID, CANCELLED)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `search` (optional): Search by seller name

**Response:**

```json
{
  "data": [
    {
      "id": 1,
      "orderRequestId": 1,
      "totalAmount": 50000,
      "productCost": 35000,
      "adminCommission": 7500,
      "netSellerAmount": 6750,
      "status": "PENDING",
      "orderRequest": {
        "id": 1,
        "user": {
          "id": 1,
          "firstName": "Ahmed",
          "lastName": "Khan"
        }
      },
      "referrer": {
        "id": 2,
        "firstName": "Fatima",
        "lastName": "Ali",
        "role": "USER"
      },
      "settlements": [...]
    }
  ],
  "meta": {
    "total": 50,
    "page": 1,
    "limit": 10,
    "totalPages": 5
  }
}
```

---

### 3. Get Settlement Details

**GET** `/order-settlements/admin/:id`

Retrieves detailed information about a specific settlement.

**Authorization:** Admin only

**Response:**

```json
{
  "id": 1,
  "orderRequestId": 1,
  "totalAmount": 50000,
  "productCost": 35000,
  "adminCommission": 7500,
  "grossSellerAmount": 7500,
  "referralCommission": 750,
  "referralCommissionRate": 10,
  "isFixedCommission": true,
  "netSellerAmount": 6750,
  "referrerId": 2,
  "referrerRole": "USER",
  "status": "PENDING",
  "orderRequest": {
    "id": 1,
    "user": {
      "id": 1,
      "firstName": "Ahmed",
      "lastName": "Khan",
      "profile": {...}
    }
  },
  "referrer": {
    "id": 2,
    "firstName": "Fatima",
    "lastName": "Ali",
    "profile": {...}
  },
  "settlements": [
    {
      "id": 1,
      "userId": 1,
      "settlementType": "SELLER_PAYMENT",
      "amount": 6750,
      "status": "PENDING",
      "user": {
        "id": 1,
        "firstName": "Ahmed",
        "lastName": "Khan"
      }
    }
  ]
}
```

---

### 4. Update Settlement

**PATCH** `/order-settlements/admin/:id`

Updates settlement details (only for PENDING settlements).

**Authorization:** Admin only

**Request Body:**

```json
{
  "productCost": 36000,
  "adminCommission": 8000,
  "notes": "Updated settlement details"
}
```

**Response:** Updated settlement object

---

### 5. Delete Settlement

**DELETE** `/order-settlements/admin/:id`

Deletes a settlement (only if not paid).

**Authorization:** Admin only

**Response:** 204 No Content

---

### 6. Record Seller Payment

**POST** `/order-settlements/admin/:id/pay-seller`

Records payment to the seller.

**Authorization:** Admin only

**Request Body:**

```json
{
  "paymentMethod": "EASYPAISA",
  "transactionId": "EP-123456789",
  "paymentProof": "https://example.com/proof.pdf",
  "notes": "Payment processed successfully"
}
```

**Response:**

```json
{
  "id": 1,
  "settlementType": "SELLER_PAYMENT",
  "amount": 6750,
  "status": "PAID",
  "paidAt": "2024-10-16T10:00:00Z",
  "paymentProof": "https://example.com/proof.pdf",
  "notes": "Payment processed successfully"
}
```

---

### 7. Record Referrer Payment

**POST** `/order-settlements/admin/:id/pay-referrer`

Records payment to the referrer.

**Authorization:** Admin only

**Request Body:**

```json
{
  "paymentMethod": "JAZZCASH",
  "transactionId": "JC-987654321",
  "paymentProof": "https://example.com/proof.pdf",
  "notes": "Referral payment processed"
}
```

**Response:** Updated referral settlement object

---

## Referral Manager Endpoints

### 8. Get Pending Settlements

**GET** `/order-settlements/referral-manager/pending`

Retrieves settlements awaiting referral manager commission input.

**Authorization:** Referral Manager only

**Response:**

```json
[
  {
    "id": 2,
    "orderRequestId": 2,
    "totalAmount": 35000,
    "grossSellerAmount": 9500,
    "referralCommission": null,
    "referralCommissionRate": null,
    "isFixedCommission": false,
    "netSellerAmount": 9500,
    "referrerId": 4,
    "referrerRole": "REFERRAL_MANAGER",
    "status": "PENDING",
    "orderRequest": {
      "id": 2,
      "user": {
        "id": 3,
        "firstName": "Hassan",
        "lastName": "Raza"
      }
    }
  }
]
```

---

### 9. Set Referral Commission

**POST** `/order-settlements/referral-manager/:id/set-commission`

Sets the commission rate for a settlement.

**Authorization:** Referral Manager only (must be the assigned referrer)

**Request Body:**

```json
{
  "commissionRate": 15,
  "notes": "Commission set by referral manager"
}
```

**Response:** Updated settlement with calculated commission

---

## User (Seller) Endpoints

### 10. Get My Settlements

**GET** `/order-settlements/my-settlements`

Retrieves the authenticated user's settlements.

**Authorization:** Any authenticated user

**Query Parameters:**

- `status` (optional): Filter by status
- `page` (optional): Page number
- `limit` (optional): Items per page

**Response:**

```json
{
  "data": [
    {
      "id": 1,
      "orderSettlementId": 1,
      "userId": 1,
      "settlementType": "SELLER_PAYMENT",
      "amount": 6750,
      "status": "PENDING",
      "createdAt": "2024-10-15T10:30:00Z",
      "orderSettlement": {
        "id": 1,
        "orderRequest": {
          "id": 1,
          "customerName": "Ahmed Khan",
          "deliveryDate": "2024-10-20T10:00:00Z"
        }
      }
    }
  ],
  "meta": {
    "total": 10,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```

---

### 11. Get My Settlement Details

**GET** `/order-settlements/my-settlements/:id`

Retrieves detailed information about a specific settlement (only if user is the seller).

**Authorization:** Any authenticated user (must be the seller)

**Response:** Full settlement details with breakdown

---

## Business Logic

### Settlement Creation Flow

1. **Admin creates settlement** for a delivered order
2. **System calculates:**
   - Gross Seller Amount = Total - Product Cost - Admin Commission
   - If USER referrer: Referral Commission = 10% of Gross (fixed)
   - If REFERRAL_MANAGER: Awaits manager input
   - Net Seller Amount = Gross - Referral Commission

3. **System creates records:**
   - 1 OrderSettlement (parent record)
   - 1 Settlement for SELLER_PAYMENT (PENDING)
   - 1 Settlement for REFERRAL_PAYMENT (PENDING, if applicable)
   - 1 Settlement for ADMIN_COMMISSION (PAID immediately)

### Referral Manager Flow

1. **Referral Manager** views pending settlements
2. **Sets commission rate** (e.g., 15%)
3. **System recalculates:**
   - Referral Commission = Gross × Rate
   - Net Seller Amount = Gross - Referral Commission
4. **Creates REFERRAL_PAYMENT** settlement record

### Payment Recording Flow

1. **Admin records payment** for seller or referrer
2. **System updates Settlement record:**
   - Status → PAID
   - paidAt → current timestamp
   - paymentProof → uploaded file URL
   - notes → payment details

---

## Status Flow

### OrderSettlement Status

- **PENDING**: Awaiting payment processing
- **PAID**: All payments completed
- **CANCELLED**: Settlement cancelled

### Settlement Status (Individual)

- **PENDING**: Awaiting payment
- **PAID**: Payment completed
- **CANCELLED**: Payment cancelled

---

## Error Responses

### 400 Bad Request

```json
{
  "statusCode": 400,
  "message": "Gross seller amount cannot be negative",
  "error": "Bad Request"
}
```

### 403 Forbidden

```json
{
  "statusCode": 403,
  "message": "Only admins can create settlements",
  "error": "Forbidden"
}
```

### 404 Not Found

```json
{
  "statusCode": 404,
  "message": "Settlement not found",
  "error": "Not Found"
}
```

---

## Notes

- All amounts are in PKR (Pakistani Rupees)
- Decimal precision: 10,2 for amounts, 5,2 for rates
- USER referrers always get 10% fixed commission
- REFERRAL_MANAGER commission is variable (set by manager)
- Admin commission is marked as PAID immediately upon settlement creation
- Settlements can only be deleted if not paid
- Settlements can only be updated if in PENDING status
