import React, { useState, useEffect } from 'react';
import { SavingsData, Transaction, User } from '../types';
import { addTransaction, deleteTransaction } from '../storage';
import { getProjectedRecurringTransactions } from '../projections';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Chip,
  FormControlLabel,
  Checkbox,
  Avatar
} from '@mui/material';
import { ChevronLeft, ChevronRight, Delete, Add } from '@mui/icons-material';
import { useAuth } from '../AuthContext';

interface CalendarProps {
  data: SavingsData;
  combinedData: SavingsData;
  onDataChange: () => void;
  currentUser: User;
}

type RecurrenceType = 'none' | 'weekly' | 'monthly';
type DialogMode = 'view' | 'add';

// Generate a consistent color for a user based on their index
const getUserColor = (_userId: string, index: number): string => {
  const colors = ['#667eea', '#e91e63', '#4caf50', '#ff9800', '#9c27b0', '#00bcd4'];
  return colors[index % colors.length];
};

const Calendar: React.FC<CalendarProps> = ({ data, combinedData, onDataChange, currentUser }) => {
  const { otherUsers, allUsers } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<DialogMode>('view');
  const [projectedTransactions, setProjectedTransactions] = useState<Transaction[]>([]);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
  // Track which users' data to display (current user always included)
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set([currentUser.id]));
  const [formData, setFormData] = useState({
    potId: data.pots[0]?.id || '',
    amount: '',
    description: '',
    recurrence: 'none' as RecurrenceType
  });

  // Build user color map
  const userColorMap = new Map<string, string>();
  allUsers.forEach((user, index) => {
    userColorMap.set(user.id, getUserColor(user.id, index));
  });

  useEffect(() => {
    const loadProjected = async () => {
      const projected = await getProjectedRecurringTransactions();
      setProjectedTransactions(projected);
    };
    loadProjected();
  }, [combinedData.transactions]);

  // Toggle user selection
  const toggleUserSelection = (userId: string) => {
    // Current user cannot be deselected
    if (userId === currentUser.id) return;
    
    setSelectedUserIds(prev => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  // Get the active data based on selected users
  const getActiveData = (): SavingsData => {
    if (selectedUserIds.size === 1 && selectedUserIds.has(currentUser.id)) {
      // Only current user selected - use their data
      return data;
    }
    // Filter combined data by selected users
    return {
      pots: combinedData.pots.filter(pot => selectedUserIds.has(pot.userId)),
      transactions: combinedData.transactions.filter(t => selectedUserIds.has(t.userId))
    };
  };

  const activeData = getActiveData();

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getTransactionsForDate = (date: Date): Transaction[] => {
    // Filter actual transactions by selected users
    const actualTransactions = activeData.transactions.filter(transaction =>
      isSameDay(transaction.date, date)
    );

    // Filter projected transactions by selected users
    const projectedForDate = projectedTransactions.filter(transaction =>
      isSameDay(transaction.date, date) && selectedUserIds.has(transaction.userId)
    );

    return [...actualTransactions, ...projectedForDate];
  };

  const getPotName = (potId: string): string => {
    const pot = combinedData.pots.find(p => p.id === potId);
    return pot?.name || 'Unknown Account';
  };

  const getUserName = (userId: string): string => {
    const user = allUsers.find(u => u.id === userId);
    return user?.name || userId;
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setDialogMode('view');
    setDialogOpen(true);
  };

  const handleAddNew = () => {
    setFormData({ potId: data.pots[0]?.id || '', amount: '', description: '', recurrence: 'none' });
    setDialogMode('add');
  };

  const handleBackToView = () => {
    setDialogMode('view');
  };

  const handleSubmitTransaction = async (e: React.FormEvent) => {
    e.preventDefault();

    const amount = parseFloat(formData.amount);
    if (!selectedDate || !formData.potId || isNaN(amount) || amount <= 0) {
      return;
    }

    await addTransaction({
      potId: formData.potId,
      amount,
      date: selectedDate,
      description: formData.description || undefined,
      repeatMonthly: formData.recurrence === 'monthly',
      repeatWeekly: formData.recurrence === 'weekly'
    });

    setDialogMode('view');
    onDataChange();
  };

  const handleDeleteClick = (transaction: Transaction) => {
    setTransactionToDelete(transaction);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!transactionToDelete) return;

    await deleteTransaction(transactionToDelete.id);
    setDeleteConfirmOpen(false);
    setTransactionToDelete(null);
    onDataChange();
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedDate(null);
    setDialogMode('view');
  };

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const selectedDateTransactions = selectedDate ? getTransactionsForDate(selectedDate) : [];
  const actualTransactionsForDialog = selectedDateTransactions.filter(t => !t.id.startsWith('projected-'));
  const projectedTransactionsForDialog = selectedDateTransactions.filter(t => t.id.startsWith('projected-'));

  return (
    <Box sx={{
      display: 'flex',
      justifyContent: 'center',
      width: '100%'
    }}>
      <Card sx={{
        width: '100%',
        maxWidth: '900px',
        overflow: 'hidden'
      }}>
        <CardContent sx={{ p: { xs: 1, sm: 2 } }}>
        {/* User Filter Checkboxes */}
        {otherUsers.length > 0 && (
          <Box sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: { xs: 1, sm: 2 },
            mb: 2,
            p: 1.5,
            bgcolor: 'grey.50',
            borderRadius: 2,
            alignItems: 'center'
          }}>
            <Typography variant="body2" color="text.secondary" sx={{ mr: 1, fontWeight: 500 }}>
              Show:
            </Typography>
            {/* Current user (always checked, disabled) */}
            <FormControlLabel
              control={
                <Checkbox
                  checked={true}
                  disabled
                  size="small"
                  sx={{
                    color: userColorMap.get(currentUser.id),
                    '&.Mui-checked': { color: userColorMap.get(currentUser.id) },
                    '&.Mui-disabled': { color: userColorMap.get(currentUser.id) }
                  }}
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Avatar
                    sx={{
                      width: 20,
                      height: 20,
                      fontSize: '0.7rem',
                      bgcolor: userColorMap.get(currentUser.id)
                    }}
                  >
                    {currentUser.name.charAt(0)}
                  </Avatar>
                  <Typography variant="body2">{currentUser.name} (You)</Typography>
                </Box>
              }
              sx={{ mr: 2 }}
            />
            {/* Other users */}
            {otherUsers.map(user => (
              <FormControlLabel
                key={user.id}
                control={
                  <Checkbox
                    checked={selectedUserIds.has(user.id)}
                    onChange={() => toggleUserSelection(user.id)}
                    size="small"
                    sx={{
                      color: userColorMap.get(user.id),
                      '&.Mui-checked': { color: userColorMap.get(user.id) }
                    }}
                  />
                }
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Avatar
                      sx={{
                        width: 20,
                        height: 20,
                        fontSize: '0.7rem',
                        bgcolor: selectedUserIds.has(user.id) ? userColorMap.get(user.id) : 'grey.400'
                      }}
                    >
                      {user.name.charAt(0)}
                    </Avatar>
                    <Typography variant="body2">{user.name}</Typography>
                  </Box>
                }
                sx={{ mr: 2 }}
              />
            ))}
          </Box>
        )}

        <Box sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 2,
          flexWrap: 'wrap',
          gap: 1
        }}>
          <IconButton onClick={prevMonth} size="small">
            <ChevronLeft />
          </IconButton>
          <Typography
            variant="h5"
            component="h2"
            sx={{ fontSize: { xs: '1.2rem', sm: '1.5rem' } }}
          >
            {format(currentMonth, 'MMMM yyyy')}
          </Typography>
          <IconButton onClick={nextMonth} size="small">
            <ChevronRight />
          </IconButton>
        </Box>

        {/* Monthly Summary when multiple users selected */}
        {selectedUserIds.size > 1 && (
          <Box sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 2,
            mb: 2,
            p: 2,
            bgcolor: 'white',
            border: '1px solid',
            borderColor: 'grey.200',
            borderRadius: 2
          }}>
            {Array.from(selectedUserIds).map(userId => {
              const userTransactions = activeData.transactions.filter(t => 
                t.userId === userId && 
                isSameMonth(t.date, currentMonth)
              );
              const userProjected = projectedTransactions.filter(t =>
                t.userId === userId &&
                isSameMonth(t.date, currentMonth)
              );
              const actualTotal = userTransactions.reduce((sum, t) => sum + t.amount, 0);
              const projectedTotal = userProjected.reduce((sum, t) => sum + t.amount, 0);
              const userColor = userColorMap.get(userId) || 'grey.500';
              
              return (
                <Box key={userId} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Avatar
                    sx={{
                      width: 28,
                      height: 28,
                      fontSize: '0.8rem',
                      bgcolor: userColor
                    }}
                  >
                    {getUserName(userId).charAt(0)}
                  </Avatar>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.2 }}>
                      {getUserName(userId)}
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold', lineHeight: 1.2 }}>
                      <span style={{ color: '#4caf50' }}>£{actualTotal.toFixed(0)}</span>
                      {projectedTotal > 0 && (
                        <span style={{ color: '#667eea', fontStyle: 'italic' }}> + £{projectedTotal.toFixed(0)}</span>
                      )}
                    </Typography>
                  </Box>
                </Box>
              );
            })}
            <Box sx={{ borderLeft: '1px solid', borderColor: 'grey.300', pl: 2, ml: 1 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.2 }}>
                Combined
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 'bold', lineHeight: 1.2, color: 'primary.main' }}>
                £{activeData.transactions
                  .filter(t => isSameMonth(t.date, currentMonth))
                  .reduce((sum, t) => sum + t.amount, 0)
                  .toFixed(0)}
                {projectedTransactions.filter(t => 
                  selectedUserIds.has(t.userId) && 
                  isSameMonth(t.date, currentMonth)
                ).reduce((sum, t) => sum + t.amount, 0) > 0 && (
                  <span style={{ fontStyle: 'italic' }}>
                    {' + £'}
                    {projectedTransactions
                      .filter(t => selectedUserIds.has(t.userId) && isSameMonth(t.date, currentMonth))
                      .reduce((sum, t) => sum + t.amount, 0)
                      .toFixed(0)}
                  </span>
                )}
              </Typography>
            </Box>
          </Box>
        )}

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: 1,
            mb: 2
          }}
        >
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <Box
              key={day}
              sx={{
                p: 1,
                textAlign: 'center',
                fontWeight: 'bold',
                color: 'text.secondary',
                bgcolor: 'grey.100'
              }}
            >
              {day}
            </Box>
          ))}

          {calendarDays.map(day => {
          const dayTransactions = getTransactionsForDate(day);

          const actualTransactions = dayTransactions.filter(t => !t.id.startsWith('projected-'));
          const projectedTransactionsForDay = dayTransactions.filter(t => t.id.startsWith('projected-'));

          const hasActualMonthlyRecurring = actualTransactions.some(t => t.repeatMonthly);
          const hasActualWeeklyRecurring = actualTransactions.some(t => t.repeatWeekly);
          const hasProjectedRecurring = projectedTransactionsForDay.length > 0;
          const hasOneTime = actualTransactions.some(t => !t.repeatMonthly && !t.repeatWeekly);

          // Calculate totals per user for display
          const totalsByUser = new Map<string, { actual: number; projected: number }>();
          actualTransactions.forEach(t => {
            const userId = t.userId;
            const existing = totalsByUser.get(userId) || { actual: 0, projected: 0 };
            existing.actual += t.amount;
            totalsByUser.set(userId, existing);
          });
          projectedTransactionsForDay.forEach(t => {
            const userId = t.userId;
            const existing = totalsByUser.get(userId) || { actual: 0, projected: 0 };
            existing.projected += t.amount;
            totalsByUser.set(userId, existing);
          });

          const actualTotal = actualTransactions.reduce((sum, t) => sum + t.amount, 0);
          const projectedTotal = projectedTransactionsForDay.reduce((sum, t) => sum + t.amount, 0);
          const showMultiUser = selectedUserIds.size > 1;

          return (
            <Box
              key={day.toISOString()}
              onClick={() => handleDateClick(day)}
              sx={{
                p: 1,
                minHeight: 80,
                cursor: 'pointer',
                border: '1px solid',
                borderColor: 'grey.200',
                bgcolor: !isSameMonth(day, currentMonth) ? 'grey.50' : 'white',
                '&:hover': {
                  bgcolor: 'action.hover'
                },
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                {format(day, 'd')}
              </Typography>

              {/* Show user-colored indicators when multiple users selected */}
              {showMultiUser && totalsByUser.size > 0 ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                  {Array.from(totalsByUser.entries()).map(([userId, totals]) => (
                    <Box key={userId} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          bgcolor: userColorMap.get(userId) || 'grey.500',
                          flexShrink: 0
                        }}
                      />
                      <Typography
                        variant="caption"
                        sx={{
                          fontWeight: 'bold',
                          color: totals.actual > 0 ? 'success.main' : 'text.secondary',
                          fontSize: '0.7rem'
                        }}
                      >
                        {totals.actual > 0 && `£${totals.actual.toFixed(0)}`}
                        {totals.actual > 0 && totals.projected > 0 && ' + '}
                        {totals.projected > 0 && (
                          <span style={{ fontStyle: 'italic', color: '#667eea' }}>
                            £{totals.projected.toFixed(0)}
                          </span>
                        )}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              ) : (
                <>
                  {/* Single user view - show actual transactions */}
                  {actualTotal > 0 && (
                    <Typography variant="body2" color="success.main" sx={{ fontWeight: 'bold' }}>
                      £{actualTotal.toFixed(2)}
                    </Typography>
                  )}

                  {/* Show projected transactions with different styling */}
                  {projectedTotal > 0 && (
                    <Typography variant="body2" sx={{ color: 'primary.main', fontStyle: 'italic', fontSize: '0.75rem' }}>
                      +£{projectedTotal.toFixed(2)} projected
                    </Typography>
                  )}
                </>
              )}

              {(actualTransactions.length > 0 || projectedTransactionsForDay.length > 0) && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                  {hasActualWeeklyRecurring && (
                    <Typography variant="caption" sx={{ color: 'secondary.main', fontWeight: 'bold' }}>
                      🔄 Weekly
                    </Typography>
                  )}
                  {hasActualMonthlyRecurring && (
                    <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                      🔄 Monthly
                    </Typography>
                  )}
                  {hasProjectedRecurring && (
                    <Typography variant="caption" sx={{ color: 'primary.main', fontStyle: 'italic' }}>
                      📅 Upcoming
                    </Typography>
                  )}
                  {hasOneTime && !showMultiUser && (
                    <Typography variant="caption" color="text.secondary">
                      {actualTransactions.filter(t => !t.repeatMonthly && !t.repeatWeekly).length} one-time
                    </Typography>
                  )}
                </Box>
              )}
            </Box>
          );
          })}
        </Box>
      </CardContent>

      {/* Main Dialog - View/Add Transactions */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {dialogMode === 'view' ? (
            selectedDate ? format(selectedDate, 'EEEE, MMMM do, yyyy') : ''
          ) : (
            `Add Transaction - ${selectedDate ? format(selectedDate, 'PPP') : ''}`
          )}
        </DialogTitle>

        {dialogMode === 'view' ? (
          <>
            <DialogContent>
              {actualTransactionsForDialog.length === 0 && projectedTransactionsForDialog.length === 0 ? (
                <Typography color="text.secondary" align="center" sx={{ py: 2 }}>
                  No transactions on this day
                </Typography>
              ) : (
                <>
                  {/* Actual Transactions */}
                  {actualTransactionsForDialog.length > 0 && (
                    <>
                      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                        Transactions
                      </Typography>
                      <List dense>
                        {actualTransactionsForDialog.map((transaction) => {
                          const isOwnTransaction = transaction.userId === currentUser.id;
                          const transactionColor = userColorMap.get(transaction.userId) || 'grey.500';
                          return (
                            <ListItem
                              key={transaction.id}
                              sx={{
                                bgcolor: 'grey.50',
                                borderRadius: 1,
                                mb: 1,
                                borderLeft: selectedUserIds.size > 1 ? `4px solid ${transactionColor}` : 'none',
                                opacity: isOwnTransaction ? 1 : 0.85
                              }}
                            >
                              <ListItemText
                                primary={
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                    <Typography variant="body1" fontWeight="bold">
                                      £{transaction.amount.toFixed(2)}
                                    </Typography>
                                    {selectedUserIds.size > 1 && (
                                      <Chip
                                        label={getUserName(transaction.userId)}
                                        size="small"
                                        sx={{
                                          bgcolor: `${transactionColor}20`,
                                          color: transactionColor,
                                          fontWeight: 500,
                                          fontSize: '0.7rem'
                                        }}
                                      />
                                    )}
                                    {transaction.repeatWeekly && (
                                      <Chip label="Weekly" size="small" color="secondary" />
                                    )}
                                    {transaction.repeatMonthly && (
                                      <Chip label="Monthly" size="small" color="primary" />
                                    )}
                                  </Box>
                                }
                                secondary={
                                  <>
                                    <Typography variant="body2" component="span">
                                      {getPotName(transaction.potId)}
                                    </Typography>
                                    {transaction.description && (
                                      <Typography variant="body2" component="span" color="text.secondary">
                                        {' — '}{transaction.description}
                                      </Typography>
                                    )}
                                  </>
                                }
                              />
                              {isOwnTransaction && (
                                <ListItemSecondaryAction>
                                  <IconButton
                                    edge="end"
                                    onClick={() => handleDeleteClick(transaction)}
                                    color="error"
                                    size="small"
                                  >
                                    <Delete />
                                  </IconButton>
                                </ListItemSecondaryAction>
                              )}
                            </ListItem>
                          );
                        })}
                      </List>
                    </>
                  )}

                  {/* Projected Transactions */}
                  {projectedTransactionsForDialog.length > 0 && (
                    <>
                      <Divider sx={{ my: 2 }} />
                      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                        Upcoming (Projected)
                      </Typography>
                      <List dense>
                        {projectedTransactionsForDialog.map((transaction) => {
                          const transactionColor = userColorMap.get(transaction.userId) || 'grey.500';
                          return (
                            <ListItem
                              key={transaction.id}
                              sx={{
                                bgcolor: 'primary.50',
                                borderRadius: 1,
                                mb: 1,
                                opacity: 0.8,
                                borderLeft: selectedUserIds.size > 1 ? `4px solid ${transactionColor}` : 'none'
                              }}
                            >
                              <ListItemText
                                primary={
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                    <Typography variant="body1" fontWeight="bold" color="primary">
                                      £{transaction.amount.toFixed(2)}
                                    </Typography>
                                    {selectedUserIds.size > 1 && (
                                      <Chip
                                        label={getUserName(transaction.userId)}
                                        size="small"
                                        sx={{
                                          bgcolor: `${transactionColor}20`,
                                          color: transactionColor,
                                          fontWeight: 500,
                                          fontSize: '0.7rem'
                                        }}
                                      />
                                    )}
                                    <Chip label="Projected" size="small" variant="outlined" />
                                  </Box>
                                }
                                secondary={
                                  <Typography variant="body2">
                                    {getPotName(transaction.potId)}
                                    {transaction.description && ` — ${transaction.description}`}
                                  </Typography>
                                }
                              />
                            </ListItem>
                          );
                        })}
                      </List>
                      <Typography variant="caption" color="text.secondary">
                        To remove projected transactions, delete the original recurring transaction
                      </Typography>
                    </>
                  )}
                </>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseDialog}>Close</Button>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={handleAddNew}
              >
                Add Transaction
              </Button>
            </DialogActions>
          </>
        ) : (
          <form onSubmit={handleSubmitTransaction}>
            <DialogContent>
              <TextField
                select
                fullWidth
                label="Account"
                value={formData.potId}
                onChange={(e) => setFormData({...formData, potId: e.target.value})}
                required
                sx={{ mb: 2 }}
              >
                {data.pots.map(pot => (
                  <MenuItem key={pot.id} value={pot.id}>
                    {pot.name}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                fullWidth
                label="Amount (£)"
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({...formData, amount: e.target.value})}
                placeholder="0.00"
                required
                inputProps={{
                  step: "0.01",
                  min: "0.01"
                }}
                sx={{ mb: 2 }}
              />

              <TextField
                fullWidth
                label="Description (optional)"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="What did you save for?"
              />

              <TextField
                select
                fullWidth
                label="Recurrence"
                value={formData.recurrence}
                onChange={(e) => setFormData({...formData, recurrence: e.target.value as RecurrenceType})}
                sx={{ mt: 2 }}
                helperText="Recurring transactions will appear in your calendar and projections"
              >
                <MenuItem value="none">One-time (no repeat)</MenuItem>
                <MenuItem value="weekly">
                  Weekly (every {selectedDate ? format(selectedDate, 'EEEE') : 'week'})
                </MenuItem>
                <MenuItem value="monthly">
                  Monthly (on the {selectedDate ? format(selectedDate, 'do') : 'same date'})
                </MenuItem>
              </TextField>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleBackToView}>Back</Button>
              <Button type="submit" variant="contained">Add Transaction</Button>
            </DialogActions>
          </form>
        )}
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle>Delete Transaction?</DialogTitle>
        <DialogContent>
          {transactionToDelete && (
            <>
              <Typography>
                Are you sure you want to delete this £{transactionToDelete.amount.toFixed(2)} transaction?
              </Typography>
              {(transactionToDelete.repeatWeekly || transactionToDelete.repeatMonthly) && (
                <Typography color="warning.main" sx={{ mt: 2 }}>
                  ⚠️ This is a recurring transaction. Deleting it will remove this payment and all future occurrences.
                </Typography>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained">
            Delete{transactionToDelete?.repeatWeekly || transactionToDelete?.repeatMonthly ? ' All' : ''}
          </Button>
        </DialogActions>
      </Dialog>
      </Card>
    </Box>
  );
};

export default Calendar;
