import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Divider,
  MenuItem,
  InputAdornment
} from '@mui/material';
import {
  Add,
  Delete,
  Edit,
  Repeat
} from '@mui/icons-material';
import { UpcomingSpend, ExpenseCategory, User } from '../types';
import {
  fetchUpcomingSpends,
  createUpcomingSpend,
  updateUpcomingSpend,
  deleteUpcomingSpend,
  fetchExpenseCategories
} from '../api';
import { useAuth } from '../AuthContext';
import { seriesColors } from '../theme';

interface RecurringExpensesProps {
  currentUser: User;
}

// Recurrence interval options
const RECURRENCE_OPTIONS = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

const RecurringExpenses: React.FC<RecurringExpensesProps> = ({ currentUser }) => {
  const { allUsers } = useAuth();
  const [expenses, setExpenses] = useState<UpcomingSpend[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<UpcomingSpend | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    recurrenceInterval: 'monthly',
    categoryId: ''
  });

  const loadData = async () => {
    setIsLoading(true);
    const [spendsData, categoriesData] = await Promise.all([
      fetchUpcomingSpends(),
      fetchExpenseCategories()
    ]);
    // Filter to only show recurring, non-completed expenses
    setExpenses(spendsData.filter(s => s.isRecurring && !s.completed));
    setCategories(categoriesData);
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenDialog = (expense?: UpcomingSpend) => {
    if (expense) {
      setEditingExpense(expense);
      setFormData({
        name: expense.name,
        amount: expense.amount.toString(),
        recurrenceInterval: expense.recurrenceInterval || 'monthly',
        categoryId: expense.categoryId || ''
      });
    } else {
      setEditingExpense(null);
      setFormData({ name: '', amount: '', recurrenceInterval: 'monthly', categoryId: '' });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingExpense(null);
    setFormData({ name: '', amount: '', recurrenceInterval: 'monthly', categoryId: '' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(formData.amount);
    
    if (!formData.name.trim() || isNaN(amount) || amount <= 0) {
      return;
    }

    if (editingExpense) {
      await updateUpcomingSpend(editingExpense.id, {
        name: formData.name.trim(),
        amount,
        recurrenceInterval: formData.recurrenceInterval,
        categoryId: formData.categoryId || null
      });
    } else {
      await createUpcomingSpend({
        name: formData.name.trim(),
        amount,
        isRecurring: true,
        recurrenceInterval: formData.recurrenceInterval,
        categoryId: formData.categoryId || null
      });
    }

    handleCloseDialog();
    loadData();
  };

  const handleDelete = async (expense: UpcomingSpend) => {
    await deleteUpcomingSpend(expense.id);
    loadData();
  };

  const getUserName = (userId: string): string => {
    const user = allUsers.find(u => u.id === userId);
    return user?.name || userId;
  };

  const getUserColor = (userId: string): string => {
    const colors = seriesColors;
    const index = allUsers.findIndex(u => u.id === userId);
    return colors[index >= 0 ? index % colors.length : 0];
  };

  const getCategoryById = (categoryId: string | null | undefined): ExpenseCategory | undefined => {
    if (!categoryId) return undefined;
    return categories.find(c => c.id === categoryId);
  };

  const getRecurrenceLabel = (interval: string | null | undefined): string => {
    const option = RECURRENCE_OPTIONS.find(o => o.value === interval);
    return option?.label || 'Monthly';
  };

  // Group expenses by category
  const expensesByCategory = expenses.reduce((acc, expense) => {
    const categoryId = expense.categoryId || 'uncategorized';
    if (!acc[categoryId]) {
      acc[categoryId] = [];
    }
    acc[categoryId].push(expense);
    return acc;
  }, {} as Record<string, UpcomingSpend[]>);

  // Calculate totals
  const monthlyTotal = expenses.reduce((sum, e) => {
    const amount = e.amount;
    switch (e.recurrenceInterval) {
      case 'weekly':
        return sum + (amount * 52 / 12); // Convert weekly to monthly
      case 'yearly':
        return sum + (amount / 12); // Convert yearly to monthly
      default:
        return sum + amount;
    }
  }, 0);

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" component="h3">
            Recurring expenses
          </Typography>
          <Button
            size="small"
            startIcon={<Add />}
            onClick={() => handleOpenDialog()}
          >
            Add
          </Button>
        </Box>

        {isLoading ? (
          <Typography color="text.secondary" align="center" sx={{ py: 2 }}>
            Loading...
          </Typography>
        ) : expenses.length === 0 ? (
          <Typography color="text.secondary" align="center" sx={{ py: 2 }}>
            No recurring expenses. Add regular bills and subscriptions to track monthly outgoings!
          </Typography>
        ) : (
          <>
            {Object.entries(expensesByCategory).map(([categoryId, categoryExpenses]) => {
              const category = categoryId === 'uncategorized' 
                ? null 
                : getCategoryById(categoryId);
              const categoryTotal = categoryExpenses.reduce((sum, e) => {
                const amount = e.amount;
                switch (e.recurrenceInterval) {
                  case 'weekly':
                    return sum + (amount * 52 / 12);
                  case 'yearly':
                    return sum + (amount / 12);
                  default:
                    return sum + amount;
                }
              }, 0);

              return (
                <Box key={categoryId} sx={{ mb: 2 }}>
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 1, 
                    mb: 1,
                    pb: 0.5,
                    borderBottom: '1px solid',
                    borderColor: 'divider'
                  }}>
                    {category ? (
                      <>
                        <Box
                          sx={{
                            width: 10,
                            height: 10,
                            borderRadius: '3px',
                            bgcolor: category.color
                          }}
                        />
                        <Typography variant="subtitle2" sx={{ flex: 1 }}>
                          {category.name}
                        </Typography>
                      </>
                    ) : (
                      <Typography variant="subtitle2" color="text.secondary" sx={{ flex: 1 }}>
                        Uncategorized
                      </Typography>
                    )}
                    <Typography variant="caption" color="text.secondary">
                      ~£{categoryTotal.toFixed(0)}/mo
                    </Typography>
                  </Box>

                  <List disablePadding>
                    {categoryExpenses.map((expense) => {
                      const isOwner = expense.userId === currentUser.id;
                      const userColor = getUserColor(expense.userId);
                      
                      return (
                        <ListItem
                          key={expense.id}
                          sx={{
                            px: 0,
                            py: 0.75,
                            pr: isOwner ? 10 : 0
                          }}
                        >
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                <Typography sx={{ fontWeight: 600, fontSize: '0.9375rem' }}>
                                  {expense.name}
                                </Typography>
                                <Chip
                                  icon={<Repeat sx={{ fontSize: '0.8rem !important' }} />}
                                  label={getRecurrenceLabel(expense.recurrenceInterval)}
                                  size="small"
                                  sx={{ height: 20, fontSize: '0.75rem', bgcolor: 'action.hover', color: 'text.secondary' }}
                                />
                                <Chip
                                  label={getUserName(expense.userId)}
                                  size="small"
                                  sx={{
                                    height: 20,
                                    fontSize: '0.75rem',
                                    bgcolor: 'action.hover',
                                    color: 'text.secondary',
                                    '&::before': { content: '""', width: 6, height: 6, borderRadius: '50%', bgcolor: userColor, ml: 1 }
                                  }}
                                />
                              </Box>
                            }
                            secondary={
                              <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                                £{expense.amount.toFixed(2)}
                                <Typography component="span" variant="caption" color="text.secondary">
                                  {expense.recurrenceInterval === 'weekly' && '/week'}
                                  {expense.recurrenceInterval === 'monthly' && '/month'}
                                  {expense.recurrenceInterval === 'yearly' && '/year'}
                                </Typography>
                              </Typography>
                            }
                          />
                          {isOwner && (
                            <ListItemSecondaryAction>
                              <IconButton
                                size="small"
                                onClick={() => handleOpenDialog(expense)}
                                sx={{ mr: 0.5, color: 'text.secondary' }}
                                aria-label={`Edit ${expense.name}`}
                              >
                                <Edit fontSize="small" />
                              </IconButton>
                              <IconButton
                                size="small"
                                onClick={() => handleDelete(expense)}
                                sx={{ color: 'text.secondary' }}
                                aria-label={`Delete ${expense.name}`}
                              >
                                <Delete fontSize="small" />
                              </IconButton>
                            </ListItemSecondaryAction>
                          )}
                        </ListItem>
                      );
                    })}
                  </List>
                </Box>
              );
            })}

            <Divider sx={{ my: 1.5 }} />
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Estimated monthly total
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                ~£{monthlyTotal.toFixed(0)}/mo
              </Typography>
            </Box>
          </>
        )}

        {/* Add/Edit Dialog */}
        <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="xs" fullWidth>
          <form onSubmit={handleSubmit}>
            <DialogTitle>
              {editingExpense ? 'Edit Recurring Expense' : 'Add Recurring Expense'}
            </DialogTitle>
            <DialogContent>
              <TextField
                autoFocus
                fullWidth
                label="Expense Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Netflix, Electricity, Rent"
                required
                sx={{ mb: 2, mt: 1 }}
              />
              <TextField
                fullWidth
                label="Amount"
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0.00"
                required
                InputProps={{
                  startAdornment: <InputAdornment position="start">£</InputAdornment>
                }}
                inputProps={{
                  step: "0.01",
                  min: "0.01"
                }}
                sx={{ mb: 2 }}
              />
              <TextField
                select
                fullWidth
                label="Frequency"
                value={formData.recurrenceInterval}
                onChange={(e) => setFormData({ ...formData, recurrenceInterval: e.target.value })}
                sx={{ mb: 2 }}
              >
                {RECURRENCE_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                fullWidth
                label="Category (optional)"
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
              >
                <MenuItem value="">
                  <em>No category</em>
                </MenuItem>
                {categories.map((category) => (
                  <MenuItem key={category.id} value={category.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box
                        sx={{
                          width: 12,
                          height: 12,
                          borderRadius: '50%',
                          bgcolor: category.color
                        }}
                      />
                      {category.name}
                    </Box>
                  </MenuItem>
                ))}
              </TextField>
              {categories.length === 0 && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                  💡 Add categories on the Accounts page to organize expenses
                </Typography>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseDialog}>Cancel</Button>
              <Button type="submit" variant="contained">
                {editingExpense ? 'Save' : 'Add'}
              </Button>
            </DialogActions>
          </form>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default RecurringExpenses;
