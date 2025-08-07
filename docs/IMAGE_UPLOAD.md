# Image Upload Documentation

This document describes the image upload functionality for product listings using Multer and Cloudinary integration.

## Overview

The image upload system allows users to upload product photos directly when creating products. Images are automatically uploaded to Cloudinary with optimization and stored as URLs in the database.

## Configuration

### Environment Variables

Add the following Cloudinary configuration to your `.env` file:

```env
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"
```

### Getting Cloudinary Credentials

1. Sign up at [cloudinary.com](https://cloudinary.com)
2. Go to your Dashboard
3. Copy the Cloud Name, API Key, and API Secret
4. Add them to your environment variables

## Image Upload Features

### Automatic Optimization

Images are automatically optimized when uploaded:

- **Size Limit**: Maximum 1000x1000 pixels
- **Quality**: Auto-optimized for web
- **Format**: Auto-converted to best format (WebP when supported)
- **Compression**: Automatic compression for faster loading

### File Validation

- **Supported Formats**: JPEG, PNG, WebP, JPG
- **File Size**: Maximum 5MB per image
- **Quantity**: Maximum 10 images per product
- **Validation**: Automatic file type and size validation

### Storage Organization

- **Folder Structure**: Images stored in `products/` folder on Cloudinary
- **Naming**: Automatic unique naming with timestamps
- **CDN**: Global CDN delivery for fast loading worldwide

## API Usage

### Create Product with Images

**Endpoint**: `POST /api/v1/products`

**Content-Type**: `multipart/form-data`

#### Form Data Fields

```
title: "Comfortable Leather Sofa"
description: "A beautiful sofa"
price: 25000.50
category: "SOFAS"
condition: "LIKE_NEW"
brand: "IKEA"
location: "Karachi, Pakistan"
photos: [File1, File2, File3] // Up to 10 image files
```

#### Example with cURL

```bash
curl -X POST http://localhost:3001/api/v1/products \
  -H "Authorization: Bearer your-access-token" \
  -F "title=Comfortable Leather Sofa" \
  -F "description=A beautiful sofa" \
  -F "price=25000.50" \
  -F "category=SOFAS" \
  -F "condition=LIKE_NEW" \
  -F "brand=IKEA" \
  -F "location=Karachi, Pakistan" \
  -F "photos=@/path/to/image1.jpg" \
  -F "photos=@/path/to/image2.jpg"
```

#### Example with JavaScript (FormData)

```javascript
const formData = new FormData();
formData.append('title', 'Comfortable Leather Sofa');
formData.append('description', 'A beautiful sofa');
formData.append('price', '25000.50');
formData.append('category', 'SOFAS');
formData.append('condition', 'LIKE_NEW');
formData.append('brand', 'IKEA');
formData.append('location', 'Karachi, Pakistan');

// Add multiple image files
const fileInput = document.getElementById('photos');
for (let i = 0; i < fileInput.files.length; i++) {
  formData.append('photos', fileInput.files[i]);
}

const response = await fetch('http://localhost:3001/api/v1/products', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
  },
  body: formData
});

const product = await response.json();
console.log('Created product:', product);
```

#### Example with React

```jsx
import React, { useState } from 'react';

function CreateProduct() {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    category: 'SOFAS',
    condition: 'NEW',
    brand: '',
    location: ''
  });
  const [photos, setPhotos] = useState([]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const data = new FormData();
    Object.keys(formData).forEach(key => {
      data.append(key, formData[key]);
    });
    
    photos.forEach(photo => {
      data.append('photos', photo);
    });

    try {
      const response = await fetch('/api/v1/products', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: data
      });
      
      const product = await response.json();
      console.log('Product created:', product);
    } catch (error) {
      console.error('Error creating product:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Product Title"
        value={formData.title}
        onChange={(e) => setFormData({...formData, title: e.target.value})}
        required
      />
      
      <textarea
        placeholder="Description"
        value={formData.description}
        onChange={(e) => setFormData({...formData, description: e.target.value})}
      />
      
      <input
        type="number"
        placeholder="Price"
        value={formData.price}
        onChange={(e) => setFormData({...formData, price: e.target.value})}
        required
      />
      
      <input
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,image/jpg"
        onChange={(e) => setPhotos(Array.from(e.target.files))}
      />
      
      <button type="submit">Create Product</button>
    </form>
  );
}
```

### Response Format

```json
{
  "id": 1,
  "ownerId": 1,
  "title": "Comfortable Leather Sofa",
  "description": "A beautiful sofa",
  "price": 25000.50,
  "category": "SOFAS",
  "condition": "LIKE_NEW",
  "photos": [
    "https://res.cloudinary.com/your-cloud/image/upload/v1234567890/products/abc123.jpg",
    "https://res.cloudinary.com/your-cloud/image/upload/v1234567890/products/def456.jpg"
  ],
  "brand": "IKEA",
  "colors": [],
  "location": "Karachi, Pakistan",
  "material": null,
  "productTags": [],
  "quantity": 1,
  "sku": null,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "owner": {
    "id": 1,
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe"
  }
}
```

## Error Handling

### File Validation Errors

```json
{
  "statusCode": 400,
  "message": "Invalid file type. Only JPEG, PNG, and WebP images are allowed.",
  "error": "Bad Request"
}
```

```json
{
  "statusCode": 400,
  "message": "File size too large. Maximum size is 5MB.",
  "error": "Bad Request"
}
```

```json
{
  "statusCode": 400,
  "message": "Maximum 10 images allowed per product.",
  "error": "Bad Request"
}
```

### Upload Errors

```json
{
  "statusCode": 400,
  "message": "Image upload failed: [Cloudinary error message]",
  "error": "Bad Request"
}
```

## Best Practices

### Image Optimization

1. **Pre-upload Optimization**: Compress images before upload to reduce upload time
2. **Appropriate Dimensions**: Use images with reasonable dimensions (max 2000x2000)
3. **File Formats**: Prefer JPEG for photos, PNG for graphics with transparency
4. **File Names**: Use descriptive file names for better organization

### User Experience

1. **Progress Indicators**: Show upload progress for better UX
2. **Preview**: Allow users to preview images before upload
3. **Drag & Drop**: Implement drag-and-drop functionality
4. **Multiple Selection**: Enable multiple file selection
5. **Error Handling**: Provide clear error messages for failed uploads

### Security

1. **File Validation**: Always validate file types and sizes
2. **Virus Scanning**: Consider implementing virus scanning for uploaded files
3. **Rate Limiting**: Implement rate limiting for upload endpoints
4. **Authentication**: Ensure only authenticated users can upload

## Troubleshooting

### Common Issues

1. **Cloudinary Configuration**
   - Verify environment variables are set correctly
   - Check Cloudinary dashboard for API usage limits
   - Ensure API keys have proper permissions

2. **File Upload Failures**
   - Check file size limits (5MB per file)
   - Verify file format is supported
   - Ensure stable internet connection

3. **CORS Issues**
   - Configure CORS properly for file uploads
   - Ensure frontend domain is whitelisted

### Debug Mode

Enable debug logging by setting log level to debug in your NestJS configuration to see detailed upload information.

## Performance Considerations

1. **Concurrent Uploads**: Limit concurrent uploads to prevent server overload
2. **CDN Usage**: Leverage Cloudinary's CDN for fast image delivery
3. **Lazy Loading**: Implement lazy loading for product images
4. **Image Sizes**: Use appropriate image sizes for different contexts (thumbnails, full-size)

## Integration with Frontend

### HTML Form

```html
<form enctype="multipart/form-data">
  <input type="file" name="photos" multiple accept="image/*" />
  <input type="text" name="title" placeholder="Product Title" />
  <input type="number" name="price" placeholder="Price" />
  <button type="submit">Create Product</button>
</form>
```

### File Input Validation

```javascript
function validateFiles(files) {
  const maxSize = 5 * 1024 * 1024; // 5MB
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
  
  if (files.length > 10) {
    throw new Error('Maximum 10 images allowed');
  }
  
  for (let file of files) {
    if (file.size > maxSize) {
      throw new Error(`File ${file.name} is too large. Maximum size is 5MB.`);
    }
    
    if (!allowedTypes.includes(file.type)) {
      throw new Error(`File ${file.name} has invalid type. Only JPEG, PNG, and WebP are allowed.`);
    }
  }
}
```

## Monitoring and Analytics

1. **Upload Success Rate**: Monitor successful vs failed uploads
2. **File Size Distribution**: Track average file sizes
3. **Storage Usage**: Monitor Cloudinary storage usage
4. **Performance Metrics**: Track upload times and optimization results