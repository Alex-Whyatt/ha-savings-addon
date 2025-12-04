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
      fullDate: point.date
    };

    projections.forEach(proj => {
      const potData = proj.data[index];
      if (potData) {
        dataPoint[proj.potId] = potData.amount;
      }
    });

    return dataPoint;
  }) || [];

  const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1'];

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
          {projections.map((proj, index) => (
            <Line
              key={proj.potId}
              type="monotone"
              dataKey={proj.potId}
              stroke={colors[index % colors.length]}
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ProjectionChart;
