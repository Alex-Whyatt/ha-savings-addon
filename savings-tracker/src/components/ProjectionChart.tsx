import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, TooltipProps } from 'recharts';
import { SavingsProjection, SavingsPot } from '../types';
import { format, isAfter, startOfDay } from 'date-fns';

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

const ProjectionChart: React.FC<ProjectionChartProps> = ({ projections, pots }) => {
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

  // Responsive settings
  const isMobile = window.innerWidth < 600;
  const chartHeight = isMobile ? 280 : 400;
  const chartMargins = isMobile 
    ? { top: 10, right: 10, left: -10, bottom: 5 }
    : { top: 10, right: 30, left: 10, bottom: 5 };

  return (
    <div className="projection-chart" style={{ width: '100%', overflowX: 'hidden' }}>
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
    </div>
  );
};

export default ProjectionChart;
