const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');
const db = require('../config/database');

// Create order
router.post('/create', isAuthenticated, express.json(), async (req, res) => {
    try {
        const { planId, nodeLocation, cpu, ram, disk, databases, backups, price, couponCode } = req.body;

        let finalPrice = parseFloat(price);
        let discountAmount = 0;
        let couponId = null;

        // Apply coupon if provided
        if (couponCode) {
            const couponResult = await db.query(
                `SELECT * FROM coupons 
                 WHERE code = $1 
                 AND is_active = true 
                 AND (start_date IS NULL OR start_date <= CURRENT_TIMESTAMP)
                 AND (end_date IS NULL OR end_date >= CURRENT_TIMESTAMP)
                 AND (usage_limit IS NULL OR usage_count < usage_limit)`,
                [couponCode.toUpperCase()]
            );

            if (couponResult.rows.length > 0) {
                const coupon = couponResult.rows[0];
                
                // Check minimum purchase requirement
                if (parseFloat(coupon.min_purchase) <= finalPrice) {
                    couponId = coupon.id;
                    
                    // Calculate discount
                    if (coupon.type === 'percentage') {
                        discountAmount = (finalPrice * parseFloat(coupon.value)) / 100;
                    } else {
                        discountAmount = parseFloat(coupon.value);
                    }
                    
                    // Make sure discount doesn't exceed total price
                    discountAmount = Math.min(discountAmount, finalPrice);
                    finalPrice = finalPrice - discountAmount;
                    
                    // Increment coupon usage
                    await db.query(
                        'UPDATE coupons SET usage_count = usage_count + 1 WHERE id = $1',
                        [couponId]
                    );
                } else {
                    return res.status(400).json({ 
                        success: false, 
                        error: `Minimum purchase of $${coupon.min_purchase} required for this coupon` 
                    });
                }
            } else {
                return res.status(400).json({ success: false, error: 'Invalid or expired coupon code' });
            }
        }

        // Insert order
        const result = await db.query(
            `INSERT INTO orders 
             (user_id, plan_id, node_location, cpu, ram, disk, databases, backups, 
              original_price, discount_amount, price, coupon_id, status) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'pending') 
             RETURNING id`,
            [
                req.session.user.id, planId || null, nodeLocation, cpu, ram, disk, 
                databases, backups, price, discountAmount, finalPrice, couponId
            ]
        );

        const orderId = result.rows[0].id;

        // Record coupon usage if coupon was used
        if (couponId) {
            await db.query(
                `INSERT INTO coupon_usage (coupon_id, user_id, order_id, discount_amount)
                 VALUES ($1, $2, $3, $4)`,
                [couponId, req.session.user.id, orderId, discountAmount]
            );
        }

        res.json({ 
            success: true, 
            orderId: orderId, 
            finalPrice: finalPrice.toFixed(2),
            discountAmount: discountAmount.toFixed(2)
        });
    } catch (err) {
        console.error('Order creation error:', err);
        res.status(500).json({ success: false, error: 'Failed to create order' });
    }
});

// Get order details
router.get('/:id', isAuthenticated, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT o.*, p.name as plan_name 
             FROM orders o 
             LEFT JOIN plans p ON o.plan_id = p.id 
             WHERE o.id = $1 AND o.user_id = $2`,
            [req.params.id, req.session.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).render('404');
        }

        res.render('orders/detail', { order: result.rows[0] });
    } catch (err) {
        console.error('Order detail error:', err);
        res.status(500).render('error', { error: err });
    }
});

// Update order status
router.post('/:id/status', isAuthenticated, express.json(), async (req, res) => {
    try {
        const { status, paymentIntentId } = req.body;

        await db.query(
            `UPDATE orders 
             SET status = $1, stripe_payment_intent_id = $2, updated_at = CURRENT_TIMESTAMP 
             WHERE id = $3 AND user_id = $4`,
            [status, paymentIntentId, req.params.id, req.session.user.id]
        );

        res.json({ success: true });
    } catch (err) {
        console.error('Order status update error:', err);
        res.status(500).json({ success: false, error: 'Failed to update order' });
    }
});

// Validate coupon code
router.post('/validate-coupon', isAuthenticated, express.json(), async (req, res) => {
    try {
        const { code, orderAmount } = req.body;

        const result = await db.query(
            `SELECT * FROM coupons 
             WHERE code = $1 
             AND is_active = true 
             AND (start_date IS NULL OR start_date <= CURRENT_TIMESTAMP)
             AND (end_date IS NULL OR end_date >= CURRENT_TIMESTAMP)
             AND (usage_limit IS NULL OR usage_count < usage_limit)`,
            [code.toUpperCase()]
        );

        if (result.rows.length === 0) {
            return res.json({ 
                valid: false, 
                message: 'Invalid or expired coupon code' 
            });
        }

        const coupon = result.rows[0];

        // Check minimum purchase
        if (parseFloat(coupon.min_purchase) > parseFloat(orderAmount)) {
            return res.json({ 
                valid: false, 
                message: `Minimum purchase of $${coupon.min_purchase} required` 
            });
        }

        // Calculate discount
        let discountAmount = 0;
        if (coupon.type === 'percentage') {
            discountAmount = (parseFloat(orderAmount) * parseFloat(coupon.value)) / 100;
        } else {
            discountAmount = parseFloat(coupon.value);
        }

        discountAmount = Math.min(discountAmount, parseFloat(orderAmount));

        res.json({ 
            valid: true, 
            coupon: {
                code: coupon.code,
                type: coupon.type,
                value: coupon.value,
                description: coupon.description
            },
            discountAmount: discountAmount.toFixed(2),
            finalPrice: (parseFloat(orderAmount) - discountAmount).toFixed(2)
        });
    } catch (err) {
        console.error('Coupon validation error:', err);
        res.status(500).json({ valid: false, message: 'Error validating coupon' });
    }
});

module.exports = router;
