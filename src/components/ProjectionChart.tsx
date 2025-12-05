import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { SavingsProjection } from '../types';
import { format } from 'date-fns';

interface ProjectionChartProps {
  projections: SavingsProjection[];
}

const ProjectionChart: React.FC<ProjectionChartProps> = ({ projections }) => {
  // Combine all projections into chart data
  const chartData = projections[0]?.data.map((point, index) => {
    const dataPoint: any = {
      date: format(point.date, 'MMM yyyy'),
      fullDate: point.date,
      total: 0
    };

    projections.forEach(proj => {
      const potData = proj.data[index];
      if (potData) {
        dataPoint.total += potData.amount;
      }
    });

    return dataPoint;
  }) || [];

  return (
    <div className="projection-chart">
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip
            formatter={(value: number) => [`£${value.toFixed(2)}`, '']}
            labelFormatter={(label) => label}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="total"
            name="Total Combined Savings"
            stroke="#667eea"
            strokeWidth={3}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ProjectionChart;
