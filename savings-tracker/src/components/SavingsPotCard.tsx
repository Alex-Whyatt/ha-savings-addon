import React, { useState } from 'react';
import { InvestmentSummary, SavingsPot, User } from '../types';
import { recordValuation } from '../api';
import { Card, CardContent, Typography, Box, TextField, Button, ButtonBase, LinearProgress, Chip, IconButton, Menu, MenuItem } from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { format } from 'date-fns';
import { useAuth } from '../AuthContext';
import FundsDialog from './FundsDialog';

interface SavingsPotCardProps {
  pot: SavingsPot;
  onUpdate: () => void;
  currentUser?: User;
  investment?: InvestmentSummary;
}

const SavingsPotCard: React.FC<SavingsPotCardProps> = ({ pot, onUpdate, currentUser, investment }) => {
  const { allUsers } = useAuth();
  // Safety check - don't render if pot is invalid
  if (!pot || typeof pot.currentTotal !== 'number') {
    console.error('Invalid pot data:', pot);
    return null;
  }

  const isCurrentUser = currentUser && pot.userId === currentUser.id;
  const [isEditing, setIsEditing] = useState(false);
  const [editAmount, setEditAmount] = useState(pot.currentTotal.toString());
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [fundsOpen, setFundsOpen] = useState(false);

  const holdings = investment?.holdings ?? [];
  const hasValuations = !!investment && investment.valuationCount > 0;

  // Typing in a new balance records what the account is worth today,
  // so the change counts as growth rather than money paid in
  const handleSaveAmount = async () => {
    const newAmount = parseFloat(editAmount);
    if (!isNaN(newAmount) && newAmount >= 0) {
      if (newAmount !== pot.currentTotal) {
        await recordValuation(pot.id, newAmount);
      }
      setIsEditing(false);
      onUpdate();
    }
  };

  const startEditing = () => {
    setMenuAnchor(null);
    setEditAmount(pot.currentTotal.toString());
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setEditAmount(pot.currentTotal.toString());
    setIsEditing(false);
  };

  const progressPercentage = pot.targetAmount && pot.currentTotal
    ? Math.min((pot.currentTotal / pot.targetAmount) * 100, 100)
    : 0;

  const formatGBP = (value: number, decimals = 2) =>
    `£${value.toLocaleString('en-GB', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;

  return (
    <Card sx={{ height: '100%', boxSizing: 'border-box' }}>
      <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.25, height: '100%', boxSizing: 'border-box' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
          <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: pot.color, flexShrink: 0 }} />
          <Typography variant="subtitle1" component="h3" sx={{ flexGrow: 1, minWidth: 0, lineHeight: 1.3 }} noWrap>
            {pot.name}
          </Typography>
          {!isCurrentUser && (
            <Chip
              label={allUsers.find(u => u.id === pot.userId)?.name || pot.userId}
              size="small"
              sx={{ fontSize: '0.75rem', height: 22, bgcolor: 'action.hover', color: 'text.secondary' }}
            />
          )}
          {isCurrentUser && (
            <>
              <IconButton
                size="small"
                aria-label={`More for ${pot.name}`}
                onClick={(e) => setMenuAnchor(e.currentTarget)}
                sx={{ color: 'text.secondary', mr: -1, my: -0.5 }}
              >
                <MoreVertIcon fontSize="small" />
              </IconButton>
              <Menu anchorEl={menuAnchor} open={!!menuAnchor} onClose={() => setMenuAnchor(null)}>
                <MenuItem onClick={startEditing}>Update value</MenuItem>
                <MenuItem onClick={() => { setMenuAnchor(null); setFundsOpen(true); }}>
                  {holdings.length > 0 ? 'Edit funds' : 'Add funds held'}
                </MenuItem>
              </Menu>
            </>
          )}
        </Box>

        {pot.description && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: -0.75 }} noWrap>
            {pot.description}
          </Typography>
        )}

        {isEditing && isCurrentUser ? (
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
            <TextField
              size="small"
              type="number"
              value={editAmount}
              onChange={(e) => setEditAmount(e.target.value)}
              autoFocus
              inputProps={{
                step: "0.01",
                min: "0",
                inputMode: 'decimal',
                'aria-label': `Value of ${pot.name} today`
              }}
              InputProps={{ startAdornment: <Typography sx={{ mr: 0.5, color: 'text.secondary' }}>£</Typography> }}
              sx={{ flex: '1 1 140px' }}
            />
            <Button size="small" variant="contained" onClick={handleSaveAmount}>
              Save
            </Button>
            <Button size="small" onClick={handleCancelEdit} sx={{ color: 'text.secondary' }}>
              Cancel
            </Button>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 1 }}>
            <ButtonBase
              onClick={() => isCurrentUser && startEditing()}
              disabled={!isCurrentUser}
              aria-label={isCurrentUser ? `Update value of ${pot.name}` : undefined}
              sx={{
                borderRadius: 1,
                mx: -0.75,
                px: 0.75,
                justifyContent: 'flex-start',
                '&:hover': isCurrentUser ? { bgcolor: 'action.hover' } : {}
              }}
            >
              <Typography component="span" sx={{ fontSize: { xs: '1.5rem', sm: '1.625rem' }, fontWeight: 700, color: 'text.primary' }}>
                {formatGBP(pot?.currentTotal ?? 0)}
              </Typography>
              {isCurrentUser && <EditOutlinedIcon sx={{ fontSize: 16, color: 'text.secondary', ml: 0.75 }} />}
            </ButtonBase>
            {pot.interestRate != null && pot.interestRate > 0 && (
              <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: 'primary.main', whiteSpace: 'nowrap' }}>
                {pot.interestRate}% a year
              </Typography>
            )}
          </Box>
        )}

        {hasValuations && investment && (
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8125rem', mt: -0.5 }}>
            {formatGBP(investment.paidIn, 0)} paid in ·{' '}
            <Box component="span" sx={{ fontWeight: 600, color: investment.growth >= 0 ? 'success.main' : 'error.main' }}>
              {investment.growth >= 0 ? '+' : '−'}{formatGBP(Math.abs(investment.growth), 0)}
              {investment.returnPercent != null && ` (${investment.returnPercent >= 0 ? '+' : '−'}${Math.abs(investment.returnPercent).toFixed(1)}%)`}
            </Box>
            {investment.firstValuedAt && ` since ${format(new Date(investment.firstValuedAt), 'MMM yyyy')}`}
          </Typography>
        )}

        {holdings.length > 0 && (
          <ButtonBase
            onClick={() => setFundsOpen(true)}
            sx={{ justifyContent: 'space-between', borderRadius: 1, mx: -0.75, px: 0.75, py: 0.25, '&:hover': { bgcolor: 'action.hover' } }}
          >
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8125rem' }} noWrap>
              {holdings.length} fund{holdings.length !== 1 ? 's' : ''}: {holdings.map(h => h.name).join(', ')}
            </Typography>
            <ChevronRightIcon sx={{ fontSize: 18, color: 'text.secondary', flexShrink: 0 }} />
          </ButtonBase>
        )}

        <Box sx={{ mt: 'auto' }}>
          {pot.targetAmount ? (
            <>
              <LinearProgress
                variant="determinate"
                value={progressPercentage}
                aria-label={`${progressPercentage.toFixed(0)}% of target`}
                sx={{ mb: 0.75, '& .MuiLinearProgress-bar': { backgroundColor: pot.color } }}
              />
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8125rem' }}>
                {progressPercentage.toFixed(0)}% of £{pot.targetAmount.toLocaleString('en-GB')} target
              </Typography>
            </>
          ) : pot.interestRate != null && pot.interestRate > 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8125rem' }}>
              ≈ £{((pot.currentTotal * pot.interestRate) / 100).toFixed(0)} a year in growth
            </Typography>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8125rem' }}>
              No target set
            </Typography>
          )}
        </Box>
      </CardContent>
      <FundsDialog
        open={fundsOpen}
        pot={pot}
        holdings={holdings}
        canEdit={!!isCurrentUser}
        onClose={() => setFundsOpen(false)}
        onSaved={onUpdate}
      />
    </Card>
  );
};

export default SavingsPotCard;
