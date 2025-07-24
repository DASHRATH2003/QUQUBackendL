const express = require('express');
const router = express.Router();
const paypal = require('@paypal/checkout-server-sdk');
const { client } = require('../config/paypal');
const auth = require('../middleware/auth');
const Order = require('../models/Order');

// Create PayPal order
router.post('/create-order', auth, async (req, res) => {
  try {
    const { items, totalAmount } = req.body;

    const request = new paypal.orders.OrdersCreateRequest();
    request.prefer("return=representation");
    request.requestBody({
      intent: 'CAPTURE',
      purchase_units: [{
        amount: {
          currency_code: 'GBP',
          value: totalAmount.toString(),
          breakdown: {
            item_total: {
              currency_code: 'GBP',
              value: totalAmount.toString()
            }
          }
        },
        items: items.map(item => ({
          name: item.name,
          unit_amount: {
            currency_code: 'GBP',
            value: (item.price * 0.0096).toFixed(2) // Converting to GBP
          },
          quantity: item.quantity.toString()
        }))
      }]
    });

    const order = await client.execute(request);
    res.json({ id: order.result.id });
  } catch (error) {
    console.error('Error creating PayPal order:', error);
    res.status(500).json({ error: 'Error creating PayPal order' });
  }
});

// Capture PayPal order (complete the transaction)
router.post('/capture-order', auth, async (req, res) => {
  try {
    const { orderID } = req.body;

    const request = new paypal.orders.OrdersCaptureRequest(orderID);
    request.requestBody({});

    const capture = await client.execute(request);
    
    // Create order in our database
    const captureData = capture.result;
    const newOrder = new Order({
      user: req.user._id,
      products: req.body.items.map(item => ({
        product: item.id,
        quantity: item.quantity,
        price: item.price
      })),
      totalAmount: req.body.totalAmount,
      shippingAddress: {
        street: captureData.purchase_units[0].shipping.address.address_line_1,
        city: captureData.purchase_units[0].shipping.address.admin_area_2,
        state: captureData.purchase_units[0].shipping.address.admin_area_1,
        zipCode: captureData.purchase_units[0].shipping.address.postal_code,
        country: captureData.purchase_units[0].shipping.address.country_code
      },
      paymentInfo: {
        paymentId: captureData.id,
        status: 'completed'
      }
    });

    await newOrder.save();

    res.json({
      status: 'success',
      orderData: captureData,
      orderId: newOrder._id
    });
  } catch (error) {
    console.error('Error capturing PayPal order:', error);
    res.status(500).json({ error: 'Error capturing PayPal order' });
  }
});

module.exports = router; 