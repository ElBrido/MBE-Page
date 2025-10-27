const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');
const db = require('../config/database');

// Create order
router.post('/create', isAuthenticated, express.json(), async (req, res) => {
    try {
        const { planId, nodeLocation, cpu, ram, disk, databases, backups, price } = req.body;

        // Insert order
        const result = await db.query(
            `INSERT INTO orders 
             (user_id, plan_id, node_location, cpu, ram, disk, databases, backups, price, status) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending') 
             RETURNING id`,
            [req.session.user.id, planId || null, nodeLocation, cpu, ram, disk, databases, backups, price]
        );

        res.json({ success: true, orderId: result.rows[0].id });
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

module.exports = router;
