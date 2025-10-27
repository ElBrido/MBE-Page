# Admin Panel Features Guide

## Overview
The MBE Hosting platform now includes a comprehensive admin panel with extensive customization and management capabilities.

## Features

### 1. **Admin Dashboard**
- Overview statistics (users, servers, orders, revenue)
- Recent orders and users
- Quick action buttons for all admin functions
- Real-time metrics display

### 2. **User Management**
- View all registered users with pagination
- Change user roles (user/admin)
- Activate/deactivate user accounts
- View user server counts
- Filter and search users

### 3. **Server Management**
- View all servers across the platform
- Update server status (creating, active, suspended, failed, pending_setup)
- Delete servers
- View server resources and locations
- User association tracking

### 4. **Plan Management**
- Create new hosting plans
- Edit existing plans (resources, pricing, descriptions)
- Activate/deactivate plans
- Delete unused plans
- Track plan popularity (order counts)

### 5. **Order Management**
- View all orders with pagination
- See original price, discounts, and final price
- Track coupon usage per order
- Update order status (pending, paid, failed, refunded, cancelled)
- Monitor payment details

### 6. **Coupon System**
- Create discount coupons with:
  - Code (auto-uppercase)
  - Type (percentage or fixed amount)
  - Value
  - Description
  - Start and end dates
  - Usage limits
  - Minimum purchase requirements
- Track coupon usage statistics
- Enable/disable coupons
- Real-time validation on checkout

### 7. **Theme Management**
Three available themes:
- **Normal**: Default professional crimson theme
- **Halloween**: Orange and black spooky theme (Oct 1 - Nov 1 by default, configurable)
- **Christmas**: Red and green festive theme (Dec 1 - Dec 31 by default, configurable)

Note: Date ranges are configurable in admin settings. Halloween extends to Nov 1 to include the full Halloween season.

Features:
- Manual theme selection
- Automatic theme switching based on dates
- Configurable theme periods
- Theme-specific CSS files

### 8. **Announcement System**
- Create site-wide announcements
- Set announcement types (info, success, warning, error)
- Schedule announcements with start/end dates
- Display announcements on all pages
- Enable/disable announcements

### 9. **Seasonal Discounts**
- Schedule automatic discounts for specific periods
- Configure discount type (percentage/fixed)
- Set discount value
- Choose which plans discounts apply to
- Perfect for Black Friday, holidays, etc.

### 10. **Site Settings**
Configurable settings include:
- Current theme selection
- Auto-theme switching toggle
- Halloween theme dates (MM-DD format)
- Christmas theme dates (MM-DD format)
- Site name
- Support email
- Registration enable/disable
- Maintenance mode

### 11. **Analytics & Reports**
- Revenue by month (last 12 months)
- Order counts and trends
- Popular plans ranking
- Coupon usage statistics
- Total discounts given
- Average order value
- Key performance metrics

## Access

### Admin Panel URL
```
https://yourdomain.com/admin
```

### Creating an Admin User
Update a user's role in the database:
```sql
UPDATE users SET role = 'admin' WHERE email = 'your@email.com';
```

Or use the admin panel user management section (requires at least one admin).

## Usage Examples

### Creating a Halloween Coupon
1. Go to Admin → Coupons
2. Click "Create New Coupon"
3. Fill in:
   - Code: HALLOWEEN2024
   - Type: Percentage
   - Value: 20
   - Description: Halloween Special - 20% off
   - Start Date: 2024-10-01
   - End Date: 2024-11-01
   - Usage Limit: 100
4. Click "Save Coupon"

### Setting Up Automatic Theme Switching
1. Go to Admin → Settings
2. Enable "Auto Theme Switching"
3. Set Halloween dates: 10-01 to 11-01
4. Set Christmas dates: 12-01 to 12-31
5. Settings auto-save on change

### Creating a Seasonal Discount
1. Go to Admin → Seasonal Discounts
2. Click "Create Seasonal Discount"
3. Fill in:
   - Name: Black Friday Sale
   - Type: Percentage
   - Value: 30
   - Start Date: 2024-11-24
   - End Date: 2024-11-27
   - Applies To: All Plans
4. Click "Save Discount"

### Making an Announcement
1. Go to Admin → Announcements
2. Click "Create Announcement"
3. Fill in:
   - Title: Special Promotion!
   - Content: Use code SAVE10 for $10 off
   - Type: Success
   - Start/End dates (optional)
4. Click "Save Announcement"

## Customer Experience

### Applying Coupons
Customers can apply coupons in two ways:

1. **During Plan Selection**:
   - Select a plan
   - Enter coupon code in the order modal
   - Click "Apply" to validate
   - See discount reflected in order summary

2. **At Checkout** (if order already created):
   - Discount already applied
   - Shows original price, discount, and final price
   - Coupon code visible in order summary

### Theme Experience
- Themes change automatically based on configured dates
- Manual override available via admin settings
- Each theme has custom colors and decorations:
  - Halloween: 🎃 👻 Orange/black theme
  - Christmas: 🎄 ⛄ ✨ Red/green theme with snowflakes

## Database Schema

### New Tables
- `coupons`: Discount codes and rules
- `coupon_usage`: Track coupon usage per order
- `announcements`: Site-wide messages
- `seasonal_discounts`: Scheduled automatic discounts
- `site_settings`: Configuration key-value pairs

### Modified Tables
- `users`: Added `role` column (user/admin)
- `orders`: Added `original_price`, `discount_amount`, `coupon_id`

## Security

- Admin routes protected by `isAdmin` middleware
- Role-based access control
- Session-based authentication
- Input validation on all forms
- SQL injection protection via parameterized queries
- XSS protection via EJS auto-escaping

## API Endpoints

### Admin Endpoints (Protected)
- `GET /admin` - Dashboard
- `GET /admin/users` - User management
- `POST /admin/users/:id/role` - Update user role
- `GET /admin/plans` - Plan management
- `POST /admin/plans` - Create/edit plan
- `GET /admin/coupons` - Coupon management
- `POST /admin/coupons` - Create/edit coupon
- `GET /admin/settings` - Site settings
- `POST /admin/settings/:key` - Update setting

### Public Endpoints
- `POST /orders/validate-coupon` - Validate coupon code
- `POST /orders/create` - Create order (with optional coupon)

## Troubleshooting

### Coupon Not Working
1. Check if coupon is active
2. Verify dates (start/end)
3. Check usage limit not exceeded
4. Ensure minimum purchase met
5. Code must be exact match (case-insensitive)

### Theme Not Changing
1. Check "Auto Theme Switching" is enabled
2. Verify date format is MM-DD
3. Check current date is within range
4. Try manual theme override in settings

### Admin Panel Not Accessible
1. Verify user has admin role
2. Check session is valid (try logging out/in)
3. Ensure middleware is properly configured

## Potential Future Enhancements

The following features could be considered for future development (not currently implemented):
- Email notifications for coupons
- Bulk coupon generation
- More granular plan-specific discounts
- Customer coupon usage history
- Advanced analytics with charts
- Export reports to CSV/PDF
- Custom theme creator
- Multi-language support

## Support

For issues or questions:
- Email: support@madebyerror.studio
- Check logs in browser console
- Review server logs for errors
