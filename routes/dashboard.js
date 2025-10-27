const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');
const db = require('../config/database');

// Dashboard home
router.get('/', isAuthenticated, async (req, res) => {
    try {
        // Get user's servers
        const servers = await db.query(
            `SELECT s.*, o.node_location 
             FROM servers s 
             LEFT JOIN orders o ON s.order_id = o.id 
             WHERE s.user_id = $1 
             ORDER BY s.created_at DESC`,
            [req.session.user.id]
        );

        // Get user's recent orders
        const orders = await db.query(
            `SELECT o.*, p.name as plan_name 
             FROM orders o 
             LEFT JOIN plans p ON o.plan_id = p.id 
             WHERE o.user_id = $1 
             ORDER BY o.created_at DESC 
             LIMIT 5`,
            [req.session.user.id]
        );

        res.render('dashboard/index', {
            servers: servers.rows,
            orders: orders.rows
        });
    } catch (err) {
        console.error('Dashboard error:', err);
        res.status(500).render('error', { error: err });
    }
});

// Profile page
router.get('/profile', isAuthenticated, async (req, res) => {
    try {
        const result = await db.query(
            'SELECT id, email, first_name, last_name, phone, created_at FROM users WHERE id = $1',
            [req.session.user.id]
        );

        if (result.rows.length === 0) {
            return res.redirect('/auth/logout');
        }

        const user = result.rows[0];
        // Decrypt phone if exists
        if (user.phone) {
            try {
                user.phone = db.decrypt(user.phone);
            } catch (err) {
                user.phone = '';
            }
        }

        res.render('dashboard/profile', { user });
    } catch (err) {
        console.error('Profile error:', err);
        res.status(500).render('error', { error: err });
    }
});

module.exports = router;
