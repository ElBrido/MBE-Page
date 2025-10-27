const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');
const db = require('../config/database');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Create payment intent
router.post('/create-payment-intent', isAuthenticated, express.json(), async (req, res) => {
    try {
        const { orderId, amount } = req.body;

        // Verify order belongs to user
        const orderResult = await db.query(
            'SELECT * FROM orders WHERE id = $1 AND user_id = $2',
            [orderId, req.session.user.id]
        );

        if (orderResult.rows.length === 0) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Create payment intent with Stripe
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount * 100), // Convert to cents
            currency: 'usd',
            metadata: {
                orderId: orderId,
                userId: req.session.user.id
            },
            automatic_payment_methods: {
                enabled: true,
            }
        });

        // Update order with payment intent ID
        await db.query(
            'UPDATE orders SET stripe_payment_intent_id = $1 WHERE id = $2',
            [paymentIntent.id, orderId]
        );

        res.json({ 
            clientSecret: paymentIntent.client_secret,
            publishableKey: process.env.STRIPE_PUBLIC_KEY
        });
    } catch (err) {
        console.error('Payment intent creation error:', err);
        res.status(500).json({ error: 'Failed to create payment intent' });
    }
});

// Webhook handler for Stripe events
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        event = stripe.webhooks.constructEvent(
            req.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
        case 'payment_intent.succeeded':
            const paymentIntent = event.data.object;
            console.log('PaymentIntent was successful!', paymentIntent.id);

            // Update order status
            await db.query(
                `UPDATE orders 
                 SET status = 'paid', updated_at = CURRENT_TIMESTAMP 
                 WHERE stripe_payment_intent_id = $1`,
                [paymentIntent.id]
            );

            // Record payment
            const orderResult = await db.query(
                'SELECT id, user_id FROM orders WHERE stripe_payment_intent_id = $1',
                [paymentIntent.id]
            );

            if (orderResult.rows.length > 0) {
                const order = orderResult.rows[0];
                await db.query(
                    `INSERT INTO payments 
                     (order_id, user_id, amount, currency, stripe_payment_intent_id, status) 
                     VALUES ($1, $2, $3, $4, $5, 'completed')`,
                    [
                        order.id,
                        order.user_id,
                        paymentIntent.amount / 100,
                        paymentIntent.currency,
                        paymentIntent.id
                    ]
                );
            }
            break;

        case 'payment_intent.payment_failed':
            const failedIntent = event.data.object;
            console.log('PaymentIntent failed:', failedIntent.id);

            await db.query(
                `UPDATE orders 
                 SET status = 'failed', updated_at = CURRENT_TIMESTAMP 
                 WHERE stripe_payment_intent_id = $1`,
                [failedIntent.id]
            );
            break;

        default:
            console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
});

// Checkout page
router.get('/checkout/:orderId', isAuthenticated, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT o.*, p.name as plan_name 
             FROM orders o 
             LEFT JOIN plans p ON o.plan_id = p.id 
             WHERE o.id = $1 AND o.user_id = $2`,
            [req.params.orderId, req.session.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).render('404');
        }

        res.render('payment/checkout', { 
            order: result.rows[0],
            stripePublicKey: process.env.STRIPE_PUBLIC_KEY
        });
    } catch (err) {
        console.error('Checkout error:', err);
        res.status(500).render('error', { error: err });
    }
});

// Payment success page
router.get('/success/:orderId', isAuthenticated, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT o.*, p.name as plan_name 
             FROM orders o 
             LEFT JOIN plans p ON o.plan_id = p.id 
             WHERE o.id = $1 AND o.user_id = $2 AND o.status = 'paid'`,
            [req.params.orderId, req.session.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).render('404');
        }

        res.render('payment/success', { order: result.rows[0] });
    } catch (err) {
        console.error('Payment success page error:', err);
        res.status(500).render('error', { error: err });
    }
});

module.exports = router;
