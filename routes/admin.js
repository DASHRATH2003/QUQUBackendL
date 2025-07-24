const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const auth = require('../middleware/auth');
const adminMiddleware = require('../middleware/admin');

// Get all users (admin only)
router.get('/users', auth, adminMiddleware, async (req, res) => {
  try {
    console.log('Fetching all users...');
    const users = await User.find().select('-password');
    console.log(`Found ${users.length} users`);
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Error fetching users', error: error.message });
  }
});

// Update user role (admin only)
router.put('/users/:userId/role', auth, adminMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    const { isAdmin } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.isAdmin = isAdmin;
    user.role = isAdmin ? 'admin' : 'user';
    await user.save();

    res.json({ message: 'User role updated successfully', user });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ message: 'Error updating user role', error: error.message });
  }
});

// Update notification settings
router.put('/notifications', auth, adminMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.notificationSettings = {
      ...user.notificationSettings,
      ...req.body
    };
    await user.save();

    res.json({ message: 'Notification settings updated', settings: user.notificationSettings });
  } catch (error) {
    console.error('Error updating notification settings:', error);
    res.status(500).json({ message: 'Error updating notification settings', error: error.message });
  }
});

// Update admin preferences
router.put('/preferences', auth, adminMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.adminPreferences = {
      ...user.adminPreferences,
      ...req.body
    };
    await user.save();

    res.json({ message: 'Admin preferences updated', preferences: user.adminPreferences });
  } catch (error) {
    console.error('Error updating admin preferences:', error);
    res.status(500).json({ message: 'Error updating admin preferences', error: error.message });
  }
});

// Get admin dashboard stats
router.get('/stats', auth, adminMiddleware, async (req, res) => {
  try {
    console.log('Fetching dashboard stats...');

    // Get total orders count
    const totalOrders = await Order.countDocuments();
    console.log('Total orders:', totalOrders);

    // Get total revenue (only from paid orders)
    const revenueData = await Order.aggregate([
      { 
        $match: { 
          isPaid: true
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$totalAmount' }
        }
      }
    ]);
    const totalRevenue = revenueData.length > 0 ? revenueData[0].total : 0;
    console.log('Total revenue:', totalRevenue);

    // Get total products
    const totalProducts = await Product.countDocuments();
    console.log('Total products:', totalProducts);

    // Get total users
    const totalUsers = await User.countDocuments();
    console.log('Total users:', totalUsers);

    // Get recent orders (last 5)
    const recentOrders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('shippingAddress totalAmount orderStatus createdAt isPaid');

    console.log('Recent orders found:', recentOrders.length);

    // Transform orders data
    const transformedOrders = recentOrders.map(order => ({
      id: order._id,
      customer: order.shippingAddress?.name || 'Guest User',
      amount: order.totalAmount || 0,
      status: order.orderStatus || 'processing',
      date: order.createdAt,
      isPaid: order.isPaid || false
    }));

    // Return dashboard data
    res.json({
      success: true,
      data: {
        stats: {
          totalOrders,
          totalRevenue,
          totalProducts,
          totalUsers
        },
        recentOrders: transformedOrders
      }
    });

  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard stats',
      error: error.message
    });
  }
});

// Get analytics data
router.get('/analytics', auth, adminMiddleware, async (req, res) => {
  try {
    const { timeRange = 'week' } = req.query;
    const now = new Date();
    let startDate;

    // Calculate start date based on time range
    switch (timeRange) {
      case 'week':
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'month':
        startDate = new Date(now.setMonth(now.getMonth() - 1));
        break;
      case 'year':
        startDate = new Date(now.setFullYear(now.getFullYear() - 1));
        break;
      default:
        startDate = new Date(now.setDate(now.getDate() - 7));
    }

    // Get sales data
    const salesData = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          isPaid: true
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
          },
          total: { $sum: "$totalAmount" }
        }
      },
      { $sort: { "_id": 1 } }
    ]);

    // Get order statistics
    const orderStats = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: "$orderStatus",
          count: { $sum: 1 }
        }
      }
    ]);

    // Get category data
    const categoryData = await Product.aggregate([
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 }
        }
      }
    ]);

    // Get summary statistics
    const summaryStats = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          isPaid: true
        }
      },
      {
        $group: {
          _id: null,
          totalSales: { $sum: "$totalAmount" },
          totalOrders: { $sum: 1 },
          averageOrderValue: { $avg: "$totalAmount" }
        }
      }
    ]);

    // Get top selling product
    const topProduct = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.productId",
          totalQuantity: { $sum: "$items.quantity" }
        }
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 1 },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "product"
        }
      }
    ]);

    // Format response data
    const formattedData = {
      salesData: {
        labels: salesData.map(item => item._id),
        values: salesData.map(item => item.total)
      },
      orderStats: [
        orderStats.find(s => s._id === 'pending')?.count || 0,
        orderStats.find(s => s._id === 'processing')?.count || 0,
        orderStats.find(s => s._id === 'shipped')?.count || 0,
        orderStats.find(s => s._id === 'delivered')?.count || 0,
        orderStats.find(s => s._id === 'cancelled')?.count || 0
      ],
      categoryData: {
        labels: categoryData.map(item => item._id),
        values: categoryData.map(item => item.count)
      },
      summaryStats: {
        totalSales: summaryStats[0]?.totalSales || 0,
        totalOrders: summaryStats[0]?.totalOrders || 0,
        averageOrderValue: summaryStats[0]?.averageOrderValue || 0,
        topSellingProduct: topProduct[0]?.product[0]?.name || 'N/A'
      }
    };

    res.json(formattedData);
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({
      message: 'Error fetching analytics data',
      error: error.message
    });
  }
});

module.exports = router; 