/**
 * Home Assistant Sensors Module
 *
 * Publishes household savings figures as Home Assistant sensors so they can
 * be shown on any dashboard:
 *   sensor.savings_tracker_total            - everything saved, both people
 *   sensor.savings_tracker_saved_this_month - paid in so far this month
 *   sensor.savings_tracker_monthly_plan     - recurring contributions per month
 *
 * States set through the API are lost when Home Assistant restarts, so they
 * are re-published on a timer as well as after every change.
 */

const http = require('http');
const { getAllRows } = require('./database');
const { buildSavingsSummary } = require('./savingsSummary');

const REFRESH_INTERVAL_MS = 5 * 60 * 1000;
const CHANGE_DEBOUNCE_MS = 2000;
const STARTUP_DELAY_MS = 5000;

let enabled = false;
let debounceTimer = null;

/**
 * Set a sensor state via the Supervisor proxy to the Home Assistant API
 */
function setState(entityId, state, attributes) {
  return new Promise((resolve) => {
    const req = http.request({
      hostname: 'supervisor',
      port: 80,
      path: `/core/api/states/${entityId}`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SUPERVISOR_TOKEN}`,
        'Content-Type': 'application/json'
      }
    }, (res) => {
      res.resume();
      res.on('end', () => {
        if (res.statusCode >= 300) {
          console.error(`   ❌ Failed to update ${entityId}: ${res.statusCode}`);
        }
        resolve(res.statusCode < 300);
      });
    });

    req.on('error', (error) => {
      console.error(`   ❌ Error updating ${entityId}:`, error.message);
      resolve(false);
    });

    req.write(JSON.stringify({ state, attributes }));
    req.end();
  });
}

const money = (extra) => ({
  unit_of_measurement: 'GBP',
  device_class: 'monetary',
  icon: 'mdi:piggy-bank',
  ...extra
});

/**
 * Work out the latest figures and push them to Home Assistant
 */
async function publishSensors() {
  if (!enabled) return;

  try {
    const [users, pots, transactions] = await Promise.all([
      getAllRows('SELECT id, name FROM users ORDER BY name ASC'),
      getAllRows('SELECT * FROM savings_pots ORDER BY name ASC'),
      getAllRows('SELECT * FROM transactions')
    ]);
    const summary = buildSavingsSummary(users, pots, transactions);
    const perPerson = (key) => Object.fromEntries(summary.people.map(person => [person.name, person[key]]));

    await setState('sensor.savings_tracker_total', summary.total, money({
      friendly_name: 'Household savings',
      state_class: 'total',
      people: perPerson('total'),
      accounts: summary.accounts
    }));

    await setState('sensor.savings_tracker_saved_this_month', summary.savedThisMonth, money({
      friendly_name: 'Saved this month',
      icon: 'mdi:calendar-month',
      monthly_plan: summary.monthlyPlan,
      people: perPerson('savedThisMonth')
    }));

    await setState('sensor.savings_tracker_monthly_plan', summary.monthlyPlan, money({
      friendly_name: 'Monthly savings plan',
      icon: 'mdi:repeat',
      people: perPerson('monthlyPlan')
    }));
  } catch (error) {
    console.error('❌ Error publishing Home Assistant sensors:', error.message);
  }
}

/**
 * Publish soon after a change, batching bursts of edits into one update
 */
function scheduleSensorUpdate() {
  if (!enabled) return;
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(publishSensors, CHANGE_DEBOUNCE_MS);
}

/**
 * Start publishing if we're running as an add-on with API access
 */
function initializeSensors() {
  enabled = !!process.env.SUPERVISOR_TOKEN && process.env.HA_SENSORS_ENABLED !== 'false';

  if (!enabled) {
    console.log('📊 Home Assistant sensors disabled');
    return false;
  }

  console.log('📊 Publishing savings sensors to Home Assistant');
  // Give the database a moment to create its tables on first run
  setTimeout(publishSensors, STARTUP_DELAY_MS);
  setInterval(publishSensors, REFRESH_INTERVAL_MS);
  return true;
}

module.exports = {
  initializeSensors,
  publishSensors,
  scheduleSensorUpdate
};
