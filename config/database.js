const { Pool } = require('pg');
const crypto = require('crypto');

// Database connection pool
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'mbe_hosting',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

// Encryption functions
// Usamos AES-256-GCM. La key debe ser exactamente 32 bytes.
// Derivamos la key desde una contraseña (ENCRYPTION_PASSWORD o ENCRYPTION_KEY) usando scryptSync.
const ALGORITHM = 'aes-256-gcm';
const ENCRYPTION_PASSWORD = process.env.ENCRYPTION_PASSWORD || process.env.ENCRYPTION_KEY || 'cambiar_esto_por_una_contraseña_segura';

function getKey() {
  // scryptSync garantiza la longitud correcta (32 bytes) independientemente de la longitud de la contraseña
  return crypto.scryptSync(ENCRYPTION_PASSWORD, 'mbe_salt', 32);
}

function encrypt(text) {
    const key = getKey();
    // Para GCM se recomienda IV de 12 bytes
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(String(text), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();
    // Guardamos iv:authTag:encrypted (todos en hex)
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
}

function decrypt(text) {
    if (!text) return null;
    const parts = text.split(':');
    if (parts.length !== 3) throw new Error('Invalid encrypted text format');
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encryptedText = parts[2];
    const key = getKey();
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

// Database initialization
async function initialize() {
    try {
        // Test connection
        await pool.query('SELECT NOW()');
        console.log('\u2705 Database connected successfully');

        // Create tables
        await createTables();
        console.log('\u2705 Database tables initialized');
    } catch (err) {
        console.error('\u274c Database initialization error:', err);
        throw err;
    }
}

async function createTables() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Users table
        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                first_name TEXT,
                last_name TEXT,
                phone TEXT,
                role VARCHAR(20) DEFAULT 'user',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                is_active BOOLEAN DEFAULT true,
                email_verified BOOLEAN DEFAULT false
            )
        `);

        // Plans table
        await client.query(`
            CREATE TABLE IF NOT EXISTS plans (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                cpu INTEGER NOT NULL,
                ram INTEGER NOT NULL,
                disk INTEGER NOT NULL,
                databases INTEGER DEFAULT 0,
                backups INTEGER DEFAULT 0,
                price_monthly DECIMAL(10,2) NOT NULL,
                is_active BOOLEAN DEFAULT true,
                is_custom BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Orders table
        await client.query(`
            CREATE TABLE IF NOT EXISTS orders (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                plan_id INTEGER REFERENCES plans(id),
                coupon_id INTEGER,
                server_name VARCHAR(255),
                node_location VARCHAR(50),
                status VARCHAR(50) DEFAULT 'pending',
                price DECIMAL(10,2) NOT NULL,
                payment_intent_id VARCHAR(255),
                stripe_session_id VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Servers table
        await client.query(`
            CREATE TABLE IF NOT EXISTS servers (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
                pterodactyl_id INTEGER,
                name VARCHAR(255) NOT NULL,
                status VARCHAR(50) DEFAULT 'pending',
                ip_address VARCHAR(50),
                port INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Coupons table
        await client.query(`
            CREATE TABLE IF NOT EXISTS coupons (
                id SERIAL PRIMARY KEY,
                code VARCHAR(50) UNIQUE NOT NULL,
                type VARCHAR(20) NOT NULL,
                value DECIMAL(10,2) NOT NULL,
                description TEXT,
                start_date TIMESTAMP,
                end_date TIMESTAMP,
                usage_limit INTEGER,
                min_purchase DECIMAL(10,2) DEFAULT 0,
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Coupon usage table
        await client.query(`
            CREATE TABLE IF NOT EXISTS coupon_usage (
                id SERIAL PRIMARY KEY,
                coupon_id INTEGER REFERENCES coupons(id) ON DELETE CASCADE,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
                discount_amount DECIMAL(10,2) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Announcements table
        await client.query(`
            CREATE TABLE IF NOT EXISTS announcements (
                id SERIAL PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                content TEXT NOT NULL,
                type VARCHAR(20) DEFAULT 'info',
                start_date TIMESTAMP,
                end_date TIMESTAMP,
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Seasonal discounts table
        await client.query(`
            CREATE TABLE IF NOT EXISTS seasonal_discounts (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                discount_type VARCHAR(20) NOT NULL,
                discount_value DECIMAL(10,2) NOT NULL,
                start_date TIMESTAMP NOT NULL,
                end_date TIMESTAMP NOT NULL,
                applies_to VARCHAR(20) DEFAULT 'all',
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Site settings table
        await client.query(`
            CREATE TABLE IF NOT EXISTS site_settings (
                id SERIAL PRIMARY KEY,
                setting_key VARCHAR(100) UNIQUE NOT NULL,
                setting_value TEXT,
                setting_type VARCHAR(50) DEFAULT 'text',
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await client.query('COMMIT');
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

// Insert default plans
async function insertDefaultPlans() {
    const client = await pool.connect();
    try {
        const checkPlans = await client.query('SELECT COUNT(*) FROM plans');
        if (parseInt(checkPlans.rows[0].count) === 0) {
            await client.query(`
                INSERT INTO plans (name, description, cpu, ram, disk, databases, backups, price_monthly, is_custom)
                VALUES 
                    ('Starter', 'Perfect for small projects and testing', 1, 2048, 20, 1, 2, 5.99, false),
                    ('Basic', 'Ideal for small websites and applications', 2, 4096, 40, 2, 5, 12.99, false),
                    ('Professional', 'Great for growing businesses', 4, 8192, 80, 5, 10, 24.99, false),
                    ('Enterprise', 'Maximum performance for large applications', 8, 16384, 160, 10, 20, 49.99, false),
                    ('Custom', 'Build your own plan', 0, 0, 0, 0, 0, 0, true)
            `);
            console.log('\u2705 Default plans inserted');
        }
    } catch (err) {
        console.error('Error inserting default plans:', err);
    } finally {
        client.release();
    }
}

// Insert default site settings
async function insertDefaultSettings() {
    const client = await pool.connect();
    try {
        const checkSettings = await client.query('SELECT COUNT(*) FROM site_settings');
        if (parseInt(checkSettings.rows[0].count) === 0) {
            await client.query(`
                INSERT INTO site_settings (setting_key, setting_value, setting_type, description)
                VALUES 
                    ('site_theme', 'normal', 'select', 'Current site theme'),
                    ('enable_auto_theme', 'true', 'boolean', 'Enable automatic theme switching based on dates'),
                    ('halloween_start', '10-01', 'date', 'Halloween theme start date (MM-DD)'),
                    ('halloween_end', '11-01', 'date', 'Halloween theme end date (MM-DD)'),
                    ('christmas_start', '12-01', 'date', 'Christmas theme start date (MM-DD)'),
                    ('christmas_end', '12-31', 'date', 'Christmas theme end date (MM-DD)'),
                    ('site_name', 'MadeByError Hosting', 'text', 'Site name'),
                    ('site_logo', '/images/logo.png', 'text', 'Site logo path'),
                    ('site_favicon', '/images/favicon.ico', 'text', 'Site favicon path'),
                    ('support_email', 'support@madebyerror.studio', 'email', 'Support email address'),
                    ('enable_registration', 'true', 'boolean', 'Allow new user registrations'),
                    ('maintenance_mode', 'false', 'boolean', 'Enable maintenance mode')
            `);
            console.log('\u2705 Default settings inserted');
        }
    } catch (err) {
        console.error('Error inserting default settings:', err);
    } finally {
        client.release();
    }
}

module.exports = {
    pool,
    query: (text, params) => pool.query(text, params),
    initialize,
    insertDefaultPlans,
    insertDefaultSettings,
    encrypt,
    decrypt
};
