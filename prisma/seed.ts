import {
  PrismaClient,
  User,
  Product,
  Role,
  BankAccount,
  ProductCategory,
  ProductCondition,
  OrderStatus,
  PaymentStatus,
  PaymentType,
  FacebookPostingStatus,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Clear existing data
  await prisma.payment.deleteMany();
  await prisma.orderRequest.deleteMany();
  await prisma.product.deleteMany();
  await prisma.referral.deleteMany();
  await prisma.profile.deleteMany();
  await prisma.user.deleteMany();

  console.log('🧹 Cleared existing data');

  const hashedPassword = await bcrypt.hash('password123', 10);

  // Create Admin
  const admin = await prisma.user.create({
    data: {
      email: 'admin@furniture.com',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: Role.ADMIN,
      isVerified: true,
    },
  });

  // Create Manager
  const manager = await prisma.user.create({
    data: {
      email: 'manager@furniture.com',
      password: hashedPassword,
      firstName: 'Manager',
      lastName: 'User',
      role: Role.REFERRAL_MANAGER,
      isVerified: true,
    },
  });

  // Create 10 regular users
  const users: User[] = [];
  for (let i = 1; i <= 10; i++) {
    const user = await prisma.user.create({
      data: {
        email: `user${i}@example.com`,
        password: hashedPassword,
        firstName: `User${i}`,
        lastName: 'Test',
        role: Role.USER,
        isVerified: i <= 8, // 2 unverified users
        lastLogin: i <= 8 ? new Date() : null,
      },
    });
    users.push(user);
  }

  console.log('👥 Created users');

  // Create profiles
  await prisma.profile.create({
    data: {
      userId: admin.id,
      fullName: 'Admin User',
      address: 'Admin Street, Karachi',
      whatsappNumber: '+923001234567',
      bankAccount: BankAccount.BANK_ACCOUNT,
      verified: true,
      referralCode: 'ADMIN001',
    },
  });

  await prisma.profile.create({
    data: {
      userId: manager.id,
      fullName: 'Manager User',
      address: 'Manager Avenue, Lahore',
      whatsappNumber: '+923009876543',
      bankAccount: BankAccount.EASYPAISA,
      verified: true,
      referralCode: 'MANAGER001',
    },
  });

  for (let i = 0; i < users.length; i++) {
    await prisma.profile.create({
      data: {
        userId: users[i].id,
        fullName: `User${i + 1} Test`,
        address: `Address ${i + 1}, City`,
        whatsappNumber: `+92300${String(i + 1).padStart(7, '0')}`,
        bankAccount: [
          BankAccount.EASYPAISA,
          BankAccount.JAZZCASH,
          BankAccount.BANK_ACCOUNT,
        ][i % 3],
        verified: i < 8,
        referralCode: `USER${String(i + 1).padStart(3, '0')}`,
        referredBy: i > 0 && i < 5 ? users[0].id : null, // First 4 users referred by user1
      },
    });
  }

  console.log('📋 Created profiles');

  // Create referrals
  for (let i = 1; i < 5; i++) {
    await prisma.referral.create({
      data: {
        referrerId: users[0].id,
        refereeId: users[i].id,
      },
    });
  }

  console.log('🔗 Created referrals');

  // Create products with realistic furniture data
  const categories = [
    ProductCategory.BEDS,
    ProductCategory.CHAIRS,
    ProductCategory.TABLES,
    ProductCategory.SOFAS,
    ProductCategory.WARDROBES,
    ProductCategory.STORAGE,
    ProductCategory.OTHER,
  ];

  const conditions = [
    ProductCondition.NEW,
    ProductCondition.LIKE_NEW,
    ProductCondition.GOOD,
    ProductCondition.FAIR,
    ProductCondition.SECOND_HAND,
  ];

  const products: Product[] = [];
  const facebookStatuses = [
    FacebookPostingStatus.NOT_POSTED,
    FacebookPostingStatus.POSTING,
    FacebookPostingStatus.POSTED,
    FacebookPostingStatus.FAILED,
    FacebookPostingStatus.NEEDS_UPDATE,
  ];

  // Realistic furniture product data
  const furnitureProducts = [
    // BEDS
    { title: 'King Size Wooden Bed Frame', category: ProductCategory.BEDS, price: 45000, brand: 'Master Molty', material: 'Wood', colors: ['Brown', 'Natural Wood'], description: 'Solid wood king size bed frame with elegant headboard design. Perfect for master bedrooms.' },
    { title: 'Queen Size Upholstered Bed', category: ProductCategory.BEDS, price: 38000, brand: 'Interwood', material: 'Fabric', colors: ['Gray', 'Beige'], description: 'Comfortable queen size bed with premium fabric upholstery and button tufting.' },
    { title: 'Single Bed with Storage', category: ProductCategory.BEDS, price: 22000, brand: 'Habitt', material: 'Wood', colors: ['White', 'Oak'], description: 'Space-saving single bed with built-in storage drawers underneath.' },
    { title: 'Double Bed Metal Frame', category: ProductCategory.BEDS, price: 18000, brand: 'Steel Craft', material: 'Metal', colors: ['Black', 'Silver'], description: 'Durable metal bed frame with modern minimalist design.' },

    // CHAIRS
    { title: 'Executive Office Chair', category: ProductCategory.CHAIRS, price: 15000, brand: 'Ergonomic Plus', material: 'Leather', colors: ['Black', 'Brown'], description: 'High-back executive chair with lumbar support and adjustable height.' },
    { title: 'Dining Chair Set (4 pieces)', category: ProductCategory.CHAIRS, price: 28000, brand: 'Dining Deluxe', material: 'Wood', colors: ['Walnut', 'Cherry'], description: 'Set of 4 elegant dining chairs with cushioned seats and solid wood construction.' },
    { title: 'Gaming Chair RGB', category: ProductCategory.CHAIRS, price: 25000, brand: 'GameZone', material: 'Fabric', colors: ['Red', 'Blue', 'Black'], description: 'Professional gaming chair with RGB lighting and premium comfort features.' },
    { title: 'Accent Armchair', category: ProductCategory.CHAIRS, price: 32000, brand: 'Comfort Living', material: 'Fabric', colors: ['Navy', 'Mustard', 'Gray'], description: 'Stylish accent chair perfect for living rooms and reading corners.' },

    // TABLES
    { title: 'Glass Top Dining Table', category: ProductCategory.TABLES, price: 42000, brand: 'Glass Masters', material: 'Glass', colors: ['Clear', 'Smoked'], description: '6-seater glass dining table with chrome legs and tempered glass top.' },
    { title: 'Wooden Coffee Table', category: ProductCategory.TABLES, price: 18000, brand: 'Wood Works', material: 'Wood', colors: ['Oak', 'Mahogany'], description: 'Solid wood coffee table with storage shelf and rustic finish.' },
    { title: 'Study Desk with Drawers', category: ProductCategory.TABLES, price: 16000, brand: 'Study Smart', material: 'Wood', colors: ['White', 'Brown'], description: 'Functional study desk with multiple drawers and cable management.' },
    { title: 'Marble Top Side Table', category: ProductCategory.TABLES, price: 12000, brand: 'Marble Craft', material: 'Marble', colors: ['White', 'Black'], description: 'Elegant side table with genuine marble top and metal base.' },

    // SOFAS
    { title: '3-Seater Leather Sofa', category: ProductCategory.SOFAS, price: 85000, brand: 'Leather Luxe', material: 'Leather', colors: ['Black', 'Brown', 'Tan'], description: 'Premium leather 3-seater sofa with deep cushions and modern design.' },
    { title: 'L-Shaped Corner Sofa', category: ProductCategory.SOFAS, price: 95000, brand: 'Corner Comfort', material: 'Fabric', colors: ['Gray', 'Beige', 'Navy'], description: 'Spacious L-shaped sofa perfect for large living rooms and family gatherings.' },
    { title: 'Recliner Sofa Set', category: ProductCategory.SOFAS, price: 120000, brand: 'Relax Zone', material: 'Leather', colors: ['Brown', 'Black'], description: '3-piece recliner sofa set with manual reclining mechanism.' },
    { title: 'Loveseat Sofa', category: ProductCategory.SOFAS, price: 45000, brand: 'Cozy Corner', material: 'Fabric', colors: ['Pink', 'Blue', 'Green'], description: 'Compact 2-seater loveseat perfect for small spaces and apartments.' },

    // WARDROBES
    { title: '4-Door Wardrobe with Mirror', category: ProductCategory.WARDROBES, price: 65000, brand: 'Wardrobe World', material: 'Wood', colors: ['White', 'Brown'], description: 'Spacious 4-door wardrobe with full-length mirror and multiple compartments.' },
    { title: 'Sliding Door Wardrobe', category: ProductCategory.WARDROBES, price: 55000, brand: 'Slide Easy', material: 'Wood', colors: ['Oak', 'Walnut'], description: 'Modern sliding door wardrobe with soft-close mechanism and LED lighting.' },
    { title: 'Corner Wardrobe Unit', category: ProductCategory.WARDROBES, price: 48000, brand: 'Space Saver', material: 'Wood', colors: ['White', 'Gray'], description: 'Corner wardrobe unit designed to maximize space utilization.' },

    // STORAGE
    { title: 'Bookshelf 5-Tier', category: ProductCategory.STORAGE, price: 14000, brand: 'Book Haven', material: 'Wood', colors: ['Brown', 'White'], description: '5-tier bookshelf with adjustable shelves and anti-tip safety feature.' },
    { title: 'Storage Ottoman', category: ProductCategory.STORAGE, price: 8000, brand: 'Multi Use', material: 'Fabric', colors: ['Gray', 'Brown', 'Black'], description: 'Multi-functional storage ottoman that doubles as seating.' },
    { title: 'TV Console with Storage', category: ProductCategory.STORAGE, price: 22000, brand: 'Media Master', material: 'Wood', colors: ['Black', 'White'], description: 'Modern TV console with cable management and storage compartments.' },
    { title: 'Chest of Drawers', category: ProductCategory.STORAGE, price: 18000, brand: 'Drawer Deluxe', material: 'Wood', colors: ['Oak', 'Pine'], description: '6-drawer chest with smooth sliding mechanism and elegant handles.' },

    // OTHER
    { title: 'Room Divider Screen', category: ProductCategory.OTHER, price: 12000, brand: 'Privacy Plus', material: 'Wood', colors: ['Natural', 'Black'], description: '3-panel room divider screen for creating private spaces.' },
    { title: 'Bar Stool Set (2 pieces)', category: ProductCategory.OTHER, price: 16000, brand: 'Bar Basics', material: 'Metal', colors: ['Black', 'Chrome'], description: 'Set of 2 adjustable height bar stools with footrest.' },
    { title: 'Shoe Rack 3-Tier', category: ProductCategory.OTHER, price: 6000, brand: 'Shoe Store', material: 'Metal', colors: ['Black', 'Silver'], description: '3-tier shoe rack that can hold up to 12 pairs of shoes.' },
  ];

  // Create products using the realistic data
  for (let i = 0; i < furnitureProducts.length; i++) {
    const productData = furnitureProducts[i];
    const product = await prisma.product.create({
      data: {
        ownerId: users[i % users.length].id,
        title: productData.title,
        description: productData.description,
        price: productData.price + (Math.random() * 5000 - 2500), // Add some price variation
        category: productData.category,
        condition: conditions[i % conditions.length],
        photos: [
          `https://images.unsplash.com/photo-furniture-${i + 1}-1.jpg`,
          `https://images.unsplash.com/photo-furniture-${i + 1}-2.jpg`,
          `https://images.unsplash.com/photo-furniture-${i + 1}-3.jpg`,
        ],
        brand: productData.brand,
        colors: productData.colors,
        location: [
          'Karachi - Gulshan',
          'Lahore - DHA',
          'Islamabad - F-7',
          'Rawalpindi - Saddar',
          'Faisalabad - Civil Lines',
          'Karachi - Clifton',
          'Lahore - Johar Town',
          'Islamabad - Blue Area',
        ][i % 8],
        material: productData.material,
        productTags: [
          'furniture',
          productData.category.toLowerCase().replace('_', '-'),
          productData.material.toLowerCase(),
          'quality',
          'home-decor',
        ],
        quantity: Math.floor(Math.random() * 3) + 1,
        sku: `FUR-${String(i + 1).padStart(4, '0')}`,
        facebookPostingStatus: facebookStatuses[i % facebookStatuses.length],
        facebookListingUrl:
          i % 4 === 0 ? `https://facebook.com/marketplace/item/furniture-${i + 1}` : null,
        facebookLastPosted:
          i % 3 === 0
            ? new Date(Date.now() - Math.random() * 14 * 24 * 60 * 60 * 1000)
            : null,
        facebookRetryCount: Math.floor(Math.random() * 2),
      },
    });
    products.push(product);
  }

  // Create additional random products to reach 50 total
  for (let i = furnitureProducts.length; i < 50; i++) {
    const randomCategory = categories[Math.floor(Math.random() * categories.length)];
    const product = await prisma.product.create({
      data: {
        ownerId: users[i % users.length].id,
        title: `${['Premium', 'Deluxe', 'Standard', 'Economy', 'Luxury'][i % 5]} ${randomCategory.toLowerCase().replace('_', ' ')} Item ${i + 1}`,
        description: `Quality ${randomCategory.toLowerCase().replace('_', ' ')} with modern design and excellent build quality. Suitable for contemporary homes and offices.`,
        price: Math.floor(Math.random() * 80000) + 5000,
        category: randomCategory,
        condition: conditions[i % conditions.length],
        photos: [
          `https://images.unsplash.com/photo-furniture-${i + 1}-1.jpg`,
          `https://images.unsplash.com/photo-furniture-${i + 1}-2.jpg`,
        ],
        brand: ['IKEA', 'Interwood', 'Habitt', 'Master Molty', 'Local Craft'][i % 5],
        colors: [
          ['Brown', 'Beige'],
          ['Black', 'White'],
          ['Gray', 'Silver'],
          ['Blue', 'Navy'],
          ['Red', 'Maroon'],
        ][i % 5],
        location: [
          'Karachi - North Nazimabad',
          'Lahore - Model Town',
          'Islamabad - G-9',
          'Rawalpindi - Committee Chowk',
          'Faisalabad - Ghulam Muhammad Abad',
        ][i % 5],
        material: ['Wood', 'Metal', 'Fabric', 'Leather', 'Plastic'][i % 5],
        productTags: [
          'furniture',
          randomCategory.toLowerCase(),
          'affordable',
          'durable',
        ],
        quantity: Math.floor(Math.random() * 4) + 1,
        sku: `FUR-${String(i + 1).padStart(4, '0')}`,
        facebookPostingStatus: facebookStatuses[i % facebookStatuses.length],
        facebookListingUrl:
          i % 5 === 0 ? `https://facebook.com/marketplace/item/furniture-${i + 1}` : null,
        facebookLastPosted:
          i % 4 === 0
            ? new Date(Date.now() - Math.random() * 21 * 24 * 60 * 60 * 1000)
            : null,
        facebookRetryCount: Math.floor(Math.random() * 3),
      },
    });
    products.push(product);
  }

  console.log('🛋️ Created products');

  // Create order requests
  for (let i = 0; i < 25; i++) {
    const productIndex = i % products.length;
    const productPrice = parseFloat(products[productIndex].price.toString());
    const advanceAmount = productPrice * 0.2; // 20% advance
    const platformCostAmount = productPrice * 0.05; // 5% platform cost
    const productCostAmount = productPrice * 0.8; // 80% product cost

    const customerNames = [
      'Ahmed Ali', 'Fatima Khan', 'Muhammad Hassan', 'Ayesha Malik', 'Omar Sheikh',
      'Zainab Ahmed', 'Ali Raza', 'Sana Tariq', 'Hamza Qureshi', 'Mariam Siddique',
      'Usman Bhatti', 'Nadia Iqbal', 'Bilal Ahmad', 'Rabia Nawaz', 'Faisal Mahmood',
      'Hina Rashid', 'Adnan Butt', 'Samina Khatoon', 'Kashif Mehmood', 'Rubina Bibi',
      'Tariq Hussain', 'Shazia Parveen', 'Imran Malik', 'Farah Naz', 'Shahid Awan'
    ];

    const cities = [
      'Karachi - Gulshan-e-Iqbal', 'Lahore - Gulberg', 'Islamabad - F-10',
      'Rawalpindi - Satellite Town', 'Faisalabad - Millat Town', 'Karachi - Defence',
      'Lahore - Cantt', 'Islamabad - G-11', 'Multan - Cantt', 'Peshawar - University Town'
    ];

    await prisma.orderRequest.create({
      data: {
        userId: users[i % users.length].id,
        productId: products[productIndex].id,
        platform: ['Facebook Marketplace', 'Dubizzle', 'WhatsApp Business', 'OLX', 'Direct Contact'][i % 5],
        decidedPrice: productPrice + (Math.random() * 2000 - 1000), // Small price variation
        advancePayment: i % 4 === 0, // Every 4th order has advance payment
        customerName: customerNames[i % customerNames.length],
        customerPhone: `+9230${String(Math.floor(Math.random() * 90000000) + 10000000)}`,
        customerWhatsapp: `+9230${String(Math.floor(Math.random() * 90000000) + 10000000)}`,
        customerEmail: `${customerNames[i % customerNames.length].toLowerCase().replace(' ', '.')}@gmail.com`,
        customerNotes:
          i % 3 === 0
            ? [
              'Please call before delivery',
              'Apartment building - 3rd floor',
              'Delivery between 2-5 PM only',
              'Handle with extra care - gift item',
              'Assembly required on site',
            ][i % 5]
            : null,
        deliveryAddress: `${cities[i % cities.length]}, House/Flat ${Math.floor(Math.random() * 500) + 1}`,
        deliveringDate: new Date(Date.now() + (Math.floor(Math.random() * 14) + 1) * 24 * 60 * 60 * 1000),
        deliveryDate: new Date(Date.now() + (Math.floor(Math.random() * 21) + 7) * 24 * 60 * 60 * 1000),
        status: [
          OrderStatus.PENDING,
          OrderStatus.CONFIRMED,
          OrderStatus.IN_PROGRESS,
          OrderStatus.DELIVERED,
          OrderStatus.PAYMENT_PENDING,
          OrderStatus.PARTIALLY_DELIVERED,
        ][i % 6],
        advancePay: i % 4 === 0 ? advanceAmount : null,
        platformCost: platformCostAmount,
        productCost: productCostAmount,
      },
    });
  }

  console.log('📦 Created orders');

  // Create payments for completed orders
  const orderRequests = await prisma.orderRequest.findMany();
  for (let i = 0; i < 20; i++) {
    const order = orderRequests[i % orderRequests.length];
    const totalPrice = parseFloat(order.decidedPrice.toString());
    const platformCost = totalPrice * 0.05; // 5% platform cost
    const productCost = totalPrice * 0.8; // 80% product cost
    const userShare = totalPrice * 0.75; // 75% to seller
    const referrerShare = i < 8 ? totalPrice * 0.05 : null; // 5% referrer commission for first 8
    const managerCommission = i < 8 ? totalPrice * 0.02 : null; // 2% manager commission for referrals

    await prisma.payment.create({
      data: {
        orderRequestId: order.id,
        userId: order.userId,
        userShare: userShare,
        referrerId: i < 8 ? users[i % 4].id : null, // Different users as referrers
        referrerShare: referrerShare,
        totalPrice: totalPrice,
        platformCost: platformCost,
        productCost: productCost,
        managerCommission: managerCommission,
        status: [
          PaymentStatus.PENDING,
          PaymentStatus.PAID,
          PaymentStatus.CANCELLED,
        ][i % 3],
        paymentType: i < 8 ? PaymentType.REFERRAL : PaymentType.SELLER,
        proofScreenshotUrl:
          i % 3 === 0 ? `https://cloudinary.com/payment-proof-${i + 1}.jpg` : null,
      },
    });
  }

  console.log('💰 Created payments');

  // Summary
  const counts = {
    users: await prisma.user.count(),
    profiles: await prisma.profile.count(),
    products: await prisma.product.count(),
    orders: await prisma.orderRequest.count(),
    payments: await prisma.payment.count(),
    referrals: await prisma.referral.count(),
  };

  console.log('\n🎉 Seeding completed!');
  console.log('📊 Summary:', counts);
  console.log('\n🔐 Login: admin@furniture.com / password123');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
