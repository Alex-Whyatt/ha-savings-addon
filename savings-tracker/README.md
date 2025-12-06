# Savings Tracker — Home Assistant Add-on

A modern, mobile-friendly savings tracker that runs directly on your Home Assistant system. Track multiple savings accounts, set goals, and visualise your progress with beautiful projections.

## ✨ Features

- 📊 **Dashboard** — Overview of all savings with combined household totals
- 📅 **Calendar** — Add transactions to specific dates with recurring support
- 💰 **Accounts** — Manage multiple savings accounts (ISAs, bonds, investments, etc.)
- 📈 **Projections** — 12-month forecasting with monthly breakdown
- 👥 **Multi-user** — Track savings for multiple household members
- 📱 **Mobile-first** — Responsive design with bottom navigation on mobile
- 🔒 **Private** — All data stays on your Home Assistant system

## 📦 Installation

### Step 1: Add the Repository

1. In Home Assistant, navigate to **Settings** → **Add-ons** → **Add-on Store**
2. Click the **⋮** menu (three dots) in the top-right corner
3. Select **Repositories**
4. Add the repository URL and click **Add**

### Step 2: Install the Add-on

1. Find "Savings Tracker" in the add-on store
2. Click **Install**
3. Wait for the installation to complete
4. Click **Start** to launch the add-on

### Step 3: Access the App

The app will appear in your Home Assistant sidebar as "Savings Tracker".

You can also access it directly via: `http://your-ha-ip:8123/api/hassio_ingress/[addon-slug]/`

## ⚙️ Configuration

No configuration is required. The add-on automatically:

- Creates a persistent SQLite database in `/config/savings-tracker/`
- Sets up the web interface on the configured port
- Configures ingress routing for seamless Home Assistant integration

### Data Storage

| Item | Location |
|------|----------|
| Database | `/config/savings-tracker/savings.db` |
| Persistence | Data survives restarts and updates |
| Backups | Included in Home Assistant backups |

## 🖥️ Using the App

### Dashboard
Your main overview showing:
- Total combined savings across all accounts
- Your accounts and your partner's accounts
- Savings projection chart with 12-month forecast
- Key stats: current total, monthly contributions, yearly growth

### Calendar
- Click any date to add a transaction
- Set transactions as **monthly** or **weekly** recurring
- View all transactions for each day
- Edit or delete existing entries

### Accounts
- Create accounts for different savings types (Cash ISA, S&S ISA, NS&I Bonds, etc.)
- Set optional savings targets with progress tracking
- Customise colours for easy identification
- View totals and goal completion percentages

## 📡 API Endpoints

The add-on provides a REST API for advanced integrations:

```
GET  /api/data              — All savings data
GET  /api/user/data         — Current user's data
GET  /api/pots              — List all accounts
POST /api/pots              — Create new account
PUT  /api/pots/:id          — Update account
DELETE /api/pots/:id        — Delete account
GET  /api/transactions      — List all transactions
POST /api/transactions      — Create transaction
PUT  /api/transactions/:id  — Update transaction
DELETE /api/transactions/:id — Delete transaction
```

## 🔍 Troubleshooting

### Add-on Won't Start

1. Check the logs: **Settings** → **System** → **Logs**
2. Filter by "Savings Tracker" to see relevant entries
3. Ensure you have sufficient disk space (at least 100MB free)
4. Try restarting the add-on

### Cannot Access the Interface

1. Verify the add-on is running (green status indicator)
2. Check that "Show in sidebar" is enabled in add-on settings
3. Try refreshing the page or clearing your browser cache
4. Ensure ingress is enabled

### Data Not Saving

1. Verify the database file exists: `/config/savings-tracker/savings.db`
2. Check the add-on has write permissions to `/config`
3. Review Home Assistant logs for database-related errors
4. Try restarting the add-on

### Interface Looks Broken

1. Clear your browser cache (Ctrl+Shift+R or Cmd+Shift+R)
2. Try a different browser
3. Check the add-on logs for JavaScript errors

## 🔄 Updates

The add-on will show available updates in the Home Assistant add-on store. Updates preserve your data — only the application code is replaced.

## 🛡️ Security

- All data is stored locally on your Home Assistant system
- No external connections or cloud dependencies
- Authentication handled through Home Assistant's ingress system
- Database is only accessible within the add-on container

## 💡 Tips

- **Recurring transactions**: Set up monthly standing orders to automatically project future savings
- **Colour coding**: Use different colours for different account types (e.g., blue for ISAs, green for investments)
- **Goals**: Set realistic targets to track progress towards specific savings milestones
- **Regular updates**: Log transactions regularly for accurate projections

## 🆘 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review the Home Assistant logs for errors
3. Create an issue on the GitHub repository with:
   - Your Home Assistant version
   - Add-on version
   - Steps to reproduce the issue
   - Relevant log entries

## 📄 Licence

MIT Licence — free to use, modify, and distribute.
