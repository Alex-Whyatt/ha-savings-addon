# Savings Tracker for Home Assistant

A modern, web-based savings tracker that runs as a Home Assistant add-on on your Raspberry Pi 4. Track multiple savings pots, visualize progress with charts, and manage your savings goals.

## Features

- 📊 **Dashboard Overview**: See all your savings pots and total savings at a glance
- 📅 **Calendar View**: Add savings transactions to specific dates
- 🎯 **Savings Pots**: Create and manage multiple savings goals
- 📈 **Projections**: Visualize savings growth over time
- 💾 **Persistent Storage**: SQLite database stores data on your Pi
- 🔒 **Secure**: Runs locally on your Home Assistant system

## Installation

### Option 1: Home Assistant Add-on (Recommended)

1. **Add the Repository**:
   - In Home Assistant, go to **Settings** → **Add-ons** → **Add-on Store**
   - Click the **⋮** menu (three dots) → **Repositories**
   - Add this URL: `https://github.com/your-username/ha-savings-tracker`

2. **Install the Add-on**:
   - Search for "Savings Tracker" in the add-on store
   - Click **Install**
   - Start the add-on

3. **Access the App**:
   - The app will be available at `http://your-ha-ip:3001/savings/`
   - Or through Home Assistant's sidebar if configured

### Option 2: Manual Docker Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/savings-tracker.git
   cd savings-tracker
   ```

2. **Build and run with Docker Compose**:
   ```bash
   docker-compose up -d
   ```

3. **Access the app**:
   - Frontend: `http://localhost/savings/`
   - Backend API: `http://localhost:3001/api`

## Usage

### Creating Your First Savings Pot

1. Navigate to the "Savings Pots" tab
2. Click "Add New Pot"
3. Fill in:
   - **Name**: e.g., "Emergency Fund"
   - **Current Total**: How much you have saved already
   - **Target Amount** (optional): Your savings goal
   - **Color**: Choose a color for visual identification

### Adding Savings Transactions

1. Go to the "Calendar" tab
2. Click on any date to add a transaction
3. Select which savings pot
4. Enter the amount saved
5. Add an optional description

### Viewing Progress

- **Dashboard**: See all pots, totals, and monthly savings
- **Charts**: View projected savings growth
- **Progress Bars**: Visual indicators for savings goals

## API Endpoints

The backend provides a REST API:

- `GET /api/data` - Get all savings data
- `GET/POST/PUT/DELETE /api/pots` - Manage savings pots
- `GET/POST/PUT/DELETE /api/transactions` - Manage transactions

## Data Storage

- SQLite database stored in `/data/savings.db` (persistent)
- All data stays on your Raspberry Pi
- No external services required

## Development

### Quick Start (Recommended)

Use the development script for easy testing:

```bash
# Development with localStorage (browser persistence)
./dev.sh

# Development with full API backend (SQLite persistence)
./dev.sh api
```

### Manual Development Setup

```bash
# Install dependencies
npm install
cd backend && npm install

# Option 1: Frontend only (localStorage)
npm run dev

# Option 2: Full stack (API + SQLite)
cd backend && npm run dev    # Terminal 1
npm run dev                  # Terminal 2 (with VITE_API_URL set)
```

### Development Modes

- **localStorage Mode** (default): Data persists in browser localStorage
  - Fast startup, no backend needed
  - Good for UI development and testing
  - Data survives browser refreshes but not clearing cache

- **API Mode**: Full backend with SQLite database
  - Run `./dev.sh api` for complete testing
  - Data persists in `backend/savings.db`
  - Same experience as production Home Assistant setup

### Building for Production

```bash
# Build frontend
npm run build

# Build backend
cd backend && npm run build
```

## Configuration

### Environment Variables

- `REACT_APP_API_URL`: Backend API URL (default: `http://localhost:3001/api`)
- `PORT`: Backend port (default: 3001)

### Home Assistant Add-on Configuration

The add-on automatically configures:
- Subpath routing at `/savings/`
- Persistent data storage
- Network access on port 3001

## Troubleshooting

### Can't Access the App

- Check if the add-on is running in Home Assistant
- Verify the URL: `http://your-ha-ip:3001/savings/`
- Check Home Assistant logs for errors

### Data Not Saving

- Ensure the add-on has write permissions to `/data`
- Check SQLite database file exists: `/data/savings.db`

### Performance Issues

- The app is optimized for Raspberry Pi 4
- Charts use lightweight libraries
- Consider clearing browser cache if slow

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test on a Raspberry Pi
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

- Create an issue on GitHub
- Check Home Assistant community forums
- Review the troubleshooting section above
# ha-savings-addon
