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
  IconButton
} from '@mui/material';
import { Add, Edit, Delete } from '@mui/icons-material';

interface SavingsPotsProps {
  pots: SavingsPot[];
  onDataChange: () => void;
}

const SavingsPots: React.FC<SavingsPotsProps> = ({ pots, onDataChange }) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingPot, setEditingPot] = useState<SavingsPot | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    currentTotal: '0',
    targetAmount: '',
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
      color: '#667eea'
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const currentTotal = parseFloat(formData.currentTotal);
    const targetAmount = formData.targetAmount ? parseFloat(formData.targetAmount) : undefined;

    if (!formData.name.trim() || isNaN(currentTotal) || currentTotal < 0) {
      return;
    }

    if (targetAmount !== undefined && (isNaN(targetAmount) || targetAmount <= 0)) {
      return;
    }

    if (editingPot) {
      updateSavingsPot(editingPot.id, {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        currentTotal,
        targetAmount,
        color: formData.color
      });
      setEditingPot(null);
    } else {
      addSavingsPot({
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        currentTotal,
        targetAmount,
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
      color: pot.color
    });
  };

  const handleDelete = (potId: string) => {
    if (window.confirm('Are you sure you want to delete this savings pot? This will also delete all associated transactions.')) {
      deleteSavingsPot(potId);
      onDataChange();
    }
  };

  const handleCancel = () => {
    setShowAddForm(false);
    setEditingPot(null);
    resetForm();
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Manage Savings Pots
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setShowAddForm(true)}
          disabled={showAddForm || editingPot !== null}
        >
          Add New Pot
        </Button>
      </Box>

      <Dialog
        open={showAddForm || editingPot !== null}
        onClose={handleCancel}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingPot ? 'Edit' : 'Add'} Savings Pot
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <TextField
              fullWidth
              label="Name"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="e.g., Emergency Fund"
              required
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              label="Description (optional)"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="What is this pot for?"
              sx={{ mb: 2 }}
            />

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
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              label="Target Amount (£) - optional"
              type="number"
              value={formData.targetAmount}
              onChange={(e) => setFormData({...formData, targetAmount: e.target.value})}
              placeholder="Leave empty if no target"
              inputProps={{
                step: "0.01",
                min: "0.01"
              }}
              sx={{ mb: 2 }}
            />

            <Typography variant="body2" sx={{ mb: 1 }}>
              Color:
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
              {colors.map(color => (
                <Box
                  key={color}
                  onClick={() => setFormData({...formData, color})}
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    backgroundColor: color,
                    cursor: 'pointer',
                    border: formData.color === color ? '3px solid #333' : '2px solid transparent',
                    transition: 'border 0.2s'
                  }}
                />
              ))}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCancel}>Cancel</Button>
            <Button type="submit" variant="contained">
              {editingPot ? 'Update' : 'Create'} Pot
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {pots.length === 0 ? (
        <Card>
          <CardContent>
            <Typography variant="body1" color="text.secondary" align="center">
              No savings pots yet. Create your first pot to get started!
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          {pots.map(pot => (
            <Box key={pot.id} sx={{ flex: '1 1 300px' }}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" component="h3" gutterBottom>
                        {pot.name}
                      </Typography>
                      <Typography variant="h5" color="primary" sx={{ fontWeight: 'bold' }}>
                        £{pot.currentTotal.toFixed(2)}
                      </Typography>
                      {pot.targetAmount && (
                        <Typography variant="body2" color="text.secondary">
                          Target: £{pot.targetAmount.toFixed(2)}
                        </Typography>
                      )}
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <IconButton size="small" onClick={() => handleEdit(pot)} color="primary">
                        <Edit />
                      </IconButton>
                      <IconButton size="small" onClick={() => handleDelete(pot.id)} color="error">
                        <Delete />
                      </IconButton>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default SavingsPots;
