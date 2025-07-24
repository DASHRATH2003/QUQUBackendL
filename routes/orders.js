const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Product = require('../models/Product');
const auth = require('../middleware/auth');

// Get user's orders
router.get('/my-orders', auth, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .populate('products.product')
      .sort('-createdAt');
    res.json(orders);
  } catch (error) {
    console.error('Error fetching user orders:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all orders
router.get('/', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    // Get total count
    const totalOrders = await Order.countDocuments();

    // Fetch orders with pagination
    const orders = await Order.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Transform orders for frontend
    const transformedOrders = orders.map(order => ({
      id: order._id.toString(),
      customer: order.shippingAddress?.name || 'Guest User',
      email: order.shippingAddress?.email || 'N/A',
      amount: order.totalAmount || 0,
      status: order.orderStatus || 'processing',
      date: order.createdAt,
      products: order.products?.map(product => ({
        name: product.name,
        quantity: product.quantity,
        price: product.price,
        image: product.image
      })) || [],
      shippingAddress: {
        name: order.shippingAddress?.name || '',
        email: order.shippingAddress?.email || '',
        phone: order.shippingAddress?.phone || '',
        street: order.shippingAddress?.street || '',
        city: order.shippingAddress?.city || '',
        postcode: order.shippingAddress?.postcode || '',
        country: order.shippingAddress?.country || 'GB'
      }
    }));

    // Return in the expected format
    return res.json({
      success: true,
      orders: transformedOrders,
      pagination: {
        total: totalOrders,
        page,
        pages: Math.ceil(totalOrders / limit),
        limit
      }
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Error fetching orders',
      error: error.message 
    });
  }
});

// Create new order
router.post('/', auth, async (req, res) => {
  try {
    const { 
      items, 
      totalAmount, 
      shippingAddress, 
      paymentId, 
      paymentStatus,
      paymentMethod,
      orderStatus = 'processing'
    } = req.body;

    // Create order with payment info
    const order = new Order({
      user: req.user._id,
      products: items.map(item => ({
        product: item.productId,
        quantity: item.quantity,
        price: item.price,
        name: item.name,
        image: item.image
      })),
      shippingAddress,
      totalAmount,
      orderStatus,
      paymentMethod,
      paymentInfo: {
        paymentId,
        status: paymentStatus
      }
    });

    // Save the order
    await order.save();

    // Update product stock
    for (let item of items) {
      const product = await Product.findById(item.productId);
      if (product) {
        product.stock = Math.max(0, product.stock - item.quantity);
        await product.save();
      }
    }

    // Return the saved order
    const populatedOrder = await Order.findById(order._id)
      .populate('user', 'name email')
      .populate('products.product');

    res.status(201).json(populatedOrder);
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ message: 'Error creating order', error: error.message });
  }
});

// Update order status (admin/creator only)
router.put('/:id/status', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin' && req.user.role !== 'creator') {
      return res.status(403).json({ 
        success: false,
        message: 'Not authorized. Admin access required.' 
      });
    }

    // Validate order status
    const { orderStatus } = req.body;
    const validStatuses = ['processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(orderStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order status. Must be one of: ' + validStatuses.join(', ')
      });
    }

    // Find and update order
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Update status
    order.orderStatus = orderStatus;
    await order.save();

    // Transform order data
    const transformedOrder = {
      id: order._id.toString(),
      customer: order.shippingAddress?.name || 'Guest User',
      email: order.shippingAddress?.email || 'N/A',
      amount: order.totalAmount || 0,
      status: order.orderStatus,
      date: order.createdAt,
      products: order.products?.map(product => ({
        name: product.name,
        quantity: product.quantity,
        price: product.price,
        image: product.image
      })) || [],
      shippingAddress: {
        name: order.shippingAddress?.name || '',
        email: order.shippingAddress?.email || '',
        phone: order.shippingAddress?.phone || '',
        street: order.shippingAddress?.street || '',
        city: order.shippingAddress?.city || '',
        postcode: order.shippingAddress?.postcode || '',
        country: order.shippingAddress?.country || 'GB'
      }
    };

    // Return success response
    res.json({
      success: true,
      message: `Order status updated to ${orderStatus}`,
      order: transformedOrder
    });

  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating order status',
      error: error.message
    });
  }
});

// Get single order details
router.get('/:id', auth, async (req, res) => {
  try {
    console.log('Fetching order with ID:', req.params.id);
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      console.log('Order not found');
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if user is admin or order belongs to user
    if (req.user.role !== 'admin' && req.user.role !== 'creator' && 
        order.user?.toString() !== req.user._id.toString()) {
      console.log('User not authorized');
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this order'
      });
    }

    console.log('Sending order data:', order);
    res.json({
      id: order._id,
      customer: order.shippingAddress?.name || 'Guest User',
      email: order.shippingAddress?.email || 'N/A',
      phone: order.shippingAddress?.phone || 'N/A',
      amount: order.totalAmount || 0,
      status: order.orderStatus,
      isPaid: order.isPaid || false,
      paidAt: order.paidAt,
      shippedAt: order.shippedAt,
      deliveredAt: order.deliveredAt,
      cancelledAt: order.cancelledAt,
      date: order.createdAt,
      products: order.products?.map(product => ({
        name: product.name,
        quantity: product.quantity,
        price: product.price,
        image: product.image
      })) || [],
      shippingAddress: {
        name: order.shippingAddress?.name || '',
        email: order.shippingAddress?.email || '',
        phone: order.shippingAddress?.phone || '',
        street: order.shippingAddress?.street || '',
        city: order.shippingAddress?.city || '',
        postcode: order.shippingAddress?.postcode || '',
        country: order.shippingAddress?.country || 'GB'
      }
    });
  } catch (error) {
    console.error('Error fetching order details:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching order details',
      error: error.message
    });
  }
});

// Test route to get order details
router.get('/test/:id', async (req, res) => {
  try {
    console.log('Test route - Fetching order with ID:', req.params.id);
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      console.log('Test route - Order not found');
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    console.log('Test route - Sending order data:', order);
    res.json(order);
  } catch (error) {
    console.error('Test route - Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error in test route',
      error: error.message
    });
  }
});

module.exports = router; 