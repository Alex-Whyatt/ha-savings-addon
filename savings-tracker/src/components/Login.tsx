import React, { useState } from 'react';
import { Button, Card, CardContent, Typography, Box, Alert, CircularProgress } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
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
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        p: 2,
        boxSizing: 'border-box',
      }}
    >
      <Card sx={{ maxWidth: 400, width: '100%' }}>
        <CardContent sx={{ p: { xs: 3, sm: 4 }, '&:last-child': { pb: { xs: 3, sm: 4 } } }}>
          <Box sx={{
            width: 48,
            height: 48,
            borderRadius: '14px',
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mx: 'auto',
            mb: 2
          }}>
            <TrendingUpIcon />
          </Box>
          <Typography variant="h5" component="h1" gutterBottom align="center">
            Savings
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
                  sx={{ minHeight: 52 }}
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
