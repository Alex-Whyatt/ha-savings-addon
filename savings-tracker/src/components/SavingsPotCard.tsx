import React, { useState } from 'react';
import { SavingsPot, User } from '../types';
import { updateSavingsPot } from '../storage';
import { Card, CardContent, Typography, Box, TextField, Button, LinearProgress, Chip } from '@mui/material';
import { useAuth } from '../AuthContext';

interface SavingsPotCardProps {
  pot: SavingsPot;
  onUpdate: () => void;
  currentUser?: User;
}

const SavingsPotCard: React.FC<SavingsPotCardProps> = ({ pot, onUpdate, currentUser }) => {
  const { allUsers } = useAuth();
  // Safety check - don't render if pot is invalid
  if (!pot || typeof pot.currentTotal !== 'number') {
    console.error('Invalid pot data:', pot);
    return null;
  }

  const isCurrentUser = currentUser && pot.userId === currentUser.id;
  const [isEditing, setIsEditing] = useState(false);
  const [editAmount, setEditAmount] = useState(pot.currentTotal.toString());

  const handleSaveAmount = () => {
    const newAmount = parseFloat(editAmount);
    if (!isNaN(newAmount) && newAmount >= 0) {
      updateSavingsPot(pot.id, { currentTotal: newAmount });
      setIsEditing(false);
      onUpdate();
    }
  };

  const handleCancelEdit = () => {
    setEditAmount(pot.currentTotal.toString());
    setIsEditing(false);
  };

  const progressPercentage = pot.targetAmount && pot.currentTotal
    ? Math.min((pot.currentTotal / pot.targetAmount) * 100, 100)
    : 0;

  return (
    <Card sx={{
      borderLeft: 4,
      borderColor: pot.color,
      opacity: isCurrentUser ? 1 : 0.8
    }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h6" component="h3">
              {pot.name}
            </Typography>
            {!isCurrentUser && (
              <Chip
                label={allUsers.find(u => u.id === pot.userId)?.name || pot.userId}
                size="small"
                variant="outlined"
                sx={{ fontSize: '0.7rem' }}
              />
            )}
          </Box>
          <Box
            sx={{
              width: 20,
              height: 20,
              borderRadius: '50%',
              backgroundColor: pot.color
            }}
          />
        </Box>

        {pot.description && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {pot.description}
          </Typography>
        )}

        <Box sx={{ mb: 2 }}>
          {isEditing && isCurrentUser ? (
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Typography variant="body1">£</Typography>
              <TextField
                size="small"
                type="number"
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
                autoFocus
                inputProps={{
                  step: "0.01",
                  min: "0"
                }}
                sx={{ flex: 1 }}
              />
              <Button
                size="small"
                variant="contained"
                color="primary"
                onClick={handleSaveAmount}
              >
                Save
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={handleCancelEdit}
              >
                Cancel
              </Button>
            </Box>
          ) : (
            <Box
              onClick={() => isCurrentUser && setIsEditing(true)}
              sx={{
                cursor: isCurrentUser ? 'pointer' : 'default',
                p: 1,
                borderRadius: 1,
                '&:hover': isCurrentUser ? { backgroundColor: 'action.hover' } : {}
              }}
            >
              <Typography variant="h5" component="div" color="primary">
                £{(pot?.currentTotal ?? 0).toFixed(2)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {isCurrentUser ? 'Click to edit' : 'Read-only'}
              </Typography>
            </Box>
          )}
        </Box>

        {pot.targetAmount && (
          <Box>
            <LinearProgress
              variant="determinate"
              value={progressPercentage}
              sx={{
                height: 8,
                borderRadius: 4,
                mb: 1,
                '& .MuiLinearProgress-bar': {
                  backgroundColor: pot.color,
                }
              }}
            />
            <Typography variant="body2" color="text.secondary">
              {progressPercentage.toFixed(1)}% of £{pot.targetAmount.toFixed(2)} target
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default SavingsPotCard;
