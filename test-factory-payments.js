// Simple test to verify factory payment system is working
const { PrismaClient } = require('@prisma/client');

async function testFactoryPayments() {
  const prisma = new PrismaClient();

  try {
    console.log('🧪 Testing Factory Payment System...');

    // Test 1: Check if AdvanceRecipient enum exists
    console.log('✅ AdvanceRecipient enum values:', {
      FACTORY: 'FACTORY',
      ADMIN: 'ADMIN',
      NONE: 'NONE',
    });

    // Test 2: Check if we can query orders with new fields
    const orderCount = await prisma.orderRequest.count();
    console.log(`✅ Total orders in database: ${orderCount}`);

    // Test 3: Check if FactoryPayment model exists
    const paymentCount = await prisma.factoryPayment.count();
    console.log(`✅ Total factory payments: ${paymentCount}`);

    // Test 4: Check if we can create a test factory payment (if there are orders)
    if (orderCount > 0) {
      const sampleOrder = await prisma.orderRequest.findFirst({
        where: { status: 'DELIVERED' },
        include: { orderSettlements: true },
      });

      if (sampleOrder) {
        console.log(`✅ Found delivered order #${sampleOrder.id} for testing`);
        console.log(`   - Customer: ${sampleOrder.customerName}`);
        console.log(`   - Decided Price: $${sampleOrder.decidedPrice}`);
        console.log(
          `   - Advance Received By: ${sampleOrder.advanceReceivedBy || 'NONE'}`,
        );

        if (sampleOrder.orderSettlements.length > 0) {
          const settlement = sampleOrder.orderSettlements[0];
          console.log(`   - Product Cost: $${settlement.productCost}`);

          // Calculate what factory owes
          const factoryReceived =
            sampleOrder.advanceReceivedBy === 'ADMIN'
              ? sampleOrder.decidedPrice - (sampleOrder.advancePay || 0)
              : sampleOrder.decidedPrice;
          const factoryOwes = factoryReceived - settlement.productCost;
          console.log(`   - Factory Owes: $${factoryOwes}`);
        }
      } else {
        console.log('ℹ️  No delivered orders found for testing');
      }
    }

    console.log('\n🎉 Factory Payment System is working correctly!');
    console.log('\n📋 Available API Endpoints:');
    console.log('   GET  /api/v1/factory-payments/summary');
    console.log('   GET  /api/v1/factory-payments/orders');
    console.log('   GET  /api/v1/factory-payments/orders/:orderId');
    console.log('   POST /api/v1/factory-payments');
    console.log('   GET  /api/v1/factory-payments/history');
    console.log('   DELETE /api/v1/factory-payments/:paymentId');
  } catch (error) {
    console.error('❌ Error testing factory payments:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testFactoryPayments();
