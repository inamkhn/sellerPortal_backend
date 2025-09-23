import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Clear existing data
  await prisma.payment.deleteMany();
  await prisma.orderRequest.deleteMany();
  await prisma.message.deleteMany();
  await prisma.conversation.deleteMany();
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
      role: 'ADMIN',
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
      role: 'REFERRAL_MANAGER',
      isVerified: true,
    },
  });

  // Create 10 regular users
  const users: any[] = [];
  for (let i = 1; i <= 10; i++) {
    const user = await prisma.user.create({
      data: {
        email: `user${i}@example.com`,
        password: hashedPassword,
        firstName: `User${i}`,
        lastName: 'Test',
        role: 'USER',
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
      bankAccount: 'BANK_ACCOUNT',
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
      bankAccount: 'EASYPAISA',
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
        bankAccount: ['EASYPAISA', 'JAZZCASH', 'BANK_ACCOUNT'][i % 3] as any,
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

  // Create products
  const categories = ['BEDS', 'CHAIRS', 'TABLES', 'SOFAS', 'WARDROBES'];
  const conditions = ['NEW', 'LIKE_NEW', 'GOOD', 'FAIR'];
  const products: any[] = [];

  for (let i = 0; i < 20; i++) {
    const product = await prisma.product.create({
      data: {
        ownerId: users[i % users.length].id,
        title: `Product ${i + 1}`,
        description: `Description for product ${i + 1}`,
        price: parseFloat((Math.random() * 100000 + 10000).toFixed(2)),
        category: categories[i % categories.length] as any,
        condition: conditions[i % conditions.length] as any,
        photos: [`https://example.com/photo${i + 1}.jpg`],
        brand: `Brand${(i % 5) + 1}`,
        colors: [['Red', 'Blue', 'Green'][i % 3]],
        location: ['Karachi', 'Lahore', 'Islamabad'][i % 3],
        material: ['Wood', 'Metal', 'Fabric'][i % 3],
        productTags: [`tag${i + 1}`],
        quantity: Math.floor(Math.random() * 5) + 1,
        sku: `SKU-${String(i + 1).padStart(3, '0')}`,
      },
    });
    products.push(product);
  }

  console.log('🛋️ Created products');

  // Create order requests
  for (let i = 0; i < 10; i++) {
    await prisma.orderRequest.create({
      data: {
        userId: users[i % users.length].id,
        productId: products[i].id,
        platform: ['Facebook', 'Dubizzle', 'WhatsApp'][i % 3],
        decidedPrice: parseFloat(products[i].price.toString()),
        customerName: `Customer ${i + 1}`,
        customerPhone: `+92300${String(i + 1).padStart(7, '0')}`,
        customerWhatsapp: `+92300${String(i + 1).padStart(7, '0')}`,
        customerEmail: `customer${i + 1}@example.com`,
        status: ['PENDING', 'CONFIRMED', 'DELIVERED'][i % 3] as any,
        productName: products[i].title,
        productDescription: products[i].description,
      },
    });
  }

  console.log('📦 Created orders');

  // Create conversations
  for (let i = 0; i < 5; i++) {
    const conversation = await prisma.conversation.create({
      data: {
        user1Id: users[i].id,
        user2Id: users[i + 1].id,
      },
    });

    // Create messages
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderId: users[i].id,
        content: `Hello from user ${i + 1}`,
        isRead: true,
      },
    });

    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderId: users[i + 1].id,
        content: `Reply from user ${i + 2}`,
        isRead: false,
      },
    });
  }

  console.log('💬 Created conversations and messages');

  // Create some payments for completed orders
  const orderRequests = await prisma.orderRequest.findMany();
  for (let i = 0; i < 5; i++) {
    await prisma.payment.create({
      data: {
        orderRequestId: orderRequests[i].id,
        userId: orderRequests[i].userId,
        userShare: parseFloat((Math.random() * 50000 + 10000).toFixed(2)),
        totalPrice: parseFloat(orderRequests[i].decidedPrice.toString()),
        status: ['PENDING', 'PAID'][i % 2] as any,
        paymentType: 'SELLER',
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
    conversations: await prisma.conversation.count(),
    messages: await prisma.message.count(),
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
  .finally(() => {
    return prisma.$disconnect();
  });
