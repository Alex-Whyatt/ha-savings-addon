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

    if (!userId || !['alex', 'beth'].includes(userId)) {
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

    // Only allow Alex and Beth to access each other's data
    if (!['alex', 'beth'].includes(userId) || !['alex', 'beth'].includes(requestingUser.id)) {
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
      ...pot,
      createdAt: new Date(pot.created_at),
      updatedAt: new Date(pot.updated_at)
    }));

    const formattedTransactions = transactions.map(transaction => ({
      ...transaction,
      date: new Date(transaction.date),
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
      ...pot,
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
    const { name, description, currentTotal, targetAmount, color } = req.body;
    const userId = req.user.id;

    if (!name || typeof currentTotal !== 'number' || !color) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    await runQuery(
      'INSERT INTO savings_pots (id, user_id, name, description, current_total, target_amount, color, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, userId, name, description || null, currentTotal, targetAmount || null, color, now, now]
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
    const { name, description, currentTotal, targetAmount, color } = req.body;
    const userId = req.user.id;

    const existingPot = await getRow('SELECT * FROM savings_pots WHERE id = ? AND user_id = ?', [id, userId]);
    if (!existingPot) {
      return res.status(404).json({ error: 'Pot not found' });
    }

    const now = new Date().toISOString();

    await runQuery(
      'UPDATE savings_pots SET name = ?, description = ?, current_total = ?, target_amount = ?, color = ?, updated_at = ? WHERE id = ?',
      [name || existingPot.name, description !== undefined ? description : existingPot.description, currentTotal !== undefined ? currentTotal : existingPot.current_total, targetAmount !== undefined ? targetAmount : existingPot.target_amount, color || existingPot.color, now, id]
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

module.exports = router;
