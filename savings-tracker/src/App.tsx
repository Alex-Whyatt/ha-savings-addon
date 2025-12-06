import { useState } from 'react';
import Dashboard from './components/Dashboard';
import Calendar from './components/Calendar';
import SavingsPots from './components/SavingsPots';
import Login from './components/Login';
import { AuthProvider, useAuth } from './AuthContext';
import { useSavingsData } from './hooks/useSavingsData';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Box, 
  ThemeProvider, 
  createTheme,
  BottomNavigation,
  BottomNavigationAction,
  Paper,
  IconButton,
  useMediaQuery
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import SavingsIcon from '@mui/icons-material/Savings';
import LogoutIcon from '@mui/icons-material/Logout';

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
  const { user, logout, otherUsers } = useAuth();
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const { data, combinedData, projections, refreshData } = useSavingsData(user?.id || null, otherUsers);
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  if (!user) {
    return <Login />;
  }

  const getPageTitle = () => {
    switch (currentView) {
      case 'dashboard': return 'Dashboard';
      case 'calendar': return 'Calendar';
      case 'pots': return 'Accounts';
      default: return 'Dashboard';
    }
  };

  return (
    <Box sx={{
      flexGrow: 1,
      minHeight: '100vh',
      backgroundColor: '#f5f5f5',
      width: '100%',
      overflowX: 'hidden',
      overflowY: 'auto',
      pb: isMobile ? '80px' : 0 // Space for bottom nav on mobile
    }}>
      {/* Top AppBar */}
      <AppBar 
        position="fixed" 
        elevation={0}
        sx={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderBottom: '1px solid rgba(255,255,255,0.1)'
        }}
      >
        <Toolbar sx={{ 
          minHeight: { xs: 56, sm: 64 },
          px: { xs: 2, sm: 3 }
        }}>
          {/* Logo/Title */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SavingsIcon sx={{ fontSize: { xs: 24, sm: 28 } }} />
            <Typography
              variant="h6"
              component="div"
              sx={{ 
                fontWeight: 600,
                fontSize: { xs: '1rem', sm: '1.25rem' },
                letterSpacing: '-0.01em'
              }}
            >
              {isMobile ? user.name : `Savings Tracker`}
            </Typography>
          </Box>

          <Box sx={{ flexGrow: 1 }} />

          {/* Desktop Navigation */}
          {!isMobile && (
            <Box sx={{ 
              display: 'flex', 
              gap: 0.5,
              mr: 2
            }}>
              {[
                { key: 'dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
                { key: 'calendar', label: 'Calendar', icon: <CalendarMonthIcon /> },
                { key: 'pots', label: 'Accounts', icon: <SavingsIcon /> }
              ].map((item) => (
                <Box
                  key={item.key}
                  onClick={() => setCurrentView(item.key as ViewType)}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.75,
                    px: 2,
                    py: 1,
                    borderRadius: 2,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    backgroundColor: currentView === item.key 
                      ? 'rgba(255,255,255,0.2)' 
                      : 'transparent',
                    color: currentView === item.key 
                      ? '#fff' 
                      : 'rgba(255,255,255,0.7)',
                    '&:hover': {
                      backgroundColor: currentView === item.key 
                        ? 'rgba(255,255,255,0.25)' 
                        : 'rgba(255,255,255,0.1)',
                      color: '#fff'
                    },
                    fontWeight: currentView === item.key ? 600 : 400
                  }}
                >
                  {item.icon}
                  <Typography variant="body2" sx={{ fontWeight: 'inherit' }}>
                    {item.label}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}

          {/* User info & Logout */}
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: { xs: 1, sm: 2 },
            borderLeft: { sm: '1px solid rgba(255,255,255,0.2)' },
            pl: { sm: 2 }
          }}>
            {!isMobile && (
              <Typography 
                variant="body2" 
                sx={{ 
                  color: 'rgba(255,255,255,0.9)',
                  fontWeight: 500
                }}
              >
                {user.name}
              </Typography>
            )}
            <IconButton
              onClick={logout}
              size="small"
              sx={{
                color: 'rgba(255,255,255,0.8)',
                '&:hover': {
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  color: '#fff'
                }
              }}
            >
              <LogoutIcon fontSize="small" />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Main Content */}
      <Box sx={{
        pt: { xs: '72px', sm: '80px' }, // Account for fixed AppBar
        pb: { xs: 2, sm: 4 },
        px: { xs: 2, sm: 3, md: 4, lg: 6, xl: 8 },
        width: '100%',
        minWidth: 0,
        boxSizing: 'border-box'
      }}>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1.5,
          mb: { xs: 2, sm: 3 }
        }}>
          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: { xs: 40, sm: 48 },
            height: { xs: 40, sm: 48 },
            borderRadius: 2,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
          }}>
            {currentView === 'dashboard' && <DashboardIcon sx={{ fontSize: { xs: 22, sm: 26 } }} />}
            {currentView === 'calendar' && <CalendarMonthIcon sx={{ fontSize: { xs: 22, sm: 26 } }} />}
            {currentView === 'pots' && <SavingsIcon sx={{ fontSize: { xs: 22, sm: 26 } }} />}
          </Box>
          <Box>
            <Typography
              variant="h4"
              component="h1"
              sx={{
                fontSize: { xs: '1.25rem', sm: '1.5rem', md: '1.75rem' },
                fontWeight: 700,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                lineHeight: 1.2
              }}
            >
              {getPageTitle()}
            </Typography>
            <Typography 
              variant="body2" 
              sx={{ 
                color: 'text.secondary',
                display: { xs: 'none', sm: 'block' }
              }}
            >
              {currentView === 'dashboard' && 'Overview of your savings progress'}
              {currentView === 'calendar' && 'Track your monthly contributions'}
              {currentView === 'pots' && 'Manage your savings accounts'}
            </Typography>
          </Box>
        </Box>

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
            combinedData={combinedData}
            onDataChange={refreshData}
            currentUser={user}
          />
        )}
        {currentView === 'pots' && (
          <SavingsPots
            pots={data.pots}
            onDataChange={refreshData}
          />
        )}
      </Box>

      {/* Mobile Bottom Navigation */}
      {isMobile && (
        <Paper 
          sx={{ 
            position: 'fixed', 
            bottom: 0, 
            left: 0, 
            right: 0,
            borderTop: '1px solid rgba(0,0,0,0.08)',
            zIndex: 1100
          }} 
          elevation={8}
        >
          <BottomNavigation
            value={currentView}
            onChange={(_, newValue) => setCurrentView(newValue)}
            sx={{
              height: 64,
              '& .MuiBottomNavigationAction-root': {
                minWidth: 'auto',
                padding: '6px 12px',
                color: 'rgba(0,0,0,0.5)',
                '&.Mui-selected': {
                  color: '#667eea'
                }
              },
              '& .MuiBottomNavigationAction-label': {
                fontSize: '0.7rem',
                '&.Mui-selected': {
                  fontSize: '0.75rem',
                  fontWeight: 600
                }
              }
            }}
          >
            <BottomNavigationAction 
              label="Dashboard" 
              value="dashboard" 
              icon={<DashboardIcon />} 
            />
            <BottomNavigationAction 
              label="Calendar" 
              value="calendar" 
              icon={<CalendarMonthIcon />} 
            />
            <BottomNavigationAction 
              label="Accounts" 
              value="pots" 
              icon={<SavingsIcon />} 
            />
          </BottomNavigation>
        </Paper>
      )}
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
