import React from 'react';
import { SavingsData, SavingsProjection, User } from '../types';
import SavingsPotCard from './SavingsPotCard';
import ProjectionChart from './ProjectionChart';
import { Card, CardContent, Typography, Box } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { format, addMonths, startOfMonth, endOfMonth, getDay } from 'date-fns';

// Reusable Summary Card Component
interface SummaryCardProps {
  label: string;
  value: string | number;
  sublabel?: string;
  icon?: React.ReactNode;
  gradient?: boolean;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ label, value, sublabel, icon, gradient }) => (
  <Card sx={{ 
    minWidth: 0,
    ...(gradient && {
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white'
    })
  }}>
    <CardContent sx={{ 
      p: { xs: 1.5, sm: 2 }, 
      '&:last-child': { pb: { xs: 1.5, sm: 2 } } 
    }}>
      {icon ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.25 }}>
          {icon}
          <Typography sx={{ 
            opacity: gradient ? 0.9 : 1, 
            fontSize: { xs: '0.65rem', sm: '0.8rem' },
            color: gradient ? 'inherit' : 'text.secondary'
          }}>
            {label}
          </Typography>
        </Box>
      ) : (
        <Typography 
          color={gradient ? 'inherit' : 'text.secondary'} 
          sx={{ 
            fontSize: { xs: '0.65rem', sm: '0.8rem' },
            opacity: gradient ? 0.9 : 1,
            mb: 0.25,
            lineHeight: 1.2
          }}
        >
          {label}
        </Typography>
      )}
      <Typography 
        variant="h4" 
        component="div" 
        sx={{ 
          fontSize: { xs: '1.1rem', sm: '1.5rem' },
          fontWeight: gradient ? 700 : 500,
          lineHeight: 1.2
        }}
      >
        {value}
      </Typography>
      {sublabel && (
        <Typography sx={{ 
          opacity: 0.8, 
          fontSize: { xs: '0.55rem', sm: '0.7rem' }, 
          mt: 0.25,
          lineHeight: 1.2
        }}>
          {sublabel}
        </Typography>
      )}
    </CardContent>
  </Card>
);

interface DashboardProps {
  data: SavingsData;
  projections: SavingsProjection[];
  onDataChange: () => void;
  currentUser: User;
}

const Dashboard: React.FC<DashboardProps> = ({ data, projections, onDataChange, currentUser }) => {
  const totalSavings = data.pots.reduce((sum, pot) => sum + pot.currentTotal, 0);

  // Calculate total recurring contributions for this month (both users)
  // This includes monthly recurring (once per month) and weekly recurring (multiple times per month)
  const countWeekdayOccurrencesInMonth = (targetDay: number, month: Date): number => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    let count = 0;
    const current = new Date(monthStart);
    
    // Move to first occurrence of target day
    while (getDay(current) !== targetDay && current <= monthEnd) {
      current.setDate(current.getDate() + 1);
    }
    
    // Count occurrences
    while (current <= monthEnd) {
      count++;
      current.setDate(current.getDate() + 7);
    }
    
    return count;
  };

  const now = new Date();
  
  // Sum all monthly recurring transactions
  const monthlyRecurringTotal = data.transactions
    .filter(t => t.repeatMonthly)
    .reduce((sum, t) => sum + t.amount, 0);
  
  // Sum all weekly recurring transactions (multiplied by occurrences this month)
  const weeklyRecurringTotal = data.transactions
    .filter(t => t.repeatWeekly)
    .reduce((sum, t) => {
      const dayOfWeek = getDay(t.date);
      const occurrences = countWeekdayOccurrencesInMonth(dayOfWeek, now);
      return sum + (t.amount * occurrences);
    }, 0);
  
  const totalRecurringMonthly = monthlyRecurringTotal + weeklyRecurringTotal;

  // Separate pots by user
  const currentUserPots = data.pots.filter(pot => pot.userId === currentUser.id);
  const otherUserId = currentUser.id === 'alex' ? 'beth' : 'alex';
  const otherUserName = otherUserId === 'alex' ? 'Alex' : 'Beth';
  const otherUserPots = data.pots.filter(pot => pot.userId === otherUserId);

  // Calculate next month's projected total from projections
  const potUserMap = new Map<string, string>();
  data.pots.forEach(pot => {
    potUserMap.set(pot.id, pot.userId);
  });

  // Get projected total for next month (index 1 in projections data)
  let nextMonthTotal = 0;
  let nextMonthAlex = 0;
  let nextMonthBeth = 0;
  const nextMonthDate = addMonths(new Date(), 1);

  if (projections.length > 0 && projections[0]?.data?.length > 1) {
    projections.forEach(proj => {
      const nextMonthData = proj.data[1]; // Index 1 is next month
      if (nextMonthData) {
        const userId = potUserMap.get(proj.potId);
        if (userId === 'alex') {
          nextMonthAlex += nextMonthData.amount;
        } else if (userId === 'beth') {
          nextMonthBeth += nextMonthData.amount;
        }
        nextMonthTotal += nextMonthData.amount;
      }
    });
  }

  return (
    <Box>

      <Box sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: 'repeat(2, 1fr)',
          sm: 'repeat(4, 1fr)'
        },
        gap: { xs: 1, sm: 2 },
        mb: 3
      }}>
        <SummaryCard
          label="Total Savings"
          value={`£${totalSavings.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
        />
        <SummaryCard
          label="Active Accounts"
          value={data.pots.length}
        />
        <SummaryCard
          label="Monthly Recurring"
          value={`£${totalRecurringMonthly.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
        />
        <SummaryCard
          label={`Expected ${format(nextMonthDate, 'MMM yyyy')}`}
          value={`£${nextMonthTotal.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          sublabel={`Alex: £${nextMonthAlex.toLocaleString('en-GB', { minimumFractionDigits: 0 })} · Beth: £${nextMonthBeth.toLocaleString('en-GB', { minimumFractionDigits: 0 })}`}
          icon={<TrendingUpIcon sx={{ fontSize: { xs: 14, sm: 16 }, opacity: 0.9 }} />}
          gradient
        />
      </Box>

      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" component="h2" gutterBottom>
          Your Accounts
        </Typography>
        <Box sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 3
        }}>
          {currentUserPots.length === 0 ? (
            <Box sx={{ width: '100%' }}>
              <Card>
                <CardContent>
                  <Typography variant="body1" color="text.secondary" align="center">
                    No accounts yet. Add your first account to get started!
                  </Typography>
                </CardContent>
              </Card>
            </Box>
          ) : (
            currentUserPots.map(pot => (
              <Box key={pot.id} sx={{ minWidth: 300, flex: 1 }}>
                <SavingsPotCard
                  pot={pot}
                  onUpdate={onDataChange}
                  currentUser={currentUser}
                />
              </Box>
            ))
          )}
        </Box>
      </Box>

      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" component="h2" gutterBottom>
          {otherUserName}'s Accounts
        </Typography>
        <Box sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 3
        }}>
          {otherUserPots.length === 0 ? (
            <Box sx={{ width: '100%' }}>
              <Card>
                <CardContent>
                  <Typography variant="body1" color="text.secondary" align="center">
                    No accounts yet.
                  </Typography>
                </CardContent>
              </Card>
            </Box>
          ) : (
            otherUserPots.map(pot => (
              <Box key={pot.id} sx={{ minWidth: 300, flex: 1 }}>
                <SavingsPotCard
                  pot={pot}
                  onUpdate={onDataChange}
                  currentUser={currentUser}
                />
              </Box>
            ))
          )}
        </Box>
      </Box>

      {projections.length > 0 && (
        <Box>
          <Typography variant="h5" component="h2" gutterBottom>
            Savings Projections
          </Typography>
          <Card>
            <CardContent>
              <ProjectionChart projections={projections} pots={data.pots} />
            </CardContent>
          </Card>
        </Box>
      )}
    </Box>
  );
};

export default Dashboard;
