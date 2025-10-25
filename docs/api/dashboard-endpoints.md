# Dashboard API Endpoints Documentation

## Overview

This document outlines the API endpoints required for the seller dashboard. The endpoints are designed to provide comprehensive metrics, order data, and settlement information based on the Prisma schema.

## Base URL

```
/api/v1/dashboard
```

## Authentication

All endpoints require authentication via JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

---

## Endpoints

### 1. Get Dashboard Overview

**Endpoint:** `GET /api/v1/dashboard/overview`

**Description:** Returns comprehensive dashboard statistics including orders, earnings, and quick metrics.

**Query Parameters:**

- `startDate` (optional): ISO date string for filtering data from a specific date
- `endDate` (optional): ISO date string for filtering data until a specific date

**Response:**

```json
{
  "success": true,
  "data": {
    "stats": {
      "totalOrders": 188,
      "pendingOrders": 8,
      "completedOrders": 156,
      "cancelledOrders": 24,
      "totalEarnings": 45231.89,
      "thisMonthEarnings": 8850.5,
      "ordersThisWeek": 12,
      "averageOrderValue": 1234.56,
      "successRate": 82.9
    },
    "trends": {
      "ordersGrowth": 8.5,
      "earningsGrowth": 20.1,
      "completionRateChange": 2.3
    }
  }
}
```

**Database Queries:**

```typescript
// Total Orders
const totalOrders = await prisma.orderRequest.count({
  where: { userId: sellerId },
});

// Pending Orders (PENDING, CONFIRMED, IN_PROGRESS, PAYMENT_PENDING)
const pendingOrders = await prisma.orderRequest.count({
  where: {
    userId: sellerId,
    status: { in: ['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'PAYMENT_PENDING'] },
  },
});

// Completed Orders (DELIVERED, PARTIALLY_DELIVERED)
const completedOrders = await prisma.orderRequest.count({
  where: {
    userId: sellerId,
    status: { in: ['DELIVERED', 'PARTIALLY_DELIVERED'] },
  },
});

// Total Earnings (from OrderSettlement)
const totalEarnings = await prisma.settlement.aggregate({
  where: {
    userId: sellerId,
    settlementType: 'SELLER_PAYMENT',
    status: { in: ['PAID', 'PENDING'] },
  },
  _sum: { amount: true },
});

// This Month Earnings
const thisMonthEarnings = await prisma.settlement.aggregate({
  where: {
    userId: sellerId,
    settlementType: 'SELLER_PAYMENT',
    createdAt: {
      gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    },
  },
  _sum: { amount: true },
});

// Orders This Week
const ordersThisWeek = await prisma.orderRequest.count({
  where: {
    userId: sellerId,
    createdAt: {
      gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    },
  },
});

// Average Order Value
const avgOrderValue = await prisma.orderRequest.aggregate({
  where: {
    userId: sellerId,
    status: { in: ['DELIVERED', 'PARTIALLY_DELIVERED'] },
  },
  _avg: { decidedPrice: true },
});

// Success Rate = (Completed / Total) * 100
```

---

### 2. Get Recent Orders

**Endpoint:** `GET /api/v1/dashboard/orders/recent`

**Description:** Returns the most recent orders for the seller.

**Query Parameters:**

- `limit` (optional, default: 5): Number of orders to return
- `offset` (optional, default: 0): Pagination offset

**Response:**

```json
{
  "success": true,
  "data": {
    "orders": [
      {
        "id": 1,
        "customerName": "Ahmed Hassan",
        "customerPhone": "+971501234567",
        "customerEmail": "ahmed@example.com",
        "decidedPrice": 1299.99,
        "status": "DELIVERED",
        "isCustomProduct": false,
        "platform": "Facebook",
        "createdAt": "2024-10-15T10:30:00Z",
        "updatedAt": "2024-10-18T14:20:00Z",
        "deliveryDate": "2024-10-18T00:00:00Z",
        "product": {
          "id": 45,
          "title": "Modern Sofa Set",
          "photos": ["url1.jpg", "url2.jpg"],
          "category": {
            "id": 3,
            "name": "Sofas"
          }
        },
        "customProduct": null
      }
    ],
    "pagination": {
      "total": 188,
      "limit": 5,
      "offset": 0,
      "hasMore": true
    }
  }
}
```

**Database Query:**

```typescript
const orders = await prisma.orderRequest.findMany({
  where: { userId: sellerId },
  include: {
    product: {
      include: {
        category: true,
      },
    },
    customProduct: {
      include: {
        category: true,
      },
    },
  },
  orderBy: { createdAt: 'desc' },
  take: limit,
  skip: offset,
});
```

---

### 3. Get Pending Deliveries

**Endpoint:** `GET /api/v1/dashboard/orders/pending-deliveries`

**Description:** Returns orders that are confirmed or in progress and need to be delivered.

**Response:**

```json
{
  "success": true,
  "data": {
    "count": 2,
    "orders": [
      {
        "id": 3,
        "customerName": "Omar Khan",
        "customerPhone": "+971507654321",
        "decidedPrice": 899.99,
        "status": "IN_PROGRESS",
        "isCustomProduct": false,
        "deliveryDate": "2024-10-25T00:00:00Z",
        "deliveryAddress": "Dubai Marina, Tower 5",
        "createdAt": "2024-10-17T09:15:00Z",
        "daysInProgress": 8,
        "product": {
          "title": "King Size Bed Frame",
          "photos": ["url1.jpg"]
        }
      },
      {
        "id": 4,
        "customerName": "Sara Ahmed",
        "customerPhone": "+971509876543",
        "decidedPrice": 349.99,
        "status": "CONFIRMED",
        "isCustomProduct": false,
        "deliveryDate": "2024-10-26T00:00:00Z",
        "deliveryAddress": "Sharjah, Al Nahda",
        "createdAt": "2024-10-17T16:45:00Z",
        "daysInProgress": 8
      }
    ]
  }
}
```

**Database Query:**

```typescript
const pendingDeliveries = await prisma.orderRequest.findMany({
  where: {
    userId: sellerId,
    status: { in: ['CONFIRMED', 'IN_PROGRESS'] },
  },
  include: {
    product: {
      select: {
        title: true,
        photos: true,
      },
    },
    customProduct: {
      select: {
        name: true,
        images: true,
      },
    },
  },
  orderBy: { deliveryDate: 'asc' },
});
```

---

### 4. Get Pending Settlements

**Endpoint:** `GET /api/v1/dashboard/settlements/pending`

**Description:** Returns settlements that are pending payment for the seller.

**Response:**

```json
{
  "success": true,
  "data": {
    "count": 3,
    "totalAmount": 2899.98,
    "settlements": [
      {
        "id": 12,
        "orderSettlementId": 45,
        "amount": 1199.99,
        "status": "PENDING",
        "createdAt": "2024-10-18T11:00:00Z",
        "orderRequest": {
          "id": 5,
          "customerName": "Youssef Ibrahim",
          "decidedPrice": 1599.99,
          "status": "DELIVERED",
          "deliveryDate": "2024-10-18T00:00:00Z"
        },
        "orderSettlement": {
          "totalAmount": 1599.99,
          "adminCommission": 400.0,
          "netSellerAmount": 1199.99,
          "adminSettledAt": null
        },
        "daysWaiting": 7
      }
    ]
  }
}
```

**Database Query:**

```typescript
const pendingSettlements = await prisma.settlement.findMany({
  where: {
    userId: sellerId,
    settlementType: 'SELLER_PAYMENT',
    status: 'PENDING',
  },
  include: {
    orderSettlement: {
      include: {
        orderRequest: {
          select: {
            id: true,
            customerName: true,
            decidedPrice: true,
            status: true,
            deliveryDate: true,
          },
        },
      },
    },
  },
  orderBy: { createdAt: 'asc' },
});

const totalAmount = await prisma.settlement.aggregate({
  where: {
    userId: sellerId,
    settlementType: 'SELLER_PAYMENT',
    status: 'PENDING',
  },
  _sum: { amount: true },
});
```

---

### 5. Get Orders by Status

**Endpoint:** `GET /api/v1/dashboard/orders/by-status`

**Description:** Returns order counts grouped by status.

**Response:**

```json
{
  "success": true,
  "data": {
    "statusBreakdown": [
      { "status": "PENDING", "count": 3, "percentage": 1.6 },
      { "status": "CONFIRMED", "count": 2, "percentage": 1.1 },
      { "status": "IN_PROGRESS", "count": 3, "percentage": 1.6 },
      { "status": "DELIVERED", "count": 150, "percentage": 79.8 },
      { "status": "PARTIALLY_DELIVERED", "count": 6, "percentage": 3.2 },
      { "status": "PAYMENT_PENDING", "count": 0, "percentage": 0 },
      { "status": "CANCELLED", "count": 24, "percentage": 12.8 }
    ],
    "total": 188
  }
}
```

**Database Query:**

```typescript
const statusBreakdown = await prisma.orderRequest.groupBy({
  by: ['status'],
  where: { userId: sellerId },
  _count: { status: true },
});
```

---

### 6. Get Earnings Breakdown

**Endpoint:** `GET /api/v1/dashboard/earnings/breakdown`

**Description:** Returns detailed earnings breakdown including paid and pending amounts.

**Query Parameters:**

- `period` (optional): 'week' | 'month' | 'year' | 'all' (default: 'month')

**Response:**

```json
{
  "success": true,
  "data": {
    "period": "month",
    "summary": {
      "totalEarnings": 8850.5,
      "paidEarnings": 6950.52,
      "pendingEarnings": 1899.98,
      "ordersCompleted": 12,
      "averageOrderValue": 737.54
    },
    "breakdown": [
      {
        "date": "2024-10-01",
        "earnings": 1250.0,
        "orders": 2,
        "status": "PAID"
      },
      {
        "date": "2024-10-08",
        "earnings": 899.99,
        "orders": 1,
        "status": "PENDING"
      }
    ],
    "byCategory": [
      {
        "categoryId": 3,
        "categoryName": "Sofas",
        "earnings": 3450.0,
        "orders": 5,
        "percentage": 39.0
      },
      {
        "categoryId": 1,
        "categoryName": "Beds",
        "earnings": 2800.5,
        "orders": 4,
        "percentage": 31.6
      }
    ]
  }
}
```

**Database Queries:**

```typescript
// Get date range based on period
const dateRange = getPeriodDateRange(period);

// Total earnings for period
const earnings = await prisma.settlement.findMany({
  where: {
    userId: sellerId,
    settlementType: 'SELLER_PAYMENT',
    createdAt: {
      gte: dateRange.start,
      lte: dateRange.end,
    },
  },
  include: {
    orderSettlement: {
      include: {
        orderRequest: {
          include: {
            product: {
              include: { category: true },
            },
            customProduct: {
              include: { category: true },
            },
          },
        },
      },
    },
  },
});

// Aggregate by status
const paidEarnings = await prisma.settlement.aggregate({
  where: {
    userId: sellerId,
    settlementType: 'SELLER_PAYMENT',
    status: 'PAID',
    createdAt: { gte: dateRange.start, lte: dateRange.end },
  },
  _sum: { amount: true },
});

const pendingEarnings = await prisma.settlement.aggregate({
  where: {
    userId: sellerId,
    settlementType: 'SELLER_PAYMENT',
    status: 'PENDING',
    createdAt: { gte: dateRange.start, lte: dateRange.end },
  },
  _sum: { amount: true },
});
```

---

### 7. Get Referral Statistics

**Endpoint:** `GET /api/v1/dashboard/referrals/stats`

**Description:** Returns referral statistics including referred users and referral earnings.

**Response:**

```json
{
  "success": true,
  "data": {
    "totalReferrals": 12,
    "activeReferrals": 8,
    "referralEarnings": {
      "total": 1250.5,
      "thisMonth": 320.0,
      "pending": 180.0,
      "paid": 1070.5
    },
    "recentReferrals": [
      {
        "id": 45,
        "refereeId": 123,
        "refereeName": "Ali Hassan",
        "refereeEmail": "ali@example.com",
        "joinedAt": "2024-10-10T08:30:00Z",
        "ordersPlaced": 3,
        "totalEarningsFromReferee": 150.0,
        "isActive": true
      }
    ],
    "referralCode": "FURNI123"
  }
}
```

**Database Queries:**

```typescript
// Get referrals made by this user
const referrals = await prisma.referral.findMany({
  where: { referrerId: userId },
  include: {
    referee: {
      include: {
        profile: true,
        orderRequests: {
          where: {
            status: { in: ['DELIVERED', 'PARTIALLY_DELIVERED'] },
          },
        },
      },
    },
  },
});

// Get referral earnings
const referralEarnings = await prisma.settlement.findMany({
  where: {
    userId: userId,
    settlementType: 'REFERRAL_PAYMENT',
  },
  include: {
    orderSettlement: {
      include: {
        orderRequest: true,
      },
    },
  },
});

// Aggregate referral earnings
const totalReferralEarnings = await prisma.settlement.aggregate({
  where: {
    userId: userId,
    settlementType: 'REFERRAL_PAYMENT',
  },
  _sum: { amount: true },
});
```

---

### 8. Get Product Performance

**Endpoint:** `GET /api/v1/dashboard/products/performance`

**Description:** Returns performance metrics for seller's products.

**Query Parameters:**

- `limit` (optional, default: 10): Number of products to return
- `sortBy` (optional): 'orders' | 'earnings' | 'views' (default: 'orders')

**Response:**

```json
{
  "success": true,
  "data": {
    "totalProducts": 45,
    "activeListings": 38,
    "soldProducts": 156,
    "topPerformers": [
      {
        "productId": 23,
        "title": "Modern L-Shape Sofa",
        "photos": ["url1.jpg"],
        "category": "Sofas",
        "price": 2500.0,
        "ordersCount": 8,
        "totalEarnings": 15200.0,
        "averageRating": 4.8,
        "lastOrderDate": "2024-10-20T10:00:00Z"
      }
    ],
    "byCategory": [
      {
        "categoryId": 3,
        "categoryName": "Sofas",
        "productsCount": 12,
        "ordersCount": 45,
        "totalEarnings": 34500.0
      }
    ]
  }
}
```

**Database Queries:**

```typescript
// Get products with order counts
const products = await prisma.product.findMany({
  where: { ownerId: sellerId },
  include: {
    category: true,
    orderRequests: {
      where: {
        status: { in: ['DELIVERED', 'PARTIALLY_DELIVERED'] },
      },
    },
    _count: {
      select: { orderRequests: true },
    },
  },
});

// Get earnings per product
const productEarnings = await prisma.orderRequest.groupBy({
  by: ['productId'],
  where: {
    userId: sellerId,
    productId: { not: null },
    status: { in: ['DELIVERED', 'PARTIALLY_DELIVERED'] },
  },
  _sum: { decidedPrice: true },
  _count: { id: true },
});
```

---

### 9. Get Monthly Trends

**Endpoint:** `GET /api/v1/dashboard/trends/monthly`

**Description:** Returns monthly trends for orders and earnings over the past 12 months.

**Query Parameters:**

- `months` (optional, default: 12): Number of months to include

**Response:**

```json
{
  "success": true,
  "data": {
    "months": [
      {
        "month": "2024-01",
        "monthName": "January",
        "orders": 15,
        "earnings": 12500.0,
        "completedOrders": 14,
        "cancelledOrders": 1,
        "averageOrderValue": 833.33,
        "successRate": 93.3
      },
      {
        "month": "2024-02",
        "monthName": "February",
        "orders": 18,
        "earnings": 18900.0,
        "completedOrders": 17,
        "cancelledOrders": 1,
        "averageOrderValue": 1050.0,
        "successRate": 94.4
      }
    ],
    "summary": {
      "totalOrders": 188,
      "totalEarnings": 245231.89,
      "averageMonthlyOrders": 15.7,
      "averageMonthlyEarnings": 20435.99,
      "growthRate": 12.5
    }
  }
}
```

**Database Query:**

```typescript
// Get orders grouped by month
const monthlyData = await prisma.$queryRaw`
  SELECT 
    DATE_TRUNC('month', created_at) as month,
    COUNT(*) as orders,
    COUNT(CASE WHEN status IN ('DELIVERED', 'PARTIALLY_DELIVERED') THEN 1 END) as completed_orders,
    COUNT(CASE WHEN status = 'CANCELLED' THEN 1 END) as cancelled_orders,
    SUM(decided_price) as total_amount
  FROM order_requests
  WHERE user_id = ${sellerId}
    AND created_at >= NOW() - INTERVAL '${months} months'
  GROUP BY DATE_TRUNC('month', created_at)
  ORDER BY month DESC
`;

// Get settlements grouped by month
const monthlyEarnings = await prisma.$queryRaw`
  SELECT 
    DATE_TRUNC('month', s.created_at) as month,
    SUM(s.amount) as earnings
  FROM settlements s
  WHERE s.user_id = ${sellerId}
    AND s.settlement_type = 'SELLER_PAYMENT'
    AND s.created_at >= NOW() - INTERVAL '${months} months'
  GROUP BY DATE_TRUNC('month', s.created_at)
  ORDER BY month DESC
`;
```

---

### 10. Get Quick Actions

**Endpoint:** `GET /api/v1/dashboard/quick-actions`

**Description:** Returns actionable items that require seller attention.

**Response:**

```json
{
  "success": true,
  "data": {
    "actions": [
      {
        "type": "PENDING_DELIVERY",
        "priority": "high",
        "count": 2,
        "title": "Orders Ready to Ship",
        "description": "2 confirmed orders awaiting delivery",
        "actionUrl": "/orders?status=confirmed",
        "dueDate": "2024-10-25T00:00:00Z"
      },
      {
        "type": "PAYMENT_PENDING",
        "priority": "medium",
        "count": 0,
        "title": "Settlements Pending",
        "description": "No pending settlements",
        "actionUrl": "/settlements?status=pending"
      },
      {
        "type": "LOW_STOCK",
        "priority": "low",
        "count": 3,
        "title": "Low Stock Products",
        "description": "3 products have low quantity",
        "actionUrl": "/products?filter=low-stock"
      },
      {
        "type": "INCOMPLETE_PROFILE",
        "priority": "medium",
        "count": 1,
        "title": "Complete Your Profile",
        "description": "Add bank account details for faster settlements",
        "actionUrl": "/profile/edit"
      }
    ],
    "notifications": {
      "unread": 5,
      "recent": [
        {
          "id": 123,
          "type": "ORDER_DELIVERED",
          "message": "Order #45 has been delivered",
          "createdAt": "2024-10-20T14:30:00Z",
          "read": false
        }
      ]
    }
  }
}
```

---

## Error Responses

All endpoints follow a consistent error response format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": {}
  }
}
```

### Common Error Codes:

- `UNAUTHORIZED` (401): Invalid or missing authentication token
- `FORBIDDEN` (403): User doesn't have permission to access this resource
- `NOT_FOUND` (404): Resource not found
- `VALIDATION_ERROR` (400): Invalid request parameters
- `INTERNAL_ERROR` (500): Server error

---

## Rate Limiting

- **Rate Limit:** 100 requests per minute per user
- **Headers:**
  - `X-RateLimit-Limit`: Maximum requests allowed
  - `X-RateLimit-Remaining`: Remaining requests
  - `X-RateLimit-Reset`: Time when limit resets (Unix timestamp)

---

## Caching Strategy

### Recommended Cache Times:

- **Dashboard Overview:** 5 minutes
- **Recent Orders:** 1 minute
- **Pending Deliveries:** 2 minutes
- **Pending Settlements:** 5 minutes
- **Monthly Trends:** 1 hour
- **Product Performance:** 15 minutes

### Cache Headers:

```
Cache-Control: private, max-age=300
ETag: "hash-of-response"
```

---

## WebSocket Events (Optional Real-time Updates)

For real-time dashboard updates, consider implementing WebSocket connections:

### Events to Subscribe:

```typescript
// Client subscribes
socket.emit('subscribe:dashboard', { userId: sellerId });

// Server emits updates
socket.on('order:status_changed', (data) => {
  // Update order status in real-time
});

socket.on('settlement:paid', (data) => {
  // Update settlement status
});

socket.on('order:new', (data) => {
  // New order received
});
```

---

## Implementation Notes

### Performance Optimization:

1. **Database Indexes:** Ensure indexes on:
   - `order_requests.user_id`
   - `order_requests.status`
   - `order_requests.created_at`
   - `settlements.user_id`
   - `settlements.status`
   - `settlements.settlement_type`

2. **Query Optimization:**
   - Use `select` to limit returned fields
   - Implement pagination for large datasets
   - Use aggregations instead of fetching all records

3. **Caching:**
   - Implement Redis caching for frequently accessed data
   - Use cache invalidation on data updates

4. **Background Jobs:**
   - Calculate complex metrics in background jobs
   - Update cached statistics periodically

### Security Considerations:

1. **Authorization:** Verify user owns the data being requested
2. **Input Validation:** Validate all query parameters
3. **SQL Injection:** Use Prisma's parameterized queries
4. **Rate Limiting:** Implement per-user rate limits
5. **Data Sanitization:** Sanitize all output data

---

## Testing Checklist

- [ ] Test with empty data (new seller)
- [ ] Test with large datasets (1000+ orders)
- [ ] Test date range filters
- [ ] Test pagination
- [ ] Test error scenarios
- [ ] Test concurrent requests
- [ ] Test cache invalidation
- [ ] Load testing for performance
- [ ] Security testing for authorization
- [ ] Cross-user data leakage testing
