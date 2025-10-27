const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');
const db = require('../config/database');
const axios = require('axios');

const PTERODACTYL_URL = process.env.PTERODACTYL_URL;
const PTERODACTYL_API_KEY = process.env.PTERODACTYL_API_KEY;

// Create server via Pterodactyl API
async function createPterodactylServer(orderData, userId) {
    try {
        const response = await axios.post(
            `${PTERODACTYL_URL}/api/application/servers`,
            {
                name: `MBE-Server-${orderData.id}`,
                user: userId,
                egg: 1, // Default egg, configure as needed
                docker_image: 'ghcr.io/pterodactyl/yolks:nodejs_16',
                startup: 'npm start',
                environment: {},
                limits: {
                    memory: orderData.ram,
                    swap: 0,
                    disk: orderData.disk * 1024, // Convert GB to MB
                    io: 500,
                    cpu: orderData.cpu * 100 // CPU percentage
                },
                feature_limits: {
                    databases: orderData.databases,
                    backups: orderData.backups,
                    allocations: 1
                },
                allocation: {
                    default: 1 // Default allocation, configure as needed
                }
            },
            {
                headers: {
                    'Authorization': `Bearer ${PTERODACTYL_API_KEY}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            }
        );

        return response.data;
    } catch (err) {
        console.error('Pterodactyl API error:', err.response?.data || err.message);
        throw new Error('Failed to create server on Pterodactyl');
    }
}

// Get user's servers
router.get('/', isAuthenticated, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT s.*, o.node_location, o.price 
             FROM servers s 
             LEFT JOIN orders o ON s.order_id = o.id 
             WHERE s.user_id = $1 
             ORDER BY s.created_at DESC`,
            [req.session.user.id]
        );

        res.render('servers/index', { servers: result.rows });
    } catch (err) {
        console.error('Servers list error:', err);
        res.status(500).render('error', { error: err });
    }
});

// Get server details
router.get('/:id', isAuthenticated, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT s.*, o.node_location 
             FROM servers s 
             LEFT JOIN orders o ON s.order_id = o.id 
             WHERE s.id = $1 AND s.user_id = $2`,
            [req.params.id, req.session.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).render('404');
        }

        res.render('servers/detail', { server: result.rows[0] });
    } catch (err) {
        console.error('Server detail error:', err);
        res.status(500).render('error', { error: err });
    }
});

// Create server (called after successful payment)
router.post('/create', isAuthenticated, async (req, res) => {
    try {
        const { orderId } = req.body;

        // Get order details
        const orderResult = await db.query(
            'SELECT * FROM orders WHERE id = $1 AND user_id = $2 AND status = $3',
            [orderId, req.session.user.id, 'paid']
        );

        if (orderResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Order not found or not paid' });
        }

        const order = orderResult.rows[0];

        // Create server in database first
        const serverResult = await db.query(
            `INSERT INTO servers 
             (order_id, user_id, node_location, cpu, ram, disk, status, server_name) 
             VALUES ($1, $2, $3, $4, $5, $6, 'creating', $7) 
             RETURNING id`,
            [
                orderId,
                req.session.user.id,
                order.node_location,
                order.cpu,
                order.ram,
                order.disk,
                `MBE-Server-${orderId}`
            ]
        );

        const serverId = serverResult.rows[0].id;

        // Create server on Pterodactyl (async)
        // In production, this should be handled by a background job
        if (PTERODACTYL_API_KEY && PTERODACTYL_URL) {
            try {
                const pterodactylServer = await createPterodactylServer(order, req.session.user.id);
                
                // Update server with Pterodactyl details
                await db.query(
                    `UPDATE servers 
                     SET pterodactyl_server_id = $1, status = 'active', updated_at = CURRENT_TIMESTAMP 
                     WHERE id = $2`,
                    [pterodactylServer.attributes.id, serverId]
                );
            } catch (err) {
                console.error('Pterodactyl creation error:', err);
                // Mark server as failed
                await db.query(
                    `UPDATE servers SET status = 'failed', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
                    [serverId]
                );
                return res.status(500).json({ 
                    success: false, 
                    error: 'Server creation failed. Please contact support.' 
                });
            }
        } else {
            // No Pterodactyl configured, mark as pending manual setup
            await db.query(
                `UPDATE servers SET status = 'pending_setup', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
                [serverId]
            );
        }

        res.json({ success: true, serverId });
    } catch (err) {
        console.error('Server creation error:', err);
        res.status(500).json({ success: false, error: 'Failed to create server' });
    }
});

module.exports = router;
