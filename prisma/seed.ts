import { PrismaClient } from '@prisma/client';
import {
  Role,
  BankAccount,
  ProductCondition,
  OrderStatus,
  FacebookPostingStatus,
  OrderSettlementStatus,
} from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Clear existing data
  await prisma.settlement.deleteMany({});
  await prisma.orderSettlement.deleteMany({});
  await prisma.customProduct.deleteMany({});
  await prisma.orderRequest.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.category.deleteMany({});
  await prisma.referral.deleteMany({});
  await prisma.profile.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.category.deleteMany({});

  console.log('🗑️  Cleared existing data');

  // 1. Create Users with different roles
  const admin = await prisma.user.create({
    data: {
      email: 'admin@furniture.com',
      password: '$2b$10$hashedpassword', // bcrypt hash
      firstName: 'Admin',
      lastName: 'User',
      role: Role.ADMIN,
      isVerified: true,
      createdAt: new Date('2024-01-01'),
    },
  });

  await prisma.user.create({
    data: {
      email: 'referral@furniture.com',
      password: '$2b$10$hashedpassword',
      firstName: 'Referral',
      lastName: 'Manager',
      role: Role.REFERRAL_MANAGER,
      isVerified: true,
      createdAt: new Date('2024-01-02'),
    },
  });

  // Create referrer (who will refer others)
  const referrer = await prisma.user.create({
    data: {
      email: 'referrer@furniture.com',
      password: '$2b$10$hashedpassword',
      firstName: 'John',
      lastName: 'Referrer',
      role: Role.USER,
      isVerified: true,
      createdAt: new Date('2024-01-03'),
    },
  });

  // Create sellers (some referred, some not)
  const sellerReferred = await prisma.user.create({
    data: {
      email: 'seller.referred@furniture.com',
      password: '$2b$10$hashedpassword',
      firstName: 'Ahmed',
      lastName: 'Khan',
      role: Role.USER,
      isVerified: true,
      createdAt: new Date('2024-01-10'),
    },
  });

  const sellerDirect = await prisma.user.create({
    data: {
      email: 'seller.direct@furniture.com',
      password: '$2b$10$hashedpassword',
      firstName: 'Sara',
      lastName: 'Ali',
      role: Role.USER,
      isVerified: true,
      createdAt: new Date('2024-01-15'),
    },
  });

  const sellerGoogle = await prisma.user.create({
    data: {
      email: 'seller.google@furniture.com',
      googleId: 'google_123456789',
      firstName: 'Hassan',
      lastName: 'Sheikh',
      role: Role.USER,
      isVerified: true,
      createdAt: new Date('2024-01-20'),
    },
  });

  console.log('👥 Created users');

  // 2. Create Profiles for all users
  await prisma.profile.create({
    data: {
      userId: referrer.id,
      fullName: 'John Referrer',
      address: 'Lahore, Pakistan',
      whatsappNumber: '+92300-1234567',
      bankAccount: BankAccount.EASYPAISA,
      accountNumber: '03001234567',
      facebookLink: 'https://facebook.com/johnreferrer',
      verified: true,
      referralCode: 'JOHN2024',
      listedProducts: [],
    },
  });

  await prisma.profile.create({
    data: {
      userId: sellerReferred.id,
      fullName: 'Ahmed Khan',
      address: 'Karachi, Pakistan',
      whatsappNumber: '+92301-9876543',
      bankAccount: BankAccount.JAZZCASH,
      accountNumber: '03019876543',
      dubizzleLink: 'https://dubizzle.pk/ahmed-furniture',
      verified: true,
      referralCode: 'AHMED2024',
      referredBy: referrer.id, // This seller was referred
      listedProducts: [],
    },
  });

  await prisma.profile.create({
    data: {
      userId: sellerDirect.id,
      fullName: 'Sara Ali',
      address: 'Islamabad, Pakistan',
      whatsappNumber: '+92302-5555555',
      bankAccount: BankAccount.BANK_ACCOUNT,
      accountNumber: 'ACC-789456123',
      facebookLink: 'https://facebook.com/sara.furniture',
      verified: true,
      referralCode: 'SARA2024',
      // No referredBy - direct signup
      listedProducts: [],
    },
  });

  await prisma.profile.create({
    data: {
      userId: sellerGoogle.id,
      fullName: 'Hassan Sheikh',
      address: 'Faisalabad, Pakistan',
      whatsappNumber: '+92303-7777777',
      bankAccount: BankAccount.OTHER,
      accountNumber: 'BANK-456789',
      verified: false, // Not yet verified
      referralCode: 'HASSAN2024',
      listedProducts: [],
    },
  });

  console.log('📋 Created profiles');

  // 3. Create Referral relationships
  await prisma.referral.create({
    data: {
      referrerId: referrer.id,
      refereeId: sellerReferred.id,
      createdAt: new Date('2024-01-10'),
    },
  });

  console.log('🔗 Created referral relationships');

  // 4. Create Categories
  const categories = await Promise.all([
    prisma.category.create({ data: { name: 'BEDS' } }),
    prisma.category.create({ data: { name: 'TABLES' } }),
    prisma.category.create({ data: { name: 'SOFAS' } }),
    prisma.category.create({ data: { name: 'CHAIRS' } }),
    prisma.category.create({ data: { name: 'WARDROBES' } }),
  ]);

  console.log('📂 Created categories');

  // 5. Create Products with different categories and conditions
  const products = await Promise.all([
    // Ahmed's products (referred seller)
    prisma.product.create({
      data: {
        ownerId: sellerReferred.id,
        title: 'Modern King Size Bed',
        description: 'Beautiful wooden king size bed with storage',
        price: 85000.0,
        categoryId: categories[0].id, // Beds
        condition: ProductCondition.NEW,
        photos: ['bed1.jpg', 'bed2.jpg'],
        brand: 'Master Furniture',
        colors: ['Brown', 'Black'],
        location: 'Karachi',
        material: 'Sheesham Wood',
        productTags: ['king-size', 'storage', 'modern'],
        quantity: 2,
        sku: 'BED-001',
        facebookPostingStatus: FacebookPostingStatus.POSTED,
        facebookListingUrl: 'https://facebook.com/marketplace/item/123',
        facebookLastPosted: new Date('2024-02-01'),
        createdAt: new Date('2024-01-25'),
      },
    }),

    prisma.product.create({
      data: {
        ownerId: sellerReferred.id,
        title: 'Dining Table Set 6 Chairs',
        description: 'Complete dining set with 6 chairs',
        price: 120000.0,
        categoryId: categories[2].id, // Tables
        condition: ProductCondition.LIKE_NEW,
        photos: ['table1.jpg', 'table2.jpg', 'table3.jpg'],
        brand: 'Elite Furniture',
        colors: ['Walnut', 'Natural'],
        location: 'Karachi',
        material: 'Solid Wood',
        productTags: ['dining', '6-seater', 'family'],
        quantity: 1,
        sku: 'TABLE-001',
        facebookPostingStatus: FacebookPostingStatus.NOT_POSTED,
        createdAt: new Date('2024-02-01'),
      },
    }),

    // Sara's products (direct seller)
    prisma.product.create({
      data: {
        ownerId: sellerDirect.id,
        title: 'L-Shape Sofa Set',
        description: 'Comfortable L-shape sofa perfect for living room',
        price: 95000.0,
        categoryId: categories[3].id, // Sofas
        condition: ProductCondition.NEW,
        photos: ['sofa1.jpg', 'sofa2.jpg'],
        brand: 'Comfort Plus',
        colors: ['Grey', 'Beige'],
        location: 'Islamabad',
        material: 'Fabric',
        productTags: ['l-shape', 'comfortable', 'modern'],
        quantity: 1,
        sku: 'SOFA-001',
        facebookPostingStatus: FacebookPostingStatus.FAILED,
        facebookRetryCount: 2,
        createdAt: new Date('2024-02-05'),
      },
    }),

    prisma.product.create({
      data: {
        ownerId: sellerDirect.id,
        title: 'Office Chair Executive',
        description: 'High-back executive office chair with lumbar support',
        price: 25000.0,
        categoryId: categories[1].id, // Chairs
        condition: ProductCondition.GOOD,
        photos: ['chair1.jpg'],
        brand: 'Office Pro',
        colors: ['Black'],
        location: 'Islamabad',
        material: 'Leather',
        productTags: ['office', 'executive', 'ergonomic'],
        quantity: 3,
        sku: 'CHAIR-001',
        facebookPostingStatus: FacebookPostingStatus.POSTING,
        createdAt: new Date('2024-02-10'),
      },
    }),

    // Hassan's products (Google signup, unverified)
    prisma.product.create({
      data: {
        ownerId: sellerGoogle.id,
        title: 'Wardrobe 3 Door',
        description: 'Spacious 3-door wardrobe with mirror',
        price: 65000.0,
        categoryId: categories[4].id, // Wardrobes
        condition: ProductCondition.SECOND_HAND,
        photos: ['wardrobe1.jpg', 'wardrobe2.jpg'],
        brand: 'Home Style',
        colors: ['White', 'Brown'],
        location: 'Faisalabad',
        material: 'Plywood',
        productTags: ['3-door', 'mirror', 'spacious'],
        quantity: 1,
        sku: 'WARD-001',
        facebookPostingStatus: FacebookPostingStatus.NEEDS_UPDATE,
        createdAt: new Date('2024-02-15'),
      },
    }),
  ]);

  console.log('🛋️  Created products');

  // 5. Create Order Requests with different scenarios
  const orderRequests = await Promise.all([
    // Completed order from referred seller (will have referral commission)
    prisma.orderRequest.create({
      data: {
        userId: sellerReferred.id,
        productId: products[0].id, // King Size Bed
        platform: 'Facebook Marketplace',
        decidedPrice: 82000.0, // Negotiated down from 85000
        advancePayment: true,
        advancePay: 20000.0,
        customerName: 'Fatima Malik',
        customerPhone: '+92321-1111111',
        customerWhatsapp: '+92321-1111111',
        customerEmail: 'fatima@email.com',
        customerNotes: 'Need delivery on weekend',
        deliveryAddress: 'DHA Phase 5, Karachi',
        deliveryDate: new Date('2024-02-20'),
        status: OrderStatus.DELIVERED, // Completed order
        createdAt: new Date('2024-02-10'),
        updatedAt: new Date('2024-02-22'),
      },
    }),

    // In-progress order from direct seller (no referral)
    prisma.orderRequest.create({
      data: {
        userId: sellerDirect.id,
        productId: products[2].id, // L-Shape Sofa
        platform: 'Dubizzle',
        decidedPrice: 90000.0,
        advancePayment: false,
        customerName: 'Ali Hassan',
        customerPhone: '+92322-2222222',
        customerWhatsapp: '+92322-2222222',
        customerEmail: 'ali@email.com',
        deliveryAddress: 'F-7, Islamabad',
        deliveryDate: new Date('2024-03-01'),
        status: OrderStatus.IN_PROGRESS,
        createdAt: new Date('2024-02-18'),
        updatedAt: new Date('2024-02-20'),
      },
    }),

    // Custom product order
    prisma.orderRequest.create({
      data: {
        userId: sellerReferred.id,
        isCustomProduct: true,
        platform: 'WhatsApp',
        decidedPrice: 150000.0,
        advancePayment: true,
        advancePay: 50000.0,
        customerName: 'Zara Ahmed',
        customerPhone: '+92323-3333333',
        customerWhatsapp: '+92323-3333333',
        customerEmail: 'zara@email.com',
        customerNotes: 'Custom design as per attached image',
        deliveryAddress: 'Gulshan-e-Iqbal, Karachi',
        deliveryDate: new Date('2024-03-15'),
        status: OrderStatus.CONFIRMED,
        createdAt: new Date('2024-02-25'),
        updatedAt: new Date('2024-02-26'),
      },
    }),

    // Pending order
    prisma.orderRequest.create({
      data: {
        userId: sellerGoogle.id,
        productId: products[4].id, // Wardrobe
        platform: 'Direct Contact',
        decidedPrice: 60000.0,
        advancePayment: false,
        customerName: 'Usman Khan',
        customerPhone: '+92324-4444444',
        customerWhatsapp: '+92324-4444444',
        customerEmail: 'usman@email.com',
        deliveryAddress: 'Peoples Colony, Faisalabad',
        status: OrderStatus.PENDING,
        createdAt: new Date('2024-02-28'),
      },
    }),

    // Cancelled order
    prisma.orderRequest.create({
      data: {
        userId: sellerDirect.id,
        productId: products[3].id, // Office Chair
        platform: 'Facebook',
        decidedPrice: 23000.0,
        advancePayment: false,
        customerName: 'Ayesha Siddique',
        customerPhone: '+92325-5555555',
        customerWhatsapp: '+92325-5555555',
        customerEmail: 'ayesha@email.com',
        status: OrderStatus.CANCELLED,
        createdAt: new Date('2024-02-20'),
        updatedAt: new Date('2024-02-22'),
      },
    }),
  ]);

  console.log('📦 Created order requests');

  // 6. Create Custom Product for custom order
  await prisma.customProduct.create({
    data: {
      orderRequestId: orderRequests[2].id, // Custom order
      name: 'Custom L-Shape Sofa with Recliner',
      description:
        'Custom designed L-shape sofa with built-in recliner and cup holders',
      categoryId: categories[3].id, // Sofas
      images: ['custom1.jpg', 'custom2.jpg', 'design.jpg'],
      createdAt: new Date('2024-02-26'),
    },
  });

  console.log('🎨 Created custom product');

  // 7. Create Order Settlement for completed order (with referral)
  const orderSettlement1 = await prisma.orderSettlement.create({
    data: {
      orderRequestId: orderRequests[0].id, // Completed bed order
      totalAmount: 82000.0,
      productCost: 60000.0,
      adminCommission: 8200.0, // 10% of total
      grossSellerAmount: 73800.0, // Total - admin commission
      referralCommission: 4100.0, // 5% of total (seller was referred)
      referralCommissionRate: 5.0,
      isFixedCommission: false,
      netSellerAmount: 69700.0, // Gross - referral commission
      referrerId: referrer.id, // John referred Ahmed
      referrerRole: Role.USER,
      adminSettledBy: admin.id,
      adminSettledAt: new Date('2024-02-23'),
      status: OrderSettlementStatus.SETTLED,
      createdAt: new Date('2024-02-22'),
      updatedAt: new Date('2024-02-23'),
    },
  });

  console.log('💰 Created order settlement');

  // 8. Create Individual Settlement Records
  await Promise.all([
    // Seller payment
    prisma.settlement.create({
      data: {
        orderSettlementId: orderSettlement1.id,
        userId: sellerReferred.id,
        settlementType: 'SELLER_PAYMENT' as const,
        amount: 69700.0,
        status: 'PAID' as const,
        paidAt: new Date('2024-02-23'),
        paymentProof: 'receipt_seller_001.jpg',
        notes: 'Paid via JazzCash to 03019876543',
        createdAt: new Date('2024-02-22'),
        updatedAt: new Date('2024-02-23'),
      },
    }),

    // Admin commission
    prisma.settlement.create({
      data: {
        orderSettlementId: orderSettlement1.id,
        userId: admin.id,
        settlementType: 'ADMIN_COMMISSION' as const,
        amount: 8200.0,
        status: 'PAID' as const,
        paidAt: new Date('2024-02-23'),
        notes: 'Platform commission collected',
        createdAt: new Date('2024-02-22'),
        updatedAt: new Date('2024-02-23'),
      },
    }),

    // Referral commission
    prisma.settlement.create({
      data: {
        orderSettlementId: orderSettlement1.id,
        userId: referrer.id,
        settlementType: 'REFERRAL_PAYMENT' as const,
        amount: 4100.0,
        status: 'PAID' as const,
        paidAt: new Date('2024-02-24'),
        paymentProof: 'receipt_referral_001.jpg',
        notes: 'Referral commission paid via EasyPaisa to 03001234567',
        createdAt: new Date('2024-02-22'),
        updatedAt: new Date('2024-02-24'),
      },
    }),
  ]);

  console.log('💸 Created settlement records');

  // 9. Create another settlement for direct seller (no referral)
  const orderSettlement2 = await prisma.orderSettlement.create({
    data: {
      orderRequestId: orderRequests[1].id, // In-progress sofa order
      totalAmount: 90000.0,
      productCost: 65000.0,
      adminCommission: 9000.0, // 10%
      grossSellerAmount: 81000.0,
      referralCommission: null, // No referral
      referralCommissionRate: null,
      netSellerAmount: 81000.0, // Same as gross (no referral deduction)
      referrerId: null,
      referrerRole: null,
      status: 'PENDING' as const, // Not yet settled
      createdAt: new Date('2024-02-28'),
    },
  });

  // Pending settlements for direct seller
  await Promise.all([
    prisma.settlement.create({
      data: {
        orderSettlementId: orderSettlement2.id,
        userId: sellerDirect.id,
        settlementType: 'SELLER_PAYMENT' as const,
        amount: 81000.0,
        status: 'PENDING' as const,
        notes: 'Awaiting delivery confirmation',
        createdAt: new Date('2024-02-28'),
      },
    }),

    prisma.settlement.create({
      data: {
        orderSettlementId: orderSettlement2.id,
        userId: admin.id,
        settlementType: 'ADMIN_COMMISSION' as const,
        amount: 9000.0,
        status: 'PENDING' as const,
        notes: 'Commission pending delivery',
        createdAt: new Date('2024-02-28'),
      },
    }),
  ]);

  console.log('⏳ Created pending settlements');

  // Update profile listed products
  await prisma.profile.update({
    where: { userId: sellerReferred.id },
    data: {
      listedProducts: [products[0].id.toString(), products[1].id.toString()],
    },
  });

  await prisma.profile.update({
    where: { userId: sellerDirect.id },
    data: {
      listedProducts: [products[2].id.toString(), products[3].id.toString()],
    },
  });

  await prisma.profile.update({
    where: { userId: sellerGoogle.id },
    data: {
      listedProducts: [products[4].id.toString()],
    },
  });

  console.log('📝 Updated profile listed products');

  console.log('✅ Seed completed successfully!');

  // Print summary
  console.log('\n📊 SEED SUMMARY:');
  console.log('================');
  console.log(`👥 Users: ${await prisma.user.count()}`);
  console.log(`📋 Profiles: ${await prisma.profile.count()}`);
  console.log(`🔗 Referrals: ${await prisma.referral.count()}`);
  console.log(`🛋️  Products: ${await prisma.product.count()}`);
  console.log(`🎨 Custom Products: ${await prisma.customProduct.count()}`);
  console.log(`📦 Order Requests: ${await prisma.orderRequest.count()}`);
  console.log(`💰 Order Settlements: ${await prisma.orderSettlement.count()}`);
  console.log(`💸 Individual Settlements: ${await prisma.settlement.count()}`);

  console.log('\n🎯 SCENARIOS COVERED:');
  console.log('====================');
  console.log('✓ Admin, Referral Manager, and User roles');
  console.log('✓ Google OAuth and regular signup');
  console.log('✓ Verified and unverified profiles');
  console.log('✓ Referred and direct signups');
  console.log('✓ All product categories and conditions');
  console.log('✓ Facebook posting statuses');
  console.log('✓ All order statuses (PENDING to DELIVERED)');
  console.log('✓ Custom product orders');
  console.log('✓ Orders with and without referral commissions');
  console.log('✓ Completed settlements (PAID)');
  console.log('✓ Pending settlements');
  console.log('✓ Different payment methods (EasyPaisa, JazzCash, Bank)');
  console.log('✓ Advance payments and full payments');
  console.log('✓ Multiple platforms (Facebook, Dubizzle, WhatsApp)');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
