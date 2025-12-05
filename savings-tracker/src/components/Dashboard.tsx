import React from 'react';
import { SavingsData, SavingsProjection, User } from '../types';
import SavingsPotCard from './SavingsPotCard';
import ProjectionChart from './ProjectionChart';
import { Card, CardContent, Typography, Box } from '@mui/material';

interface DashboardProps {
  data: SavingsData;
  projections: SavingsProjection[];
  onDataChange: () => void;
  currentUser: User;
}

const Dashboard: React.FC<DashboardProps> = ({ data, projections, onDataChange, currentUser }) => {
  console.log("Dashboard received data:", data);
  console.log("Current user:", currentUser);

  const totalSavings = data.pots.reduce((sum, pot) => sum + pot.currentTotal, 0);
  const thisMonthSavings = data.transactions
    .filter(t => {
      const now = new Date();
      return t.date.getMonth() === now.getMonth() &&
             t.date.getFullYear() === now.getFullYear();
    })
    .reduce((sum, t) => sum + t.amount, 0);

  // Separate pots by user
  const currentUserPots = data.pots.filter(pot => pot.userId === currentUser.id);
  const otherUserId = currentUser.id === 'alex' ? 'beth' : 'alex';
  const otherUserName = otherUserId === 'alex' ? 'Alex' : 'Beth';
  const otherUserPots = data.pots.filter(pot => pot.userId === otherUserId);

  console.log("Current user pots:", currentUserPots);
  console.log("Other user pots:", otherUserPots);
  console.log("Other user ID:", otherUserId);

  return (
    <Box>

      <Box sx={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 3,
        mb: 4
      }}>
        <Card sx={{ minWidth: 200, flex: 1 }}>
          <CardContent>
            <Typography color="text.secondary" gutterBottom>
              Total Savings
            </Typography>
            <Typography variant="h4" component="div">
              £{totalSavings.toFixed(2)}
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ minWidth: 200, flex: 1 }}>
          <CardContent>
            <Typography color="text.secondary" gutterBottom>
              Active Accounts
            </Typography>
            <Typography variant="h4" component="div">
              {data.pots.length}
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ minWidth: 200, flex: 1 }}>
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
