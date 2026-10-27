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
- ⏰ **Auto-Processing** — Recurring transactions are automatically applied daily
- 🔔 **Notifications** — Get notified via Home Assistant when savings are updated
- 🏠 **Dashboard sensors** — Show your household total and this month's savings on any Home Assistant dashboard

## 📦 Installation

### Step 1: Add the Repository

1. In Home Assistant, navigate to **Settings** → **Add-ons** → **Add-on Store**
2. Click the **⋮** menu (three dots) in the top-right corner
3. Select **Repositories**
4. Add `https://github.com/Alex-Whyatt/ha-savings-addon` and click **Add**

### Step 2: Install the Add-on

1. Find "Savings Tracker" in the add-on store
2. Click **Install**
3. Wait for the installation to complete
4. Click **Start** to launch the add-on

### Step 3: Access the App

The app will appear in your Home Assistant sidebar as "Savings Tracker".

You can also access it directly via: `http://your-ha-ip:8123/api/hassio_ingress/[addon-slug]/`

## ⚙️ Configuration

### Users

Configure the household members who will use the savings tracker. In Home Assistant, go to **Settings** → **Add-ons** → **Savings Tracker** → **Configuration** and set:

```yaml
users:
  - id: "john"
    name: "John"
  - id: "jane"
    name: "Jane"
```

| Field | Description |
|-------|-------------|
| `id` | Unique identifier for the user (lowercase, no spaces) |
| `name` | Display name shown in the app |

**Note**: Changing the configuration will add new users on restart but **will not remove existing users** or their data. This ensures your savings history is preserved.

### Scheduler (Auto-Processing)

The scheduler automatically processes recurring transactions at a specified time each day. When a recurring transaction is due, it:
1. Creates an actual transaction record
2. Updates the savings account total
3. Sends a notification (if enabled)

```yaml
scheduler:
  enabled: true          # Enable/disable automatic processing
  cron: "0 8 * * *"      # When to run (default: 8:00 AM daily)
```

| Field | Description |
|-------|-------------|
| `enabled` | Set to `true` to enable automatic processing |
| `cron` | Standard cron expression for when to run |

Common cron examples:
- `0 8 * * *` — 8:00 AM every day (default)
- `0 6 * * *` — 6:00 AM every day
- `0 0 * * *` — Midnight every day
- `0 */6 * * *` — Every 6 hours

### Notifications

Get notified via Home Assistant when recurring transactions are processed. This uses Home Assistant's native notification system.

```yaml
notifications:
  enabled: true
  services:
    - user_id: "alex"
      service: "mobile_app_pixel_9a"
    - user_id: "beth"
      service: "mobile_app_iphone"
  default_service: "mobile_app_pixel_9a"
```

| Field | Description |
|-------|-------------|
| `enabled` | Set to `true` to enable notifications |
| `services` | Map each user to their notification service |
| `default_service` | Fallback service if user-specific not found |

**Finding your notification service name:**
1. Go to **Developer Tools** → **Services** in Home Assistant
2. Search for `notify.`
3. Look for services like `notify.mobile_app_your_device`

**Example notification:**
> 💰 **Savings Updated**
> 
> £100.00 added to Cash ISA
> New total: £5,250.00

### Dashboard Sensors

The add-on publishes your household savings to Home Assistant as sensors, so you can show them on any dashboard. They update a couple of seconds after any change in the app, and every 5 minutes (which also restores them after Home Assistant restarts).

| Sensor | Shows | Attributes |
|--------|-------|------------|
| `sensor.savings_tracker_total` | Everything saved, both of you combined | `people` (each person's total), `accounts` |
| `sensor.savings_tracker_saved_this_month` | What you've both paid in so far this month | `monthly_plan`, `people` |
| `sensor.savings_tracker_monthly_plan` | Your recurring contributions per month | `people` |

Because the sensors are recorded like any other entity, Home Assistant also keeps their history, so a history graph card shows your savings over time.

**Example card** (edit a dashboard → **Add card** → **Manual**, then paste):

```yaml
type: vertical-stack
cards:
  - type: grid
    columns: 2
    square: false
    cards:
      - type: tile
        entity: sensor.savings_tracker_total
        name: Total savings
      - type: tile
        entity: sensor.savings_tracker_saved_this_month
        name: Saved this month
  - type: markdown
    content: >
      {% set saved = states('sensor.savings_tracker_saved_this_month') | float(0) %}
      {% set plan = state_attr('sensor.savings_tracker_saved_this_month', 'monthly_plan') | float(0) %}
      **£{{ '{:,.0f}'.format(saved) }}** of £{{ '{:,.0f}'.format(plan) }} saved together this month
```

The sensors need no setup. To turn them off, add `sensors: false` to the add-on configuration.

### Automatic Setup

The add-on automatically:

- Creates a persistent SQLite database in the add-on's data folder (`/data`)
- Sets up the web interface on the configured port
- Configures ingress routing for seamless Home Assistant integration

### Data Storage

| Item | Location |
|------|----------|
| Database | `/data/savings.db` (add-on data folder) |
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

### Investments (S&S ISA, Moneybox and similar)
- **Update value**: tap an account's balance (or ⋮ → Update value) and type in what it's worth today. The change is recorded as growth, not money paid in, so the card shows e.g. "£10,500 paid in · +£740 (+7.0%) since Oct 2026".
- **Funds held**: ⋮ → Add funds held lets you list each fund with its ISIN or ticker, its share of the account and the return you expect. Projections then use the blended rate, so you no longer have to keep adjusting the account's growth rate by hand.
- Your partner can see your funds and growth but can't change them.

## 📡 API Endpoints

The add-on provides a REST API for advanced integrations:

### Data Endpoints
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

### Scheduler Endpoints
```
GET  /api/scheduler/status          — Get scheduler and notification status
POST /api/scheduler/process         — Manually trigger processing now
POST /api/scheduler/test-notification — Test notification to current user
GET  /api/scheduler/history         — Get processing history
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

1. Check the add-on logs for database errors at startup
2. The database lives at `/data/savings.db` inside the add-on
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

- **Recurring transactions**: Set up monthly standing orders — they'll be automatically processed on the due date to reflect real transactions
- **Colour coding**: Use different colours for different account types (e.g., blue for ISAs, green for investments)
- **Goals**: Set realistic targets to track progress towards specific savings milestones
- **Notifications**: Enable notifications to get daily updates when your savings grow
- **Manual processing**: Use the API endpoint `/api/scheduler/process` to trigger processing immediately
- **Check status**: Use `/api/scheduler/status` to see what's scheduled and recently processed

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
