import { useState, useMemo } from 'react';
import Dashboard from './components/Dashboard';
import Calendar from './components/Calendar';
import SavingsPots from './components/SavingsPots';
import BudgetSankey, { SavingsBreakdown } from './components/BudgetSankey';
import Login from './components/Login';
import { AuthProvider, useAuth } from './AuthContext';
import { useSavingsData } from './hooks/useSavingsData';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  ThemeProvider,
  CssBaseline,
  BottomNavigation,
  BottomNavigationAction,
  ButtonBase,
  Paper,
  IconButton,
  Avatar,
  Tooltip,
  useMediaQuery
} from '@mui/material';
import InsightsIcon from '@mui/icons-material/Insights';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import SavingsIcon from '@mui/icons-material/Savings';
import DonutLargeIcon from '@mui/icons-material/DonutLarge';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import LogoutIcon from '@mui/icons-material/Logout';
import { theme } from './theme';
import { startOfMonth, endOfMonth, getDay } from 'date-fns';

type ViewType = 'dashboard' | 'calendar' | 'pots' | 'budget';

const AppContent: React.FC = () => {
  const { user, logout, otherUsers } = useAuth();
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const { data, combinedData, projections, refreshData } = useSavingsData(user?.id || null, otherUsers);
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Calculate total recurring monthly and breakdown by pot for the budget sankey
  // Use current user's data only (not combined) since this represents their salary allocation
  // This must be before the early return to follow Rules of Hooks
  const { totalRecurringMonthly, savingsBreakdown } = useMemo(() => {
    const countWeekdayOccurrencesInMonth = (targetDay: number, month: Date): number => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      let count = 0;
      const current = new Date(monthStart);
      
      while (getDay(current) !== targetDay && current <= monthEnd) {
        current.setDate(current.getDate() + 1);
      }
      
      while (current <= monthEnd) {
        count++;
        current.setDate(current.getDate() + 7);
      }
      
      return count;
    };

    const now = new Date();
    
    // Build a map of pot contributions
    const potMap = new Map<string, {
      potId: string;
      potName: string;
      potColor: string;
      monthlyAmount: number;
      weeklyAmount: number;
      totalMonthly: number;
      isWeekly: boolean;
      isMonthly: boolean;
    }>();

    // Get pot info from current user's pots only
    data.pots.forEach(pot => {
      potMap.set(pot.id, {
        potId: pot.id,
        potName: pot.name,
        potColor: pot.color,
        monthlyAmount: 0,
        weeklyAmount: 0,
        totalMonthly: 0,
        isWeekly: false,
        isMonthly: false,
      });
    });

    // Calculate monthly recurring by pot (current user only)
    data.transactions
      .filter(t => t.repeatMonthly)
      .forEach(t => {
        const pot = potMap.get(t.potId);
        if (pot) {
          pot.monthlyAmount += t.amount;
          pot.totalMonthly += t.amount;
          pot.isMonthly = true;
        }
      });

    // Calculate weekly recurring by pot (with monthly equivalent, current user only)
    data.transactions
      .filter(t => t.repeatWeekly)
      .forEach(t => {
        const pot = potMap.get(t.potId);
        if (pot) {
          const dayOfWeek = getDay(t.date);
          const occurrences = countWeekdayOccurrencesInMonth(dayOfWeek, now);
          const monthlyEquivalent = t.amount * occurrences;
          pot.weeklyAmount += t.amount;
          pot.totalMonthly += monthlyEquivalent;
          pot.isWeekly = true;
        }
      });

    // Filter to only pots with recurring transactions and convert to array
    const breakdown: SavingsBreakdown[] = Array.from(potMap.values())
      .filter(pot => pot.totalMonthly > 0)
      .sort((a, b) => b.totalMonthly - a.totalMonthly);

    const total = breakdown.reduce((sum, pot) => sum + pot.totalMonthly, 0);
    
    return { totalRecurringMonthly: total, savingsBreakdown: breakdown };
  }, [data.transactions, data.pots]);

  if (!user) {
    return <Login />;
  }

  const navItems: { key: ViewType; label: string; icon: React.ReactNode }[] = [
    { key: 'dashboard', label: 'Overview', icon: <InsightsIcon /> },
    { key: 'calendar', label: 'Calendar', icon: <CalendarMonthIcon /> },
    { key: 'pots', label: 'Accounts', icon: <SavingsIcon /> },
    { key: 'budget', label: 'Budget', icon: <DonutLargeIcon /> }
  ];
  const currentLabel = navItems.find(item => item.key === currentView)?.label ?? 'Overview';

  return (
    <Box sx={{
      minHeight: '100vh',
      bgcolor: 'background.default',
      width: '100%',
      overflowX: 'hidden',
      pb: isMobile ? 'calc(80px + env(safe-area-inset-bottom))' : 0
    }}>
      <AppBar
        position="sticky"
        elevation={0}
        color="inherit"
        sx={{
          bgcolor: 'background.paper',
          borderBottom: 1,
          borderColor: 'divider'
        }}
      >
        <Toolbar sx={{ minHeight: { xs: 56, sm: 64 }, px: { xs: 2, sm: 3 }, gap: { xs: 1.5, sm: 4 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
            <Box sx={{
              width: 32,
              height: 32,
              borderRadius: '9px',
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <TrendingUpIcon sx={{ fontSize: 20 }} />
            </Box>
            <Typography component="div" sx={{ fontWeight: 700, fontSize: '1.125rem' }}>
              {isMobile ? currentLabel : 'Savings'}
            </Typography>
          </Box>

          {!isMobile && (
            <Box component="nav" aria-label="Sections" sx={{ display: 'flex', alignSelf: 'stretch', gap: 0.5 }}>
              {navItems.map(item => {
                const selected = currentView === item.key;
                return (
                  <ButtonBase
                    key={item.key}
                    onClick={() => setCurrentView(item.key)}
                    aria-current={selected ? 'page' : undefined}
                    sx={{
                      px: 1.75,
                      fontSize: '0.9375rem',
                      fontWeight: selected ? 600 : 500,
                      color: selected ? 'text.primary' : 'text.secondary',
                      borderBottom: 2,
                      borderColor: selected ? 'primary.main' : 'transparent',
                      '&:hover': { color: 'text.primary' }
                    }}
                  >
                    {item.label}
                  </ButtonBase>
                );
              })}
            </Box>
          )}

          <Box sx={{ flexGrow: 1 }} />

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {!isMobile && (
              <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                {user.name}
              </Typography>
            )}
            <Avatar sx={{ width: 34, height: 34, fontSize: '0.875rem', fontWeight: 700, bgcolor: 'action.hover', color: 'primary.main' }}>
              {user.name.charAt(0).toUpperCase()}
            </Avatar>
            <Tooltip title="Switch user">
              <IconButton onClick={logout} aria-label="Switch user" sx={{ color: 'text.secondary' }}>
                <LogoutIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Toolbar>
      </AppBar>

      <Box component="main" sx={{
        pt: { xs: 2, sm: 3.5 },
        pb: { xs: 2, sm: 5 },
        px: { xs: 2, sm: 3, md: 4 },
        maxWidth: 1360,
        mx: 'auto',
        width: '100%',
        minWidth: 0,
        boxSizing: 'border-box'
      }}>
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
        {currentView === 'budget' && (
          <BudgetSankey
            totalRecurringMonthly={totalRecurringMonthly}
            savingsBreakdown={savingsBreakdown}
            onDataChange={refreshData}
          />
        )}
      </Box>

      {isMobile && (
        <Paper
          component="nav"
          aria-label="Sections"
          elevation={0}
          sx={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            borderTop: 1,
            borderColor: 'divider',
            borderRadius: 0,
            pb: 'env(safe-area-inset-bottom)',
            zIndex: 1100
          }}
        >
          <BottomNavigation
            value={currentView}
            onChange={(_, newValue) => setCurrentView(newValue)}
            showLabels
            sx={{
              height: 72,
              bgcolor: 'transparent',
              '& .MuiBottomNavigationAction-root': {
                minWidth: 0,
                px: 0.5,
                gap: 0.5,
                color: 'text.secondary'
              },
              '& .MuiBottomNavigationAction-label': {
                fontSize: '0.75rem',
                fontWeight: 500,
                '&.Mui-selected': { fontSize: '0.75rem', fontWeight: 600, color: 'text.primary' }
              },
              '& .nav-pill': {
                width: 56,
                height: 30,
                borderRadius: 15,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background-color 0.2s'
              },
              '& .Mui-selected .nav-pill': {
                bgcolor: 'action.hover',
                color: 'primary.main'
              }
            }}
          >
            {navItems.map(item => (
              <BottomNavigationAction
                key={item.key}
                label={item.label}
                value={item.key}
                icon={<Box className="nav-pill">{item.icon}</Box>}
              />
            ))}
          </BottomNavigation>
        </Paper>
      )}
    </Box>
  );
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
