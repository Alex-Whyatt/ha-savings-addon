import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  InputAdornment,
  Alert,
  CircularProgress,
  Collapse,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SavingsIcon from '@mui/icons-material/Savings';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { ResponsiveSankey } from '@nivo/sankey';
import {
  fetchBudget,
  updateBudget,
  createBudgetStream,
  updateBudgetStream,
  deleteBudgetStream,
  BudgetWithStreams,
} from '../api';
import { BudgetStream } from '../types';

// Savings breakdown by pot
export interface SavingsBreakdown {
  potId: string;
  potName: string;
  potColor: string;
  monthlyAmount: number;
  weeklyAmount: number;
  totalMonthly: number;
  isWeekly: boolean;
  isMonthly: boolean;
}

interface BudgetSankeyProps {
  totalRecurringMonthly: number;
  savingsBreakdown: SavingsBreakdown[];
  onDataChange?: () => void;
}

// Softer pastel color palette
const STREAM_COLORS = [
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#f59e0b', // Amber
  '#10b981', // Emerald
  '#3b82f6', // Blue
  '#ef4444', // Red
  '#06b6d4', // Cyan
  '#84cc16', // Lime
  '#f97316', // Orange
  '#6366f1', // Indigo
];

// Fixed colors for specific node types
const NODE_COLORS: Record<string, string> = {
  'net-salary': '#6366f1',    // Indigo
  'savings': '#10b981',        // Emerald
  'unallocated': '#94a3b8',    // Slate
};

const BudgetSankey: React.FC<BudgetSankeyProps> = ({
  totalRecurringMonthly,
  savingsBreakdown,
  onDataChange,
}) => {
  const [budget, setBudget] = useState<BudgetWithStreams | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSavingsBreakdown, setShowSavingsBreakdown] = useState(false);
  
  // Form states
  const [netSalary, setNetSalary] = useState<string>('');
  const [editingSalary, setEditingSalary] = useState(false);
  
  // Stream dialog states
  const [streamDialogOpen, setStreamDialogOpen] = useState(false);
  const [editingStream, setEditingStream] = useState<BudgetStream | null>(null);
  const [streamName, setStreamName] = useState('');
  const [streamAmount, setStreamAmount] = useState('');
  const [streamColor, setStreamColor] = useState(STREAM_COLORS[0]);

  const loadBudget = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchBudget();
      setBudget(data);
      if (data) {
        setNetSalary(data.netSalary.toString());
      }
    } catch (err) {
      setError('Failed to load budget data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBudget();
  }, [loadBudget]);

  // Filter out any auto-savings streams (we use savingsBreakdown now)
  const userStreams = budget?.streams.filter(s => !s.isAutoSavings) || [];

  const handleSaveSalary = async () => {
    const salary = parseFloat(netSalary);
    if (isNaN(salary) || salary < 0) {
      setError('Please enter a valid salary');
      return;
    }
    
    setSaving(true);
    try {
      await updateBudget(salary);
      await loadBudget();
      setEditingSalary(false);
      onDataChange?.();
    } catch (err) {
      setError('Failed to save salary');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenStreamDialog = (stream?: BudgetStream) => {
    if (stream) {
      setEditingStream(stream);
      setStreamName(stream.name);
      setStreamAmount(stream.amount.toString());
      setStreamColor(stream.color);
    } else {
      setEditingStream(null);
      setStreamName('');
      setStreamAmount('');
      // Pick next unused color
      const usedColors = budget?.streams.map(s => s.color) || [];
      const nextColor = STREAM_COLORS.find(c => !usedColors.includes(c)) || STREAM_COLORS[0];
      setStreamColor(nextColor);
    }
    setStreamDialogOpen(true);
  };

  const handleCloseStreamDialog = () => {
    setStreamDialogOpen(false);
    setEditingStream(null);
    setStreamName('');
    setStreamAmount('');
  };

  const handleSaveStream = async () => {
    const amount = parseFloat(streamAmount);
    if (!streamName.trim() || isNaN(amount) || amount < 0) {
      setError('Please enter valid stream details');
      return;
    }
    
    setSaving(true);
    try {
      if (editingStream) {
        await updateBudgetStream(editingStream.id, {
          name: streamName,
          amount,
          color: streamColor,
        });
      } else {
        await createBudgetStream({
          name: streamName,
          amount,
          color: streamColor,
          isAutoSavings: false,
          sortOrder: (budget?.streams.length || 0) + 1,
        });
      }
      await loadBudget();
      handleCloseStreamDialog();
      onDataChange?.();
    } catch (err) {
      setError('Failed to save stream');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteStream = async (streamId: string) => {
    if (!confirm('Are you sure you want to delete this budget stream?')) return;
    
    setSaving(true);
    try {
      await deleteBudgetStream(streamId);
      await loadBudget();
      onDataChange?.();
    } catch (err) {
      setError('Failed to delete stream');
    } finally {
      setSaving(false);
    }
  };

  // Calculate totals and unallocated
  const userStreamsTotal = userStreams.reduce((sum, s) => sum + s.amount, 0);
  const totalAllocated = userStreamsTotal + totalRecurringMonthly;
  const netSalaryValue = budget?.netSalary || 0;
  const unallocated = netSalaryValue - totalAllocated;

  // Build Nivo Sankey data
  // Nivo uses { nodes: [{id}], links: [{source, target, value}] }
  const buildSankeyData = () => {
    if (!budget || netSalaryValue === 0) return null;
    
    const hasSavings = savingsBreakdown.length > 0 && totalRecurringMonthly > 0;
    const activeUserStreams = userStreams.filter(s => s.amount > 0);
    const hasUserStreams = activeUserStreams.length > 0;
    
    if (!hasSavings && !hasUserStreams && unallocated <= 0) return null;
    
    const nodes: { id: string; nodeColor: string }[] = [];
    const links: { source: string; target: string; value: number }[] = [];
    
    // Build color map for nodes
    const colorMap: Record<string, string> = {};
    
    // Node: Net Salary (source)
    nodes.push({ id: 'Net Salary', nodeColor: NODE_COLORS['net-salary'] });
    colorMap['Net Salary'] = NODE_COLORS['net-salary'];
    
    // If we have savings, create intermediate "Savings" node and individual pots
    if (hasSavings) {
      nodes.push({ id: 'Savings', nodeColor: NODE_COLORS['savings'] });
      colorMap['Savings'] = NODE_COLORS['savings'];
      
      // Link Salary -> Savings
      links.push({
        source: 'Net Salary',
        target: 'Savings',
        value: totalRecurringMonthly,
      });
      
      // Add individual savings pots
      savingsBreakdown.forEach((saving, idx) => {
        const potId = saving.potName;
        const color = saving.potColor || STREAM_COLORS[idx % STREAM_COLORS.length];
        nodes.push({ id: potId, nodeColor: color });
        colorMap[potId] = color;
        
        // Link Savings -> Individual Pot
        links.push({
          source: 'Savings',
          target: potId,
          value: saving.totalMonthly,
        });
      });
    }
    
    // Add user-defined streams (directly from Salary)
    activeUserStreams.forEach((stream, idx) => {
      const streamId = stream.name;
      const color = stream.color || STREAM_COLORS[(savingsBreakdown.length + idx) % STREAM_COLORS.length];
      nodes.push({ id: streamId, nodeColor: color });
      colorMap[streamId] = color;
      
      // Link Salary -> User Stream
      links.push({
        source: 'Net Salary',
        target: streamId,
        value: stream.amount,
      });
    });
    
    // Add unallocated if positive
    if (unallocated > 0) {
      nodes.push({ id: 'Unallocated', nodeColor: NODE_COLORS['unallocated'] });
      colorMap['Unallocated'] = NODE_COLORS['unallocated'];
      
      links.push({
        source: 'Net Salary',
        target: 'Unallocated',
        value: unallocated,
      });
    }
    
    return { nodes, links, colorMap };
  };

  const sankeyData = buildSankeyData();

  // Custom node ordering to control vertical position
  // We want: Savings flow at top, user streams in middle, unallocated at bottom
  const getNodeSort = () => {
    return (a: { id: string }, b: { id: string }) => {
      const order: Record<string, number> = {
        'Net Salary': 0,
        'Savings': 1,
      };
      
      // Savings pots get order 2-99
      savingsBreakdown.forEach((s, idx) => {
        order[s.potName] = 2 + idx;
      });
      
      // User streams get order 100-199
      userStreams.forEach((s, idx) => {
        order[s.name] = 100 + idx;
      });
      
      // Unallocated at the end
      order['Unallocated'] = 200;
      
      const orderA = order[a.id] ?? 150;
      const orderB = order[b.id] ?? 150;
      
      return orderA - orderB;
    };
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      
      {/* Net Salary Input */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <AccountBalanceIcon sx={{ color: 'primary.main', fontSize: 32 }} />
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Monthly Net Salary
              </Typography>
              {editingSalary ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                  <TextField
                    size="small"
                    type="number"
                    value={netSalary}
                    onChange={(e) => setNetSalary(e.target.value)}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">£</InputAdornment>,
                    }}
                    sx={{ width: 200 }}
                    autoFocus
                  />
                  <Button 
                    variant="contained" 
                    size="small" 
                    onClick={handleSaveSalary}
                    disabled={saving}
                  >
                    Save
                  </Button>
                  <Button 
                    size="small" 
                    onClick={() => {
                      setNetSalary(budget?.netSalary.toString() || '');
                      setEditingSalary(false);
                    }}
                  >
                    Cancel
                  </Button>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="h5" sx={{ fontWeight: 600 }}>
                    £{netSalaryValue.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                  </Typography>
                  <IconButton size="small" onClick={() => setEditingSalary(true)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Box>
              )}
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Sankey Diagram */}
      {sankeyData && sankeyData.links.length > 0 ? (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Salary Allocation Flow
            </Typography>
            <Box sx={{ height: 450, width: '100%' }}>
              <ResponsiveSankey
                data={sankeyData}
                margin={{ top: 20, right: 200, bottom: 20, left: 20 }}
                align="justify"
                colors={(node) => sankeyData.colorMap[node.id] || '#888'}
                nodeOpacity={1}
                nodeHoverOthersOpacity={0.35}
                nodeThickness={24}
                nodeSpacing={24}
                nodeBorderWidth={0}
                nodeBorderRadius={3}
                linkOpacity={0.4}
                linkHoverOthersOpacity={0.1}
                linkContract={3}
                enableLinkGradient={true}
                labelPosition="outside"
                labelOrientation="horizontal"
                labelPadding={16}
                labelTextColor={{ from: 'color', modifiers: [['darker', 1]] }}
                sort={getNodeSort()}
                nodeTooltip={({ node }) => (
                  <Box sx={{ 
                    bgcolor: 'white', 
                    p: 1.5, 
                    borderRadius: 1, 
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    border: '1px solid #e5e7eb'
                  }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#374151' }}>
                      {node.id}
                    </Typography>
                    <Typography variant="body2" sx={{ color: node.color, fontWeight: 600, mt: 0.5 }}>
                      £{node.value.toLocaleString()}
                    </Typography>
                  </Box>
                )}
                linkTooltip={({ link }) => (
                  <Box sx={{ 
                    bgcolor: 'white', 
                    p: 1.5, 
                    borderRadius: 1, 
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    border: '1px solid #e5e7eb'
                  }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#374151' }}>
                      {link.source.id} → {link.target.id}
                    </Typography>
                    <Typography variant="body2" sx={{ color: link.target.color, fontWeight: 600, mt: 0.5 }}>
                      £{link.value.toLocaleString()}
                    </Typography>
                  </Box>
                )}
              />
            </Box>
          </CardContent>
        </Card>
      ) : (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
              {netSalaryValue === 0 
                ? 'Enter your net salary above to see the allocation flow'
                : 'Add budget streams or savings to visualize your salary allocation'
              }
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* Budget Summary */}
      <Box sx={{ 
        display: 'grid', 
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, 
        gap: 2, 
        mb: 3 
      }}>
        <Card>
          <CardContent sx={{ textAlign: 'center' }}>
            <Typography variant="subtitle2" color="text.secondary">Total Allocated</Typography>
            <Typography variant="h5" sx={{ fontWeight: 600, color: 'primary.main' }}>
              £{totalAllocated.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent sx={{ textAlign: 'center' }}>
            <Typography variant="subtitle2" color="text.secondary">Unallocated</Typography>
            <Typography 
              variant="h5" 
              sx={{ 
                fontWeight: 600, 
                color: unallocated < 0 ? 'error.main' : unallocated === 0 ? 'success.main' : 'warning.main' 
              }}
            >
              £{unallocated.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent sx={{ textAlign: 'center' }}>
            <Typography variant="subtitle2" color="text.secondary">% Allocated</Typography>
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              {netSalaryValue > 0 ? Math.round((totalAllocated / netSalaryValue) * 100) : 0}%
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Savings Breakdown Card */}
      {savingsBreakdown.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box 
              sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                cursor: 'pointer',
              }}
              onClick={() => setShowSavingsBreakdown(!showSavingsBreakdown)}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <SavingsIcon sx={{ color: 'success.main' }} />
                <Box>
                  <Typography variant="h6">
                    Monthly Savings
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    £{totalRecurringMonthly.toLocaleString('en-GB', { minimumFractionDigits: 2 })} total across {savingsBreakdown.length} account{savingsBreakdown.length !== 1 ? 's' : ''}
                  </Typography>
                </Box>
              </Box>
              <IconButton size="small">
                {showSavingsBreakdown ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
            </Box>
            
            <Collapse in={showSavingsBreakdown}>
              <List sx={{ mt: 2 }}>
                {savingsBreakdown.map((saving) => (
                  <ListItem
                    key={saving.potId}
                    sx={{
                      bgcolor: 'grey.50',
                      borderRadius: 1,
                      mb: 1,
                      border: '1px solid',
                      borderColor: 'grey.200',
                    }}
                  >
                    <Box
                      sx={{
                        width: 16,
                        height: 16,
                        borderRadius: '50%',
                        bgcolor: saving.potColor,
                        mr: 2,
                        flexShrink: 0,
                      }}
                    />
                    <ListItemText
                      primary={saving.potName}
                      secondary={
                        <Box component="span">
                          <Typography component="span" variant="body2" sx={{ fontWeight: 600 }}>
                            £{saving.totalMonthly.toLocaleString('en-GB', { minimumFractionDigits: 2 })}/month
                          </Typography>
                          {' '}
                          <Typography component="span" variant="body2" color="text.secondary">
                            {saving.isMonthly && saving.isWeekly 
                              ? `(£${saving.monthlyAmount.toFixed(0)} monthly + £${saving.weeklyAmount.toFixed(0)}/week)`
                              : saving.isWeekly 
                                ? `(£${saving.weeklyAmount.toFixed(0)}/week × ~4.3)`
                                : '(monthly)'
                            }
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </Collapse>
          </CardContent>
        </Card>
      )}

      {/* Other Budget Streams */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Other Allocations</Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenStreamDialog()}
              size="small"
            >
              Add Stream
            </Button>
          </Box>
          
          <List>
            {userStreams.map((stream) => (
              <ListItem
                key={stream.id}
                sx={{
                  bgcolor: 'grey.50',
                  borderRadius: 1,
                  mb: 1,
                  border: '1px solid',
                  borderColor: 'grey.200',
                }}
              >
                <Box
                  sx={{
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    bgcolor: stream.color,
                    mr: 2,
                    flexShrink: 0,
                  }}
                />
                <ListItemText
                  primary={stream.name}
                  secondary={`£${stream.amount.toLocaleString('en-GB', { minimumFractionDigits: 2 })} / month`}
                />
                <ListItemSecondaryAction>
                  <IconButton
                    size="small"
                    onClick={() => handleOpenStreamDialog(stream)}
                    sx={{ mr: 1 }}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleDeleteStream(stream.id)}
                    color="error"
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
            
            {userStreams.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                Add streams for things like joint account contributions, personal spending, etc.
              </Typography>
            )}
          </List>
        </CardContent>
      </Card>

      {/* Add/Edit Stream Dialog */}
      <Dialog open={streamDialogOpen} onClose={handleCloseStreamDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingStream ? 'Edit Stream' : 'Add New Stream'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Stream Name"
              value={streamName}
              onChange={(e) => setStreamName(e.target.value)}
              fullWidth
              placeholder="e.g., Joint Account, Personal Spending"
            />
            <TextField
              label="Monthly Amount"
              type="number"
              value={streamAmount}
              onChange={(e) => setStreamAmount(e.target.value)}
              fullWidth
              InputProps={{
                startAdornment: <InputAdornment position="start">£</InputAdornment>,
              }}
            />
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Color</Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {STREAM_COLORS.map((color) => (
                  <Box
                    key={color}
                    onClick={() => setStreamColor(color)}
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      bgcolor: color,
                      cursor: 'pointer',
                      border: streamColor === color ? '3px solid' : '2px solid transparent',
                      borderColor: streamColor === color ? 'primary.main' : 'transparent',
                      transition: 'all 0.2s',
                      '&:hover': {
                        transform: 'scale(1.1)',
                      },
                    }}
                  />
                ))}
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseStreamDialog}>Cancel</Button>
          <Button onClick={handleSaveStream} variant="contained" disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BudgetSankey;
