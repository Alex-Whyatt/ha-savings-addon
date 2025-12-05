import React, { useState, useEffect } from 'react';
import { SavingsData, Transaction } from '../types';
import { addTransaction } from '../storage';
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
  IconButton
} from '@mui/material';
import { ChevronLeft, ChevronRight } from '@mui/icons-material';

interface CalendarProps {
  data: SavingsData;
  onDataChange: () => void;
}

const Calendar: React.FC<CalendarProps> = ({ data, onDataChange }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [projectedTransactions, setProjectedTransactions] = useState<Transaction[]>([]);
  const [formData, setFormData] = useState({
    potId: data.pots[0]?.id || '',
    amount: '',
    description: '',
    repeatMonthly: false
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

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setShowAddForm(true);
    setFormData({ potId: data.pots[0]?.id || '', amount: '', description: '', repeatMonthly: false });
  };

  const handleSubmitTransaction = (e: React.FormEvent) => {
    e.preventDefault();

    const amount = parseFloat(formData.amount);
    if (!selectedDate || !formData.potId || isNaN(amount) || amount <= 0) {
      return;
    }

    addTransaction({
      potId: formData.potId,
      amount,
      date: selectedDate,
      description: formData.description || undefined,
      repeatMonthly: formData.repeatMonthly
    });

    setShowAddForm(false);
    setSelectedDate(null);
    onDataChange();
  };

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

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

          const hasActualRecurring = actualTransactions.some(t => t.repeatMonthly);
          const hasProjectedRecurring = projectedTransactionsForDay.length > 0;
          const hasOneTime = actualTransactions.some(t => !t.repeatMonthly);

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
                  {hasActualRecurring && (
                    <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                      🔄 Recurring
                    </Typography>
                  )}
                  {hasProjectedRecurring && (
                    <Typography variant="caption" sx={{ color: 'primary.main', fontStyle: 'italic' }}>
                      📅 Upcoming
                    </Typography>
                  )}
                  {hasOneTime && (
                    <Typography variant="caption" color="text.secondary">
                      {actualTransactions.filter(t => !t.repeatMonthly).length} one-time
                    </Typography>
                  )}
                </Box>
              )}
            </Box>
          );
          })}
        </Box>
      </CardContent>

      <Dialog open={showAddForm} onClose={() => setShowAddForm(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Add Transaction - {selectedDate ? format(selectedDate, 'PPP') : ''}
        </DialogTitle>
        <form onSubmit={handleSubmitTransaction}>
          <DialogContent>
            <TextField
              select
              fullWidth
              label="Savings Pot"
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

            <Box sx={{ mt: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                <input
                  type="checkbox"
                  id="repeatMonthly"
                  checked={formData.repeatMonthly}
                  onChange={(e) => setFormData({...formData, repeatMonthly: e.target.checked})}
                  style={{ marginRight: '8px' }}
                />
                <label htmlFor="repeatMonthly" style={{ cursor: 'pointer', fontSize: '0.875rem' }}>
                  Repeat this transaction monthly
                </label>
              </Box>
              <Typography variant="caption" color="text.secondary">
                This will show as a recurring transaction in your calendar and projections
              </Typography>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowAddForm(false)}>Cancel</Button>
            <Button type="submit" variant="contained">Add Transaction</Button>
          </DialogActions>
        </form>
      </Dialog>
      </Card>
    </Box>
  );
};

export default Calendar;
