import React, { useState } from 'react';
import { Button, Card, CardContent, Typography, Box, Alert, CircularProgress } from '@mui/material';
import { useAuth } from '../AuthContext';

const Login: React.FC = () => {
  const { login, allUsers, isLoading: isAuthLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (userId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      await login(userId);
    } catch (err) {
      setError('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f5f5f5',
        p: 2,
        boxSizing: 'border-box',
      }}
    >
      <Card sx={{ maxWidth: 400, width: '100%' }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom align="center">
            Savings Tracker
          </Typography>
          <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 4 }}>
            Choose your account to continue
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {isAuthLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                <CircularProgress />
              </Box>
            ) : allUsers.length === 0 ? (
              <Alert severity="warning">
                No users configured. Please add users in the add-on configuration.
              </Alert>
            ) : (
              allUsers.map(user => (
                <Button
                  key={user.id}
                  variant="contained"
                  size="large"
                  onClick={() => handleLogin(user.id)}
                  disabled={isLoading}
                  sx={{ py: 1.5 }}
                >
                  {isLoading ? 'Signing in...' : `Sign in as ${user.name}`}
                </Button>
              ))
            )}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Login;
