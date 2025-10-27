const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { isNotAuthenticated, isAuthenticated } = require('../middleware/auth');

// Register page
router.get('/register', isNotAuthenticated, (req, res) => {
    res.render('auth/register', { errors: [], formData: {} });
});

// Register handler
router.post('/register', [
    body('email').isEmail().normalizeEmail().withMessage('Please enter a valid email'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('confirmPassword').custom((value, { req }) => {
        if (value !== req.body.password) {
            throw new Error('Passwords do not match');
        }
        return true;
    }),
    body('firstName').trim().notEmpty().withMessage('First name is required'),
    body('lastName').trim().notEmpty().withMessage('Last name is required')
], async (req, res) => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
        return res.render('auth/register', {
            errors: errors.array(),
            formData: req.body
        });
    }

    const { email, password, firstName, lastName, phone } = req.body;

    try {
        // Check if user already exists
        const existingUser = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        
        if (existingUser.rows.length > 0) {
            return res.render('auth/register', {
                errors: [{ msg: 'Email already registered' }],
                formData: req.body
            });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // Encrypt sensitive data
        const encryptedPhone = phone ? db.encrypt(phone) : null;

        // Insert user
        const result = await db.query(
            `INSERT INTO users (email, password_hash, first_name, last_name, phone) 
             VALUES ($1, $2, $3, $4, $5) RETURNING id`,
            [email, passwordHash, firstName, lastName, encryptedPhone]
        );

        // Log user in
        req.session.user = {
            id: result.rows[0].id,
            email: email,
            firstName: firstName,
            lastName: lastName
        };

        res.redirect('/dashboard');
    } catch (err) {
        console.error('Registration error:', err);
        res.render('auth/register', {
            errors: [{ msg: 'An error occurred during registration' }],
            formData: req.body
        });
    }
});

// Login page
router.get('/login', isNotAuthenticated, (req, res) => {
    res.render('auth/login', { errors: [], formData: {} });
});

// Login handler
router.post('/login', [
    body('email').isEmail().normalizeEmail().withMessage('Please enter a valid email'),
    body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
        return res.render('auth/login', {
            errors: errors.array(),
            formData: req.body
        });
    }

    const { email, password } = req.body;

    try {
        // Find user
        const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        
        if (result.rows.length === 0) {
            return res.render('auth/login', {
                errors: [{ msg: 'Invalid email or password' }],
                formData: req.body
            });
        }

        const user = result.rows[0];

        // Check if user is active
        if (!user.is_active) {
            return res.render('auth/login', {
                errors: [{ msg: 'Account is deactivated. Please contact support.' }],
                formData: req.body
            });
        }

        // Verify password
        const isMatch = await bcrypt.compare(password, user.password_hash);
        
        if (!isMatch) {
            return res.render('auth/login', {
                errors: [{ msg: 'Invalid email or password' }],
                formData: req.body
            });
        }

        // Log user in
        req.session.user = {
            id: user.id,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name
        };

        // Redirect to original URL or dashboard
        const redirect = req.query.redirect || '/dashboard';
        res.redirect(redirect);
    } catch (err) {
        console.error('Login error:', err);
        res.render('auth/login', {
            errors: [{ msg: 'An error occurred during login' }],
            formData: req.body
        });
    }
});

// Logout handler
router.get('/logout', isAuthenticated, (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);
        }
        res.redirect('/');
    });
});

module.exports = router;
