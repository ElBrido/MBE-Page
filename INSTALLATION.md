# MBE Hosting Platform - Installation & Deployment Guide

## 📋 Prerequisites

Before installing the MBE Hosting Platform, ensure you have:

- **Node.js** 16.x or higher
- **PostgreSQL** 12.x or higher
- **npm** or **yarn** package manager
- **Stripe Account** for payment processing
- **Pterodactyl Panel** for server management
- **SSL Certificate** (for production)

## 🚀 Quick Start

### 1. Automated Setup (Recommended)

```bash
cd MBE
chmod +x setup.sh
./setup.sh
```

This will:
- Check system requirements
- Install dependencies
- Create .env file from template

### 2. Manual Setup

#### Install Dependencies

```bash
npm install
```

#### Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your configuration (see Configuration section below).

#### Initialize Database

The database tables will be created automatically when you start the server for the first time.

To insert default hosting plans:

```bash
node -r dotenv/config -e "require('./config/database').initialize().then(() => require('./config/database').insertDefaultPlans()).then(() => process.exit())"
```

#### Start the Server

Development mode (with auto-reload):
```bash
npm run dev
```

Production mode:
```bash
npm start
```

The application will be available at `http://localhost:3000`

## ⚙️ Configuration

### Required Environment Variables

Edit your `.env` file with the following:

#### Server Configuration
```env
NODE_ENV=production
PORT=3000
APP_URL=https://yourdomain.com
```

#### Database Configuration
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mbe_hosting
DB_USER=your_db_user
DB_PASSWORD=your_secure_password
```

#### Security Configuration

Generate secure random strings for encryption:

```bash
# Generate encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate session secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

```env
ENCRYPTION_KEY=your-generated-32-character-key
SESSION_SECRET=your-generated-session-secret
```

#### Stripe Configuration

1. Create a Stripe account at https://stripe.com
2. Get your API keys from Dashboard > Developers > API keys
3. Set up a webhook endpoint at `https://yourdomain.com/payment/webhook`
4. Get the webhook signing secret

```env
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key
STRIPE_PUBLIC_KEY=pk_live_your_stripe_public_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
```

**Important**: For testing, use test mode keys (`sk_test_...` and `pk_test_...`)

#### Pterodactyl Configuration

1. Log in to your Pterodactyl admin panel
2. Go to Application API
3. Create a new API key with full permissions
4. Note your panel URL

```env
PTERODACTYL_URL=https://panel.madebyerror.studio
PTERODACTYL_API_KEY=your_pterodactyl_api_key
```

#### Email Configuration

```env
SUPPORT_EMAIL=support@madebyerror.studio
BUSINESS_EMAIL=business@madebyerror.studio
CEO_EMAIL=brido@madebyerror.studio
```

#### Node Configuration

Match these IDs with your Pterodactyl node IDs:

```env
NODE_MEXICO_ID=1
NODE_OHIO_ID=2
NODE_FUTURE_ID=3
```

## 🗄️ Database Setup

### PostgreSQL Installation

#### Ubuntu/Debian
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

#### macOS (using Homebrew)
```bash
brew install postgresql@14
brew services start postgresql@14
```

### Create Database and User

```bash
sudo -u postgres psql
```

```sql
CREATE DATABASE mbe_hosting;
CREATE USER mbe_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE mbe_hosting TO mbe_user;
\q
```

### Test Connection

```bash
psql -h localhost -U mbe_user -d mbe_hosting
```

## 🐳 Docker Deployment

### Using Docker Compose (Recommended)

1. Ensure `.env` file is configured
2. Run:

```bash
docker-compose up -d
```

This will start:
- PostgreSQL database
- MBE application

To view logs:
```bash
docker-compose logs -f app
```

To stop:
```bash
docker-compose down
```

### Manual Docker Build

```bash
# Build image
docker build -t mbe-hosting .

# Run with external PostgreSQL
docker run -d \
  -p 3000:3000 \
  --env-file .env \
  --name mbe-hosting \
  mbe-hosting
```

## 🔧 Production Deployment

### Using PM2 (Process Manager)

1. Install PM2 globally:
```bash
npm install -g pm2
```

2. Start the application:
```bash
pm2 start server.js --name mbe-hosting
```

3. Save PM2 configuration:
```bash
pm2 save
```

4. Set PM2 to start on system boot:
```bash
pm2 startup
```

5. Monitor the application:
```bash
pm2 status
pm2 logs mbe-hosting
pm2 monit
```

### Nginx Reverse Proxy

1. Install Nginx:
```bash
sudo apt install nginx
```

2. Create Nginx configuration:
```bash
sudo nano /etc/nginx/sites-available/mbe-hosting
```

3. Add the following configuration:
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

4. Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/mbe-hosting /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### SSL with Let's Encrypt

1. Install Certbot:
```bash
sudo apt install certbot python3-certbot-nginx
```

2. Obtain SSL certificate:
```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

3. Auto-renewal is configured automatically. Test it with:
```bash
sudo certbot renew --dry-run
```

## 🔐 Security Checklist

Before going to production, ensure:

- [ ] All environment variables are set with secure values
- [ ] ENCRYPTION_KEY is a random 32-character string
- [ ] SESSION_SECRET is a random string
- [ ] Database password is strong and unique
- [ ] SSL certificate is installed and configured
- [ ] Firewall is configured (allow only 80, 443, and SSH)
- [ ] PostgreSQL is not exposed to the internet
- [ ] Stripe webhook endpoint is secured
- [ ] Regular backups are configured
- [ ] NODE_ENV is set to 'production'

## 🔄 Updates and Maintenance

### Updating the Application

1. Pull latest changes:
```bash
git pull origin main
```

2. Install new dependencies:
```bash
npm install
```

3. Restart the application:
```bash
# With PM2
pm2 restart mbe-hosting

# With Docker
docker-compose restart app
```

### Database Backups

Create automated backups:

```bash
#!/bin/bash
# backup.sh
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/path/to/backups"
pg_dump -h localhost -U mbe_user mbe_hosting > "$BACKUP_DIR/mbe_backup_$DATE.sql"
```

Add to crontab for daily backups:
```bash
crontab -e
# Add line:
0 2 * * * /path/to/backup.sh
```

## 📊 Monitoring

### Application Logs

With PM2:
```bash
pm2 logs mbe-hosting
```

With Docker:
```bash
docker-compose logs -f app
```

### Health Checks

Create a monitoring endpoint by adding to `server.js`:

```javascript
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});
```

## 🐛 Troubleshooting

### Database Connection Issues

1. Verify PostgreSQL is running:
```bash
sudo systemctl status postgresql
```

2. Check database credentials in `.env`
3. Ensure database exists:
```bash
psql -l
```

### Port Already in Use

Change port in `.env`:
```env
PORT=3001
```

### Stripe Webhook Not Working

1. Check webhook URL in Stripe dashboard
2. Verify STRIPE_WEBHOOK_SECRET is correct
3. Check webhook logs in Stripe dashboard

### Pterodactyl API Errors

1. Verify API key has correct permissions
2. Check PTERODACTYL_URL format (no trailing slash)
3. Test API key with curl:
```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
     -H "Accept: application/json" \
     https://panel.madebyerror.studio/api/application/nodes
```

## 📞 Support

For issues and questions:
- **Email**: support@madebyerror.studio
- **Business**: business@madebyerror.studio
- **CEO**: brido@madebyerror.studio

## 📄 License

This project is proprietary software owned by MadeByError.

---

© 2025 MadeByError. All rights reserved.
