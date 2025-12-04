import React from 'react';
import { SavingsData, SavingsProjection } from '../types';
import SavingsPotCard from './SavingsPotCard';
import ProjectionChart from './ProjectionChart';
import { Card, CardContent, Typography, Box } from '@mui/material';

interface DashboardProps {
  data: SavingsData;
  projections: SavingsProjection[];
  onDataChange: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ data, projections, onDataChange }) => {
  const totalSavings = data.pots.reduce((sum, pot) => sum + pot.currentTotal, 0);
  const thisMonthSavings = data.transactions
    .filter(t => {
      const now = new Date();
      return t.date.getMonth() === now.getMonth() &&
             t.date.getFullYear() === now.getFullYear();
    })
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Dashboard
      </Typography>
      <Typography variant="body1" color="text.secondary" gutterBottom>
        Overview of your savings progress
      </Typography>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 4 }}>
        <Box sx={{ flex: '1 1 250px' }}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Total Savings
              </Typography>
              <Typography variant="h4" component="div">
                £{totalSavings.toFixed(2)}
              </Typography>
            </CardContent>
          </Card>
        </Box>
        <Box sx={{ flex: '1 1 250px' }}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Active Pots
              </Typography>
              <Typography variant="h4" component="div">
                {data.pots.length}
              </Typography>
            </CardContent>
          </Card>
        </Box>
        <Box sx={{ flex: '1 1 250px' }}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                This Month
              </Typography>
              <Typography variant="h4" component="div">
                £{thisMonthSavings.toFixed(2)}
              </Typography>
            </CardContent>
          </Card>
        </Box>
      </Box>

      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" component="h2" gutterBottom>
          Your Savings Pots
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          {data.pots.length === 0 ? (
            <Box sx={{ width: '100%' }}>
              <Card>
                <CardContent>
                  <Typography variant="body1" color="text.secondary" align="center">
                    No savings pots yet. Create your first pot to get started!
                  </Typography>
                </CardContent>
              </Card>
            </Box>
          ) : (
            data.pots.map(pot => (
              <Box key={pot.id} sx={{ flex: '1 1 300px' }}>
                <SavingsPotCard
                  pot={pot}
                  onUpdate={onDataChange}
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
              <ProjectionChart projections={projections} />
            </CardContent>
          </Card>
        </Box>
      )}
    </Box>
  );
};

export default Dashboard;
