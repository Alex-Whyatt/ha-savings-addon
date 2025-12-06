# Savings Tracker

[WIP] (mainly coded with vibes pls don't take this as what I consider to be good react thx) 

Savings tracker designed for households to monitor and project their savings across multiple accounts. Built as a Home Assistant add-on but runs as a standalone web application. 

![Savings Tracker](https://img.shields.io/badge/Home%20Assistant-Add--on-blue?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

## ✨ Features

### 📊 Dashboard
- **At-a-glance overview** of your total savings across all accounts
- **Per-user breakdown** — perfect for couples or households tracking savings together
- **Savings projection chart** with 12-month forecasting
- **Key insights** including monthly contribution rates, yearly growth, and projected totals

### 📅 Calendar View
- Add one-off or recurring contributions to specific dates
- Support for **monthly** and **weekly** recurring transactions
- Visual calendar with transaction indicators
- Easy transaction management with edit and delete functionality

### 💰 Accounts Management
- Create multiple savings accounts (Cash ISA, Stocks & Shares ISA, NS&I Bonds, etc.)
- Set savings targets with visual progress tracking
- Customisable colours for easy identification
- Track current totals and goal completion percentages

### 📈 Projections & Insights
- **12-month savings projection** based on recurring contributions
- **Monthly breakdown table** showing cumulative growth
- **Stat cards** displaying:
  - Current total savings
  - Average monthly contribution
  - Projected 12-month growth (amount & percentage)
  - Projected total at end of forecast period

### 👥 Multi-User Support
- Built-in support for multiple users (Alex & Beth by default)
- View your own accounts and your partner's accounts
- Combined household savings view on the dashboard

## 🖼️ Screenshots

### Mobile-First Design
The app features a modern, mobile-first design with:
- Bottom navigation bar on mobile devices
- Responsive layouts that adapt to any screen size
- Touch-friendly interface elements
- Gradient-themed UI with consistent branding

## 🚀 Installation

### As a Home Assistant Add-on

1. **Add the repository** to your Home Assistant add-on store:
   - Go to **Settings** → **Add-ons** → **Add-on Store**
   - Click the **⋮** menu → **Repositories**
   - Add: `https://github.com/Alex-Whyatt/savings-tracker`

2. **Install the add-on**:
   - Find "Savings Tracker" in the add-on store
   - Click **Install**, then **Start**

3. **Access via sidebar**:
   - The app appears in your Home Assistant sidebar
   - Or access directly via the ingress URL

### Standalone Docker

```bash
# Clone the repository
git clone https://github.com/Alex-Whyatt/savings-tracker.git
cd savings-tracker/savings-tracker

# Build and run with Docker
docker build -t savings-tracker .
docker run -p 3001:3001 -v savings-data:/data savings-tracker
```

Access the app at `http://localhost:3001`

## 🛠️ Technology Stack

- **Frontend**: React 18, TypeScript, Material-UI (MUI)
- **Charts**: Recharts
- **Backend**: Node.js, Express
- **Database**: SQLite
- **Containerisation**: Docker with multi-stage builds

## 📁 Project Structure

```
savings-tracker/
├── src/                    # React frontend source
│   ├── components/         # UI components
│   ├── hooks/              # Custom React hooks
│   └── ...
├── backend/                # Express API server
├── Dockerfile              # Multi-stage Docker build
└── config.yaml             # Home Assistant add-on config
```

## 🔧 Configuration

The add-on requires no manual configuration. It automatically:
- Creates a persistent SQLite database
- Configures the web interface
- Sets up ingress routing for Home Assistant

### Data Storage
- **Database location**: `/config/savings-tracker/savings.db`
- **Persistence**: Data survives add-on restarts and updates
- **Backups**: Included in Home Assistant's backup system

## 📡 API Reference

The backend exposes a REST API:

| Endpoint | Methods | Description |
|----------|---------|-------------|
| `/api/data` | GET | Retrieve all savings data |
| `/api/user/data` | GET | Get current user's data |
| `/api/pots` | GET, POST | List/create accounts |
| `/api/pots/:id` | PUT, DELETE | Update/delete account |
| `/api/transactions` | GET, POST | List/create transactions |
| `/api/transactions/:id` | PUT, DELETE | Update/delete transaction |

## 🐛 Troubleshooting

### Add-on won't start
- Check logs: **Settings** → **System** → **Logs**
- Ensure sufficient disk space
- Verify Docker is running correctly

### Interface not loading
- Confirm the add-on shows a green "Running" status
- Try clearing your browser cache
- Check ingress is enabled in add-on settings

### Data not saving
- Verify database exists at `/config/savings-tracker/savings.db`
- Check add-on has write permissions to `/config`
- Review logs for database errors
