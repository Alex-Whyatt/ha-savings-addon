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
  InputAdornment
} from '@mui/material';
import {
  Add,
  Delete,
  Edit,
  RadioButtonUnchecked
} from '@mui/icons-material';
import { UpcomingSpend, User } from '../types';
import {
  fetchUpcomingSpends,
  createUpcomingSpend,
  updateUpcomingSpend,
  deleteUpcomingSpend
} from '../api';
import { useAuth } from '../AuthContext';

interface UpcomingSpendsProps {
  currentUser: User;
}

// Generate a consistent color for a user based on their index
const getUserColor = (userId: string, allUsers: User[]): string => {
  const colors = ['#667eea', '#e91e63', '#4caf50', '#ff9800', '#9c27b0', '#00bcd4'];
  const index = allUsers.findIndex(u => u.id === userId);
  return colors[index >= 0 ? index % colors.length : 0];
};

const UpcomingSpends: React.FC<UpcomingSpendsProps> = ({ currentUser }) => {
  const { allUsers } = useAuth();
  const [spends, setSpends] = useState<UpcomingSpend[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSpend, setEditingSpend] = useState<UpcomingSpend | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    amount: ''
  });

  const loadSpends = async () => {
    setIsLoading(true);
    const data = await fetchUpcomingSpends();
    // Filter to only show non-completed, non-recurring spends
    setSpends(data.filter(s => !s.completed && !s.isRecurring));
    setIsLoading(false);
  };

  useEffect(() => {
    loadSpends();
  }, []);

  const handleOpenDialog = (spend?: UpcomingSpend) => {
    if (spend) {
      setEditingSpend(spend);
      setFormData({
        name: spend.name,
        amount: spend.amount.toString()
      });
    } else {
      setEditingSpend(null);
      setFormData({ name: '', amount: '' });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingSpend(null);
    setFormData({ name: '', amount: '' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(formData.amount);
    
    if (!formData.name.trim() || isNaN(amount) || amount <= 0) {
      return;
    }

    if (editingSpend) {
      await updateUpcomingSpend(editingSpend.id, {
        name: formData.name.trim(),
        amount
      });
    } else {
      await createUpcomingSpend({
        name: formData.name.trim(),
        amount,
        isRecurring: false
      });
    }

    handleCloseDialog();
    loadSpends();
  };

  const handleToggleComplete = async (spend: UpcomingSpend) => {
    await updateUpcomingSpend(spend.id, { completed: true });
    loadSpends();
  };

  const handleDelete = async (spend: UpcomingSpend) => {
    await deleteUpcomingSpend(spend.id);
    loadSpends();
  };

  const getUserName = (userId: string): string => {
    const user = allUsers.find(u => u.id === userId);
    return user?.name || userId;
  };

  // Calculate total
  const totalAmount = spends.reduce((sum, s) => sum + s.amount, 0);

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" component="h3">
            📋 Upcoming Spends
          </Typography>
          <Button
            variant="outlined"
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
        ) : spends.length === 0 ? (
          <Typography color="text.secondary" align="center" sx={{ py: 2 }}>
            No upcoming spends. Add one to track shared expenses!
          </Typography>
        ) : (
          <>
            <List dense sx={{ mb: 1 }}>
              {spends.map((spend) => {
                const isOwner = spend.userId === currentUser.id;
                const userColor = getUserColor(spend.userId, allUsers);
                
                return (
                  <ListItem
                    key={spend.id}
                    sx={{
                      bgcolor: 'grey.50',
                      borderRadius: 1,
                      mb: 0.5,
                      borderLeft: `4px solid ${userColor}`,
                      pr: isOwner ? 12 : 2
                    }}
                  >
                    <IconButton
                      size="small"
                      onClick={() => isOwner && handleToggleComplete(spend)}
                      sx={{ mr: 1, color: isOwner ? 'primary.main' : 'grey.400' }}
                      disabled={!isOwner}
                    >
                      <RadioButtonUnchecked fontSize="small" />
                    </IconButton>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {spend.name}
                          </Typography>
                          <Chip
                            label={getUserName(spend.userId)}
                            size="small"
                            sx={{
                              height: 20,
                              fontSize: '0.65rem',
                              bgcolor: `${userColor}20`,
                              color: userColor
                            }}
                          />
                        </Box>
                      }
                      secondary={
                        <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'error.main' }}>
                          £{spend.amount.toFixed(2)}
                        </Typography>
                      }
                    />
                    {isOwner && (
                      <ListItemSecondaryAction>
                        <IconButton
                          size="small"
                          onClick={() => handleOpenDialog(spend)}
                          sx={{ mr: 0.5 }}
                        >
                          <Edit fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDelete(spend)}
                          color="error"
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </ListItemSecondaryAction>
                    )}
                  </ListItem>
                );
              })}
            </List>

            <Divider sx={{ my: 1.5 }} />
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Total upcoming:
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'error.main' }}>
                £{totalAmount.toFixed(2)}
              </Typography>
            </Box>
          </>
        )}

        {/* Add/Edit Dialog */}
        <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="xs" fullWidth>
          <form onSubmit={handleSubmit}>
            <DialogTitle>
              {editingSpend ? 'Edit Upcoming Spend' : 'Add Upcoming Spend'}
            </DialogTitle>
            <DialogContent>
              <TextField
                autoFocus
                fullWidth
                label="What's the spend for?"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., New sofa, Holiday booking"
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
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseDialog}>Cancel</Button>
              <Button type="submit" variant="contained">
                {editingSpend ? 'Save' : 'Add'}
              </Button>
            </DialogActions>
          </form>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default UpcomingSpends;
