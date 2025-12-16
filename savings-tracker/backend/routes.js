const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { runQuery, getRow, getAllRows } = require('./database');

const router = express.Router();

// Simple in-memory session store (for demo purposes)
const sessions = new Map();

// Test route to verify API is working
router.get('/test', (req, res) => {
  console.log('🧪 Test route called');
  res.json({ message: 'API is working!', timestamp: new Date().toISOString() });
});

// Get all available users (for login screen)
router.get('/users', async (req, res) => {
  try {
    const users = await getAllRows('SELECT id, name FROM users ORDER BY name ASC');
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Authentication middleware
const requireAuth = (req, res, next) => {
  const sessionId = req.headers.authorization;
  console.log('🔐 Auth middleware - Session ID:', sessionId, 'Sessions count:', sessions.size);

  if (!sessionId || !sessions.has(sessionId)) {
    console.log('❌ Auth failed - no session or session not found');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  req.user = sessions.get(sessionId);
  console.log('✅ Auth successful - User:', req.user);
  next();
};

// Authentication routes
router.post('/login', async (req, res) => {
  try {
    const { userId } = req.body;
    console.log('🔑 Login attempt for userId:', userId);

    if (!userId) {
      console.log('❌ Invalid user ID');
      return res.status(400).json({ error: 'Invalid user' });
    }

    const user = await getRow('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) {
      console.log('❌ User not found in database');
      return res.status(404).json({ error: 'User not found' });
    }

    // Create session
    const sessionId = Math.random().toString(36).substring(2);
    sessions.set(sessionId, {
      id: user.id,
      name: user.name,
      email: user.email
    });

    console.log('✅ Login successful, sessions count:', sessions.size);

    res.json({
      sessionId,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/logout', (req, res) => {
  const sessionId = req.headers.authorization;
  if (sessionId) {
    sessions.delete(sessionId);
  }
  res.json({ message: 'Logged out' });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// Admin route to get data for any user (for combined dashboard)
router.get('/admin/user/:userId/data', requireAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const requestingUser = req.user;

    console.log('🔍 Admin data request for userId:', userId, 'by requestingUser:', requestingUser);

    // Verify both the requesting user and target user exist in the database
    const targetUser = await getRow('SELECT id FROM users WHERE id = ?', [userId]);
    const reqUser = await getRow('SELECT id FROM users WHERE id = ?', [requestingUser.id]);
    
    if (!targetUser || !reqUser) {
      console.log('❌ Access denied for userId:', userId, 'requestingUser:', requestingUser.id);
      return res.status(403).json({ error: 'Access denied' });
    }

    const pots = await getAllRows('SELECT * FROM savings_pots WHERE user_id = ? ORDER BY created_at DESC', [userId]);
    const transactions = await getAllRows('SELECT * FROM transactions WHERE user_id = ? ORDER BY date DESC', [userId]);

    // Convert date strings back to Date objects for consistency
    const formattedPots = pots.map(pot => ({
      id: pot.id,
      userId: pot.user_id,
      name: pot.name,
      description: pot.description,
      currentTotal: pot.current_total,
      targetAmount: pot.target_amount,
      color: pot.color,
      interestRate: pot.interest_rate,
      createdAt: new Date(pot.created_at),
      updatedAt: new Date(pot.updated_at)
    }));

    const formattedTransactions = transactions.map(transaction => ({
      id: transaction.id,
      userId: transaction.user_id,
      potId: transaction.pot_id,
      amount: transaction.amount,
      date: new Date(transaction.date),
      description: transaction.description,
      repeatMonthly: transaction.repeat_monthly === 1,
      repeatWeekly: transaction.repeat_weekly === 1,
      createdAt: new Date(transaction.created_at)
    }));

    res.json({
      pots: formattedPots,
      transactions: formattedTransactions
    });
  } catch (error) {
    console.error('Error fetching admin user data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// User-specific data routes
router.get('/user/data', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    const pots = await getAllRows('SELECT * FROM savings_pots WHERE user_id = ? ORDER BY created_at DESC', [userId]);
    const transactions = await getAllRows('SELECT * FROM transactions WHERE user_id = ? ORDER BY date DESC', [userId]);

    // Convert date strings back to Date objects for consistency
    const formattedPots = pots.map(pot => ({
      id: pot.id,
      userId: pot.user_id,
      name: pot.name,
      description: pot.description,
      currentTotal: pot.current_total,
      targetAmount: pot.target_amount,
      color: pot.color,
      interestRate: pot.interest_rate,
      createdAt: new Date(pot.created_at),
      updatedAt: new Date(pot.updated_at)
    }));

    const formattedTransactions = transactions.map(transaction => ({
      id: transaction.id,
      userId: transaction.user_id,
      potId: transaction.pot_id,
      amount: transaction.amount,
      date: new Date(transaction.date),
      description: transaction.description,
      repeatMonthly: transaction.repeat_monthly === 1,
      repeatWeekly: transaction.repeat_weekly === 1,
      createdAt: new Date(transaction.created_at)
    }));

    res.json({
      pots: formattedPots,
      transactions: formattedTransactions
    });
  } catch (error) {
    console.error('Error fetching user data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all savings data for all users
router.get('/data', async (req, res) => {
  try {
    const pots = await getAllRows('SELECT * FROM savings_pots ORDER BY created_at DESC');
    const transactions = await getAllRows('SELECT * FROM transactions ORDER BY date DESC');

    // Convert date strings back to Date objects for consistency
    const formattedPots = pots.map(pot => ({
      id: pot.id,
      userId: pot.user_id,
      name: pot.name,
      description: pot.description,
      currentTotal: pot.current_total,
      targetAmount: pot.target_amount,
      color: pot.color,
      interestRate: pot.interest_rate,
      createdAt: new Date(pot.created_at),
      updatedAt: new Date(pot.updated_at)
    }));

    const formattedTransactions = transactions.map(transaction => ({
      id: transaction.id,
      userId: transaction.user_id,
      potId: transaction.pot_id,
      amount: transaction.amount,
      date: new Date(transaction.date),
      description: transaction.description,
      repeatMonthly: transaction.repeat_monthly === 1,
      repeatWeekly: transaction.repeat_weekly === 1,
      createdAt: new Date(transaction.created_at)
    }));

    res.json({
      pots: formattedPots,
      transactions: formattedTransactions
    });
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Savings Pots Routes
router.get('/pots', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const pots = await getAllRows('SELECT * FROM savings_pots WHERE user_id = ? ORDER BY created_at DESC', [userId]);
    const formattedPots = pots.map(pot => ({
      id: pot.id,
      userId: pot.user_id,
      name: pot.name,
      description: pot.description,
      currentTotal: pot.current_total,
      targetAmount: pot.target_amount,
      color: pot.color,
      interestRate: pot.interest_rate,
      createdAt: new Date(pot.created_at),
      updatedAt: new Date(pot.updated_at)
    }));
    res.json(formattedPots);
  } catch (error) {
    console.error('Error fetching pots:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/pots', requireAuth, async (req, res) => {
  try {
    const { name, description, currentTotal, targetAmount, color, interestRate } = req.body;
    const userId = req.user.id;

    if (!name || typeof currentTotal !== 'number' || !color) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    await runQuery(
      'INSERT INTO savings_pots (id, user_id, name, description, current_total, target_amount, color, interest_rate, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, userId, name, description || null, currentTotal, targetAmount || null, color, interestRate || null, now, now]
    );

    const pot = await getRow('SELECT * FROM savings_pots WHERE id = ?', [id]);
    const formattedPot = {
      id: pot.id,
      userId: pot.user_id,
      name: pot.name,
      description: pot.description,
      currentTotal: pot.current_total,
      targetAmount: pot.target_amount,
      color: pot.color,
      interestRate: pot.interest_rate,
      createdAt: new Date(pot.created_at),
      updatedAt: new Date(pot.updated_at)
    };

    res.status(201).json(formattedPot);
  } catch (error) {
    console.error('Error creating pot:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/pots/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, currentTotal, targetAmount, color, interestRate } = req.body;
    const userId = req.user.id;

    const existingPot = await getRow('SELECT * FROM savings_pots WHERE id = ? AND user_id = ?', [id, userId]);
    if (!existingPot) {
      return res.status(404).json({ error: 'Pot not found' });
    }

    const now = new Date().toISOString();

    await runQuery(
      'UPDATE savings_pots SET name = ?, description = ?, current_total = ?, target_amount = ?, color = ?, interest_rate = ?, updated_at = ? WHERE id = ?',
      [
        name || existingPot.name,
        description !== undefined ? description : existingPot.description,
        currentTotal !== undefined ? currentTotal : existingPot.current_total,
        targetAmount !== undefined ? targetAmount : existingPot.target_amount,
        color || existingPot.color,
        interestRate !== undefined ? interestRate : existingPot.interest_rate,
        now,
        id
      ]
    );

    const updatedPot = await getRow('SELECT * FROM savings_pots WHERE id = ?', [id]);
    const formattedPot = {
      id: updatedPot.id,
      userId: updatedPot.user_id,
      name: updatedPot.name,
      description: updatedPot.description,
      currentTotal: updatedPot.current_total,
      targetAmount: updatedPot.target_amount,
      color: updatedPot.color,
      interestRate: updatedPot.interest_rate,
      createdAt: new Date(updatedPot.created_at),
      updatedAt: new Date(updatedPot.updated_at)
    };

    res.json(formattedPot);
  } catch (error) {
    console.error('Error updating pot:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/pots/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if pot exists and belongs to user
    const pot = await getRow('SELECT * FROM savings_pots WHERE id = ? AND user_id = ?', [id, userId]);
    if (!pot) {
      return res.status(404).json({ error: 'Pot not found' });
    }

    // Delete transactions first (due to foreign key constraint)
    await runQuery('DELETE FROM transactions WHERE pot_id = ?', [id]);

    // Delete the pot
    await runQuery('DELETE FROM savings_pots WHERE id = ?', [id]);

    res.json({ message: 'Pot deleted successfully' });
  } catch (error) {
    console.error('Error deleting pot:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Transactions Routes
router.get('/transactions', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const transactions = await getAllRows('SELECT * FROM transactions WHERE user_id = ? ORDER BY date DESC', [userId]);
    const formattedTransactions = transactions.map(transaction => ({
      id: transaction.id,
      userId: transaction.user_id,
      potId: transaction.pot_id,
      amount: transaction.amount,
      date: new Date(transaction.date),
      description: transaction.description,
      repeatMonthly: transaction.repeat_monthly === 1,
      repeatWeekly: transaction.repeat_weekly === 1,
      createdAt: new Date(transaction.created_at)
    }));
    res.json(formattedTransactions);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/transactions', requireAuth, async (req, res) => {
  try {
    const { potId, amount, date, description, repeatMonthly, repeatWeekly } = req.body;
    const userId = req.user.id;

    if (!potId || typeof amount !== 'number' || !date) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Verify pot exists and belongs to user
    const pot = await getRow('SELECT * FROM savings_pots WHERE id = ? AND user_id = ?', [potId, userId]);
    if (!pot) {
      return res.status(404).json({ error: 'Pot not found' });
    }

    const id = uuidv4();
    const now = new Date().toISOString();
    const transactionDate = new Date(date).toISOString();

    // Insert transaction
    await runQuery(
      'INSERT INTO transactions (id, user_id, pot_id, amount, date, description, repeat_monthly, repeat_weekly, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, userId, potId, amount, transactionDate, description || null, repeatMonthly ? 1 : 0, repeatWeekly ? 1 : 0, now]
    );

    // Update pot total
    await runQuery(
      'UPDATE savings_pots SET current_total = current_total + ?, updated_at = ? WHERE id = ?',
      [amount, now, potId]
    );

    const transaction = await getRow('SELECT * FROM transactions WHERE id = ?', [id]);
    const formattedTransaction = {
      id: transaction.id,
      userId: transaction.user_id,
      potId: transaction.pot_id,
      amount: transaction.amount,
      date: new Date(transaction.date),
      description: transaction.description,
      repeatMonthly: transaction.repeat_monthly === 1,
      repeatWeekly: transaction.repeat_weekly === 1,
      createdAt: new Date(transaction.created_at)
    };

    res.status(201).json(formattedTransaction);
  } catch (error) {
    console.error('Error creating transaction:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/transactions/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { potId, amount, date, description, repeatMonthly, repeatWeekly } = req.body;
    const userId = req.user.id;

    const existingTransaction = await getRow('SELECT * FROM transactions WHERE id = ? AND user_id = ?', [id, userId]);
    if (!existingTransaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const now = new Date().toISOString();
    const transactionDate = date ? new Date(date).toISOString() : existingTransaction.date;

    // Calculate the difference in amount
    const amountDiff = (amount !== undefined ? amount : existingTransaction.amount) - existingTransaction.amount;

    // Update transaction
    await runQuery(
      'UPDATE transactions SET pot_id = ?, amount = ?, date = ?, description = ?, repeat_monthly = ?, repeat_weekly = ? WHERE id = ?',
      [potId || existingTransaction.pot_id, amount !== undefined ? amount : existingTransaction.amount, transactionDate, description !== undefined ? description : existingTransaction.description, repeatMonthly !== undefined ? (repeatMonthly ? 1 : 0) : existingTransaction.repeat_monthly, repeatWeekly !== undefined ? (repeatWeekly ? 1 : 0) : existingTransaction.repeat_weekly, id]
    );

    // Update pot total if amount changed
    if (amountDiff !== 0) {
      await runQuery(
        'UPDATE savings_pots SET current_total = current_total + ?, updated_at = ? WHERE id = ?',
        [amountDiff, now, existingTransaction.pot_id]
      );
    }

    // If pot changed, we need to handle that too (more complex logic needed)

    const updatedTransaction = await getRow('SELECT * FROM transactions WHERE id = ?', [id]);
    const formattedTransaction = {
      id: updatedTransaction.id,
      userId: updatedTransaction.user_id,
      potId: updatedTransaction.pot_id,
      amount: updatedTransaction.amount,
      date: new Date(updatedTransaction.date),
      description: updatedTransaction.description,
      repeatMonthly: updatedTransaction.repeat_monthly === 1,
      repeatWeekly: updatedTransaction.repeat_weekly === 1,
      createdAt: new Date(updatedTransaction.created_at)
    };

    res.json(formattedTransaction);
  } catch (error) {
    console.error('Error updating transaction:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/transactions/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const transaction = await getRow('SELECT * FROM transactions WHERE id = ? AND user_id = ?', [id, userId]);
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // Update pot total (subtract the transaction amount)
    await runQuery(
      'UPDATE savings_pots SET current_total = current_total - ?, updated_at = ? WHERE id = ?',
      [transaction.amount, new Date().toISOString(), transaction.pot_id]
    );

    // Delete transaction
    await runQuery('DELETE FROM transactions WHERE id = ?', [id]);

    res.json({ message: 'Transaction deleted successfully' });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== Upcoming Spends Routes ====================
// All users can see all upcoming spends (collaborative feature)

// Get all upcoming spends (all users can see all)
router.get('/upcoming-spends', requireAuth, async (req, res) => {
  try {
    const spends = await getAllRows(
      'SELECT * FROM upcoming_spends ORDER BY due_date ASC, created_at DESC'
    );
    
    const formattedSpends = spends.map(spend => ({
      id: spend.id,
      userId: spend.user_id,
      name: spend.name,
      amount: spend.amount,
      dueDate: spend.due_date ? new Date(spend.due_date) : null,
      isRecurring: spend.is_recurring === 1,
      recurrenceInterval: spend.recurrence_interval,
      categoryId: spend.category_id,
      completed: spend.completed === 1,
      createdAt: new Date(spend.created_at),
      updatedAt: new Date(spend.updated_at)
    }));
    
    res.json(formattedSpends);
  } catch (error) {
    console.error('Error fetching upcoming spends:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new upcoming spend
router.post('/upcoming-spends', requireAuth, async (req, res) => {
  try {
    const { name, amount, dueDate, isRecurring, recurrenceInterval, categoryId } = req.body;
    const userId = req.user.id;

    if (!name || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ error: 'Name and valid amount are required' });
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    await runQuery(
      `INSERT INTO upcoming_spends (id, user_id, name, amount, due_date, is_recurring, recurrence_interval, category_id, completed, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
      [id, userId, name, amount, dueDate || null, isRecurring ? 1 : 0, recurrenceInterval || null, categoryId || null, now, now]
    );

    const spend = await getRow('SELECT * FROM upcoming_spends WHERE id = ?', [id]);
    
    res.status(201).json({
      id: spend.id,
      userId: spend.user_id,
      name: spend.name,
      amount: spend.amount,
      dueDate: spend.due_date ? new Date(spend.due_date) : null,
      isRecurring: spend.is_recurring === 1,
      recurrenceInterval: spend.recurrence_interval,
      categoryId: spend.category_id,
      completed: spend.completed === 1,
      createdAt: new Date(spend.created_at),
      updatedAt: new Date(spend.updated_at)
    });
  } catch (error) {
    console.error('Error creating upcoming spend:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update an upcoming spend (only owner can update)
router.put('/upcoming-spends/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, amount, dueDate, isRecurring, recurrenceInterval, categoryId, completed } = req.body;
    const userId = req.user.id;

    const existingSpend = await getRow('SELECT * FROM upcoming_spends WHERE id = ? AND user_id = ?', [id, userId]);
    if (!existingSpend) {
      return res.status(404).json({ error: 'Upcoming spend not found or not authorized' });
    }

    const now = new Date().toISOString();

    await runQuery(
      `UPDATE upcoming_spends SET 
        name = ?, amount = ?, due_date = ?, is_recurring = ?, recurrence_interval = ?, category_id = ?, completed = ?, updated_at = ?
       WHERE id = ?`,
      [
        name !== undefined ? name : existingSpend.name,
        amount !== undefined ? amount : existingSpend.amount,
        dueDate !== undefined ? dueDate : existingSpend.due_date,
        isRecurring !== undefined ? (isRecurring ? 1 : 0) : existingSpend.is_recurring,
        recurrenceInterval !== undefined ? recurrenceInterval : existingSpend.recurrence_interval,
        categoryId !== undefined ? categoryId : existingSpend.category_id,
        completed !== undefined ? (completed ? 1 : 0) : existingSpend.completed,
        now,
        id
      ]
    );

    const updatedSpend = await getRow('SELECT * FROM upcoming_spends WHERE id = ?', [id]);
    
    res.json({
      id: updatedSpend.id,
      userId: updatedSpend.user_id,
      name: updatedSpend.name,
      amount: updatedSpend.amount,
      dueDate: updatedSpend.due_date ? new Date(updatedSpend.due_date) : null,
      isRecurring: updatedSpend.is_recurring === 1,
      recurrenceInterval: updatedSpend.recurrence_interval,
      categoryId: updatedSpend.category_id,
      completed: updatedSpend.completed === 1,
      createdAt: new Date(updatedSpend.created_at),
      updatedAt: new Date(updatedSpend.updated_at)
    });
  } catch (error) {
    console.error('Error updating upcoming spend:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete an upcoming spend (only owner can delete)
router.delete('/upcoming-spends/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const spend = await getRow('SELECT * FROM upcoming_spends WHERE id = ? AND user_id = ?', [id, userId]);
    if (!spend) {
      return res.status(404).json({ error: 'Upcoming spend not found or not authorized' });
    }

    await runQuery('DELETE FROM upcoming_spends WHERE id = ?', [id]);

    res.json({ message: 'Upcoming spend deleted successfully' });
  } catch (error) {
    console.error('Error deleting upcoming spend:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== Expense Categories Routes ====================
// All users can see all categories (collaborative feature)

// Get all expense categories
router.get('/expense-categories', requireAuth, async (req, res) => {
  try {
    const categories = await getAllRows(
      'SELECT * FROM expense_categories ORDER BY name ASC'
    );
    
    const formattedCategories = categories.map(cat => ({
      id: cat.id,
      userId: cat.user_id,
      name: cat.name,
      color: cat.color,
      icon: cat.icon,
      createdAt: new Date(cat.created_at),
      updatedAt: new Date(cat.updated_at)
    }));
    
    res.json(formattedCategories);
  } catch (error) {
    console.error('Error fetching expense categories:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new expense category
router.post('/expense-categories', requireAuth, async (req, res) => {
  try {
    const { name, color, icon } = req.body;
    const userId = req.user.id;

    if (!name || !color) {
      return res.status(400).json({ error: 'Name and color are required' });
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    await runQuery(
      `INSERT INTO expense_categories (id, user_id, name, color, icon, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, userId, name, color, icon || null, now, now]
    );

    const category = await getRow('SELECT * FROM expense_categories WHERE id = ?', [id]);
    
    res.status(201).json({
      id: category.id,
      userId: category.user_id,
      name: category.name,
      color: category.color,
      icon: category.icon,
      createdAt: new Date(category.created_at),
      updatedAt: new Date(category.updated_at)
    });
  } catch (error) {
    console.error('Error creating expense category:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update an expense category (only owner can update)
router.put('/expense-categories/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, color, icon } = req.body;
    const userId = req.user.id;

    const existingCategory = await getRow('SELECT * FROM expense_categories WHERE id = ? AND user_id = ?', [id, userId]);
    if (!existingCategory) {
      return res.status(404).json({ error: 'Category not found or not authorized' });
    }

    const now = new Date().toISOString();

    await runQuery(
      `UPDATE expense_categories SET name = ?, color = ?, icon = ?, updated_at = ? WHERE id = ?`,
      [
        name !== undefined ? name : existingCategory.name,
        color !== undefined ? color : existingCategory.color,
        icon !== undefined ? icon : existingCategory.icon,
        now,
        id
      ]
    );

    const updatedCategory = await getRow('SELECT * FROM expense_categories WHERE id = ?', [id]);
    
    res.json({
      id: updatedCategory.id,
      userId: updatedCategory.user_id,
      name: updatedCategory.name,
      color: updatedCategory.color,
      icon: updatedCategory.icon,
      createdAt: new Date(updatedCategory.created_at),
      updatedAt: new Date(updatedCategory.updated_at)
    });
  } catch (error) {
    console.error('Error updating expense category:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete an expense category (only owner can delete)
router.delete('/expense-categories/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const category = await getRow('SELECT * FROM expense_categories WHERE id = ? AND user_id = ?', [id, userId]);
    if (!category) {
      return res.status(404).json({ error: 'Category not found or not authorized' });
    }

    // Set category_id to null for any spends using this category
    await runQuery('UPDATE upcoming_spends SET category_id = NULL WHERE category_id = ?', [id]);

    await runQuery('DELETE FROM expense_categories WHERE id = ?', [id]);

    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Error deleting expense category:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== Budget Allocation Routes ====================
// Budget allocation for Sankey diagram visualization

// Get user's budget allocation with streams
router.get('/budget', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    let budget = await getRow('SELECT * FROM budget_allocations WHERE user_id = ?', [userId]);
    
    // If no budget exists, create one with default values
    if (!budget) {
      const id = uuidv4();
      const now = new Date().toISOString();
      
      await runQuery(
        'INSERT INTO budget_allocations (id, user_id, net_salary, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
        [id, userId, 0, now, now]
      );
      
      budget = await getRow('SELECT * FROM budget_allocations WHERE id = ?', [id]);
    }
    
    const streams = await getAllRows(
      'SELECT * FROM budget_streams WHERE budget_id = ? ORDER BY sort_order ASC',
      [budget.id]
    );
    
    res.json({
      id: budget.id,
      userId: budget.user_id,
      netSalary: budget.net_salary,
      createdAt: new Date(budget.created_at),
      updatedAt: new Date(budget.updated_at),
      streams: streams.map(s => ({
        id: s.id,
        budgetId: s.budget_id,
        name: s.name,
        amount: s.amount,
        color: s.color,
        isAutoSavings: s.is_auto_savings === 1,
        sortOrder: s.sort_order,
        createdAt: new Date(s.created_at),
        updatedAt: new Date(s.updated_at)
      }))
    });
  } catch (error) {
    console.error('Error fetching budget:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update budget allocation (net salary)
router.put('/budget', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { netSalary } = req.body;
    
    if (typeof netSalary !== 'number' || netSalary < 0) {
      return res.status(400).json({ error: 'Valid net salary is required' });
    }
    
    let budget = await getRow('SELECT * FROM budget_allocations WHERE user_id = ?', [userId]);
    const now = new Date().toISOString();
    
    if (!budget) {
      // Create new budget
      const id = uuidv4();
      await runQuery(
        'INSERT INTO budget_allocations (id, user_id, net_salary, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
        [id, userId, netSalary, now, now]
      );
      budget = await getRow('SELECT * FROM budget_allocations WHERE id = ?', [id]);
    } else {
      // Update existing budget
      await runQuery(
        'UPDATE budget_allocations SET net_salary = ?, updated_at = ? WHERE id = ?',
        [netSalary, now, budget.id]
      );
      budget = await getRow('SELECT * FROM budget_allocations WHERE id = ?', [budget.id]);
    }
    
    res.json({
      id: budget.id,
      userId: budget.user_id,
      netSalary: budget.net_salary,
      createdAt: new Date(budget.created_at),
      updatedAt: new Date(budget.updated_at)
    });
  } catch (error) {
    console.error('Error updating budget:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add a new budget stream
router.post('/budget/streams', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, amount, color, isAutoSavings, sortOrder } = req.body;
    
    if (!name || typeof amount !== 'number') {
      return res.status(400).json({ error: 'Name and amount are required' });
    }
    
    // Get or create budget
    let budget = await getRow('SELECT * FROM budget_allocations WHERE user_id = ?', [userId]);
    const now = new Date().toISOString();
    
    if (!budget) {
      const budgetId = uuidv4();
      await runQuery(
        'INSERT INTO budget_allocations (id, user_id, net_salary, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
        [budgetId, userId, 0, now, now]
      );
      budget = await getRow('SELECT * FROM budget_allocations WHERE id = ?', [budgetId]);
    }
    
    const id = uuidv4();
    
    await runQuery(
      'INSERT INTO budget_streams (id, budget_id, name, amount, color, is_auto_savings, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, budget.id, name, amount, color || '#667eea', isAutoSavings ? 1 : 0, sortOrder || 0, now, now]
    );
    
    const stream = await getRow('SELECT * FROM budget_streams WHERE id = ?', [id]);
    
    res.status(201).json({
      id: stream.id,
      budgetId: stream.budget_id,
      name: stream.name,
      amount: stream.amount,
      color: stream.color,
      isAutoSavings: stream.is_auto_savings === 1,
      sortOrder: stream.sort_order,
      createdAt: new Date(stream.created_at),
      updatedAt: new Date(stream.updated_at)
    });
  } catch (error) {
    console.error('Error creating budget stream:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update a budget stream
router.put('/budget/streams/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { name, amount, color, sortOrder } = req.body;
    
    // Verify stream belongs to user's budget
    const budget = await getRow('SELECT * FROM budget_allocations WHERE user_id = ?', [userId]);
    if (!budget) {
      return res.status(404).json({ error: 'Budget not found' });
    }
    
    const existingStream = await getRow('SELECT * FROM budget_streams WHERE id = ? AND budget_id = ?', [id, budget.id]);
    if (!existingStream) {
      return res.status(404).json({ error: 'Stream not found' });
    }
    
    const now = new Date().toISOString();
    
    await runQuery(
      'UPDATE budget_streams SET name = ?, amount = ?, color = ?, sort_order = ?, updated_at = ? WHERE id = ?',
      [
        name !== undefined ? name : existingStream.name,
        amount !== undefined ? amount : existingStream.amount,
        color !== undefined ? color : existingStream.color,
        sortOrder !== undefined ? sortOrder : existingStream.sort_order,
        now,
        id
      ]
    );
    
    const stream = await getRow('SELECT * FROM budget_streams WHERE id = ?', [id]);
    
    res.json({
      id: stream.id,
      budgetId: stream.budget_id,
      name: stream.name,
      amount: stream.amount,
      color: stream.color,
      isAutoSavings: stream.is_auto_savings === 1,
      sortOrder: stream.sort_order,
      createdAt: new Date(stream.created_at),
      updatedAt: new Date(stream.updated_at)
    });
  } catch (error) {
    console.error('Error updating budget stream:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a budget stream
router.delete('/budget/streams/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    
    // Verify stream belongs to user's budget
    const budget = await getRow('SELECT * FROM budget_allocations WHERE user_id = ?', [userId]);
    if (!budget) {
      return res.status(404).json({ error: 'Budget not found' });
    }
    
    const stream = await getRow('SELECT * FROM budget_streams WHERE id = ? AND budget_id = ?', [id, budget.id]);
    if (!stream) {
      return res.status(404).json({ error: 'Stream not found' });
    }
    
    // Don't allow deleting the auto-savings stream
    if (stream.is_auto_savings === 1) {
      return res.status(400).json({ error: 'Cannot delete the savings stream' });
    }
    
    await runQuery('DELETE FROM budget_streams WHERE id = ?', [id]);
    
    res.json({ message: 'Stream deleted successfully' });
  } catch (error) {
    console.error('Error deleting budget stream:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
