# MBE Hosting Platform - Quick Start Guide

## 🚀 Getting Started in 5 Minutes

### Step 1: Prerequisites
Ensure you have:
- Node.js 16+ installed
- PostgreSQL 12+ installed
- Stripe account (free to create)
- Pterodactyl panel (optional for testing)

### Step 2: Installation

```bash
cd MBE
chmod +x setup.sh
./setup.sh
```

### Step 3: Configuration

Edit `.env` file with your details:

```env
# Generate these secrets
ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

# Add your Stripe keys (get from https://stripe.com)
STRIPE_SECRET_KEY=sk_test_your_key_here
STRIPE_PUBLIC_KEY=pk_test_your_key_here

# Database credentials
DB_PASSWORD=your_secure_password
```

### Step 4: Database Setup

```bash
# Create database
sudo -u postgres psql -c "CREATE DATABASE mbe_hosting;"
sudo -u postgres psql -c "CREATE USER mbe_user WITH PASSWORD 'your_password';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE mbe_hosting TO mbe_user;"
```

### Step 5: Start the Application

```bash
npm start
```

Visit: http://localhost:3000

## 📁 Project Overview

### What You Get

**Complete Hosting Platform** with:
- ✅ User registration and authentication
- ✅ Pre-configured hosting plans
- ✅ Custom plan builder with sliders
- ✅ Stripe payment integration
- ✅ Pterodactyl server provisioning
- ✅ Professional red/burgundy UI
- ✅ User dashboard
- ✅ Encrypted data storage
- ✅ Production-ready security

### File Structure

```
MBE/
├── server.js              # Main application file
├── package.json           # Dependencies
├── .env.example          # Configuration template
├── setup.sh              # Automated setup
│
├── config/
│   └── database.js       # Database & encryption
│
├── routes/
│   ├── auth.js           # Login/Register
│   ├── dashboard.js      # User dashboard
│   ├── plans.js          # Hosting plans
│   ├── orders.js         # Order management
│   ├── payment.js        # Stripe integration
│   └── servers.js        # Server management
│
├── views/
│   ├── index.ejs         # Home page
│   ├── auth/             # Login/Register pages
│   ├── dashboard/        # Dashboard pages
│   ├── plans/            # Plans and custom builder
│   ├── payment/          # Checkout pages
│   └── servers/          # Server management
│
└── public/
    ├── css/style.css     # Main stylesheet
    └── js/main.js        # Client JavaScript
```

## 🎯 Key Features

### 1. Plans Page (`/plans`)
- 4 pre-configured plans
- Interactive plan cards
- Custom plan builder link
- Location selection modal
- Real-time order creation

### 2. Custom Builder (`/plans/custom`)
- CPU slider: 1-16 cores
- RAM slider: 1-64 GB
- Disk slider: 10-500 GB
- Databases slider: 0-20
- Backups slider: 0-50
- Real-time price calculation
- Location selection

### 3. Payment (`/payment/checkout/:orderId`)
- Stripe payment form
- Order summary
- Secure payment processing
- Success page with next steps

### 4. Dashboard (`/dashboard`)
- Server overview
- Recent orders
- Statistics
- Quick actions
- Profile management

### 5. Pterodactyl Integration
- Automatic server creation
- Direct panel access
- Status tracking
- Resource allocation

## ⚙️ Environment Variables

### Required
```env
# Database
DB_HOST=localhost
DB_USER=mbe_user
DB_PASSWORD=your_password
DB_NAME=mbe_hosting

# Security (generate random)
ENCRYPTION_KEY=your_32_char_key
SESSION_SECRET=your_session_secret

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLIC_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Optional
```env
# Pterodactyl (for server provisioning)
PTERODACTYL_URL=https://panel.example.com
PTERODACTYL_API_KEY=your_api_key

# Email
SUPPORT_EMAIL=support@madebyerror.studio
BUSINESS_EMAIL=business@madebyerror.studio
CEO_EMAIL=brido@madebyerror.studio
```

## 🔧 Common Tasks

### Generate Encryption Keys
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Insert Default Plans
```bash
node -e "require('./config/database').initialize().then(() => require('./config/database').insertDefaultPlans())"
```

### Start Development Mode
```bash
npm run dev
```

### Check Database Connection
```bash
psql -h localhost -U mbe_user -d mbe_hosting
```

### View Application Logs
```bash
# PM2
pm2 logs mbe-hosting

# Docker
docker-compose logs -f app
```

## 🐳 Docker Quick Start

```bash
# Copy and configure
cp .env.example .env
# Edit .env with your settings

# Start with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

## 🌐 Stripe Setup

1. Create account: https://stripe.com
2. Dashboard → Developers → API keys
3. Copy **Publishable key** → `STRIPE_PUBLIC_KEY`
4. Copy **Secret key** → `STRIPE_SECRET_KEY`
5. Dashboard → Developers → Webhooks
6. Add endpoint: `https://yourdomain.com/payment/webhook`
7. Select events: `payment_intent.*`
8. Copy **Signing secret** → `STRIPE_WEBHOOK_SECRET`

## 🔒 Security Checklist

Before going live:
- [ ] Generate new random ENCRYPTION_KEY
- [ ] Generate new random SESSION_SECRET
- [ ] Use strong database password
- [ ] Switch to Stripe live keys
- [ ] Install SSL certificate
- [ ] Set NODE_ENV=production
- [ ] Configure firewall
- [ ] Enable automatic backups

## 📚 Documentation

- **README.md** - Full project overview
- **INSTALLATION.md** - Detailed setup guide
- **SECURITY.md** - Security best practices
- **FEATURES.md** - Complete feature list

## 🆘 Troubleshooting

### Port Already in Use
```bash
# Change port in .env
PORT=3001
```

### Database Connection Failed
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Verify credentials in .env
```

### Stripe Webhook Not Working
```bash
# Use Stripe CLI for local testing
stripe listen --forward-to localhost:3000/payment/webhook
```

### Cannot Create Servers
```bash
# Check Pterodactyl API key has permissions
# Verify PTERODACTYL_URL is correct (no trailing slash)
```

## 💡 Tips

1. **Testing Payments**: Use Stripe test mode
   - Test card: `4242 4242 4242 4242`
   - Any future expiry date
   - Any 3-digit CVC

2. **Development**: Use `npm run dev` for auto-reload

3. **Production**: Use PM2 or Docker for process management

4. **Security**: Never commit `.env` file

5. **Backups**: Set up automated PostgreSQL backups

## 📞 Support

- **Email**: support@madebyerror.studio
- **Business**: business@madebyerror.studio
- **CEO**: brido@madebyerror.studio

## 🎉 You're Ready!

Your MBE Hosting Platform is now set up and ready to use!

Visit http://localhost:3000 to see it in action.

---

**Made with ❤️ by MadeByError Team**  
**CEOs**: Brido & Franco

© 2025 MadeByError. All rights reserved.
