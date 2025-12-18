/**
 * Direct fix for revenue issue - Update delivered orders to paid status
 * This is a simpler, more direct approach
 * 
 * Usage: node scripts/fixRevenueIssue.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Order = require('../src/models/order.model');

async function fixRevenueIssue() {
  try {
    // Connect to MongoDB
    let DB;
    if (process.env.DATABASE && process.env.DATABASE.includes('<PASSWORD>')) {
      DB = process.env.DATABASE.replace(
        '<PASSWORD>',
        process.env.DATABASE_PASSWORD
      );
    } else {
      DB = process.env.DATABASE || process.env.MONGODB_URI;
    }

    if (!DB) {
      console.error('❌ DATABASE connection string not found in .env file');
      process.exit(1);
    }

    await mongoose.connect(DB, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ Connected to MongoDB\n');

    // First, let's see what we have
    console.log('📊 Current Status:');
    const totalDelivered = await Order.countDocuments({ orderStatus: 'delivered' });
    const deliveredWithPaid = await Order.countDocuments({ 
      orderStatus: 'delivered',
      paymentStatus: 'paid'
    });
    const deliveredNotPaid = await Order.countDocuments({
      orderStatus: 'delivered',
      paymentStatus: { $ne: 'paid' }
    });

    console.log(`   Total delivered orders: ${totalDelivered}`);
    console.log(`   Delivered with paymentStatus: "paid": ${deliveredWithPaid}`);
    console.log(`   Delivered without paymentStatus: "paid": ${deliveredNotPaid}\n`);

    // Get the orders that need fixing
    const ordersToFix = await Order.find({
      orderStatus: 'delivered',
      paymentStatus: { $ne: 'paid' }
    }).select('orderNumber paymentMethod paymentStatus totalAmount orderStatus');

    if (ordersToFix.length === 0) {
      console.log('✅ All delivered orders already have paymentStatus: "paid"');
      await mongoose.disconnect();
      return;
    }

    console.log(`📋 Found ${ordersToFix.length} delivered orders to fix:\n`);
    ordersToFix.forEach((order, index) => {
      console.log(
        `   ${index + 1}. ${order.orderNumber} | ${order.paymentMethod} | Current: ${order.paymentStatus || 'undefined'} | Amount: ${order.totalAmount}`
      );
    });

    // Calculate total revenue that will be added
    const totalRevenueToAdd = ordersToFix.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
    console.log(`\n💰 Total revenue to add: ${totalRevenueToAdd}\n`);

    // Update ALL delivered orders that are not already paid, failed, or refunded
    // Simple approach: update all delivered orders that don't have paymentStatus as 'paid'
    // But exclude ones that are explicitly 'failed' or 'refunded'
    const updateResult = await Order.updateMany(
      {
        orderStatus: 'delivered',
        paymentStatus: { $nin: ['paid', 'failed', 'refunded'] }
      },
      {
        $set: { paymentStatus: 'paid' }
      }
    );

    console.log(`✅ Update Results:`);
    console.log(`   Matched: ${updateResult.matchedCount} orders`);
    console.log(`   Modified: ${updateResult.modifiedCount} orders\n`);

    // Verify
    const afterDeliveredWithPaid = await Order.countDocuments({ 
      orderStatus: 'delivered',
      paymentStatus: 'paid'
    });

    console.log('📊 Verification:');
    console.log(`   Delivered orders with paymentStatus: "paid": ${afterDeliveredWithPaid}/${totalDelivered}`);

    // Calculate revenue after fix
    const revenueResult = await Order.aggregate([
      { $match: { paymentStatus: 'paid' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    const totalRevenue = revenueResult[0]?.total || 0;

    console.log(`   Total revenue (all paid orders): ${totalRevenue}\n`);

    if (afterDeliveredWithPaid === totalDelivered) {
      console.log('✅ SUCCESS! All delivered orders now have paymentStatus: "paid"');
      console.log('✅ Revenue should now be calculated correctly\n');
    } else {
      console.log(`⚠️  ${totalDelivered - afterDeliveredWithPaid} delivered orders still need fixing\n`);
    }

    await mongoose.disconnect();
    console.log('✅ Script completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixRevenueIssue();

