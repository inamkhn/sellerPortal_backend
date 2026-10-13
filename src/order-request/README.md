# Order Request Module

## Overview

This module handles the creation and management of order requests in the furniture sellers portal. It supports two types of orders:

- **Existing Product Orders**: Orders for products already in the seller's catalog
- **Custom Product Orders**: Orders for custom-made products with image uploads

## API Endpoint

### Create Order Request

```
POST /order-requests
Authorization: Bearer <token>
Content-Type: multipart/form-data (for custom products with images)
Content-Type: application/json (for existing products)
```

## Request Body

### For Existing Products

```json
{
  "orderType": "EXISTING_PRODUCT",
  "productId": 123,
  "customerName": "Ahmed Khan",
  "customerPhone": "+92 300 1234567",
  "customerWhatsapp": "+92 300 1234567",
  "customerEmail": "ahmed@example.com",
  "customerNotes": "Customer prefers morning delivery",
  "decidedPrice": 45000,
  "platform": "FACEBOOK",
  "advancePayment": true,
  "advancePay": 15000,
  "deliveryAddress": "123 Main Street, Karachi",
  "deliveryDate": "2024-12-25T00:00:00.000Z"
}
```

### For Custom Products

```
POST /order-requests
Content-Type: multipart/form-data

Form Fields:
- orderType: "CUSTOM_PRODUCT"
- customerName: "Fatima Ali"
- customerPhone: "+92 321 9876543"
- customerWhatsapp: "+92 321 9876543"
- customerEmail: "fatima@example.com"
- decidedPrice: 75000
- platform: "WHATSAPP"
- advancePayment: true
- advancePay: 25000
- deliveryAddress: "456 Garden Road, Lahore"
- deliveryDate: "2024-12-30T00:00:00.000Z"
- customProductName: "Custom L-Shaped Leather Sofa"
- customProductDescription: "Brown leather, 8-seater, with reclining feature"
- categoryId: 4 (optional)
- customProductImages: [File, File, ...] (max 10 files, 5MB each)
```

## Validation Rules

| Field                    | Type    | Required    | Validation                                                          |
| ------------------------ | ------- | ----------- | ------------------------------------------------------------------- |
| orderType                | enum    | Yes         | EXISTING_PRODUCT or CUSTOM_PRODUCT                                  |
| productId                | number  | Conditional | Required if orderType is EXISTING_PRODUCT                           |
| customerName             | string  | Yes         | 2-100 characters                                                    |
| customerPhone            | string  | Yes         | Valid phone format                                                  |
| customerWhatsapp         | string  | Yes         | Valid phone format                                                  |
| customerEmail            | string  | Yes         | Valid email format                                                  |
| decidedPrice             | number  | Yes         | Must be > 0                                                         |
| platform                 | enum    | Yes         | FACEBOOK, DUBIZZLE, WHATSAPP, OTHER                                 |
| advancePayment           | boolean | Yes         | -                                                                   |
| advancePay               | number  | Conditional | Required if advancePayment is true, must be > 0 and <= decidedPrice |
| deliveryDate             | date    | No          | ISO 8601 format                                                     |
| customProductName        | string  | Conditional | Required if orderType is CUSTOM_PRODUCT, 3-100 chars                |
| customProductDescription | string  | Conditional | Required if orderType is CUSTOM_PRODUCT, 10-1000 chars              |
| customProductImages      | files   | No          | Max 10 files, each max 5MB, types: jpg, png, gif, webp              |
| categoryId               | number  | No          | Valid category ID                                                   |

## Business Logic

1. **Product Ownership**: For existing products, verifies the product belongs to the authenticated user
2. **Product Availability**: Checks if product exists and is not deleted
3. **Advance Payment**: If advancePayment is true, advancePay must be provided and valid
4. **Category**: If custom product and no categoryId provided, uses default "OTHER" category
5. **Image Upload**: For custom products, uploads images to Cloudinary in 'order-requests' folder

## Response

### Success Response (201 Created)

```json
{
  "id": 1,
  "userId": 5,
  "productId": 123,
  "isCustomProduct": false,
  "platform": "FACEBOOK",
  "decidedPrice": "50000.00",
  "advancePayment": true,
  "advancePay": "15000.00",
  "customerName": "Ahmed Khan",
  "customerPhone": "+92 300 1234567",
  "customerWhatsapp": "+92 300 1234567",
  "customerEmail": "ahmed@example.com",
  "customerNotes": "Customer prefers morning delivery",
  "deliveryAddress": "123 Main Street, Karachi",
  "deliveryDate": "2024-12-25T00:00:00.000Z",
  "status": "PENDING",
  "createdAt": "2024-10-19T10:30:00.000Z",
  "updatedAt": "2024-10-19T10:30:00.000Z"
}
```

## Error Responses

| Status | Description                             |
| ------ | --------------------------------------- |
| 400    | Invalid input data / Validation failed  |
| 401    | Unauthorized - Missing or invalid token |
| 404    | Product not found                       |
| 413    | File size exceeds limit                 |
| 415    | Invalid file type                       |

## Files Structure

```
order-request/
├── dto/
│   ├── create-order-request.dto.ts    # Request validation DTO
│   ├── order-request-response.dto.ts  # Response DTO
│   └── index.ts                        # DTO exports
├── order-request.controller.ts         # HTTP endpoints
├── order-request.service.ts            # Business logic
├── order-request.module.ts             # Module configuration
└── README.md                           # This file
```

## Dependencies

- **DatabaseModule**: Prisma database access
- **UploadModule**: Image upload to Cloudinary
- **AuthModule**: JWT authentication guards

## Testing

To test the endpoint:

1. **Get JWT Token**: Login to get authentication token
2. **Test Existing Product Order**:

```bash
curl -X POST http://localhost:3000/order-requests \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "orderType": "EXISTING_PRODUCT",
    "productId": 1,
    "customerName": "Test Customer",
    "customerPhone": "+923001234567",
    "customerWhatsapp": "+923001234567",
    "customerEmail": "test@example.com",
    "decidedPrice": 50000,
    "platform": "FACEBOOK",
    "advancePayment": false
  }'
```

3. **Test Custom Product Order with Images**:

```bash
curl -X POST http://localhost:3000/order-requests \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "orderType=CUSTOM_PRODUCT" \
  -F "customerName=Test Customer" \
  -F "customerPhone=+923001234567" \
  -F "customerWhatsapp=+923001234567" \
  -F "customerEmail=test@example.com" \
  -F "decidedPrice=75000" \
  -F "platform=WHATSAPP" \
  -F "advancePayment=true" \
  -F "advancePay=25000" \
  -F "customProductName=Custom Sofa" \
  -F "customProductDescription=A beautiful custom sofa with reclining feature" \
  -F "customProductImages=@/path/to/image1.jpg" \
  -F "customProductImages=@/path/to/image2.jpg"
```

## Notes

- All endpoints require JWT authentication
- Images are uploaded to Cloudinary in the 'order-requests' folder
- Maximum 10 images per order, each up to 5MB
- Supported image formats: JPEG, PNG, GIF, WebP
- Orders are created with PENDING status by default
- Database transactions ensure data consistency
