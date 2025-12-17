/**
 * Scheduler Module for Savings Tracker
 * 
 * Handles:
 * 1. Daily processing of recurring transactions
 * 2. Updating savings pot totals
 * 3. Sending notifications via Home Assistant
 */

const cron = require('node-cron');
const { v4: uuidv4 } = require('uuid');
const { runQuery, getRow, getAllRows } = require('./database');
const { sendNotification } = require('./notifications');

// Track if scheduler is running
let schedulerRunning = false;

/**
 * Get day of week (0 = Sunday, 6 = Saturday)
 */
function getDayOfWeek(date) {
  return date.getDay();
}

/**
 * Get day of month (1-31)
 */
function getDayOfMonth(date) {
  return date.getDate();
}

/**
 * Check if a recurring instance has already been processed for a specific date
 */
async function hasBeenProcessed(originalTransactionId, instanceDate) {
  const dateStr = instanceDate.toISOString().split('T')[0]; // YYYY-MM-DD
  const record = await getRow(
    `SELECT id FROM processed_recurring 
     WHERE original_transaction_id = ? AND instance_date = ?`,
    [originalTransactionId, dateStr]
  );
  return !!record;
}

/**
 * Mark a recurring instance as processed
 */
async function markAsProcessed(originalTransactionId, instanceDate, newTransactionId) {
  const dateStr = instanceDate.toISOString().split('T')[0];
  const now = new Date().toISOString();
  
  await runQuery(
    `INSERT INTO processed_recurring 
     (id, original_transaction_id, instance_date, new_transaction_id, processed_at)
     VALUES (?, ?, ?, ?, ?)`,
    [uuidv4(), originalTransactionId, dateStr, newTransactionId, now]
  );
}

/**
 * Process all due recurring transactions for today
 * Returns summary of processed transactions
 */
async function processRecurringTransactions() {
  const today = new Date();
  today.setHours(12, 0, 0, 0); // Normalize to noon
  
  const todayDayOfWeek = getDayOfWeek(today);
  const todayDayOfMonth = getDayOfMonth(today);
  
  console.log(`🔄 Processing recurring transactions for ${today.toDateString()}`);
  console.log(`   Day of week: ${todayDayOfWeek}, Day of month: ${todayDayOfMonth}`);
  
  const processed = [];
  const errors = [];
  
  try {
    // Get all recurring transactions
    const recurringTransactions = await getAllRows(
      `SELECT t.*, sp.name as pot_name, u.name as user_name
       FROM transactions t
       JOIN savings_pots sp ON t.pot_id = sp.id
       JOIN users u ON t.user_id = u.id
       WHERE t.repeat_monthly = 1 OR t.repeat_weekly = 1`
    );
    
    console.log(`   Found ${recurringTransactions.length} recurring transaction(s)`);
    
    for (const recurring of recurringTransactions) {
      try {
        const originalDate = new Date(recurring.date);
        let shouldProcess = false;
        
        // Check if this transaction should occur today
        if (recurring.repeat_weekly === 1) {
          // Weekly: check if today is the same day of week
          const originalDayOfWeek = getDayOfWeek(originalDate);
          shouldProcess = todayDayOfWeek === originalDayOfWeek;
          
          if (shouldProcess) {
            console.log(`   📅 Weekly match: ${recurring.description || 'Payment'} (${recurring.pot_name})`);
          }
        }
        
        if (recurring.repeat_monthly === 1) {
          // Monthly: check if today is the same day of month
          const originalDayOfMonth = getDayOfMonth(originalDate);
          shouldProcess = todayDayOfMonth === originalDayOfMonth;
          
          if (shouldProcess) {
            console.log(`   📅 Monthly match: ${recurring.description || 'Payment'} (${recurring.pot_name})`);
          }
        }
        
        if (!shouldProcess) continue;
        
        // Check if already processed today
        const alreadyProcessed = await hasBeenProcessed(recurring.id, today);
        if (alreadyProcessed) {
          console.log(`   ⏭️  Already processed: ${recurring.description || 'Payment'}`);
          continue;
        }
        
        // Create new transaction instance
        const newTransactionId = uuidv4();
        const now = new Date().toISOString();
        
        await runQuery(
          `INSERT INTO transactions 
           (id, user_id, pot_id, amount, date, description, repeat_monthly, repeat_weekly, created_at)
           VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?)`,
          [
            newTransactionId,
            recurring.user_id,
            recurring.pot_id,
            recurring.amount,
            today.toISOString(),
            recurring.description ? `${recurring.description} (auto)` : 'Auto-processed recurring payment',
            now
          ]
        );
        
        // Update pot total
        await runQuery(
          `UPDATE savings_pots SET current_total = current_total + ?, updated_at = ? WHERE id = ?`,
          [recurring.amount, now, recurring.pot_id]
        );
        
        // Mark as processed
        await markAsProcessed(recurring.id, today, newTransactionId);
        
        // Get updated pot total
        const updatedPot = await getRow('SELECT current_total FROM savings_pots WHERE id = ?', [recurring.pot_id]);
        
        processed.push({
          transactionId: newTransactionId,
          originalId: recurring.id,
          userId: recurring.user_id,
          userName: recurring.user_name,
          potId: recurring.pot_id,
          potName: recurring.pot_name,
          amount: recurring.amount,
          description: recurring.description,
          type: recurring.repeat_weekly === 1 ? 'weekly' : 'monthly',
          newTotal: updatedPot?.current_total || 0
        });
        
        console.log(`   ✅ Processed: £${recurring.amount.toFixed(2)} → ${recurring.pot_name}`);
        
      } catch (error) {
        console.error(`   ❌ Error processing transaction ${recurring.id}:`, error.message);
        errors.push({
          transactionId: recurring.id,
          error: error.message
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Error in processRecurringTransactions:', error);
    errors.push({ error: error.message });
  }
  
  return { processed, errors, date: today.toISOString() };
}

/**
 * Send notifications for processed transactions
 */
async function notifyProcessedTransactions(results) {
  if (!results.processed || results.processed.length === 0) {
    console.log('📭 No transactions to notify about');
    return;
  }
  
  // Group by user
  const byUser = results.processed.reduce((acc, tx) => {
    if (!acc[tx.userId]) {
      acc[tx.userId] = { userName: tx.userName, transactions: [] };
    }
    acc[tx.userId].transactions.push(tx);
    return acc;
  }, {});
  
  // Send notification for each user's transactions
  for (const [userId, data] of Object.entries(byUser)) {
    const totalAmount = data.transactions.reduce((sum, tx) => sum + tx.amount, 0);
    const count = data.transactions.length;
    
    // Build detailed message
    const details = data.transactions
      .map(tx => `• £${tx.amount.toFixed(2)} → ${tx.potName}`)
      .join('\n');
    
    const title = `💰 Savings Updated`;
    const message = count === 1
      ? `£${totalAmount.toFixed(2)} added to ${data.transactions[0].potName}\nNew total: £${data.transactions[0].newTotal.toFixed(2)}`
      : `${count} recurring payments processed\nTotal: £${totalAmount.toFixed(2)}\n\n${details}`;
    
    await sendNotification(userId, title, message);
  }
}

/**
 * Run the full processing cycle: process transactions and send notifications
 */
async function runProcessingCycle() {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 Starting scheduled processing cycle');
  console.log('='.repeat(60));
  
  const results = await processRecurringTransactions();
  
  console.log(`\n📊 Processing Summary:`);
  console.log(`   Processed: ${results.processed.length}`);
  console.log(`   Errors: ${results.errors.length}`);
  
  // Send notifications
  await notifyProcessedTransactions(results);
  
  console.log('='.repeat(60));
  console.log('✅ Processing cycle complete\n');
  
  return results;
}

/**
 * Initialize the scheduler
 * @param {string} cronExpression - Cron expression for when to run (default: 6:00 AM daily)
 */
function initializeScheduler(cronExpression = '0 8 * * *') {
  if (schedulerRunning) {
    console.log('⚠️  Scheduler already running');
    return;
  }
  
  // Validate cron expression
  if (!cron.validate(cronExpression)) {
    console.error(`❌ Invalid cron expression: ${cronExpression}`);
    console.log('   Using default: 0 8 * * * (8:00 AM daily)');
    cronExpression = '0 6 * * *';
  }
  
  console.log(`⏰ Initializing scheduler with cron: ${cronExpression}`);
  
  // Schedule the daily job
  cron.schedule(cronExpression, async () => {
    try {
      await runProcessingCycle();
    } catch (error) {
      console.error('❌ Scheduled job error:', error);
    }
  });
  
  schedulerRunning = true;
  console.log('✅ Scheduler initialized successfully');
}

/**
 * Stop the scheduler
 */
function stopScheduler() {
  schedulerRunning = false;
  console.log('🛑 Scheduler stopped');
}

module.exports = {
  initializeScheduler,
  stopScheduler,
  processRecurringTransactions,
  runProcessingCycle
};

