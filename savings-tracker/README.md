# Savings Tracker Home Assistant Add-on

A modern, web-based savings tracker that integrates seamlessly with Home Assistant.

## Features

- 📊 **Dashboard Overview**: See all your savings pots and total savings at a glance
- 📅 **Calendar View**: Add savings transactions to specific dates
- 🎯 **Savings Pots**: Create and manage multiple savings goals
- 📈 **Projections**: Visualize savings growth over time
- 💾 **Persistent Storage**: SQLite database stores data on your Home Assistant system
- 🔒 **Secure**: Runs locally on your Home Assistant system

## Installation

### Step 1: Add the Repository

1. In Home Assistant, go to **Settings** → **Add-ons** → **Add-on Store**
2. Click the **⋮** menu (three dots) in the top-right corner
3. Select **Repositories**
4. Add this URL: `https://github.com/your-username/ha-savings-tracker`
5. Click **Add**

### Step 2: Install the Add-on

1. Find "Savings Tracker" in the add-on store
2. Click **Install**
3. Wait for the installation to complete
4. Click **Start** to start the add-on

### Step 3: Access the App

The app will be available through the Home Assistant sidebar under "Savings Tracker".

Alternatively, you can access it directly at: `http://your-ha-ip:8123/api/hassio_ingress/your-addon-slug/`

## Configuration

No configuration is required. The add-on will automatically:

- Create a persistent SQLite database in `/config/savings-tracker/`
- Set up the web interface
- Configure ingress routing

## Data Storage

- SQLite database: `/config/savings-tracker/savings.db`
- All data persists between add-on restarts
- Automatic backups through Home Assistant's backup system

## API Endpoints

The add-on provides a REST API at `/api/`:

- `GET /api/data` - Get all savings data
- `GET/POST/PUT/DELETE /api/pots` - Manage savings pots
- `GET/POST/PUT/DELETE /api/transactions` - Manage transactions

## Troubleshooting

### Add-on Won't Start

1. Check the Home Assistant logs: **Settings** → **System** → **Logs**
2. Look for errors related to the savings-tracker add-on
3. Ensure you have sufficient disk space

### Can't Access the Interface

1. Verify the add-on is running (green status)
2. Check that ingress is enabled
3. Try refreshing the page or clearing browser cache

### Data Not Saving

1. Check the database file exists: `/config/savings-tracker/savings.db`
2. Verify the add-on has write permissions to `/config`
3. Check Home Assistant logs for database errors

## Development

### Local Testing

To test the add-on locally before publishing:

```bash
# Build the Docker image
docker build -t savings-tracker:test ./ha-addon/savings-tracker

# Run the container
docker run -p 3001:3001 -v $(pwd)/data:/data savings-tracker:test
```

### Publishing

1. Push your repository to GitHub
2. Update the repository URL in the add-on configuration
3. Users can then add your repository URL to install the add-on

## Support

- Create an issue on the GitHub repository
- Check Home Assistant community forums
- Review the troubleshooting section above
