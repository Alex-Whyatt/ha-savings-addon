import React, { useState, useEffect } from 'react';
import { SavingsData, Transaction } from '../types';
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
  Chip
} from '@mui/material';
import { ChevronLeft, ChevronRight, Delete, Add } from '@mui/icons-material';

interface CalendarProps {
  data: SavingsData;
  onDataChange: () => void;
}

type RecurrenceType = 'none' | 'weekly' | 'monthly';
type DialogMode = 'view' | 'add';

const Calendar: React.FC<CalendarProps> = ({ data, onDataChange }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<DialogMode>('view');
  const [projectedTransactions, setProjectedTransactions] = useState<Transaction[]>([]);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
  const [formData, setFormData] = useState({
    potId: data.pots[0]?.id || '',
    amount: '',
    description: '',
    recurrence: 'none' as RecurrenceType
  });

  useEffect(() => {
    const loadProjected = async () => {
      const projected = await getProjectedRecurringTransactions();
      setProjectedTransactions(projected);
    };
    loadProjected();
  }, [data.transactions]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getTransactionsForDate = (date: Date): Transaction[] => {
    const actualTransactions = data.transactions.filter(transaction =>
      isSameDay(transaction.date, date)
    );

    const projectedForDate = projectedTransactions.filter(transaction =>
      isSameDay(transaction.date, date)
    );

    return [...actualTransactions, ...projectedForDate];
  };

  const getPotName = (potId: string): string => {
    const pot = data.pots.find(p => p.id === potId);
    return pot?.name || 'Unknown Account';
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

          const actualTotal = actualTransactions.reduce((sum, t) => sum + t.amount, 0);
          const projectedTotal = projectedTransactionsForDay.reduce((sum, t) => sum + t.amount, 0);

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

              {/* Show actual transactions */}
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
                  {hasOneTime && (
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
                        {actualTransactionsForDialog.map((transaction) => (
                          <ListItem
                            key={transaction.id}
                            sx={{
                              bgcolor: 'grey.50',
                              borderRadius: 1,
                              mb: 1
                            }}
                          >
                            <ListItemText
                              primary={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Typography variant="body1" fontWeight="bold">
                                    £{transaction.amount.toFixed(2)}
                                  </Typography>
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
                          </ListItem>
                        ))}
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
                        {projectedTransactionsForDialog.map((transaction) => (
                          <ListItem
                            key={transaction.id}
                            sx={{
                              bgcolor: 'primary.50',
                              borderRadius: 1,
                              mb: 1,
                              opacity: 0.8
                            }}
                          >
                            <ListItemText
                              primary={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Typography variant="body1" fontWeight="bold" color="primary">
                                    £{transaction.amount.toFixed(2)}
                                  </Typography>
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
                        ))}
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
