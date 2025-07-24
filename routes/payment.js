const express = require('express');
const router = express.Router();
const paypal = require('@paypal/checkout-server-sdk');
const auth = require('../middleware/auth');

// PayPal client configuration
function client() {
    return new paypal.core.PayPalHttpClient(environment());
}

function environment() {
    const clientId = process.env.PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

    return new paypal.core.SandboxEnvironment(clientId, clientSecret);
}

// Create PayPal order
router.post('/create-order', auth, async (req, res) => {
    try {
        const { amount, items } = req.body;

        const request = new paypal.orders.OrdersCreateRequest();
        request.prefer("return=representation");
        request.requestBody({
            intent: 'CAPTURE',
            purchase_units: [{
                amount: {
                    currency_code: 'GBP',
                    value: amount.toString(),
                    breakdown: {
                        item_total: {
                            currency_code: 'GBP',
                            value: amount.toString()
                        }
                    }
                },
                items: items.map(item => ({
                    name: item.name,
                    unit_amount: {
                        currency_code: 'GBP',
                        value: item.price.toString()
                    },
                    quantity: item.quantity.toString()
                }))
            }]
        });

        const order = await client().execute(request);
        res.json({
            id: order.result.id
        });
    } catch (error) {
        console.error('PayPal create order error:', error);
        res.status(500).json({
            error: 'Error creating PayPal order',
            details: error.message
        });
    }
});

// Capture PayPal payment
router.post('/capture-order', auth, async (req, res) => {
    try {
        const { orderID } = req.body;
        
        const request = new paypal.orders.OrdersCaptureRequest(orderID);
        request.requestBody({});

        const capture = await client().execute(request);
        
        res.json({
            status: 'success',
            orderData: capture.result
        });
    } catch (error) {
        console.error('PayPal capture order error:', error);
        res.status(500).json({
            error: 'Error capturing PayPal payment',
            details: error.message
        });
    }
});

module.exports = router; 