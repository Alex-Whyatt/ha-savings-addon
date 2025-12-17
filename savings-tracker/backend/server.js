const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const routes = require('./routes');
const { initializeScheduler } = require('./scheduler');
const { initializeNotifications } = require('./notifications');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

/**
 * Load Home Assistant add-on options
 * When running as an HA add-on, config is at /data/options.json
 */
function loadHomeAssistantOptions() {
  const optionsPath = '/data/options.json';
  
  try {
    if (fs.existsSync(optionsPath)) {
      const options = JSON.parse(fs.readFileSync(optionsPath, 'utf8'));
      console.log('📋 Loaded Home Assistant add-on options');
      
      // Set users configuration
      if (options.users && Array.isArray(options.users)) {
        process.env.SEED_USERS = JSON.stringify(options.users);
        console.log(`   Users: ${options.users.map(u => u.name).join(', ')}`);
      }
      
      // Set scheduler configuration
      if (options.scheduler) {
        if (options.scheduler.enabled !== undefined) {
          process.env.SCHEDULER_ENABLED = String(options.scheduler.enabled);
        }
        if (options.scheduler.cron) {
          process.env.SCHEDULER_CRON = options.scheduler.cron;
        }
        console.log(`   Scheduler: ${options.scheduler.enabled ? 'enabled' : 'disabled'}, cron: ${options.scheduler.cron || 'default'}`);
      }
      
      // Set notification configuration
      if (options.notifications) {
        process.env.NOTIFICATIONS_ENABLED = String(options.notifications.enabled);
        
        // Convert services array to object map {userId: service}
        if (options.notifications.services && Array.isArray(options.notifications.services)) {
          const servicesMap = {};
          options.notifications.services.forEach(s => {
            servicesMap[s.user_id] = s.service;
          });
          process.env.NOTIFICATION_SERVICES = JSON.stringify(servicesMap);
        }
        
        if (options.notifications.default_service) {
          process.env.DEFAULT_NOTIFICATION_SERVICE = options.notifications.default_service;
        }
        
        console.log(`   Notifications: ${options.notifications.enabled ? 'enabled' : 'disabled'}`);
      }
      
      return options;
    }
  } catch (error) {
    console.log('📋 No Home Assistant options file (running in standalone mode)');
  }
  
  return null;
}

// Load HA options before initializing anything else
loadHomeAssistantOptions();

// Re-initialize notifications with updated config
initializeNotifications();

// API routes
console.log('🔧 Mounting API routes at /api');
app.use('/api', routes);

// Serve static files from the React app build directory
app.use(express.static(path.join(__dirname, '../dist')));

// Catch all handler: send back React's index.html file for client-side routing
app.get('*', (req, res) => {
  console.log('📄 Serving index.html for route:', req.path);
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Serving static files from: ${path.join(__dirname, '../dist')}`);
  
  // Initialize scheduler if enabled
  const schedulerEnabled = process.env.SCHEDULER_ENABLED !== 'false';
  if (schedulerEnabled) {
    const cronExpression = process.env.SCHEDULER_CRON || '0 8 * * *';
    console.log(`⏰ Starting scheduler with cron: ${cronExpression}`);
    initializeScheduler(cronExpression);
  } else {
    console.log('⏰ Scheduler is disabled');
  }
});
