/**
 * Home Assistant Notifications Module
 * 
 * Sends notifications via Home Assistant's notification services
 * when running as an add-on.
 */

const http = require('http');
const https = require('https');

// Configuration loaded from environment variables
let notificationConfig = {
  enabled: false,
  supervisorToken: null,
  services: {},  // Map of userId to notification service
  defaultService: null
};

/**
 * Initialize notification configuration from environment variables
 */
function initializeNotifications() {
  // Get Supervisor token (provided by HA when homeassistant_api is enabled)
  notificationConfig.supervisorToken = process.env.SUPERVISOR_TOKEN;
  
  // Check if notifications are enabled
  const notificationsEnabled = process.env.NOTIFICATIONS_ENABLED === 'true';
  
  // Parse notification services configuration
  // Format: {"alex": "mobile_app_pixel_9a", "beth": "mobile_app_iphone"}
  const servicesJson = process.env.NOTIFICATION_SERVICES;
  if (servicesJson) {
    try {
      notificationConfig.services = JSON.parse(servicesJson);
      console.log('📱 Notification services configured:', Object.keys(notificationConfig.services));
    } catch (error) {
      console.error('❌ Error parsing NOTIFICATION_SERVICES:', error.message);
    }
  }
  
  // Default notification service (used when user-specific not found)
  notificationConfig.defaultService = process.env.DEFAULT_NOTIFICATION_SERVICE;
  
  // Enable notifications if we have a token and at least one service
  notificationConfig.enabled = notificationsEnabled && 
    notificationConfig.supervisorToken && 
    (Object.keys(notificationConfig.services).length > 0 || notificationConfig.defaultService);
  
  if (notificationConfig.enabled) {
    console.log('✅ Home Assistant notifications enabled');
  } else {
    console.log('📭 Home Assistant notifications disabled');
    if (!notificationConfig.supervisorToken) {
      console.log('   - No SUPERVISOR_TOKEN (enable homeassistant_api in add-on config)');
    }
    if (!notificationsEnabled) {
      console.log('   - NOTIFICATIONS_ENABLED is not true');
    }
    if (Object.keys(notificationConfig.services).length === 0 && !notificationConfig.defaultService) {
      console.log('   - No notification services configured');
    }
  }
  
  return notificationConfig.enabled;
}

/**
 * Call Home Assistant service via Supervisor API
 */
async function callHomeAssistantService(domain, service, data) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'supervisor',
      port: 80,
      path: `/core/api/services/${domain}/${service}`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${notificationConfig.supervisorToken}`,
        'Content-Type': 'application/json'
      }
    };
    
    const req = http.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log(`   ✅ HA service call successful: ${domain}.${service}`);
          resolve({ success: true, statusCode: res.statusCode, data: responseData });
        } else {
          console.error(`   ❌ HA service call failed: ${res.statusCode} - ${responseData}`);
          resolve({ success: false, statusCode: res.statusCode, error: responseData });
        }
      });
    });
    
    req.on('error', (error) => {
      console.error(`   ❌ HA request error:`, error.message);
      resolve({ success: false, error: error.message });
    });
    
    req.write(JSON.stringify(data));
    req.end();
  });
}

/**
 * Send a notification to a specific user
 * @param {string} userId - The user ID to notify
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {object} extraData - Additional notification data
 */
async function sendNotification(userId, title, message, extraData = {}) {
  if (!notificationConfig.enabled) {
    console.log(`📭 Notifications disabled, would have sent to ${userId}:`);
    console.log(`   Title: ${title}`);
    console.log(`   Message: ${message}`);
    return { success: false, reason: 'disabled' };
  }
  
  // Find the notification service for this user
  const service = notificationConfig.services[userId] || notificationConfig.defaultService;
  
  if (!service) {
    console.log(`📭 No notification service configured for user: ${userId}`);
    return { success: false, reason: 'no_service' };
  }
  
  console.log(`📱 Sending notification to ${userId} via ${service}`);
  
  const notificationData = {
    title: title,
    message: message,
    data: {
      tag: 'savings-tracker',
      group: 'savings-tracker',
      importance: 'default',
      ...extraData
    }
  };
  
  return await callHomeAssistantService('notify', service, notificationData);
}

/**
 * Send a notification to all configured users
 */
async function sendNotificationToAll(title, message, extraData = {}) {
  const results = [];
  
  // Get all unique services
  const allServices = new Set([
    ...Object.values(notificationConfig.services),
    notificationConfig.defaultService
  ].filter(Boolean));
  
  for (const service of allServices) {
    const result = await sendNotification(null, title, message, extraData);
    results.push({ service, ...result });
  }
  
  return results;
}

/**
 * Test notification to verify configuration
 */
async function testNotification(userId) {
  console.log('🧪 Testing notification configuration...');
  
  if (!notificationConfig.enabled) {
    return {
      success: false,
      reason: 'notifications_disabled',
      config: {
        hasToken: !!notificationConfig.supervisorToken,
        services: Object.keys(notificationConfig.services),
        defaultService: notificationConfig.defaultService
      }
    };
  }
  
  const result = await sendNotification(
    userId,
    '🧪 Savings Tracker Test',
    'If you see this, notifications are working correctly!',
    { test: true }
  );
  
  return result;
}

/**
 * Get current notification configuration (for debugging)
 */
function getNotificationConfig() {
  return {
    enabled: notificationConfig.enabled,
    hasToken: !!notificationConfig.supervisorToken,
    services: Object.keys(notificationConfig.services),
    defaultService: notificationConfig.defaultService || null
  };
}

// Initialize on module load
initializeNotifications();

module.exports = {
  initializeNotifications,
  sendNotification,
  sendNotificationToAll,
  testNotification,
  getNotificationConfig
};

