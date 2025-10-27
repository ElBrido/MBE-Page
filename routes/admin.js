const express = require('express');
const router = express.Router();
const { isAdmin } = require('../middleware/auth');
const db = require('../config/database');
const bcrypt = require('bcryptjs');

// Middleware to add admin role to all responses
router.use(isAdmin);

// Helper function to get active theme
async function getActiveTheme() {
    try {
        const autoTheme = await db.query(
            "SELECT setting_value FROM site_settings WHERE setting_key = 'enable_auto_theme'"
        );
        
        if (autoTheme.rows[0]?.setting_value === 'true') {
            const today = new Date();
            const month = today.getMonth() + 1;
            const day = today.getDate();
            const currentDate = `${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
            
            // Check Halloween
            const halloweenStart = await db.query(
                "SELECT setting_value FROM site_settings WHERE setting_key = 'halloween_start'"
            );
            const halloweenEnd = await db.query(
                "SELECT setting_value FROM site_settings WHERE setting_key = 'halloween_end'"
            );
            
            if (halloweenStart.rows[0] && halloweenEnd.rows[0]) {
                if (currentDate >= halloweenStart.rows[0].setting_value && 
                    currentDate <= halloweenEnd.rows[0].setting_value) {
                    return 'halloween';
                }
            }
            
            // Check Christmas
            const christmasStart = await db.query(
                "SELECT setting_value FROM site_settings WHERE setting_key = 'christmas_start'"
            );
            const christmasEnd = await db.query(
                "SELECT setting_value FROM site_settings WHERE setting_key = 'christmas_end'"
            );
            
            if (christmasStart.rows[0] && christmasEnd.rows[0]) {
                if (currentDate >= christmasStart.rows[0].setting_value && 
                    currentDate <= christmasEnd.rows[0].setting_value) {
                    return 'christmas';
                }
            }
        }
        
        const themeResult = await db.query(
            "SELECT setting_value FROM site_settings WHERE setting_key = 'site_theme'"
        );
        return themeResult.rows[0]?.setting_value || 'normal';
    } catch (err) {
        console.error('Error getting theme:', err);
        return 'normal';
    }
}

// Admin Dashboard
router.get('/', async (req, res) => {
    try {
        const stats = await Promise.all([
            db.query('SELECT COUNT(*) FROM users'),
            db.query('SELECT COUNT(*) FROM servers'),
            db.query('SELECT COUNT(*) FROM orders WHERE status = $1', ['paid']),
            db.query('SELECT COALESCE(SUM(price), 0) as total FROM orders WHERE status = $1', ['paid']),
            db.query('SELECT COUNT(*) FROM plans WHERE is_active = true'),
            db.query('SELECT COUNT(*) FROM coupons WHERE is_active = true'),
            db.query('SELECT COUNT(*) FROM announcements WHERE is_active = true'),
        ]);

        const recentOrders = await db.query(`
            SELECT o.*, u.email, u.first_name, u.last_name, p.name as plan_name
            FROM orders o
            LEFT JOIN users u ON o.user_id = u.id
            LEFT JOIN plans p ON o.plan_id = p.id
            ORDER BY o.created_at DESC
            LIMIT 10
        `);

        const recentUsers = await db.query(`
            SELECT id, email, first_name, last_name, role, created_at, is_active
            FROM users
            ORDER BY created_at DESC
            LIMIT 10
        `);

        res.render('admin/dashboard', {
            title: 'Admin Dashboard',
            stats: {
                users: parseInt(stats[0].rows[0].count),
                servers: parseInt(stats[1].rows[0].count),
                orders: parseInt(stats[2].rows[0].count),
                revenue: parseFloat(stats[3].rows[0].total),
                plans: parseInt(stats[4].rows[0].count),
                coupons: parseInt(stats[5].rows[0].count),
                announcements: parseInt(stats[6].rows[0].count),
            },
            recentOrders: recentOrders.rows,
            recentUsers: recentUsers.rows
        });
    } catch (err) {
        console.error('Admin dashboard error:', err);
        res.status(500).render('error', { error: err });
    }
});

// Users Management
router.get('/users', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 20;
        const offset = (page - 1) * limit;

        const users = await db.query(`
            SELECT id, email, first_name, last_name, role, is_active, created_at,
                   (SELECT COUNT(*) FROM servers WHERE user_id = users.id) as server_count
            FROM users
            ORDER BY created_at DESC
            LIMIT $1 OFFSET $2
        `, [limit, offset]);

        const countResult = await db.query('SELECT COUNT(*) FROM users');
        const totalPages = Math.ceil(parseInt(countResult.rows[0].count) / limit);

        res.render('admin/users', {
            title: 'User Management',
            users: users.rows,
            currentPage: page,
            totalPages
        });
    } catch (err) {
        console.error('Users list error:', err);
        res.status(500).render('error', { error: err });
    }
});

// Update user role
router.post('/users/:id/role', express.json(), async (req, res) => {
    try {
        const { role } = req.body;
        await db.query(
            'UPDATE users SET role = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [role, req.params.id]
        );
        res.json({ success: true });
    } catch (err) {
        console.error('Update role error:', err);
        res.status(500).json({ success: false, error: 'Failed to update user role' });
    }
});

// Toggle user active status
router.post('/users/:id/toggle-active', express.json(), async (req, res) => {
    try {
        await db.query(
            'UPDATE users SET is_active = NOT is_active, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
            [req.params.id]
        );
        res.json({ success: true });
    } catch (err) {
        console.error('Toggle active error:', err);
        res.status(500).json({ success: false, error: 'Failed to toggle user status' });
    }
});

// Plans Management
router.get('/plans', async (req, res) => {
    try {
        const plans = await db.query(`
            SELECT p.*,
                   (SELECT COUNT(*) FROM orders WHERE plan_id = p.id) as order_count
            FROM plans p
            ORDER BY price_monthly ASC
        `);

        res.render('admin/plans', {
            title: 'Plan Management',
            plans: plans.rows
        });
    } catch (err) {
        console.error('Plans list error:', err);
        res.status(500).render('error', { error: err });
    }
});

// Create/Edit Plan
router.post('/plans', express.json(), async (req, res) => {
    try {
        const { id, name, description, cpu, ram, disk, databases, backups, price_monthly, is_active } = req.body;

        if (id) {
            // Update existing plan
            await db.query(`
                UPDATE plans 
                SET name = $1, description = $2, cpu = $3, ram = $4, disk = $5, 
                    databases = $6, backups = $7, price_monthly = $8, is_active = $9
                WHERE id = $10
            `, [name, description, cpu, ram, disk, databases, backups, price_monthly, is_active, id]);
        } else {
            // Create new plan
            await db.query(`
                INSERT INTO plans (name, description, cpu, ram, disk, databases, backups, price_monthly, is_active)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            `, [name, description, cpu, ram, disk, databases, backups, price_monthly, is_active]);
        }

        res.json({ success: true });
    } catch (err) {
        console.error('Plan save error:', err);
        res.status(500).json({ success: false, error: 'Failed to save plan' });
    }
});

// Delete Plan
router.delete('/plans/:id', express.json(), async (req, res) => {
    try {
        await db.query('DELETE FROM plans WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        console.error('Plan delete error:', err);
        res.status(500).json({ success: false, error: 'Failed to delete plan' });
    }
});

// Servers Management
router.get('/servers', async (req, res) => {
    try {
        const servers = await db.query(`
            SELECT s.*, u.email, u.first_name, u.last_name, o.node_location, o.price
            FROM servers s
            LEFT JOIN users u ON s.user_id = u.id
            LEFT JOIN orders o ON s.order_id = o.id
            ORDER BY s.created_at DESC
        `);

        res.render('admin/servers', {
            title: 'Server Management',
            servers: servers.rows
        });
    } catch (err) {
        console.error('Servers list error:', err);
        res.status(500).render('error', { error: err });
    }
});

// Update server status
router.post('/servers/:id/status', express.json(), async (req, res) => {
    try {
        const { status } = req.body;
        await db.query(
            'UPDATE servers SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [status, req.params.id]
        );
        res.json({ success: true });
    } catch (err) {
        console.error('Update status error:', err);
        res.status(500).json({ success: false, error: 'Failed to update server status' });
    }
});

// Delete server
router.delete('/servers/:id', express.json(), async (req, res) => {
    try {
        await db.query('DELETE FROM servers WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        console.error('Server delete error:', err);
        res.status(500).json({ success: false, error: 'Failed to delete server' });
    }
});

// Orders Management
router.get('/orders', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 20;
        const offset = (page - 1) * limit;

        const orders = await db.query(`
            SELECT o.*, u.email, u.first_name, u.last_name, p.name as plan_name,
                   c.code as coupon_code
            FROM orders o
            LEFT JOIN users u ON o.user_id = u.id
            LEFT JOIN plans p ON o.plan_id = p.id
            LEFT JOIN coupons c ON o.coupon_id = c.id
            ORDER BY o.created_at DESC
            LIMIT $1 OFFSET $2
        `, [limit, offset]);

        const countResult = await db.query('SELECT COUNT(*) FROM orders');
        const totalPages = Math.ceil(parseInt(countResult.rows[0].count) / limit);

        res.render('admin/orders', {
            title: 'Order Management',
            orders: orders.rows,
            currentPage: page,
            totalPages
        });
    } catch (err) {
        console.error('Orders list error:', err);
        res.status(500).render('error', { error: err });
    }
});

// Update order status
router.post('/orders/:id/status', express.json(), async (req, res) => {
    try {
        const { status } = req.body;
        await db.query(
            'UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [status, req.params.id]
        );
        res.json({ success: true });
    } catch (err) {
        console.error('Update order status error:', err);
        res.status(500).json({ success: false, error: 'Failed to update order status' });
    }
});

// Coupons Management
router.get('/coupons', async (req, res) => {
    try {
        const coupons = await db.query(`
            SELECT c.*,
                   (SELECT COUNT(*) FROM coupon_usage WHERE coupon_id = c.id) as total_usage
            FROM coupons c
            ORDER BY created_at DESC
        `);

        res.render('admin/coupons', {
            title: 'Coupon Management',
            coupons: coupons.rows
        });
    } catch (err) {
        console.error('Coupons list error:', err);
        res.status(500).render('error', { error: err });
    }
});

// Create/Edit Coupon
router.post('/coupons', express.json(), async (req, res) => {
    try {
        const { id, code, type, value, description, start_date, end_date, usage_limit, min_purchase, is_active } = req.body;

        if (id) {
            // Update existing coupon
            await db.query(`
                UPDATE coupons 
                SET code = $1, type = $2, value = $3, description = $4, 
                    start_date = $5, end_date = $6, usage_limit = $7, 
                    min_purchase = $8, is_active = $9, updated_at = CURRENT_TIMESTAMP
                WHERE id = $10
            `, [code, type, value, description, start_date, end_date, usage_limit, min_purchase, is_active, id]);
        } else {
            // Create new coupon
            await db.query(`
                INSERT INTO coupons (code, type, value, description, start_date, end_date, usage_limit, min_purchase, is_active)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            `, [code, type, value, description, start_date, end_date, usage_limit, min_purchase, is_active]);
        }

        res.json({ success: true });
    } catch (err) {
        console.error('Coupon save error:', err);
        res.status(500).json({ success: false, error: 'Failed to save coupon' });
    }
});

// Delete Coupon
router.delete('/coupons/:id', express.json(), async (req, res) => {
    try {
        await db.query('DELETE FROM coupons WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        console.error('Coupon delete error:', err);
        res.status(500).json({ success: false, error: 'Failed to delete coupon' });
    }
});

// Announcements Management
router.get('/announcements', async (req, res) => {
    try {
        const announcements = await db.query(`
            SELECT * FROM announcements
            ORDER BY created_at DESC
        `);

        res.render('admin/announcements', {
            title: 'Announcement Management',
            announcements: announcements.rows
        });
    } catch (err) {
        console.error('Announcements list error:', err);
        res.status(500).render('error', { error: err });
    }
});

// Create/Edit Announcement
router.post('/announcements', express.json(), async (req, res) => {
    try {
        const { id, title, content, type, start_date, end_date, is_active } = req.body;

        if (id) {
            // Update existing announcement
            await db.query(`
                UPDATE announcements 
                SET title = $1, content = $2, type = $3, start_date = $4, 
                    end_date = $5, is_active = $6, updated_at = CURRENT_TIMESTAMP
                WHERE id = $7
            `, [title, content, type, start_date, end_date, is_active, id]);
        } else {
            // Create new announcement
            await db.query(`
                INSERT INTO announcements (title, content, type, start_date, end_date, is_active)
                VALUES ($1, $2, $3, $4, $5, $6)
            `, [title, content, type, start_date, end_date, is_active]);
        }

        res.json({ success: true });
    } catch (err) {
        console.error('Announcement save error:', err);
        res.status(500).json({ success: false, error: 'Failed to save announcement' });
    }
});

// Delete Announcement
router.delete('/announcements/:id', express.json(), async (req, res) => {
    try {
        await db.query('DELETE FROM announcements WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        console.error('Announcement delete error:', err);
        res.status(500).json({ success: false, error: 'Failed to delete announcement' });
    }
});

// Seasonal Discounts Management
router.get('/seasonal-discounts', async (req, res) => {
    try {
        const discounts = await db.query(`
            SELECT * FROM seasonal_discounts
            ORDER BY start_date DESC
        `);

        res.render('admin/seasonal-discounts', {
            title: 'Seasonal Discount Management',
            discounts: discounts.rows
        });
    } catch (err) {
        console.error('Seasonal discounts list error:', err);
        res.status(500).render('error', { error: err });
    }
});

// Create/Edit Seasonal Discount
router.post('/seasonal-discounts', express.json(), async (req, res) => {
    try {
        const { id, name, discount_type, discount_value, start_date, end_date, applies_to, is_active } = req.body;

        if (id) {
            // Update existing discount
            await db.query(`
                UPDATE seasonal_discounts 
                SET name = $1, discount_type = $2, discount_value = $3, 
                    start_date = $4, end_date = $5, applies_to = $6, 
                    is_active = $7, updated_at = CURRENT_TIMESTAMP
                WHERE id = $8
            `, [name, discount_type, discount_value, start_date, end_date, applies_to, is_active, id]);
        } else {
            // Create new discount
            await db.query(`
                INSERT INTO seasonal_discounts (name, discount_type, discount_value, start_date, end_date, applies_to, is_active)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
            `, [name, discount_type, discount_value, start_date, end_date, applies_to, is_active]);
        }

        res.json({ success: true });
    } catch (err) {
        console.error('Seasonal discount save error:', err);
        res.status(500).json({ success: false, error: 'Failed to save seasonal discount' });
    }
});

// Delete Seasonal Discount
router.delete('/seasonal-discounts/:id', express.json(), async (req, res) => {
    try {
        await db.query('DELETE FROM seasonal_discounts WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        console.error('Seasonal discount delete error:', err);
        res.status(500).json({ success: false, error: 'Failed to delete seasonal discount' });
    }
});

// Settings Management
router.get('/settings', async (req, res) => {
    try {
        const settings = await db.query(`
            SELECT * FROM site_settings
            ORDER BY setting_key ASC
        `);

        const theme = await getActiveTheme();

        res.render('admin/settings', {
            title: 'Site Settings',
            settings: settings.rows,
            currentTheme: theme
        });
    } catch (err) {
        console.error('Settings list error:', err);
        res.status(500).render('error', { error: err });
    }
});

// Update Setting
router.post('/settings/:key', express.json(), async (req, res) => {
    try {
        const { value } = req.body;
        await db.query(`
            UPDATE site_settings 
            SET setting_value = $1, updated_at = CURRENT_TIMESTAMP 
            WHERE setting_key = $2
        `, [value, req.params.key]);
        res.json({ success: true });
    } catch (err) {
        console.error('Setting update error:', err);
        res.status(500).json({ success: false, error: 'Failed to update setting' });
    }
});

// Analytics/Reports
router.get('/analytics', async (req, res) => {
    try {
        // Revenue by month
        const revenueByMonth = await db.query(`
            SELECT 
                DATE_TRUNC('month', created_at) as month,
                SUM(price) as revenue,
                COUNT(*) as order_count
            FROM orders
            WHERE status = 'paid'
            GROUP BY DATE_TRUNC('month', created_at)
            ORDER BY month DESC
            LIMIT 12
        `);

        // Popular plans
        const popularPlans = await db.query(`
            SELECT p.name, COUNT(o.id) as order_count, SUM(o.price) as revenue
            FROM plans p
            LEFT JOIN orders o ON p.id = o.plan_id AND o.status = 'paid'
            GROUP BY p.id, p.name
            ORDER BY order_count DESC
        `);

        // Coupon usage stats
        const couponStats = await db.query(`
            SELECT c.code, COUNT(cu.id) as usage_count, SUM(cu.discount_amount) as total_discount
            FROM coupons c
            LEFT JOIN coupon_usage cu ON c.id = cu.coupon_id
            GROUP BY c.id, c.code
            ORDER BY usage_count DESC
            LIMIT 10
        `);

        res.render('admin/analytics', {
            title: 'Analytics & Reports',
            revenueByMonth: revenueByMonth.rows,
            popularPlans: popularPlans.rows,
            couponStats: couponStats.rows
        });
    } catch (err) {
        console.error('Analytics error:', err);
        res.status(500).render('error', { error: err });
    }
});

module.exports = router;
