import React, { useState, useEffect } from 'react';
import { SavingsData, Transaction, User } from '../types';
import { addTransaction, deleteTransaction, splitRecurringTransaction, stopRecurringTransaction } from '../storage';
import { getProjectedRecurringTransactions, getRepeatDates, normalizeToNoon } from '../projections';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, addYears, subMonths, getDay, isBefore, startOfDay } from 'date-fns';
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
  ListItemButton,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Chip,
  Avatar,
  ButtonBase,
  useMediaQuery,
  useTheme
} from '@mui/material';
import { ChevronLeft, ChevronRight, Delete, Add, Edit, Repeat } from '@mui/icons-material';
import { useAuth } from '../AuthContext';
import { seriesColors } from '../theme';
import { updateTransaction } from '../storage';

interface CalendarProps {
  data: SavingsData;
  combinedData: SavingsData;
  onDataChange: () => void;
  currentUser: User;
}

type RecurrenceType = 'none' | 'weekly' | 'monthly';
type DialogMode = 'view' | 'add' | 'edit';

// Recurring payments the user can change open the edit form when tapped
const EditableRow: React.FC<{ editable: boolean; label: string; onEdit: () => void; hasAction?: boolean; children: React.ReactNode }> = ({ editable, label, onEdit, hasAction, children }) =>
  editable ? (
    <ListItemButton onClick={onEdit} aria-label={label} sx={{ borderRadius: 1, py: 1, pr: hasAction ? 7 : 2 }}>
      {children}
      <Edit fontSize="small" sx={{ color: 'text.secondary', ml: 1 }} />
    </ListItemButton>
  ) : (
    <>{children}</>
  );

// Generate a consistent color for a user based on their index
const getUserColor = (_userId: string, index: number): string => {
  const colors = seriesColors;
  return colors[index % colors.length];
};

const Calendar: React.FC<CalendarProps> = ({ data, combinedData, onDataChange, currentUser }) => {
  const { otherUsers, allUsers } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<DialogMode>('view');
  const [projectedTransactions, setProjectedTransactions] = useState<Transaction[]>([]);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
  const [transactionToEdit, setTransactionToEdit] = useState<Transaction | null>(null);
  // Edits to a recurring payment apply from this occurrence onwards
  const [editFromDate, setEditFromDate] = useState<Date | null>(null);
  const [stopConfirmOpen, setStopConfirmOpen] = useState(false);
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

  // The recurring transaction an item belongs to: itself, or the one a projected occurrence repeats
  const getSeries = (transaction: Transaction): Transaction | undefined =>
    transaction.seriesId
      ? data.transactions.find(t => t.id === transaction.seriesId)
      : transaction;

  // Changes apply from the tapped occurrence, or from the next one still to come
  // when it's already happened. Null when the payment has no occurrences left.
  const getChangeFromDate = (series: Transaction, occurrenceDate: Date): Date | null => {
    const today = startOfDay(new Date());
    const occurrence = normalizeToNoon(occurrenceDate);
    const from = isBefore(occurrence, today) ? normalizeToNoon(today) : occurrence;
    if (isSameDay(from, series.date)) return normalizeToNoon(series.date);
    return getRepeatDates(series, from, addYears(from, 1))[0]?.date ?? null;
  };

  const canEditRecurring = (transaction: Transaction): boolean => {
    const series = getSeries(transaction);
    return !!series &&
      series.userId === currentUser.id &&
      !!(series.repeatMonthly || series.repeatWeekly) &&
      getChangeFromDate(series, transaction.date) !== null;
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
    setTransactionToEdit(null);
    setEditFromDate(null);
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
    if (dialogMode === 'edit') handleBackToView();
    onDataChange();
  };

  const handleEditClick = (transaction: Transaction) => {
    const series = getSeries(transaction);
    const fromDate = series && getChangeFromDate(series, transaction.date);
    if (!series || !fromDate) return;

    setTransactionToEdit(series);
    setEditFromDate(fromDate);
    // Determine recurrence type
    let recurrence: RecurrenceType = 'none';
    if (series.repeatWeekly) recurrence = 'weekly';
    else if (series.repeatMonthly) recurrence = 'monthly';
    
    setFormData({
      potId: series.potId,
      amount: series.amount.toString(),
      description: series.description || '',
      recurrence
    });
    setDialogMode('edit');
  };

  // Editing from the first occurrence changes the whole payment
  const isEditingFromStart = !!(transactionToEdit && editFromDate && isSameDay(editFromDate, transactionToEdit.date));

  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!transactionToEdit || !editFromDate) return;

    const amount = parseFloat(formData.amount);
    if (!formData.potId || isNaN(amount) || amount <= 0) {
      return;
    }

    const changes = {
      potId: formData.potId,
      amount,
      repeatMonthly: formData.recurrence === 'monthly',
      repeatWeekly: formData.recurrence === 'weekly'
    };
    if (isEditingFromStart) {
      await updateTransaction(transactionToEdit.id, { ...changes, description: formData.description || undefined });
    } else {
      await splitRecurringTransaction(transactionToEdit.id, editFromDate, { ...changes, description: formData.description });
    }

    handleBackToView();
    onDataChange();
  };

  const handleStopClick = () => {
    if (!transactionToEdit) return;
    if (isEditingFromStart) {
      // Stopping from the first occurrence removes the whole payment
      handleDeleteClick(transactionToEdit);
    } else {
      setStopConfirmOpen(true);
    }
  };

  const handleConfirmStop = async () => {
    if (!transactionToEdit || !editFromDate) return;

    await stopRecurringTransaction(transactionToEdit.id, editFromDate);
    setStopConfirmOpen(false);
    handleBackToView();
    onDataChange();
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedDate(null);
    setDialogMode('view');
    setTransactionToEdit(null);
    setEditFromDate(null);
  };

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const selectedDateTransactions = selectedDate ? getTransactionsForDate(selectedDate) : [];
  const isSelectedDatePast = selectedDate ? isBefore(selectedDate, startOfDay(new Date())) : false;
  // For past days, treat projected as actual (they should have happened)
  const actualTransactionsForDialog = selectedDateTransactions.filter(t => 
    !t.id.startsWith('projected-') || isSelectedDatePast
  );
  const projectedTransactionsForDialog = selectedDateTransactions.filter(t => 
    t.id.startsWith('projected-') && !isSelectedDatePast
  );

  return (
    <Box sx={{
      display: 'flex',
      justifyContent: 'center',
      width: '100%'
    }}>
      <Card sx={{
        width: '100%',
        maxWidth: 1100,
        overflow: 'hidden'
      }}>
        <CardContent sx={{ p: { xs: 1, sm: 2 } }}>
        {/* Whose contributions to show */}
        {otherUsers.length > 0 && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2, alignItems: 'center' }} role="group" aria-label="Show contributions for">
            {[currentUser, ...otherUsers].map(u => {
              const isSelf = u.id === currentUser.id;
              const selected = isSelf || selectedUserIds.has(u.id);
              return (
                <Chip
                  key={u.id}
                  label={isSelf ? `${u.name} (you)` : u.name}
                  onClick={isSelf ? undefined : () => toggleUserSelection(u.id)}
                  aria-pressed={selected}
                  avatar={<Box component="span" sx={{ width: '10px !important', height: '10px !important', borderRadius: '50%', bgcolor: userColorMap.get(u.id), ml: '10px !important' }} />}
                  variant={selected ? 'filled' : 'outlined'}
                  sx={{
                    height: 36,
                    borderRadius: 999,
                    px: 0.5,
                    bgcolor: selected ? 'action.hover' : 'transparent',
                    color: selected ? 'text.primary' : 'text.secondary'
                  }}
                />
              );
            })}
          </Box>
        )}

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Typography variant="h6" component="h2" sx={{ flexGrow: 1, fontSize: { xs: '1.125rem', sm: '1.375rem' } }}>
            {format(currentMonth, 'MMMM yyyy')}
          </Typography>
          {!isSameMonth(currentMonth, new Date()) && (
            <Button variant="outlined" size="small" onClick={() => setCurrentMonth(new Date())} sx={{ borderColor: 'divider', color: 'text.primary' }}>
              Today
            </Button>
          )}
          <IconButton onClick={prevMonth} aria-label="Previous month" sx={{ border: 1, borderColor: 'divider', borderRadius: 2.5 }}>
            <ChevronLeft />
          </IconButton>
          <IconButton onClick={nextMonth} aria-label="Next month" sx={{ border: 1, borderColor: 'divider', borderRadius: 2.5 }}>
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
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
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
              const userColor = userColorMap.get(userId) || 'text.secondary';
              
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
                      <span>£{actualTotal.toFixed(0)}</span>
                      {projectedTotal > 0 && (
                        <Box component="span" sx={{ color: 'text.secondary', fontWeight: 500 }}> + £{projectedTotal.toFixed(0)} to come</Box>
                      )}
                    </Typography>
                  </Box>
                </Box>
              );
            })}
            <Box sx={{ borderLeft: '1px solid', borderColor: 'divider', pl: 2, ml: 1 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.2 }}>
                Combined
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 'bold', lineHeight: 1.2 }}>
                £{activeData.transactions
                  .filter(t => isSameMonth(t.date, currentMonth))
                  .reduce((sum, t) => sum + t.amount, 0)
                  .toFixed(0)}
                {projectedTransactions.filter(t => 
                  selectedUserIds.has(t.userId) && 
                  isSameMonth(t.date, currentMonth)
                ).reduce((sum, t) => sum + t.amount, 0) > 0 && (
                  <Box component="span" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                    {' + £'}
                    {projectedTransactions
                      .filter(t => selectedUserIds.has(t.userId) && isSameMonth(t.date, currentMonth))
                      .reduce((sum, t) => sum + t.amount, 0)
                      .toFixed(0)}
                  </Box>
                )}
              </Typography>
            </Box>
          </Box>
        )}

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
            gap: { xs: 0.5, sm: 0.75 },
            mb: 1
          }}
        >
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <Box
              key={day}
              sx={{
                py: 0.5,
                textAlign: 'center',
                fontSize: '0.75rem',
                fontWeight: 600,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                color: 'text.secondary'
              }}
            >
              {day}
            </Box>
          ))}

          {/* Empty cells for days before the 1st of the month to align grid with day headers */}
          {Array.from({ length: getDay(monthStart) }).map((_, index) => (
            <Box key={`empty-${index}`} />
          ))}

          {calendarDays.map(day => {
          const dayTransactions = getTransactionsForDate(day);
          const isPastDay = isBefore(day, startOfDay(new Date()));

          // For past days, treat projected as actual (they should have happened)
          const actualTransactions = dayTransactions.filter(t => 
            !t.id.startsWith('projected-') || isPastDay
          );
          const projectedTransactionsForDay = dayTransactions.filter(t => 
            t.id.startsWith('projected-') && !isPastDay
          );

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

          const isToday = isSameDay(day, new Date());
          const userEntries = Array.from(totalsByUser.entries());
          const transactionCount = actualTransactions.length + projectedTransactionsForDay.length;
          const compact = (value: number) => `£${value.toLocaleString('en-GB', { maximumFractionDigits: 0 })}`;

          return (
            <ButtonBase
              key={day.toISOString()}
              onClick={() => handleDateClick(day)}
              aria-label={`${format(day, 'EEEE d MMMM')}${transactionCount ? `, ${transactionCount} contribution${transactionCount > 1 ? 's' : ''}` : ''}`}
              sx={{
                p: { xs: 0.5, sm: 1 },
                minHeight: { xs: 64, sm: 104 },
                borderRadius: { xs: 1.5, sm: 2.5 },
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.paper',
                '&:hover': { bgcolor: 'action.hover' },
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'stretch',
                justifyContent: 'flex-start',
                gap: 0.5,
                minWidth: 0,
                textAlign: 'left'
              }}
            >
              <Box sx={{
                fontSize: { xs: '0.75rem', sm: '0.8125rem' },
                fontWeight: 600,
                width: { xs: 22, sm: 26 },
                height: { xs: 22, sm: 26 },
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                alignSelf: { xs: 'center', sm: 'flex-start' },
                ...(isToday && { bgcolor: 'primary.main', color: 'primary.contrastText' })
              }}>
                {format(day, 'd')}
              </Box>

              {/* Phone: one dot per person, filled when paid in, hollow when scheduled */}
              {userEntries.length > 0 && (
                <Box sx={{ display: { xs: 'flex', sm: 'none' }, flexDirection: 'column', alignItems: 'center', gap: 0.25 }}>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    {userEntries.map(([userId, totals]) => (
                      <Box key={userId} sx={{
                        width: 7,
                        height: 7,
                        borderRadius: '50%',
                        border: '1.5px solid',
                        borderColor: userColorMap.get(userId) || 'text.secondary',
                        bgcolor: totals.actual > 0 ? (userColorMap.get(userId) || 'text.secondary') : 'transparent'
                      }} />
                    ))}
                  </Box>
                  <Typography sx={{ fontSize: '0.625rem', fontWeight: 600, color: actualTotal > 0 ? 'text.primary' : 'text.secondary', lineHeight: 1.2 }}>
                    {compact(actualTotal + projectedTotal)}
                  </Typography>
                </Box>
              )}

              {/* Larger screens: an amount chip per person */}
              <Box sx={{ display: { xs: 'none', sm: 'flex' }, flexDirection: 'column', gap: 0.5 }}>
                {(showMultiUser ? userEntries : userEntries.length ? [['all', { actual: actualTotal, projected: projectedTotal }] as const] : []).map(([userId, totals]) => (
                  <Box key={userId} sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    {totals.actual > 0 && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, px: 0.75, py: 0.25, borderRadius: 1.5, bgcolor: 'action.hover', fontSize: '0.75rem', fontWeight: 600 }}>
                        <Box sx={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, bgcolor: userId === 'all' ? 'primary.main' : userColorMap.get(userId) }} />
                        {compact(totals.actual)}
                      </Box>
                    )}
                    {totals.projected > 0 && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, px: 0.75, py: 0.25, borderRadius: 1.5, border: '1.5px dashed', borderColor: 'divider', color: 'text.secondary', fontSize: '0.75rem', fontWeight: 600 }}>
                        <Box sx={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, bgcolor: userId === 'all' ? 'primary.main' : userColorMap.get(userId) }} />
                        {compact(totals.projected)}
                      </Box>
                    )}
                  </Box>
                ))}
                {(hasActualMonthlyRecurring || hasActualWeeklyRecurring) && (
                  <Typography sx={{ fontSize: '0.6875rem', color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.25 }}>
                    <Repeat sx={{ fontSize: 12 }} />
                    {hasActualWeeklyRecurring && hasActualMonthlyRecurring ? 'Repeats' : hasActualWeeklyRecurring ? 'Weekly' : 'Monthly'}
                  </Typography>
                )}
                {hasOneTime && !showMultiUser && !hasProjectedRecurring && !(hasActualMonthlyRecurring || hasActualWeeklyRecurring) && (
                  <Typography sx={{ fontSize: '0.6875rem', color: 'text.secondary' }}>One-off</Typography>
                )}
              </Box>
            </ButtonBase>
          );
          })}
        </Box>
      </CardContent>

      {/* Main Dialog - View/Add Transactions */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth fullScreen={isMobile}>
        <DialogTitle>
          {dialogMode === 'view' ? (
            selectedDate ? format(selectedDate, 'EEEE, MMMM do, yyyy') : ''
          ) : dialogMode === 'edit' ? (
            'Edit recurring payment'
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
                          const isProjected = transaction.id.startsWith('projected-');
                          const editable = canEditRecurring(transaction);
                          const transactionColor = userColorMap.get(transaction.userId) || 'text.secondary';
                          return (
                            <ListItem
                              key={transaction.id}
                              disablePadding={editable}
                              sx={{
                                bgcolor: 'action.hover',
                                borderRadius: 1,
                                mb: 1,
                                borderLeft: selectedUserIds.size > 1 ? `4px solid ${transactionColor}` : 'none',
                                opacity: isOwnTransaction ? 1 : 0.85
                              }}
                            >
                              <EditableRow
                                editable={editable}
                                label={`Edit £${transaction.amount.toFixed(2)} ${transaction.repeatWeekly ? 'weekly' : 'monthly'} payment`}
                                onEdit={() => handleEditClick(transaction)}
                                hasAction={isOwnTransaction && !isProjected}
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
                              </EditableRow>
                              {isOwnTransaction && !isProjected && (
                                <ListItemSecondaryAction>
                                  <IconButton
                                    edge="end"
                                    onClick={() => handleDeleteClick(transaction)}
                                    color="error"
                                    aria-label={`Delete £${transaction.amount.toFixed(2)} payment`}
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

                  {/* Projected Transactions (future only - past ones are shown as actual) */}
                  {projectedTransactionsForDialog.length > 0 && (
                    <>
                      <Divider sx={{ my: 2 }} />
                      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                        Upcoming (Projected)
                      </Typography>
                      <List dense>
                        {projectedTransactionsForDialog.map((transaction) => {
                          const transactionColor = userColorMap.get(transaction.userId) || 'text.secondary';
                          const editable = canEditRecurring(transaction);
                          return (
                            <ListItem
                              key={transaction.id}
                              disablePadding={editable}
                              sx={{
                                bgcolor: 'action.hover',
                                borderRadius: 1,
                                mb: 1,
                                borderLeft: selectedUserIds.size > 1 ? `4px solid ${transactionColor}` : 'none'
                              }}
                            >
                              <EditableRow
                                editable={editable}
                                label={`Edit £${transaction.amount.toFixed(2)} ${transaction.repeatWeekly ? 'weekly' : 'monthly'} payment from ${format(transaction.date, 'd MMMM')}`}
                                onEdit={() => handleEditClick(transaction)}
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
                                    <Chip label="Upcoming" size="small" variant="outlined" />
                                  </Box>
                                }
                                secondary={
                                  <Typography variant="body2">
                                    {getPotName(transaction.potId)}
                                    {transaction.description && ` — ${transaction.description}`}
                                  </Typography>
                                }
                              />
                              </EditableRow>
                            </ListItem>
                          );
                        })}
                      </List>
                      {projectedTransactionsForDialog.some(canEditRecurring) && (
                        <Typography variant="caption" color="text.secondary">
                          Tap a payment to change or stop it from this date onwards
                        </Typography>
                      )}
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
        ) : dialogMode === 'edit' ? (
          <form onSubmit={handleSubmitEdit}>
            <DialogContent>
              {transactionToEdit && editFromDate && (
                <Box sx={{
                  mb: 2,
                  p: 1.5,
                  bgcolor: 'action.hover',
                  borderRadius: 1,
                  display: 'flex',
                  gap: 1,
                  alignItems: 'flex-start'
                }}>
                  <Repeat fontSize="small" sx={{ color: 'primary.main', mt: 0.25 }} />
                  <Typography variant="body2">
                    {isEditingFromStart ? (
                      <>Changes apply to <strong>every payment</strong>, starting {format(editFromDate, 'EEE d MMMM')}.</>
                    ) : (
                      <>Changes apply from <strong>{format(editFromDate, 'EEE d MMMM')}</strong> onwards. Earlier payments stay as they were.</>
                    )}
                  </Typography>
                </Box>
              )}
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
                sx={{ mb: 2 }}
              />

              <TextField
                select
                fullWidth
                label="Recurrence"
                value={formData.recurrence}
                onChange={(e) => setFormData({...formData, recurrence: e.target.value as RecurrenceType})}
                helperText={isEditingFromStart ? undefined : 'One-time makes this the last payment'}
              >
                <MenuItem value="none">One-time (no repeat)</MenuItem>
                <MenuItem value="weekly">
                  Weekly (every {editFromDate ? format(editFromDate, 'EEEE') : 'week'})
                </MenuItem>
                <MenuItem value="monthly">
                  Monthly (on the {editFromDate ? format(editFromDate, 'do') : 'same date'})
                </MenuItem>
              </TextField>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleStopClick} color="error" sx={{ mr: 'auto' }}>
                {isEditingFromStart ? 'Delete' : 'Stop from here'}
              </Button>
              <Button onClick={handleBackToView}>Cancel</Button>
              <Button type="submit" variant="contained" color="primary">
                Save
              </Button>
            </DialogActions>
          </form>
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

      {/* Stop From Date Confirmation Dialog */}
      <Dialog open={stopConfirmOpen} onClose={() => setStopConfirmOpen(false)}>
        <DialogTitle>Stop this payment?</DialogTitle>
        <DialogContent>
          {transactionToEdit && editFromDate && (
            <Typography>
              The £{transactionToEdit.amount.toFixed(2)} {transactionToEdit.repeatWeekly ? 'weekly' : 'monthly'} payment won't repeat from {format(editFromDate, 'EEE d MMMM')}. Earlier payments stay as they were.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStopConfirmOpen(false)}>Cancel</Button>
          <Button onClick={handleConfirmStop} color="error" variant="contained">
            Stop payment
          </Button>
        </DialogActions>
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
