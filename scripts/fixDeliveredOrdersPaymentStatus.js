/**
 * Script to fix existing delivered orders that don't have paymentStatus set to "paid"
 * 
 * Run this script to update all delivered orders to have paymentStatus: "paid"
 * This fixes orders that were marked as delivered before the auto-update fix was implemented
 * 
 * Usage:
 *   node scripts/fixDeliveredOrdersPaymentStatus.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Order = require('../src/models/order.model');

async function fixDeliveredOrdersPaymentStatus() {
  try {
    // Connect to MongoDB
    const DB = process.env.DATABASE.replace(
      '<PASSWORD>',
      process.env.DATABASE_PASSWORD
    );

    await mongoose.connect(DB, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ Connected to MongoDB');

    // Find delivered orders that don't have paymentStatus as "paid"
    const deliveredOrders = await Order.find({
      orderStatus: 'delivered',
      $and: [
        { paymentStatus: { $ne: 'paid' } },
        { paymentStatus: { $nin: ['failed', 'refunded'] } } // Don't update failed/refunded orders
      ],
    }).select('orderNumber paymentMethod paymentStatus totalAmount orderStatus');

    console.log(`\n📊 Found ${deliveredOrders.length} delivered orders without paymentStatus: "paid"`);

    if (deliveredOrders.length === 0) {
      console.log('✅ All delivered orders already have paymentStatus: "paid"');
      await mongoose.disconnect();
      return;
    }

    // Display orders that will be updated
    console.log('\n📋 Orders to update:');
    deliveredOrders.forEach((order, index) => {
      console.log(
        `${index + 1}. Order: ${order.orderNumber} | Payment Method: ${order.paymentMethod} | Current Status: ${order.paymentStatus} | Amount: ${order.totalAmount}`
      );
    });

    // Update all delivered orders to have paymentStatus: "paid" (except failed/refunded)
    const result = await Order.updateMany(
      {
        orderStatus: 'delivered',
        paymentStatus: { $ne: 'paid' },
        $or: [
          { paymentStatus: { $exists: false } },
          { paymentStatus: { $nin: ['failed', 'refunded'] } }
        ]
      },
      {
        $set: { paymentStatus: 'paid' },
      }
    );

    console.log(`\n✅ Successfully updated ${result.modifiedCount} orders`);
    console.log(`✅ Matched ${result.matchedCount} orders`);
    console.log(`\n💰 Revenue should now be calculated correctly for these orders`);

    // Verify the update
    const updatedOrders = await Order.countDocuments({
      orderStatus: 'delivered',
      paymentStatus: 'paid',
    });

    const totalDelivered = await Order.countDocuments({
      orderStatus: 'delivered',
    });

    console.log(`\n📊 Verification:`);
    console.log(`   Total delivered orders: ${totalDelivered}`);
    console.log(`   Delivered orders with paymentStatus: "paid": ${updatedOrders}`);

    if (updatedOrders === totalDelivered) {
      console.log('   ✅ All delivered orders now have paymentStatus: "paid"');
    } else {
      console.log(
        `   ⚠️  ${totalDelivered - updatedOrders} delivered orders still need payment status update`
      );
    }

    await mongoose.disconnect();
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run the script
fixDeliveredOrdersPaymentStatus();

