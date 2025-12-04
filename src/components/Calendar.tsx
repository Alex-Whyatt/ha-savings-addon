import React, { useState } from 'react';
import { SavingsData, Transaction } from '../types';
import { addTransaction } from '../storage';
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
  const [formData, setFormData] = useState({
    potId: '',
    amount: '',
    description: ''
  });

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getTransactionsForDate = (date: Date): Transaction[] => {
    return data.transactions.filter(transaction =>
      isSameDay(transaction.date, date)
    );
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setShowAddForm(true);
    setFormData({ potId: data.pots[0]?.id || '', amount: '', description: '' });
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
      description: formData.description || undefined
    });

    setShowAddForm(false);
    setSelectedDate(null);
    onDataChange();
  };

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <IconButton onClick={prevMonth}>
            <ChevronLeft />
          </IconButton>
          <Typography variant="h5" component="h2">
            {format(currentMonth, 'MMMM yyyy')}
          </Typography>
          <IconButton onClick={nextMonth}>
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
            const totalForDay = dayTransactions.reduce((sum, t) => sum + t.amount, 0);

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
                  }
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                  {format(day, 'd')}
                </Typography>
                {totalForDay > 0 && (
                  <Typography variant="body2" color="success.main" sx={{ fontWeight: 'bold' }}>
                    £{totalForDay.toFixed(2)}
                  </Typography>
                )}
                {dayTransactions.length > 0 && (
                  <Typography variant="caption" color="text.secondary">
                    {dayTransactions.length} transaction{dayTransactions.length !== 1 ? 's' : ''}
                  </Typography>
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
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowAddForm(false)}>Cancel</Button>
            <Button type="submit" variant="contained">Add Transaction</Button>
          </DialogActions>
        </form>
      </Dialog>
    </Card>
  );
};

export default Calendar;
