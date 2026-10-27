import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, TooltipProps } from 'recharts';
import { SavingsProjection, SavingsPot } from '../types';
import { format, isAfter, startOfDay } from 'date-fns';
import { Box, Typography, useTheme, useMediaQuery } from '@mui/material';
import { useAuth } from '../AuthContext';
import { seriesColors, cssVars } from '../theme';

interface ProjectionChartProps {
  projections: SavingsProjection[];
  pots: SavingsPot[];
}

interface ChartDataPoint {
  date: string;
  fullDate: Date;
  byUser: Record<string, number>;
  total: number;
  isProjected: boolean;
}

const formatGBP = (value: number) =>
  `£${value.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface CustomTooltipProps extends TooltipProps<number, string> {
  userNames: Record<string, string>;
  userColor: (userId: string) => string;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label, userNames, userColor }) => {
  if (active && payload && payload.length > 0) {
    const data = payload[0].payload as ChartDataPoint;

    return (
      <Box sx={{
        bgcolor: 'background.paper',
        color: 'text.primary',
        p: 1.5,
        border: 1,
        borderColor: 'divider',
        borderRadius: 2.5,
        boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
        fontSize: '0.875rem',
        minWidth: 180
      }}>
        <Box sx={{ fontWeight: 700, mb: 1 }}>
          {label}{' '}
          {data.isProjected && <Box component="span" sx={{ color: 'text.secondary', fontWeight: 500 }}>· projected</Box>}
        </Box>
        {Object.keys(data.byUser).map(userId => (
          <Box key={userId} sx={{ display: 'flex', alignItems: 'center', gap: 1, my: 0.5 }}>
            <Box sx={{ width: 8, height: 8, borderRadius: '2px', bgcolor: userColor(userId) }} />
            <Box sx={{ flexGrow: 1, color: 'text.secondary' }}>{userNames[userId] || userId}</Box>
            <Box sx={{ fontWeight: 600 }}>{formatGBP(data.byUser[userId] || 0)}</Box>
          </Box>
        ))}
        <Box sx={{ display: 'flex', mt: 1, pt: 1, borderTop: 1, borderColor: 'divider', fontWeight: 700 }}>
          <Box sx={{ flexGrow: 1 }}>Total</Box>
          {formatGBP(data.total)}
        </Box>
      </Box>
    );
  }
  return null;
};

const ProjectionChart: React.FC<ProjectionChartProps> = ({ projections, pots }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { allUsers } = useAuth();

  // Create maps for quick lookup
  const potUserMap = new Map<string, string>();
  pots.forEach(pot => {
    potUserMap.set(pot.id, pot.userId);
  });

  const userNames: Record<string, string> = {};
  allUsers.forEach(user => {
    userNames[user.id] = user.name;
  });

  // Get unique user IDs from pots
  const userIds = [...new Set(pots.map(pot => pot.userId))];

  const currentDate = startOfDay(new Date());

  // Combine all projections into chart data with per-user breakdown
  const chartData: ChartDataPoint[] = projections[0]?.data.map((point, index) => {
    const byUser: Record<string, number> = {};
    
    // Initialize all users to 0
    userIds.forEach(userId => {
      byUser[userId] = 0;
    });

    projections.forEach(proj => {
      const potData = proj.data[index];
      if (potData) {
        const userId = potUserMap.get(proj.potId);
        if (userId) {
          byUser[userId] = (byUser[userId] || 0) + potData.amount;
        }
      }
    });

    const total = Object.values(byUser).reduce((sum, val) => sum + val, 0);
    const isProjected = isAfter(startOfDay(point.date), currentDate);

    return {
      date: format(point.date, 'MMM yyyy'),
      fullDate: point.date,
      byUser,
      total,
      isProjected
    };
  }) || [];

  // Calculate insights from the data
  const currentTotal = chartData[0]?.total || 0;
  const projectedIn12Months = chartData[chartData.length - 1]?.total || 0;
  
  // Calculate monthly contribution by looking at the change between two consecutive 
  // fully-projected months (this gives the true recurring monthly amount)
  const projectedMonths = chartData.filter(d => d.isProjected);
  let monthlyContribution = 0;
  const monthlyContributionByUser: Record<string, number> = {};
  userIds.forEach(userId => {
    monthlyContributionByUser[userId] = 0;
  });
  
  if (projectedMonths.length >= 2) {
    // Use the change between month 2 and month 3 of projections (both are full months)
    // This avoids the partial-month issue in the first projected month
    const idx = Math.min(2, projectedMonths.length - 1);
    const prevIdx = idx - 1;
    monthlyContribution = projectedMonths[idx].total - projectedMonths[prevIdx].total;
    userIds.forEach(userId => {
      monthlyContributionByUser[userId] = 
        (projectedMonths[idx].byUser[userId] || 0) - (projectedMonths[prevIdx].byUser[userId] || 0);
    });
  } else if (projectedMonths.length === 1 && chartData.length >= 2) {
    // Fallback: use difference from current to first projected
    monthlyContribution = projectedMonths[0].total - currentTotal;
    userIds.forEach(userId => {
      monthlyContributionByUser[userId] = 
        (projectedMonths[0].byUser[userId] || 0) - (chartData[0]?.byUser[userId] || 0);
    });
  }

  const formatCurrency = (value: number) => {
    if (value >= 1000) {
      return `£${(value / 1000).toFixed(1)}k`;
    }
    return `£${value.toFixed(0)}`;
  };

  // Calculate yearly growth
  const yearlyGrowth = projectedIn12Months - currentTotal;
  const yearlyGrowthPercent = currentTotal > 0 
    ? ((yearlyGrowth / currentTotal) * 100).toFixed(1)
    : '0';

  const userColor = (userId: string) => {
    const index = allUsers.findIndex(u => u.id === userId);
    return seriesColors[(index >= 0 ? index : userIds.indexOf(userId)) % seriesColors.length];
  };

  const chartHeight = isMobile ? 220 : 320;

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', columnGap: 4, rowGap: 1.5, mb: 2 }}>
        <Box>
          <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary', fontWeight: 500 }}>12-month growth</Typography>
          <Typography sx={{ fontSize: '1.25rem', fontWeight: 700 }}>
            +{formatCurrency(yearlyGrowth)}{' '}
            <Box component="span" sx={{ fontSize: '0.875rem', color: 'primary.main', fontWeight: 600 }}>+{yearlyGrowthPercent}%</Box>
          </Typography>
        </Box>
        <Box>
          <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary', fontWeight: 500 }}>Saving per month</Typography>
          <Typography sx={{ fontSize: '1.25rem', fontWeight: 700 }}>{formatCurrency(monthlyContribution)}</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, ml: { sm: 'auto' }, flexWrap: 'wrap' }}>
          {userIds.map(userId => (
            <Box key={userId} sx={{ display: 'flex', alignItems: 'center', gap: 0.75, fontSize: '0.8125rem', color: 'text.secondary' }}>
              <Box sx={{ width: 10, height: 10, borderRadius: '3px', bgcolor: userColor(userId) }} />
              {userNames[userId] || userId}
            </Box>
          ))}
        </Box>
      </Box>

      <Box sx={{ width: '100%', mx: { xs: -1, sm: 0 } }}>
        <ResponsiveContainer width="100%" height={chartHeight}>
          <AreaChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke={cssVars.divider} />
            <XAxis
              dataKey="date"
              tickFormatter={(value: string) => value.replace(/ (\d{2})(\d{2})$/, ' ’$2')}
              tick={{ fontSize: 12, fill: cssVars.textSecondary }}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              interval={isMobile ? 3 : 1}
              padding={{ left: 8, right: 24 }}
            />
            <YAxis
              tickFormatter={(value) => `£${(value / 1000).toFixed(0)}k`}
              tick={{ fontSize: 12, fill: cssVars.textSecondary }}
              tickLine={false}
              axisLine={false}
              width={44}
            />
            <Tooltip
              content={<CustomTooltip userNames={userNames} userColor={userColor} />}
              cursor={{ stroke: cssVars.divider, strokeWidth: 1 }}
            />
            {userIds.map(userId => (
              <Area
                key={userId}
                type="monotone"
                dataKey={(d: ChartDataPoint) => d.byUser[userId] || 0}
                name={userNames[userId] || userId}
                stackId="savings"
                stroke={userColor(userId)}
                strokeWidth={2}
                fill={userColor(userId)}
                fillOpacity={0.18}
                activeDot={{ r: 4 }}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </Box>

      {chartData.length > 0 && (
        <Box sx={{ mt: 2.5 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
            Month by month
          </Typography>
          <Box sx={{
            display: 'flex',
            gap: 1,
            overflowX: 'auto',
            pb: 1,
            mx: { xs: -2.5, sm: 0 },
            px: { xs: 2.5, sm: 0 },
            scrollSnapType: 'x mandatory'
          }}>
            {chartData.map((point, index) => {
              const prevTotal = index > 0 ? chartData[index - 1].total : point.total;
              const monthlyChange = point.total - prevTotal;

              return (
                <Box
                  key={point.date}
                  sx={{
                    flex: '0 0 auto',
                    minWidth: 84,
                    scrollSnapAlign: 'start',
                    p: 1.25,
                    borderRadius: 2,
                    border: '1px dashed',
                    borderColor: 'divider',
                    ...(!point.isProjected && { borderStyle: 'solid', bgcolor: 'action.hover' })
                  }}
                >
                  <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', fontWeight: 500 }}>
                    {format(point.fullDate, 'MMM yy')}
                  </Typography>
                  <Typography sx={{ fontSize: '0.9375rem', fontWeight: 700 }}>
                    £{(point.total / 1000).toFixed(1)}k
                  </Typography>
                  <Typography sx={{ fontSize: '0.75rem', color: 'primary.main', fontWeight: 600, minHeight: '1.2em' }}>
                    {index > 0 && monthlyChange > 0 ? `+£${monthlyChange.toFixed(0)}` : ''}
                  </Typography>
                </Box>
              );
            })}
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default ProjectionChart;
