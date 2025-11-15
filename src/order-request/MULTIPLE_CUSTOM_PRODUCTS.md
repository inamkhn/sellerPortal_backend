# Multiple Custom Products Feature

## Overview

The order request system now supports creating multiple custom products in a single order request. Each custom product can have its own set of images.

## API Usage

### Endpoint

`POST /order-requests`

### Request Format

#### Headers

```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

#### Form Data Fields

**Required Fields:**

- `orderType`: `CUSTOM_PRODUCT`
- `customerName`: Customer's full name
- `customerPhone`: Customer's phone number
- `customerWhatsapp`: Customer's WhatsApp number
- `customerEmail`: Customer's email address
- `decidedPrice`: Total order price
- `platform`: Platform where order was received (FACEBOOK, DUBIZZLE, WHATSAPP, OTHER)
- `advancePayment`: Boolean indicating if advance payment is required
- `customProducts`: JSON string array of custom product objects

**Optional Fields:**

- `advancePay`: Advance payment amount (required if advancePayment is true)
- `deliveryAddress`: Delivery address
- `deliveryDate`: Delivery date (ISO 8601 format)
- `customerNotes`: Additional notes from customer
- `customProductImages`: Array of image files (up to 50 images, 5MB each)

### Custom Products Format

The `customProducts` field should be a JSON string containing an array of objects:

```json
[
  {
    "name": "Custom L-Shaped Leather Sofa",
    "description": "Brown leather, 8-seater, with reclining feature",
    "categoryId": 4,
    "imageIndices": [0, 1, 2]
  },
  {
    "name": "Custom Coffee Table",
    "description": "Wooden coffee table with glass top",
    "categoryId": 5,
    "imageIndices": [3, 4]
  }
]
```

### Image Mapping

Images are uploaded as a single array and mapped to custom products using `imageIndices`:

1. Upload all images in the `customProductImages` field
2. Images are indexed starting from 0
3. Each custom product specifies which images belong to it via `imageIndices`

**Example:**

- Upload 5 images: [img0, img1, img2, img3, img4]
- Product 1 uses images [0, 1, 2] → gets img0, img1, img2
- Product 2 uses images [3, 4] → gets img3, img4

### Example Request (using FormData)

```javascript
const formData = new FormData();

// Basic order information
formData.append('orderType', 'CUSTOM_PRODUCT');
formData.append('customerName', 'Ahmed Khan');
formData.append('customerPhone', '+92 300 1234567');
formData.append('customerWhatsapp', '+92 300 1234567');
formData.append('customerEmail', 'ahmed@example.com');
formData.append('decidedPrice', '75000');
formData.append('platform', 'FACEBOOK');
formData.append('advancePayment', 'true');
formData.append('advancePay', '25000');

// Custom products array
const customProducts = [
  {
    name: 'Custom L-Shaped Leather Sofa',
    description: 'Brown leather, 8-seater, with reclining feature',
    categoryId: 4,
    imageIndices: [0, 1, 2],
  },
  {
    name: 'Custom Coffee Table',
    description: 'Wooden coffee table with glass top',
    categoryId: 5,
    imageIndices: [3, 4],
  },
];
formData.append('customProducts', JSON.stringify(customProducts));

// Upload images
formData.append('customProductImages', file1); // Index 0
formData.append('customProductImages', file2); // Index 1
formData.append('customProductImages', file3); // Index 2
formData.append('customProductImages', file4); // Index 3
formData.append('customProductImages', file5); // Index 4

// Send request
const response = await fetch('/order-requests', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
  },
  body: formData,
});
```

### Example Request (using cURL)

```bash
curl -X POST http://localhost:3000/order-requests \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "orderType=CUSTOM_PRODUCT" \
  -F "customerName=Ahmed Khan" \
  -F "customerPhone=+92 300 1234567" \
  -F "customerWhatsapp=+92 300 1234567" \
  -F "customerEmail=ahmed@example.com" \
  -F "decidedPrice=75000" \
  -F "platform=FACEBOOK" \
  -F "advancePayment=true" \
  -F "advancePay=25000" \
  -F 'customProducts=[{"name":"Custom Sofa","description":"Brown leather sofa","categoryId":4,"imageIndices":[0,1]},{"name":"Coffee Table","description":"Wooden table","categoryId":5,"imageIndices":[2,3]}]' \
  -F "customProductImages=@sofa1.jpg" \
  -F "customProductImages=@sofa2.jpg" \
  -F "customProductImages=@table1.jpg" \
  -F "customProductImages=@table2.jpg"
```

## Backward Compatibility

The old single custom product format is still supported for backward compatibility:

```javascript
formData.append('orderType', 'CUSTOM_PRODUCT');
formData.append('customProductName', 'Custom Sofa');
formData.append('customProductDescription', 'Brown leather sofa');
formData.append('categoryId', '4');
// All uploaded images will be assigned to this single product
```

This will automatically be converted to the new format internally.

## Response Format

```json
{
  "id": 123,
  "userId": 45,
  "productId": null,
  "isCustomProduct": true,
  "platform": "FACEBOOK",
  "decidedPrice": "75000.00",
  "advancePayment": true,
  "advancePay": "25000.00",
  "customerName": "Ahmed Khan",
  "customerPhone": "+92 300 1234567",
  "customerWhatsapp": "+92 300 1234567",
  "customerEmail": "ahmed@example.com",
  "status": "PENDING",
  "customProducts": [
    {
      "id": 1,
      "orderRequestId": 123,
      "name": "Custom L-Shaped Leather Sofa",
      "description": "Brown leather, 8-seater, with reclining feature",
      "categoryId": 4,
      "images": [
        "https://cloudinary.com/image1.jpg",
        "https://cloudinary.com/image2.jpg",
        "https://cloudinary.com/image3.jpg"
      ],
      "category": {
        "id": 4,
        "name": "Furniture"
      }
    },
    {
      "id": 2,
      "orderRequestId": 123,
      "name": "Custom Coffee Table",
      "description": "Wooden coffee table with glass top",
      "categoryId": 5,
      "images": [
        "https://cloudinary.com/image4.jpg",
        "https://cloudinary.com/image5.jpg"
      ],
      "category": {
        "id": 5,
        "name": "Tables"
      }
    }
  ],
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

## Validation Rules

1. **Custom Products Array**: Must contain at least 1 product when orderType is CUSTOM_PRODUCT
2. **Product Name**: 3-100 characters, required for each product
3. **Product Description**: 10-1000 characters, required for each product
4. **Category ID**: Optional, defaults to "OTHER" category if not provided
5. **Image Indices**: Optional, must be valid indices within the uploaded images array
6. **Images**: Maximum 50 images total, 5MB per image
7. **Allowed Image Types**: JPEG, PNG, WebP, GIF

## Error Handling

### Common Errors

**400 Bad Request - Missing Custom Products**

```json
{
  "statusCode": 400,
  "message": "Custom products array is required for custom product orders"
}
```

**400 Bad Request - Invalid Product Data**

```json
{
  "statusCode": 400,
  "message": "Each custom product must have a name and description"
}
```

**400 Bad Request - Invalid Image Type**

```json
{
  "statusCode": 400,
  "message": "Invalid file type. Only JPEG, PNG, WebP, and GIF images are allowed."
}
```

## Database Schema

```prisma
model CustomProduct {
  id             Int          @id @default(autoincrement())
  orderRequestId Int          @map("order_request_id")
  name           String       @map("product_name")
  description    String?      @map("product_description")
  categoryId     Int          @map("category_id")
  images         String[]     @default([]) @map("customize_images")
  createdAt      DateTime     @default(now()) @map("created_at")
  updatedAt      DateTime     @updatedAt @map("updated_at")
  category       Category     @relation(fields: [categoryId], references: [id])
  orderRequest   OrderRequest @relation(fields: [orderRequestId], references: [id], onDelete: Cascade)
}
```

## Notes

- Images are uploaded to Cloudinary in the 'order-requests' folder
- If no category is specified, products are assigned to the "OTHER" category
- All custom products in an order share the same customer information and pricing
- The total `decidedPrice` applies to the entire order, not individual products
