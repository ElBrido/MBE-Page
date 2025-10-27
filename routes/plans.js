const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Get all active plans
router.get('/', async (req, res) => {
    try {
        const result = await db.query(
            'SELECT * FROM plans WHERE is_active = true ORDER BY price_monthly ASC'
        );
        res.render('plans/index', { plans: result.rows });
    } catch (err) {
        console.error('Plans error:', err);
        res.status(500).render('error', { error: err });
    }
});

// Custom plan builder
router.get('/custom', (req, res) => {
    res.render('plans/custom', {
        nodes: [
            { id: process.env.NODE_MEXICO_ID || 1, name: 'Mexico', location: 'Mexico City, Mexico' },
            { id: process.env.NODE_OHIO_ID || 2, name: 'Ohio', location: 'Columbus, Ohio, USA' },
            { id: process.env.NODE_FUTURE_ID || 3, name: 'Coming Soon', location: 'To be announced', disabled: true }
        ]
    });
});

// Calculate custom plan price
router.post('/custom/calculate',  (req, res) => {
    try {
        const { cpu, ram, disk, databases, backups } = req.body;

        // Price calculation based on resources
        const cpuPrice = cpu * 2.5;
        const ramPrice = (ram / 1024) * 3.0; // Per GB
        const diskPrice = (disk / 10) * 0.5; // Per 10GB
        const databasePrice = databases * 2.0;
        const backupPrice = backups * 1.0;

        const totalPrice = cpuPrice + ramPrice + diskPrice + databasePrice + backupPrice;

        res.json({
            success: true,
            price: Math.max(totalPrice, 3.99).toFixed(2), // Minimum $3.99
            breakdown: {
                cpu: cpuPrice.toFixed(2),
                ram: ramPrice.toFixed(2),
                disk: diskPrice.toFixed(2),
                databases: databasePrice.toFixed(2),
                backups: backupPrice.toFixed(2)
            }
        });
    } catch (err) {
        console.error('Price calculation error:', err);
        res.status(500).json({ success: false, error: 'Calculation error' });
    }
});

module.exports = router;
