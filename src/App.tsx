import { useState, useEffect } from 'react';
import { loadSavingsData } from './storage';
import { getTotalSavings, calculateAllProjections } from './projections';
import { SavingsData } from './types';
import Dashboard from './components/Dashboard';
import Calendar from './components/Calendar';
import SavingsPots from './components/SavingsPots';
import { AppBar, Toolbar, Typography, Button, Box, Container, ThemeProvider, createTheme } from '@mui/material';

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

function App() {
  const [data, setData] = useState<SavingsData>({ pots: [], transactions: [] });
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');

  useEffect(() => {
    const loadData = async () => {
      const savingsData = await loadSavingsData();
      setData(savingsData);
    };
    loadData();
  }, []);

  const refreshData = async () => {
    const savingsData = await loadSavingsData();
    setData(savingsData);
  };

  const totalSavings = getTotalSavings();
  const projections = calculateAllProjections();

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ flexGrow: 1, minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
        <AppBar position="static" elevation={2}>
          <Toolbar>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              Savings Tracker
            </Typography>
            <Button
              color={currentView === 'dashboard' ? 'secondary' : 'inherit'}
              onClick={() => setCurrentView('dashboard')}
            >
              Dashboard
            </Button>
            <Button
              color={currentView === 'calendar' ? 'secondary' : 'inherit'}
              onClick={() => setCurrentView('calendar')}
            >
              Calendar
            </Button>
            <Button
              color={currentView === 'pots' ? 'secondary' : 'inherit'}
              onClick={() => setCurrentView('pots')}
            >
              Savings Pots
            </Button>
            <Typography variant="h6" sx={{ ml: 2, color: 'white' }}>
              £{totalSavings.toFixed(2)}
            </Typography>
          </Toolbar>
        </AppBar>

        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
          {currentView === 'dashboard' && (
            <Dashboard
              data={data}
              projections={projections}
              onDataChange={refreshData}
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
        </Container>
      </Box>
    </ThemeProvider>
  );
}

export default App;
