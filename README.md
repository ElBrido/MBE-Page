# MadeByError (MBE) Hosting Platform

Professional hosting platform with Pterodactyl integration and Stripe payment processing.

## 🌟 Features

- **User Authentication**: Secure registration and login system with encrypted data storage
- **Multiple Hosting Plans**: Pre-configured plans for different needs
- **Custom Plan Builder**: Interactive resource selector with sliders for CPU, RAM, Disk, Databases, and Backups
- **Pterodactyl Integration**: Automatic server provisioning via Pterodactyl API
- **Stripe Payments**: Secure payment processing with Stripe.js
- **Global Nodes**: Multiple data center locations (Mexico, Ohio, and more coming soon)
- **Encrypted Database**: All sensitive user data is encrypted at rest
- **Professional UI**: Modern red/burgundy themed interface
- **Real-time Pricing**: Dynamic price calculation for custom plans
- **Dashboard**: User dashboard for managing servers and orders

## 📋 Requirements

- Node.js 16.x or higher
- PostgreSQL 12.x or higher
- Stripe account (for payments)
- Pterodactyl panel (for server management)

## 🚀 Installation

### 1. Clone the repository

```bash
cd MBE
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up PostgreSQL database

```sql
CREATE DATABASE mbe_hosting;
CREATE USER mbe_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE mbe_hosting TO mbe_user;
```

### 4. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Server
NODE_ENV=production
PORT=3000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mbe_hosting
DB_USER=mbe_user
DB_PASSWORD=your_db_password

# Security - Generate secure random strings
ENCRYPTION_KEY=your-32-character-encryption-key
SESSION_SECRET=your-session-secret-random-string

# Stripe (Get from https://stripe.com)
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key
STRIPE_PUBLIC_KEY=pk_live_your_stripe_public_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Pterodactyl (Get from your panel)
PTERODACTYL_URL=https://panel.madebyerror.studio
PTERODACTYL_API_KEY=your_pterodactyl_api_key

# Email
SUPPORT_EMAIL=support@madebyerror.studio
BUSINESS_EMAIL=business@madebyerror.studio
CEO_EMAIL=brido@madebyerror.studio

# Nodes
NODE_MEXICO_ID=1
NODE_OHIO_ID=2
NODE_FUTURE_ID=3

# Application
APP_URL=https://yourdomain.com
```

### 5. Initialize the database

The database tables will be created automatically when you start the server for the first time.

### 6. Insert default plans (optional)

```javascript
node -e "require('./config/database').initialize().then(() => require('./config/database').insertDefaultPlans()).then(() => process.exit())"
```

### 7. Start the server

Development mode:
```bash
npm run dev
```

Production mode:
```bash
npm start
```

The application will be available at `http://localhost:3000`

## 🔧 Configuration

### Stripe Setup

1. Create a Stripe account at https://stripe.com
2. Get your API keys from the Stripe Dashboard
3. Set up a webhook endpoint at `https://yourdomain.com/payment/webhook`
4. Add the webhook secret to your `.env` file

### Pterodactyl Setup

1. Install and configure Pterodactyl panel
2. Create an API key in the Pterodactyl admin panel
3. Add the API key and panel URL to your `.env` file
4. Configure node IDs for each location

### Nodes Configuration

Edit the node IDs in your `.env` file to match your Pterodactyl node configuration:

```env
NODE_MEXICO_ID=1     # Mexico City node ID
NODE_OHIO_ID=2       # Ohio node ID
NODE_FUTURE_ID=3     # Future node ID (disabled by default)
```

## 📱 Usage

### For Users

1. **Register**: Create an account at `/auth/register`
2. **Browse Plans**: View pre-configured plans at `/plans`
3. **Custom Plan**: Build a custom plan at `/plans/custom`
4. **Checkout**: Complete payment via Stripe
5. **Dashboard**: Manage servers at `/dashboard`

### For Administrators

- Access the database directly to manage users and orders
- Monitor server creation via Pterodactyl panel
- View payment history in Stripe dashboard

## 🏗️ Project Structure

```
MBE/
├── config/
│   └── database.js          # Database configuration and encryption
├── middleware/
│   └── auth.js              # Authentication middleware
├── routes/
│   ├── auth.js              # Authentication routes
│   ├── dashboard.js         # Dashboard routes
│   ├── orders.js            # Order management
│   ├── payment.js           # Stripe payment handling
│   ├── plans.js             # Hosting plans
│   └── servers.js           # Server management
├── views/
│   ├── auth/                # Authentication pages
│   ├── dashboard/           # Dashboard pages
│   ├── payment/             # Payment pages
│   ├── plans/               # Plans pages
│   ├── 404.ejs              # 404 error page
│   ├── about.ejs            # About page
│   ├── contact.ejs          # Contact page
│   ├── index.ejs            # Home page
│   └── layout.ejs           # Main layout
├── public/
│   ├── css/
│   │   └── style.css        # Main stylesheet
│   └── js/
│       └── main.js          # Client-side JavaScript
├── .env.example             # Environment variables template
├── package.json             # Dependencies
├── server.js                # Express server
└── README.md                # This file
```

## 🔐 Security Features

- Password hashing with bcrypt
- Encrypted storage of sensitive data (AES-256-GCM)
- Secure session management
- CSRF protection
- Rate limiting on API endpoints
- Helmet.js for HTTP headers
- Input validation and sanitization
- Stripe PCI-compliant payment processing

## 🌐 Deployment

### Using PM2 (Recommended)

```bash
npm install -g pm2
pm2 start server.js --name mbe-hosting
pm2 save
pm2 startup
```

### Using Docker

```bash
# Build image
docker build -t mbe-hosting .

# Run container
docker run -d -p 3000:3000 --env-file .env mbe-hosting
```

### Nginx Reverse Proxy

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 📧 Contact

- **Support**: support@madebyerror.studio
- **Business**: business@madebyerror.studio
- **CEO**: brido@madebyerror.studio

## 👥 Team

- **Brido** - CEO
- **Franco** - CEO

## 📄 License

This project is proprietary software owned by MadeByError.

## 🔄 Updates and Maintenance

Regular updates include:
- Security patches
- New features
- Performance improvements
- Bug fixes

---

© 2025 MadeByError. All rights reserved.
