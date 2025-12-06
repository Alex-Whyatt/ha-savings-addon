import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, TooltipProps } from 'recharts';
import { SavingsProjection, SavingsPot } from '../types';
import { format, isAfter, startOfDay } from 'date-fns';
import { Box, Typography, useTheme, useMediaQuery } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import SavingsIcon from '@mui/icons-material/Savings';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';

interface ProjectionChartProps {
  projections: SavingsProjection[];
  pots: SavingsPot[];
}

interface ChartDataPoint {
  date: string;
  fullDate: Date;
  alex: number;
  beth: number;
  total: number;
  isProjected: boolean;
}

const CustomTooltip: React.FC<TooltipProps<number, string>> = ({ active, payload, label }) => {
  if (active && payload && payload.length > 0) {
    const data = payload[0].payload as ChartDataPoint;
    
    return (
      <div style={{
        backgroundColor: 'white',
        padding: '12px 16px',
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
      }}>
        <p style={{ 
          margin: '0 0 8px 0', 
          fontWeight: 'bold',
          color: '#333',
          borderBottom: '1px solid #eee',
          paddingBottom: '8px'
        }}>
          {label} {data.isProjected && <span style={{ color: '#667eea', fontSize: '0.85em' }}>(Projected)</span>}
        </p>
        <p style={{ margin: '4px 0', color: '#2196f3' }}>
          Alex: £{data.alex.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
        <p style={{ margin: '4px 0', color: '#e91e63' }}>
          Beth: £{data.beth.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
        <p style={{ 
          margin: '8px 0 0 0', 
          fontWeight: 'bold',
          color: '#667eea',
          borderTop: '1px solid #eee',
          paddingTop: '8px'
        }}>
          Total: £{data.total.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
      </div>
    );
  }
  return null;
};

// Stat card component for the highlights
interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  sublabel?: string;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, sublabel, color }) => (
  <Box sx={{
    display: 'flex',
    alignItems: 'flex-start',
    gap: { xs: 1, sm: 2 },
    p: { xs: 1.5, sm: 2 },
    borderRadius: 2,
    backgroundColor: `${color}08`,
    border: `1px solid ${color}20`,
  }}>
    <Box sx={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: { xs: 32, sm: 44 },
      height: { xs: 32, sm: 44 },
      minWidth: { xs: 32, sm: 44 },
      borderRadius: 1.5,
      backgroundColor: `${color}15`,
      color: color,
      flexShrink: 0,
      mt: 0.25
    }}>
      {icon}
    </Box>
    <Box sx={{ minWidth: 0, flex: 1 }}>
      <Typography 
        variant="caption" 
        sx={{ 
          color: 'text.secondary',
          display: 'block',
          fontSize: { xs: '0.6rem', sm: '0.75rem' },
          lineHeight: 1.2
        }}
      >
        {label}
      </Typography>
      <Typography 
        variant="h6" 
        sx={{ 
          fontWeight: 700,
          color: color,
          fontSize: { xs: '0.9rem', sm: '1.25rem' },
          lineHeight: 1.2
        }}
      >
        {value}
      </Typography>
      {sublabel && (
        <Typography 
          variant="caption" 
          sx={{ 
            color: 'text.secondary',
            fontSize: { xs: '0.5rem', sm: '0.65rem' },
            lineHeight: 1.3,
            display: 'block',
            wordBreak: 'break-word'
          }}
        >
          {sublabel}
        </Typography>
      )}
    </Box>
  </Box>
);

const ProjectionChart: React.FC<ProjectionChartProps> = ({ projections, pots }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Create a map of potId to userId for quick lookup
  const potUserMap = new Map<string, string>();
  pots.forEach(pot => {
    potUserMap.set(pot.id, pot.userId);
  });

  const currentDate = startOfDay(new Date());

  // Combine all projections into chart data with per-user breakdown
  const chartData: ChartDataPoint[] = projections[0]?.data.map((point, index) => {
    let alexTotal = 0;
    let bethTotal = 0;

    projections.forEach(proj => {
      const potData = proj.data[index];
      if (potData) {
        const userId = potUserMap.get(proj.potId);
        if (userId === 'alex') {
          alexTotal += potData.amount;
        } else if (userId === 'beth') {
          bethTotal += potData.amount;
        }
      }
    });

    const isProjected = isAfter(startOfDay(point.date), currentDate);

    return {
      date: format(point.date, 'MMM yyyy'),
      fullDate: point.date,
      alex: alexTotal,
      beth: bethTotal,
      total: alexTotal + bethTotal,
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
  let alexMonthlyContribution = 0;
  let bethMonthlyContribution = 0;
  
  if (projectedMonths.length >= 2) {
    // Use the change between month 2 and month 3 of projections (both are full months)
    // This avoids the partial-month issue in the first projected month
    const idx = Math.min(2, projectedMonths.length - 1);
    const prevIdx = idx - 1;
    monthlyContribution = projectedMonths[idx].total - projectedMonths[prevIdx].total;
    alexMonthlyContribution = projectedMonths[idx].alex - projectedMonths[prevIdx].alex;
    bethMonthlyContribution = projectedMonths[idx].beth - projectedMonths[prevIdx].beth;
  } else if (projectedMonths.length === 1 && chartData.length >= 2) {
    // Fallback: use difference from current to first projected
    monthlyContribution = projectedMonths[0].total - currentTotal;
    alexMonthlyContribution = projectedMonths[0].alex - (chartData[0]?.alex || 0);
    bethMonthlyContribution = projectedMonths[0].beth - (chartData[0]?.beth || 0);
  }
  
  // Calculate yearly growth
  const yearlyGrowth = projectedIn12Months - currentTotal;
  const yearlyGrowthPercent = currentTotal > 0 
    ? ((yearlyGrowth / currentTotal) * 100).toFixed(1)
    : '0';

  const chartHeight = isMobile ? 280 : 400;
  const chartMargins = isMobile 
    ? { top: 10, right: 10, left: -10, bottom: 5 }
    : { top: 10, right: 30, left: 10, bottom: 5 };

  const formatCurrency = (value: number) => {
    if (value >= 1000) {
      return `£${(value / 1000).toFixed(1)}k`;
    }
    return `£${value.toFixed(0)}`;
  };

  return (
    <Box sx={{ width: '100%' }}>
      {/* Chart */}
      <Box sx={{ width: '100%', overflowX: 'hidden', mb: 3 }}>
        <ResponsiveContainer width="100%" height={chartHeight}>
          <LineChart data={chartData} margin={chartMargins}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: isMobile ? 10 : 12 }}
              tickMargin={8}
              interval={isMobile ? 2 : 1}
            />
            <YAxis 
              tickFormatter={(value) => `£${(value / 1000).toFixed(0)}k`}
              tick={{ fontSize: isMobile ? 10 : 12 }}
              width={isMobile ? 45 : 60}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              wrapperStyle={{ 
                fontSize: isMobile ? '12px' : '14px',
                paddingTop: '10px'
              }}
            />
            <Line
              type="monotone"
              dataKey="total"
              name="Total Combined Savings"
              stroke="#667eea"
              strokeWidth={isMobile ? 2 : 3}
              dot={(props: any) => {
                const { cx, cy, payload } = props;
                const dotRadius = isMobile ? 3 : 4;
                if (!payload.isProjected) {
                  return <circle key={`dot-${payload.date}`} cx={cx} cy={cy} r={dotRadius} fill="#667eea" stroke="#667eea" />;
                }
                return <circle key={`dot-${payload.date}`} cx={cx} cy={cy} r={dotRadius} fill="#667eea" stroke="#667eea" strokeDasharray="2 2" opacity={0.6} />;
              }}
              activeDot={{ r: isMobile ? 5 : 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </Box>

      {/* Insights Grid */}
      <Box sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: 'repeat(2, minmax(0, 1fr))',
          sm: 'repeat(4, minmax(0, 1fr))'
        },
        gap: { xs: 1, sm: 2 }
      }}>
        <StatCard
          icon={<SavingsIcon sx={{ fontSize: { xs: 20, sm: 24 } }} />}
          label="Current Total"
          value={formatCurrency(currentTotal)}
          color="#667eea"
        />
        <StatCard
          icon={<CalendarMonthIcon sx={{ fontSize: { xs: 20, sm: 24 } }} />}
          label="Monthly Savings"
          value={formatCurrency(monthlyContribution)}
          sublabel={`Alex: ${formatCurrency(alexMonthlyContribution)} · Beth: ${formatCurrency(bethMonthlyContribution)}`}
          color="#4facfe"
        />
        <StatCard
          icon={<TrendingUpIcon sx={{ fontSize: { xs: 20, sm: 24 } }} />}
          label="12-Month Growth"
          value={formatCurrency(yearlyGrowth)}
          sublabel={`+${yearlyGrowthPercent}%`}
          color="#43e97b"
        />
        <StatCard
          icon={<AccountBalanceIcon sx={{ fontSize: { xs: 20, sm: 24 } }} />}
          label="Projected Total"
          value={formatCurrency(projectedIn12Months)}
          sublabel={chartData[chartData.length - 1]?.date}
          color="#764ba2"
        />
      </Box>

      {/* Monthly Breakdown Table */}
      {!isMobile && chartData.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Typography 
            variant="subtitle2" 
            sx={{ 
              mb: 1.5, 
              color: 'text.secondary',
              fontWeight: 600 
            }}
          >
            Monthly Projection Breakdown
          </Typography>
          <Box sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(6, 1fr)',
            gap: 1,
            backgroundColor: '#f8f9fa',
            borderRadius: 2,
            p: 2
          }}>
            {chartData.slice(0, 12).map((point, index) => {
              const prevTotal = index > 0 ? chartData[index - 1].total : point.total;
              const monthlyChange = point.total - prevTotal;
              
              return (
                <Box 
                  key={point.date}
                  sx={{
                    textAlign: 'center',
                    p: 1,
                    borderRadius: 1,
                    backgroundColor: point.isProjected ? 'rgba(102, 126, 234, 0.08)' : 'white',
                    border: point.isProjected ? '1px dashed rgba(102, 126, 234, 0.3)' : '1px solid #e0e0e0'
                  }}
                >
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      display: 'block',
                      color: 'text.secondary',
                      fontSize: '0.65rem',
                      mb: 0.5
                    }}
                  >
                    {point.date}
                  </Typography>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      fontWeight: 600,
                      color: '#667eea',
                      fontSize: '0.8rem'
                    }}
                  >
                    £{(point.total / 1000).toFixed(1)}k
                  </Typography>
                  {index > 0 && monthlyChange > 0 && (
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        color: '#43e97b',
                        fontSize: '0.6rem'
                      }}
                    >
                      +£{monthlyChange.toFixed(0)}
                    </Typography>
                  )}
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
