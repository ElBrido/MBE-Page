# Admin Panel Setup Instructions

## Prerequisites
- PostgreSQL database installed and running
- Node.js v16 or higher
- npm installed

## Initial Setup

### 1. Database Configuration
Edit your `.env` file with your database credentials:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mbe_hosting
DB_USER=your_db_user
DB_PASSWORD=your_db_password
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Initialize Database
The application will automatically create all required tables on first run:
```bash
npm start
```

The following tables will be created:
- `users` (with role column)
- `plans`
- `orders` (with coupon tracking)
- `servers`
- `payments`
- `sessions`
- `coupons`
- `coupon_usage`
- `announcements`
- `seasonal_discounts`
- `site_settings`

Default settings will also be initialized.

### 4. Create Your First Admin User

#### Option A: During Registration
1. Register a new account normally
2. Access the database and run:
```sql
UPDATE users SET role = 'admin' WHERE email = 'youremail@example.com';
```

#### Option B: Directly in Database
```sql
-- First create a user (password is 'admin123' hashed with bcrypt)
INSERT INTO users (email, password_hash, first_name, last_name, role)
VALUES (
    'admin@madebyerror.studio',
    '$2a$10$YourHashedPasswordHere',  -- Use bcrypt to hash your password
    'Admin',
    'User',
    'admin'
);
```

To hash a password with bcrypt in Node.js:
```javascript
const bcrypt = require('bcryptjs');
const hash = await bcrypt.hash('yourpassword', 10);
console.log(hash);
```

### 5. Access Admin Panel
1. Log in with your admin account
2. Navigate to: `http://localhost:3000/admin`
3. You should see the admin dashboard

## Loading Sample Data (Optional)

To test the features, you can load sample coupons and announcements:

```sql
-- Sample Halloween coupon
INSERT INTO coupons (code, type, value, description, start_date, end_date, usage_limit, is_active)
VALUES ('HALLOWEEN2024', 'percentage', 20, 'Halloween Special - 20% off all plans', 
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '30 days', 100, true);

-- Sample Christmas coupon
INSERT INTO coupons (code, type, value, description, start_date, end_date, usage_limit, is_active)
VALUES ('XMAS2024', 'percentage', 25, 'Christmas Sale - 25% off', 
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '60 days', 200, true);

-- Sample fixed discount
INSERT INTO coupons (code, type, value, description, min_purchase, is_active)
VALUES ('SAVE10', 'fixed', 10, 'Get $10 off any order over $20', 20, true);

-- Sample announcement
INSERT INTO announcements (title, content, type, is_active)
VALUES ('Welcome!', 'Check out our special deals and use coupon codes for discounts!', 'info', true);
```

## Verification Checklist

After setup, verify everything works:

- [ ] Server starts without errors
- [ ] Can access home page at http://localhost:3000
- [ ] Can register a new user
- [ ] Can log in
- [ ] Database tables are created
- [ ] Can access admin panel at /admin (as admin user)
- [ ] Admin dashboard shows statistics
- [ ] Can create a new plan
- [ ] Can create a new coupon
- [ ] Can create an announcement
- [ ] Theme settings are available
- [ ] Can change site theme
- [ ] Announcements appear on pages

## Common Issues

### Database Connection Failed
**Error**: `Failed to initialize database`
**Solution**: 
1. Verify PostgreSQL is running
2. Check database credentials in `.env`
3. Ensure database exists: `createdb mbe_hosting`

### Admin Panel Shows 403 Forbidden
**Error**: `Access denied. Admin privileges required.`
**Solution**: 
1. Check user role in database: `SELECT role FROM users WHERE email = 'your@email.com';`
2. Update if needed: `UPDATE users SET role = 'admin' WHERE email = 'your@email.com';`
3. Log out and log back in

### Coupon Not Applying
**Issue**: Coupon code not working
**Solution**:
1. Check coupon is active in admin panel
2. Verify start/end dates are valid
3. Ensure usage limit not reached
4. Check minimum purchase requirement met

### Theme Not Changing
**Issue**: Theme stays the same
**Solution**:
1. Go to Admin → Settings
2. Check "Auto Theme Switching" is enabled
3. Verify date formats are MM-DD
4. Try manual theme override

## Environment Variables Reference

Required variables in `.env`:

```env
# Server
NODE_ENV=development
PORT=3000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mbe_hosting
DB_USER=your_username
DB_PASSWORD=your_password

# Security
ENCRYPTION_KEY=your-32-character-key-here
SESSION_SECRET=your-session-secret-here

# Payment (Stripe)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLIC_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Pterodactyl (Optional)
PTERODACTYL_URL=https://panel.example.com
PTERODACTYL_API_KEY=your_api_key

# Application
APP_URL=http://localhost:3000
```

## Next Steps

After setup is complete:

1. **Configure Themes**:
   - Go to Admin → Settings
   - Set theme dates for Halloween and Christmas
   - Enable auto-switching if desired

2. **Create Coupons**:
   - Go to Admin → Coupons
   - Create your first promotional code
   - Test it on the order page

3. **Set Up Plans**:
   - Go to Admin → Plans
   - Review default plans
   - Create custom plans as needed

4. **Create Announcements**:
   - Go to Admin → Announcements
   - Add welcome message or current promotions

5. **Review Settings**:
   - Go to Admin → Settings
   - Update site name and contact emails
   - Configure other preferences

## Security Recommendations

1. **Change Default Passwords**: Never use default or simple passwords
2. **Secure Environment Variables**: Keep `.env` file private (in `.gitignore`)
3. **Use HTTPS**: In production, always use HTTPS
4. **Regular Backups**: Backup database regularly
5. **Update Dependencies**: Keep npm packages up to date
6. **Monitor Logs**: Check server logs for suspicious activity
7. **Limit Admin Accounts**: Only give admin role to trusted users

## Production Deployment

Additional steps for production:

1. Set `NODE_ENV=production` in `.env`
2. Use strong session secret and encryption key
3. Enable HTTPS
4. Configure proper database credentials
5. Set up database backups
6. Use process manager (PM2) for Node.js
7. Configure reverse proxy (nginx)
8. Set up monitoring and logging
9. Review and update security headers

## Support

If you encounter issues:
1. Check server logs: `npm start` output
2. Check browser console for JavaScript errors
3. Verify database connection
4. Review error messages carefully
5. Contact support at support@madebyerror.studio

## Updates and Maintenance

Keep the system updated:
- Regularly update npm packages: `npm update`
- Monitor for security vulnerabilities: `npm audit`
- Backup database before major updates
- Test updates in development environment first
