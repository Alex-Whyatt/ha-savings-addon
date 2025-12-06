import React, { useState } from 'react';
import { SavingsPot } from '../types';
import { addSavingsPot, updateSavingsPot, deleteSavingsPot } from '../storage';
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
  IconButton,
  LinearProgress,
  Fab,
  useMediaQuery,
  useTheme
} from '@mui/material';
import { Add, Edit, Delete } from '@mui/icons-material';
import ExpenseCategories from './ExpenseCategories';
import { useAuth } from '../AuthContext';

interface SavingsPotsProps {
  pots: SavingsPot[];
  onDataChange: () => void;
}

const SavingsPots: React.FC<SavingsPotsProps> = ({ pots, onDataChange }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { user } = useAuth();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingPot, setEditingPot] = useState<SavingsPot | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    currentTotal: '0',
    targetAmount: '',
    interestRate: '',
    color: '#667eea'
  });

  const colors = [
    '#667eea', '#764ba2', '#f093fb', '#f5576c',
    '#4facfe', '#00f2fe', '#43e97b', '#38f9d7',
    '#fa709a', '#fee140', '#a8edea', '#fed6e3'
  ];

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      currentTotal: '0',
      targetAmount: '',
      interestRate: '',
      color: '#667eea'
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const currentTotal = parseFloat(formData.currentTotal);
    const targetAmount = formData.targetAmount ? parseFloat(formData.targetAmount) : undefined;
    const interestRate = formData.interestRate ? parseFloat(formData.interestRate) : undefined;

    if (!formData.name.trim() || isNaN(currentTotal) || currentTotal < 0) {
      return;
    }

    if (targetAmount !== undefined && (isNaN(targetAmount) || targetAmount <= 0)) {
      return;
    }

    if (interestRate !== undefined && (isNaN(interestRate) || interestRate < 0 || interestRate > 100)) {
      return;
    }

    if (editingPot) {
      updateSavingsPot(editingPot.id, {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        currentTotal,
        targetAmount,
        interestRate: interestRate ?? null,
        color: formData.color
      });
      setEditingPot(null);
    } else {
      addSavingsPot({
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        currentTotal,
        targetAmount,
        interestRate: interestRate ?? null,
        color: formData.color
      });
      setShowAddForm(false);
    }

    resetForm();
    onDataChange();
  };

  const handleEdit = (pot: SavingsPot) => {
    setEditingPot(pot);
    setFormData({
      name: pot.name,
      description: pot.description || '',
      currentTotal: pot.currentTotal.toString(),
      targetAmount: pot.targetAmount?.toString() || '',
      interestRate: pot.interestRate?.toString() || '',
      color: pot.color
    });
  };

  const handleDelete = (potId: string) => {
    if (window.confirm('Are you sure you want to delete this account? This will also delete all associated transactions.')) {
      deleteSavingsPot(potId);
      onDataChange();
    }
  };

  const handleCancel = () => {
    setShowAddForm(false);
    setEditingPot(null);
    resetForm();
  };

  const totalSaved = pots.reduce((sum, pot) => sum + pot.currentTotal, 0);

  return (
    <Box sx={{ position: 'relative', minHeight: '60vh' }}>
      {/* Summary Card */}
      <Card 
        sx={{ 
          mb: 3,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white'
        }}
      >
        <CardContent sx={{ py: { xs: 2, sm: 3 } }}>
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 2
          }}>
            <Box>
              <Typography variant="body2" sx={{ opacity: 0.9, mb: 0.5 }}>
                Total across {pots.length} account{pots.length !== 1 ? 's' : ''}
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                £{totalSaved.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
              </Typography>
            </Box>
            {!isMobile && (
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => setShowAddForm(true)}
                disabled={showAddForm || editingPot !== null}
                sx={{
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  '&:hover': {
                    backgroundColor: 'rgba(255,255,255,0.3)'
                  },
                  whiteSpace: 'nowrap'
                }}
              >
                New Account
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Dialog for Add/Edit */}
      <Dialog
        open={showAddForm || editingPot !== null}
        onClose={handleCancel}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 2 }
        }}
      >
        <DialogTitle sx={{ 
          pb: 1,
          fontWeight: 600 
        }}>
          {editingPot ? 'Edit Account' : 'Create New Account'}
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="Account Name"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="e.g., Cash ISA, S&S ISA, NS&I Bonds"
              required
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              label="Description (optional)"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="e.g., Provider name or notes"
              sx={{ mb: 2 }}
            />

            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <TextField
                fullWidth
                label="Current Total (£)"
                type="number"
                value={formData.currentTotal}
                onChange={(e) => setFormData({...formData, currentTotal: e.target.value})}
                required
                inputProps={{
                  step: "0.01",
                  min: "0"
                }}
              />

              <TextField
                fullWidth
                label="Target (£)"
                type="number"
                value={formData.targetAmount}
                onChange={(e) => setFormData({...formData, targetAmount: e.target.value})}
                placeholder="Optional"
                inputProps={{
                  step: "0.01",
                  min: "0.01"
                }}
              />
            </Box>

            <TextField
              fullWidth
              label="Expected Annual Growth Rate (%)"
              type="number"
              value={formData.interestRate}
              onChange={(e) => setFormData({...formData, interestRate: e.target.value})}
              placeholder="e.g., 3.1 for Cash ISA, 5 for S&S ISA"
              helperText="Optional - Used to forecast expected growth from interest or returns"
              inputProps={{
                step: "0.1",
                min: "0",
                max: "100"
              }}
              sx={{ mb: 2 }}
            />

            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              Choose a color
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {colors.map(color => (
                <Box
                  key={color}
                  onClick={() => setFormData({...formData, color})}
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    backgroundColor: color,
                    cursor: 'pointer',
                    border: formData.color === color ? '3px solid #333' : '2px solid transparent',
                    transition: 'all 0.2s',
                    '&:hover': {
                      transform: 'scale(1.1)'
                    }
                  }}
                />
              ))}
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={handleCancel} sx={{ color: 'text.secondary' }}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="contained"
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              }}
            >
              {editingPot ? 'Save Changes' : 'Create Account'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Accounts Grid */}
      {pots.length === 0 ? (
        <Card sx={{ 
          textAlign: 'center', 
          py: 6,
          borderStyle: 'dashed',
          borderWidth: 2,
          borderColor: 'divider',
          backgroundColor: 'transparent'
        }}>
          <CardContent>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No accounts yet
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Add your first savings account to start tracking
            </Typography>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setShowAddForm(true)}
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              }}
            >
              Add First Account
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, 1fr)',
            md: 'repeat(3, 1fr)'
          },
          gap: { xs: 2, sm: 3 }
        }}>
          {pots.map(pot => {
            const progressPercentage = pot.targetAmount 
              ? Math.min((pot.currentTotal / pot.targetAmount) * 100, 100)
              : 0;
            
            return (
              <Card 
                key={pot.id} 
                sx={{ 
                  position: 'relative',
                  overflow: 'visible',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 4,
                    backgroundColor: pot.color,
                    borderRadius: '4px 4px 0 0'
                  }
                }}
              >
                <CardContent sx={{ pt: 2.5 }}>
                  <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'flex-start',
                    mb: 1
                  }}>
                    <Typography 
                      variant="subtitle1" 
                      component="h3" 
                      sx={{ 
                        fontWeight: 600,
                        color: 'text.primary'
                      }}
                    >
                      {pot.name}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.5, ml: 1 }}>
                      <IconButton 
                        size="small" 
                        onClick={() => handleEdit(pot)}
                        sx={{ 
                          color: 'text.secondary',
                          '&:hover': { color: 'primary.main' }
                        }}
                      >
                        <Edit fontSize="small" />
                      </IconButton>
                      <IconButton 
                        size="small" 
                        onClick={() => handleDelete(pot.id)}
                        sx={{ 
                          color: 'text.secondary',
                          '&:hover': { color: 'error.main' }
                        }}
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>
                  
                  {pot.description && (
                    <Typography 
                      variant="body2" 
                      color="text.secondary" 
                      sx={{ 
                        mb: 2,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}
                    >
                      {pot.description}
                    </Typography>
                  )}

                  <Typography 
                    variant="h5" 
                    sx={{ 
                      fontWeight: 700,
                      color: pot.color,
                      mb: pot.targetAmount ? 1.5 : 0
                    }}
                  >
                    £{pot.currentTotal.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                  </Typography>

                  {pot.targetAmount && (
                    <Box sx={{ mb: pot.interestRate ? 1.5 : 0 }}>
                      <LinearProgress
                        variant="determinate"
                        value={progressPercentage}
                        sx={{
                          height: 6,
                          borderRadius: 3,
                          backgroundColor: 'rgba(0,0,0,0.08)',
                          mb: 0.75,
                          '& .MuiLinearProgress-bar': {
                            backgroundColor: pot.color,
                            borderRadius: 3
                          }
                        }}
                      />
                      <Box sx={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <Typography variant="caption" color="text.secondary">
                          {progressPercentage.toFixed(0)}% complete
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          £{pot.targetAmount.toLocaleString('en-GB')} goal
                        </Typography>
                      </Box>
                    </Box>
                  )}

                  {pot.interestRate && pot.interestRate > 0 && (
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 1,
                      mt: pot.targetAmount ? 0 : 1.5,
                      p: 1,
                      bgcolor: 'rgba(76, 175, 80, 0.08)',
                      borderRadius: 1,
                      border: '1px solid rgba(76, 175, 80, 0.2)'
                    }}>
                      <Typography variant="body2" sx={{ color: 'success.main', fontWeight: 500 }}>
                        📈 {pot.interestRate}% p.a.
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </Box>
      )}

      {/* Expense Categories Section */}
      {user && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h5" component="h2" gutterBottom sx={{ 
            fontWeight: 600,
            color: 'text.primary'
          }}>
            Expense Categories
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Create categories to organize your recurring expenses. Categories are shared with all users.
          </Typography>
          <ExpenseCategories currentUser={user} />
        </Box>
      )}

      {/* Mobile FAB */}
      {isMobile && (
        <Fab
          color="primary"
          onClick={() => setShowAddForm(true)}
          disabled={showAddForm || editingPot !== null}
          sx={{
            position: 'fixed',
            bottom: 80, // Above bottom nav
            right: 16,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            zIndex: 1000
          }}
        >
          <Add />
        </Fab>
      )}
    </Box>
  );
};

export default SavingsPots;
