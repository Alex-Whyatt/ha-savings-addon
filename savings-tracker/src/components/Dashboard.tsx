import React from 'react';
import { SavingsData, SavingsProjection, User } from '../types';
import SavingsPotCard from './SavingsPotCard';
import ProjectionChart from './ProjectionChart';
import UpcomingSpends from './UpcomingSpends';
import RecurringExpenses from './RecurringExpenses';
import { Card, CardContent, Typography, Box, Chip, useMediaQuery, useTheme } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import SavingsIcon from '@mui/icons-material/Savings';
import { AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { format, addMonths, startOfMonth, endOfMonth, getDay, isSameMonth } from 'date-fns';
import { useAuth } from '../AuthContext';
import { seriesColors, cssVars } from '../theme';

const formatGBP = (value: number, decimals = 2) =>
  `£${value.toLocaleString('en-GB', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;

// Small stat tile used beside the hero card
interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon, children }) => (
  <Card sx={{ minWidth: 0 }}>
    <CardContent sx={{ p: { xs: 1.75, sm: 2.5 }, '&:last-child': { pb: { xs: 1.75, sm: 2.5 } } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, color: 'text.secondary', mb: 0.5 }}>
        {icon}
        <Typography sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, fontWeight: 500, lineHeight: 1.3 }}>
          {label}
        </Typography>
      </Box>
      <Typography component="div" sx={{ fontSize: { xs: '1.25rem', sm: '1.75rem' }, fontWeight: 700, lineHeight: 1.2 }}>
        {value}
      </Typography>
      {children}
    </CardContent>
  </Card>
);

interface SectionHeaderProps {
  title: string;
  action?: React.ReactNode;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ title, action }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
    <Typography variant="h6" component="h2" sx={{ fontSize: { xs: '1.0625rem', sm: '1.25rem' } }}>
      {title}
    </Typography>
    {action}
  </Box>
);

interface DashboardProps {
  data: SavingsData;
  projections: SavingsProjection[];
  onDataChange: () => void;
  currentUser: User;
}

const Dashboard: React.FC<DashboardProps> = ({ data, projections, onDataChange, currentUser }) => {
  const { otherUsers } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
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

  // Calculate next month's projected total from projections
  const potUserMap = new Map<string, string>();
  data.pots.forEach(pot => {
    potUserMap.set(pot.id, pot.userId);
  });

  // Get projected total for next month (index 1 in projections data)
  const nextMonthDate = addMonths(new Date(), 1);
  const nextMonthByUser = new Map<string, number>();
  let nextMonthTotal = 0;

  if (projections.length > 0 && projections[0]?.data?.length > 1) {
    projections.forEach(proj => {
      const nextMonthData = proj.data[1]; // Index 1 is next month
      if (nextMonthData) {
        const userId = potUserMap.get(proj.potId);
        if (userId) {
          nextMonthByUser.set(userId, (nextMonthByUser.get(userId) || 0) + nextMonthData.amount);
        }
        nextMonthTotal += nextMonthData.amount;
      }
    });
  }

  const allUsers = [currentUser, ...otherUsers];

  // Monthly recurring split by person
  const recurringByUser = new Map<string, number>();
  data.transactions.forEach(t => {
    let monthly = 0;
    if (t.repeatMonthly) monthly = t.amount;
    else if (t.repeatWeekly) monthly = t.amount * countWeekdayOccurrencesInMonth(getDay(t.date), now);
    if (monthly > 0) recurringByUser.set(t.userId, (recurringByUser.get(t.userId) || 0) + monthly);
  });

  // Paid in so far this month
  const savedThisMonth = data.transactions
    .filter(t => isSameMonth(t.date, now) && t.date <= now)
    .reduce((sum, t) => sum + t.amount, 0);

  // Combined projection line for the hero chart
  const projectionSeries: { label: string; amount: number }[] = [];
  if (projections.length > 0) {
    const length = Math.max(...projections.map(p => p.data.length));
    for (let i = 0; i < length; i++) {
      const amount = projections.reduce((sum, p) => sum + (p.data[i]?.amount ?? p.data[p.data.length - 1]?.amount ?? 0), 0);
      projectionSeries.push({ label: format(addMonths(now, i), 'MMM yy'), amount });
    }
  }
  const finalProjection = projectionSeries[projectionSeries.length - 1];

  // Annual growth from interest rates
  const annualGrowth = data.pots.reduce((sum, pot) => sum + (pot.interestRate ? pot.currentTotal * pot.interestRate / 100 : 0), 0);

  const userColor = (userId: string) => seriesColors[Math.max(0, allUsers.findIndex(u => u.id === userId)) % seriesColors.length];

  const renderPotGrid = (pots: typeof data.pots, emptyText: string) => (
    pots.length === 0 ? (
      <Card sx={{ borderStyle: 'dashed', bgcolor: 'transparent' }}>
        <CardContent>
          <Typography variant="body1" color="text.secondary" align="center">
            {emptyText}
          </Typography>
        </CardContent>
      </Card>
    ) : (
      <Box sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(3, minmax(0, 1fr))' },
        gap: { xs: 1.5, sm: 2 }
      }}>
        {pots.map(pot => (
          <SavingsPotCard
            key={pot.id}
            pot={pot}
            onUpdate={onDataChange}
            currentUser={currentUser}
          />
        ))}
      </Box>
    )
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 3, sm: 3.5 } }}>
      <Box sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 2fr) minmax(0, 1fr)' },
        gap: { xs: 1.5, sm: 2.5 }
      }}>
        {/* Hero: total and where it is heading */}
        <Card sx={{ display: 'flex', flexDirection: 'column' }}>
          <CardContent sx={{ p: { xs: 2.25, sm: 3 }, '&:last-child': { pb: { xs: 1.5, sm: 2.5 } }, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
            <Typography sx={{ color: 'text.secondary', fontWeight: 500, fontSize: { xs: '0.8125rem', sm: '0.875rem' } }}>
              {otherUsers.length > 0 ? 'Household savings' : 'Total savings'}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', columnGap: 1.5, rowGap: 0.5 }}>
              <Typography component="div" sx={{ fontSize: { xs: '2.125rem', sm: '2.75rem' }, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.15 }}>
                {formatGBP(totalSavings)}
              </Typography>
              {savedThisMonth > 0 && (
                <Chip
                  size="small"
                  label={`+${formatGBP(savedThisMonth, 0)} this month`}
                  sx={{ bgcolor: 'action.hover', color: 'primary.main' }}
                />
              )}
            </Box>
            {finalProjection && (
              <Typography sx={{ color: 'text.secondary', fontSize: { xs: '0.8125rem', sm: '0.875rem' }, mt: 0.5 }}>
                On course for{' '}
                <Box component="strong" sx={{ color: 'text.primary', fontWeight: 600 }}>{formatGBP(finalProjection.amount, 0)}</Box>
                {' '}by {format(addMonths(now, projectionSeries.length - 1), 'MMMM yyyy')}
              </Typography>
            )}
            {projectionSeries.length > 1 && (
              <Box sx={{ height: { xs: 96, sm: 170 }, flexGrow: { md: 1 }, mt: 2, mx: -1 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={projectionSeries} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
                    <defs>
                      <linearGradient id="heroFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={cssVars.primary} stopOpacity={0.22} />
                        <stop offset="100%" stopColor={cssVars.primary} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="label" hide={isMobile} tickLine={false} axisLine={false} interval={2} padding={{ left: 16, right: 16 }} tick={{ fontSize: 12, fill: cssVars.textSecondary }} />
                    <YAxis hide domain={['dataMin', 'dataMax']} />
                    <RechartsTooltip
                      formatter={(value: number) => [formatGBP(value, 0), 'Projected']}
                      contentStyle={{ borderRadius: 10, border: `1px solid ${cssVars.divider}`, background: cssVars.paper, color: cssVars.textPrimary }}
                    />
                    <Area type="monotone" dataKey="amount" stroke={cssVars.primary} strokeWidth={2.5} strokeDasharray="6 5" fill="url(#heroFill)" dot={false} activeDot={{ r: 5 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </Box>
            )}
          </CardContent>
        </Card>

        <Box sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: '1fr' },
          gap: { xs: 1.5, sm: 2.5 },
          alignContent: 'start'
        }}>
          <Box sx={{ gridColumn: { xs: '1 / -1', md: 'auto' } }}>
            <StatCard
              label="Saved automatically each month"
              value={formatGBP(totalRecurringMonthly)}
              icon={<AutorenewIcon sx={{ fontSize: 16 }} />}
            >
              {totalRecurringMonthly > 0 && (
                <>
                  <Box sx={{ display: 'flex', height: 8, borderRadius: 1, overflow: 'hidden', gap: '2px', mt: 1.25 }}>
                    {allUsers.map(u => {
                      const amount = recurringByUser.get(u.id) || 0;
                      return amount > 0 ? (
                        <Box key={u.id} sx={{ width: `${(amount / totalRecurringMonthly) * 100}%`, bgcolor: userColor(u.id) }} />
                      ) : null;
                    })}
                  </Box>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', columnGap: 2, rowGap: 0.5, mt: 1 }}>
                    {allUsers.map(u => (
                      <Box key={u.id} sx={{ display: 'flex', alignItems: 'center', gap: 0.75, fontSize: '0.8125rem', color: 'text.secondary' }}>
                        <Box sx={{ width: 8, height: 8, borderRadius: '2px', bgcolor: userColor(u.id) }} />
                        {u.name} {formatGBP(recurringByUser.get(u.id) || 0, 0)}
                      </Box>
                    ))}
                  </Box>
                </>
              )}
            </StatCard>
          </Box>
          <StatCard
            label={`Expected ${format(nextMonthDate, 'MMM yyyy')}`}
            value={formatGBP(nextMonthTotal)}
            icon={<TrendingUpIcon sx={{ fontSize: 16 }} />}
          >
            <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary', mt: 0.5 }}>
              {allUsers.map(u => `${u.name} ${formatGBP(nextMonthByUser.get(u.id) || 0, 0)}`).join(' · ')}
            </Typography>
          </StatCard>
          <StatCard
            label="Accounts"
            value={data.pots.length}
            icon={<SavingsIcon sx={{ fontSize: 16 }} />}
          >
            {annualGrowth > 0 && (
              <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary', mt: 0.5 }}>
                ≈ {formatGBP(annualGrowth, 0)} a year in growth
              </Typography>
            )}
          </StatCard>
        </Box>
      </Box>

      <Box>
        <SectionHeader title="Your Accounts" />
        {renderPotGrid(currentUserPots, 'No accounts yet. Add your first account to get started!')}
      </Box>

      {otherUsers.map(otherUser => (
        <Box key={otherUser.id}>
          <SectionHeader title={`${otherUser.name}'s Accounts`} />
          {renderPotGrid(data.pots.filter(pot => pot.userId === otherUser.id), 'No accounts yet.')}
        </Box>
      ))}

      {projections.length > 0 && (
        <Box>
          <SectionHeader title="Savings Projections" />
          <Card>
            <CardContent>
              <ProjectionChart projections={projections} pots={data.pots} />
            </CardContent>
          </Card>
        </Box>
      )}

      <Box>
        <SectionHeader title="Shared Expenses" />
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
          gap: { xs: 1.5, sm: 2.5 }
        }}>
          <UpcomingSpends currentUser={currentUser} />
          <RecurringExpenses currentUser={currentUser} />
        </Box>
      </Box>
    </Box>
  );
};

export default Dashboard;
