import { PrismaClient } from '@prisma/client';
import {
  User,
  Profile,
  Product,
  OrderRequest,
  Payment,
  Referral,
  Role,
  BankAccount,
  ProductCategory,
  ProductCondition,
  OrderStatus,
  PaymentStatus,
  PaymentType,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Utility functions for data generation
function generateReferralCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function generateRandomPrice(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomEnum<T extends Record<string, string | number>>(
  enumObject: T,
): T[keyof T] {
  const values = Object.values(enumObject) as T[keyof T][];
  return values[Math.floor(Math.random() * values.length)];
}

function generatePhoneNumber(): string {
  return `+92${Math.floor(Math.random() * 9000000000) + 1000000000}`;
}

function generateWhatsAppNumber(): string {
  return `+92${Math.floor(Math.random() * 9000000000) + 1000000000}`;
}

function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

// Hash password utility
async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

// Seed function declarations with proper types
async function seedUsers(): Promise<User[]> {
  console.log('👤 Seeding users...');

  const usersData = [
    {
      email: 'admin@example.com',
      password: await hashPassword('admin123'),
      firstName: 'Admin',
      lastName: 'User',
      role: Role.ADMIN,
      isVerified: true,
    },
    {
      email: 'user1@example.com',
      password: await hashPassword('password1'),
      firstName: 'John',
      lastName: 'Doe',
      role: Role.USER,
      isVerified: true,
    },
    {
      email: 'user2@example.com',
      password: await hashPassword('password2'),
      firstName: 'Jane',
      lastName: 'Smith',
      role: Role.USER,
      isVerified: true,
    },
    {
      email: 'user3@example.com',
      password: await hashPassword('password3'),
      firstName: 'Alice',
      lastName: 'Johnson',
      role: Role.USER,
      isVerified: true,
    },
  ];

  const users: User[] = [];
  for (const userData of usersData) {
    const user = await prisma.user.create({
      data: userData,
    });
    users.push(user);
  }

  console.log(`✅ Created ${users.length} users`);
  return users;
}

async function seedProfiles(users: User[]): Promise<Profile[]> {
  console.log('👤 Seeding profiles...');

  const profiles: Profile[] = [];
  for (const user of users) {
    const firstName = user.firstName || 'User';
    const lastName = user.lastName || 'Profile';

    const profile = await prisma.profile.create({
      data: {
        userId: user.id,
        fullName: `${firstName} ${lastName}`,
        address: `Address for ${firstName} ${lastName}`,
        whatsappNumber: generateWhatsAppNumber(),
        bankAccount: getRandomEnum(BankAccount),
        facebookLink: `https://facebook.com/${firstName.toLowerCase()}.${lastName.toLowerCase()}`,
        dubizzleLink: `https://dubizzle.com/users/${user.id}`,
        verified: user.role === Role.ADMIN || Math.random() > 0.5, // Admins always verified, others 50% chance
        referralCode: generateReferralCode(),
        referredBy: user.role === Role.ADMIN ? undefined : users[0].id, // Regular users referred by admin
      },
    });
    profiles.push(profile);
  }

  console.log(`✅ Created ${profiles.length} profiles`);
  return profiles;
}

async function seedProducts(users: User[]): Promise<Product[]> {
  console.log('🛋️ Seeding products...');

  const productsData = [
    {
      title: 'Comfortable Sofa',
      category: ProductCategory.SOFAS,
      condition: ProductCondition.LIKE_NEW,
      brand: 'IKEA',
    },
    {
      title: 'Wooden Dining Table',
      category: ProductCategory.DINING_SETS,
      condition: ProductCondition.GOOD,
      brand: 'HomeCenter',
    },
    {
      title: 'Office Chair',
      category: ProductCategory.OFFICE_FURNITURE,
      condition: ProductCondition.NEW,
      brand: 'Herman Miller',
    },
    {
      title: 'King Size Bed',
      category: ProductCategory.BEDS,
      condition: ProductCondition.SECOND_HAND,
      brand: 'SleepWell',
    },
    {
      title: 'Wardrobe',
      category: ProductCategory.WARDROBES,
      condition: ProductCondition.FAIR,
      brand: 'HomeTown',
    },
    {
      title: 'Decorative Lamp',
      category: ProductCategory.DECORATIVE_ITEMS,
      condition: ProductCondition.NEW,
      brand: 'Philips',
    },
  ];

  const products: Product[] = [];
  for (const productData of productsData) {
    const owner = getRandomElement(users.filter((u) => u.role === Role.USER)); // Only regular users can own products
    const product = await prisma.product.create({
      data: {
        ownerId: owner.id,
        title: productData.title,
        description: `Description for ${productData.title}`,
        price: generateRandomPrice(1000, 50000),
        category: productData.category,
        condition: productData.condition,
        photos: [
          `https://example.com/photos/${productData.title.toLowerCase().replace(/ /g, '-')}.jpg`,
        ],
        brand: productData.brand,
        colors: ['Black', 'White', 'Brown'],
        location: 'Karachi, Pakistan',
        material: 'Wood',
        productTags: ['furniture', 'home'],
        quantity: 1,
      },
    });
    products.push(product);
  }

  console.log(`✅ Created ${products.length} products`);
  return products;
}

async function seedOrderRequests(
  users: User[],
  products: Product[],
): Promise<OrderRequest[]> {
  console.log('📦 Seeding order requests...');

  const orders: OrderRequest[] = [];
  for (let i = 0; i < 10; i++) {
    const user = getRandomElement(users.filter((u) => u.role === Role.USER));
    const product = getRandomElement(products);

    const order = await prisma.orderRequest.create({
      data: {
        userId: user.id,
        productId: product.id,
        platform: getRandomElement([
          'Website',
          'Facebook',
          'Instagram',
          'WhatsApp',
        ]),
        decidedPrice: product.price,
        advancePayment: Math.random() > 0.5,
        customerName: `${user.firstName} ${user.lastName}`,
        customerPhone: generatePhoneNumber(),
        customerWhatsapp: generateWhatsAppNumber(),
        customerEmail: user.email,
        customerNotes: `Order notes for ${product.title}`,
        deliveringDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        status: getRandomEnum(OrderStatus),
      },
    });
    orders.push(order);
  }

  console.log(`✅ Created ${orders.length} order requests`);
  return orders;
}

async function seedPayments(
  orders: OrderRequest[],
  users: User[],
): Promise<Payment[]> {
  console.log('💰 Seeding payments...');

  const payments: Payment[] = [];
  for (const order of orders) {
    const user = users.find((u) => u.id === order.userId);
    if (!user) continue;

    // 30% chance of having a referral
    const hasReferral = Math.random() < 0.3;
    const referrer = hasReferral
      ? getRandomElement(users.filter((u) => u.id !== user.id))
      : undefined;

    const payment = await prisma.payment.create({
      data: {
        orderRequestId: order.id,
        userId: user.id,
        userShare: Number(order.decidedPrice) * 0.8, // User gets 80%
        referrerId: referrer?.id,
        referrerShare: referrer ? Number(order.decidedPrice) * 0.2 : null, // Referrer gets 20%
        totalPrice: order.decidedPrice,
        proofScreenshotUrl: `https://example.com/payments/${order.id}.png`,
        status: getRandomEnum(PaymentStatus),
        paymentType: referrer ? PaymentType.REFERRAL : PaymentType.SELLER,
      },
    });
    payments.push(payment);
  }

  console.log(`✅ Created ${payments.length} payments`);
  return payments;
}

async function seedReferrals(users: User[]): Promise<Referral[]> {
  console.log('👥 Seeding referrals...');

  const referrals: Referral[] = [];
  // Create some referral relationships
  for (let i = 0; i < 5; i++) {
    const referrer = getRandomElement(users);
    // Find a user who is not the referrer and not already referred by this referrer
    const referee = getRandomElement(
      users.filter(
        (u) =>
          u.id !== referrer.id &&
          !referrals.some(
            (r) => r.referrerId === referrer.id && r.refereeId === u.id,
          ),
      ),
    );

    if (!referee) continue;

    const referral = await prisma.referral.create({
      data: {
        referrerId: referrer.id,
        refereeId: referee.id,
      },
    });
    referrals.push(referral);
  }

  console.log(`✅ Created ${referrals.length} referrals`);
  return referrals;
}

// Optional: Clear existing data
async function clearDatabase() {
  console.log('🧹 Clearing existing data...');

  // Delete in correct order to avoid foreign key constraints
  await prisma.payment.deleteMany();
  await prisma.orderRequest.deleteMany();
  await prisma.product.deleteMany();
  await prisma.referral.deleteMany();
  await prisma.profile.deleteMany();
  await prisma.user.deleteMany();

  console.log('✅ Database cleared');
}

// Main seeding function
async function main() {
  try {
    console.log('🌱 Starting database seeding...');

    // Test database connection
    await prisma.$connect();
    console.log('✅ Database connection established');

    // Clear existing data (optional - uncomment if needed)
    // await clearDatabase();

    // Execute seeding functions in order
    const users = await seedUsers();
    const profiles = await seedProfiles(users);
    const products = await seedProducts(users);
    const orders = await seedOrderRequests(users, products);
    const payments = await seedPayments(orders, users);
    const referrals = await seedReferrals(users);

    // Log summary
    console.log('\n📊 Seeding Summary:');
    console.log(`👤 Users: ${users.length}`);
    console.log(`👤 Profiles: ${profiles.length}`);
    console.log(`🛋️ Products: ${products.length}`);
    console.log(`📦 Orders: ${orders.length}`);
    console.log(`💰 Payments: ${payments.length}`);
    console.log(`👥 Referrals: ${referrals.length}`);

    console.log('\n🎉 Database seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Execute the main function
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
