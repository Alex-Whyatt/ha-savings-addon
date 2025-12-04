import React, { useState } from 'react';
import { SavingsPot } from '../types';
import { updateSavingsPot } from '../storage';
import { Card, CardContent, Typography, Box, TextField, Button, LinearProgress } from '@mui/material';

interface SavingsPotCardProps {
  pot: SavingsPot;
  onUpdate: () => void;
}

const SavingsPotCard: React.FC<SavingsPotCardProps> = ({ pot, onUpdate }) => {
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

  const progressPercentage = pot.targetAmount
    ? Math.min((pot.currentTotal / pot.targetAmount) * 100, 100)
    : 0;

  return (
    <Card sx={{ borderLeft: 4, borderColor: pot.color }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="h6" component="h3">
            {pot.name}
          </Typography>
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
          {isEditing ? (
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
              onClick={() => setIsEditing(true)}
              sx={{
                cursor: 'pointer',
                p: 1,
                borderRadius: 1,
                '&:hover': { backgroundColor: 'action.hover' }
              }}
            >
              <Typography variant="h5" component="div" color="primary">
                £{pot.currentTotal.toFixed(2)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Click to edit
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
