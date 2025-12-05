import { useState } from 'react';
import Dashboard from './components/Dashboard';
import Calendar from './components/Calendar';
import SavingsPots from './components/SavingsPots';
import Login from './components/Login';
import { AuthProvider, useAuth } from './AuthContext';
import { useSavingsData } from './hooks/useSavingsData';
import { AppBar, Toolbar, Typography, Button, Box, ThemeProvider, createTheme } from '@mui/material';

type ViewType = 'dashboard' | 'calendar' | 'pots';

const theme = createTheme({
  palette: {
    primary: {
      main: '#667eea',
    },
    secondary: {
      main: '#764ba2',
    },
  },
});

const AppContent: React.FC = () => {
  const { user, logout } = useAuth();
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const { data, combinedData, projections, refreshData } = useSavingsData(user?.id || null);

  if (!user) {
    return <Login />;
  }

  return (
    <Box sx={{
      flexGrow: 1,
      minHeight: '100vh',
      backgroundColor: '#f5f5f5',
      width: '100vw',
      maxWidth: '100vw',
      overflow: 'hidden'
    }}>
      <AppBar elevation={2}>
        <Toolbar sx={{ flexWrap: 'wrap', gap: 1 }}>
          <Typography
            variant="h6"
            component="div"
            sx={{ flexGrow: 1 }}
          >
            Savings Tracker - {user.name}
          </Typography>

          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button
              color={currentView === 'dashboard' ? 'secondary' : 'inherit'}
              onClick={() => setCurrentView('dashboard')}
              size="small"
            >
              Dashboard
            </Button>
            <Button
              color={currentView === 'calendar' ? 'secondary' : 'inherit'}
              onClick={() => setCurrentView('calendar')}
              size="small"
            >
              Calendar
            </Button>
            <Button
              color={currentView === 'pots' ? 'secondary' : 'inherit'}
              onClick={() => setCurrentView('pots')}
              size="small"
            >
              Pots
            </Button>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, ml: 'auto' }}>
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', lineHeight: 1 }}>
                {user.name}
              </Typography>

            </Box>
            <Button
              color="inherit"
              onClick={logout}
              size="small"
            >
              Logout
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

        <Box sx={{
          mt: 4,
          mb: 4,
          px: { xs: 2, sm: 3, md: 4, lg: 6, xl: 8 },
          width: '100%',
          minWidth: 0,
          boxSizing: 'border-box'
        }}>
          <Typography
            variant="h4"
            component="h2"
            gutterBottom
            sx={{
              fontSize: { xs: '1.5rem', sm: '2rem', md: '2.125rem' },
              textAlign: { xs: 'center', sm: 'left' }
            }}
          >
            Dashboard
          </Typography>

        {currentView === 'dashboard' && (
          <Dashboard
            data={combinedData}
            projections={projections}
            onDataChange={refreshData}
            currentUser={user}
          />
        )}
        {currentView === 'calendar' && (
          <Calendar
            data={data}
            onDataChange={refreshData}
          />
        )}
        {currentView === 'pots' && (
          <SavingsPots
            pots={data.pots}
            onDataChange={refreshData}
          />
        )}
        </Box>
    </Box>
  );
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
