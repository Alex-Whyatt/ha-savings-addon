import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SavingsIcon from '@mui/icons-material/Savings';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import SubdirectoryArrowRightIcon from '@mui/icons-material/SubdirectoryArrowRight';
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
  const [streamParentId, setStreamParentId] = useState<string | null>(null);

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

  const handleOpenStreamDialog = (stream?: BudgetStream, defaultParentId?: string | null) => {
    if (stream) {
      setEditingStream(stream);
      setStreamName(stream.name);
      setStreamAmount(stream.amount.toString());
      setStreamColor(stream.color);
      setStreamParentId(stream.parentId);
    } else {
      setEditingStream(null);
      setStreamName('');
      setStreamAmount('');
      // Pick next unused color
      const usedColors = budget?.streams.map(s => s.color) || [];
      const nextColor = STREAM_COLORS.find(c => !usedColors.includes(c)) || STREAM_COLORS[0];
      setStreamColor(nextColor);
      setStreamParentId(defaultParentId ?? null);
    }
    setStreamDialogOpen(true);
  };

  const handleCloseStreamDialog = () => {
    setStreamDialogOpen(false);
    setEditingStream(null);
    setStreamName('');
    setStreamAmount('');
    setStreamParentId(null);
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
          parentId: streamParentId,
        });
      } else {
        await createBudgetStream({
          name: streamName,
          amount,
          color: streamColor,
          isAutoSavings: false,
          sortOrder: (budget?.streams.length || 0) + 1,
          parentId: streamParentId,
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

  // Build hierarchical structure from flat stream list
  const buildStreamTree = useMemo(() => {
    const streamMap = new Map<string, BudgetStream & { children: BudgetStream[] }>();
    const rootStreams: (BudgetStream & { children: BudgetStream[] })[] = [];
    
    // First pass: create map with children arrays
    userStreams.forEach(stream => {
      streamMap.set(stream.id, { ...stream, children: [] });
    });
    
    // Second pass: build tree
    userStreams.forEach(stream => {
      const streamWithChildren = streamMap.get(stream.id)!;
      if (stream.parentId && streamMap.has(stream.parentId)) {
        streamMap.get(stream.parentId)!.children.push(streamWithChildren);
      } else {
        rootStreams.push(streamWithChildren);
      }
    });
    
    return { streamMap, rootStreams };
  }, [userStreams]);

  // Calculate only root-level stream amounts for top-level allocation
  // Child streams are part of their parent's allocation
  const getRootStreamTotal = (stream: BudgetStream & { children: BudgetStream[] }): number => {
    // If stream has children, its value flows to children
    // If stream has no children, it's a leaf and keeps its amount
    return stream.amount;
  };

  const rootStreamsTotal = buildStreamTree.rootStreams.reduce((sum, s) => sum + getRootStreamTotal(s), 0);
  const totalAllocated = rootStreamsTotal + totalRecurringMonthly;
  const netSalaryValue = budget?.netSalary || 0;
  const unallocated = netSalaryValue - totalAllocated;

  // Build Nivo Sankey data with hierarchical streams
  // Nivo uses { nodes: [{id}], links: [{source, target, value}] }
  const buildSankeyData = () => {
    if (!budget || netSalaryValue === 0) return null;
    
    const hasSavings = savingsBreakdown.length > 0 && totalRecurringMonthly > 0;
    const { rootStreams, streamMap } = buildStreamTree;
    const hasUserStreams = rootStreams.length > 0;
    
    if (!hasSavings && !hasUserStreams && unallocated <= 0) return null;
    
    const nodes: { id: string; nodeColor: string }[] = [];
    const links: { source: string; target: string; value: number }[] = [];
    const colorMap: Record<string, string> = {};
    const addedNodeIds = new Set<string>();
    
    // Helper to get unique node ID (in case of name collisions)
    const getNodeId = (stream: BudgetStream) => `stream-${stream.id}`;
    
    // Node: Net Salary (source)
    nodes.push({ id: 'Net Salary', nodeColor: NODE_COLORS['net-salary'] });
    colorMap['Net Salary'] = NODE_COLORS['net-salary'];
    addedNodeIds.add('Net Salary');
    
    // If we have savings, create intermediate "Savings" node and individual pots
    if (hasSavings) {
      nodes.push({ id: 'Savings', nodeColor: NODE_COLORS['savings'] });
      colorMap['Savings'] = NODE_COLORS['savings'];
      addedNodeIds.add('Savings');
      
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
        addedNodeIds.add(potId);
        
        // Link Savings -> Individual Pot
        links.push({
          source: 'Savings',
          target: potId,
          value: saving.totalMonthly,
        });
      });
    }
    
    // Recursively add streams and their children
    const addStreamNode = (stream: BudgetStream & { children: BudgetStream[] }, parentNodeId: string) => {
      if (stream.amount <= 0) return;
      
      const nodeId = getNodeId(stream);
      const color = stream.color || STREAM_COLORS[0];
      
      // Add node
      nodes.push({ id: nodeId, nodeColor: color });
      colorMap[nodeId] = color;
      addedNodeIds.add(nodeId);
      
      // Link parent -> this stream
      links.push({
        source: parentNodeId,
        target: nodeId,
        value: stream.amount,
      });
      
      // If this stream has children, add them
      if (stream.children.length > 0) {
        const childrenTotal = stream.children.reduce((sum, c) => sum + c.amount, 0);
        
        stream.children.forEach(child => {
          const childWithChildren = streamMap.get(child.id);
          if (childWithChildren && childWithChildren.amount > 0) {
            addStreamNode(childWithChildren, nodeId);
          }
        });
        
        // If children don't account for all of parent's amount, add "Other" node
        const remainder = stream.amount - childrenTotal;
        if (remainder > 0.01) {
          const otherNodeId = `${nodeId}-other`;
          nodes.push({ id: otherNodeId, nodeColor: '#94a3b8' });
          colorMap[otherNodeId] = '#94a3b8';
          links.push({
            source: nodeId,
            target: otherNodeId,
            value: remainder,
          });
        }
      }
    };
    
    // Add root-level user streams (connected to Net Salary)
    rootStreams.forEach(stream => {
      addStreamNode(stream, 'Net Salary');
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
    
    // Create label map for display
    const labelMap: Record<string, string> = { 'Net Salary': 'Net Salary', 'Savings': 'Savings', 'Unallocated': 'Unallocated' };
    userStreams.forEach(s => {
      labelMap[getNodeId(s)] = s.name;
    });
    // Handle "other" nodes
    userStreams.forEach(s => {
      labelMap[`${getNodeId(s)}-other`] = 'Other';
    });
    savingsBreakdown.forEach(s => {
      labelMap[s.potName] = s.potName;
    });
    
    return { nodes, links, colorMap, labelMap };
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
      
      // Build order for hierarchical streams using DFS
      let orderIdx = 100;
      const assignOrder = (streams: typeof buildStreamTree.rootStreams) => {
        streams.forEach(stream => {
          order[`stream-${stream.id}`] = orderIdx++;
          order[`stream-${stream.id}-other`] = orderIdx++;
          if (stream.children.length > 0) {
            const childrenWithChildren = stream.children.map(c => buildStreamTree.streamMap.get(c.id)!).filter(Boolean);
            assignOrder(childrenWithChildren);
          }
        });
      };
      assignOrder(buildStreamTree.rootStreams);
      
      // Unallocated at the end
      order['Unallocated'] = 1000;
      
      const orderA = order[a.id] ?? 500;
      const orderB = order[b.id] ?? 500;
      
      return orderA - orderB;
    };
  };

  // Get node label from labelMap
  const getNodeLabel = (nodeId: string) => {
    return sankeyData?.labelMap?.[nodeId] || nodeId;
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
            <Box sx={{ height: Math.max(450, userStreams.length * 40 + 200), width: '100%' }}>
              <ResponsiveSankey
                data={sankeyData}
                margin={{ top: 20, right: 200, bottom: 20, left: 20 }}
                align="justify"
                colors={(node) => sankeyData.colorMap[node.id] || '#888'}
                nodeOpacity={1}
                nodeHoverOthersOpacity={0.35}
                nodeThickness={24}
                nodeSpacing={18}
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
                label={(node) => getNodeLabel(node.id)}
                nodeTooltip={({ node }) => (
                  <Box sx={{ 
                    bgcolor: 'white', 
                    p: 1.5, 
                    borderRadius: 1, 
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    border: '1px solid #e5e7eb'
                  }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#374151' }}>
                      {getNodeLabel(node.id)}
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
                      {getNodeLabel(link.source.id)} → {getNodeLabel(link.target.id)}
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
            <Typography variant="h6">Budget Allocations</Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenStreamDialog()}
              size="small"
            >
              Add Stream
            </Button>
          </Box>
          
          <List sx={{ py: 0 }}>
            {/* Render streams hierarchically */}
            {(() => {
              const renderStream = (stream: BudgetStream & { children: BudgetStream[] }, depth: number = 0) => {
                const childrenWithChildren = stream.children.map(c => buildStreamTree.streamMap.get(c.id)!).filter(Boolean);
                const hasChildren = childrenWithChildren.length > 0;
                
                return (
                  <React.Fragment key={stream.id}>
                    <ListItem
                      sx={{
                        bgcolor: depth === 0 ? 'grey.50' : 'grey.100',
                        borderRadius: 1,
                        mb: 0.5,
                        ml: depth * 3,
                        border: '1px solid',
                        borderColor: depth === 0 ? 'grey.200' : 'grey.300',
                        py: 1,
                      }}
                    >
                      {depth > 0 && (
                        <SubdirectoryArrowRightIcon 
                          sx={{ 
                            color: 'grey.400', 
                            mr: 1, 
                            fontSize: 18,
                          }} 
                        />
                      )}
                      <Box
                        sx={{
                          width: 14,
                          height: 14,
                          borderRadius: '50%',
                          bgcolor: stream.color,
                          mr: 1.5,
                          flexShrink: 0,
                        }}
                      />
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {stream.name}
                            </Typography>
                            {hasChildren && (
                              <Typography variant="caption" color="text.secondary">
                                ({childrenWithChildren.length} sub-item{childrenWithChildren.length !== 1 ? 's' : ''})
                              </Typography>
                            )}
                          </Box>
                        }
                        secondary={`£${stream.amount.toLocaleString('en-GB', { minimumFractionDigits: 2 })} / month`}
                        primaryTypographyProps={{ variant: 'body2' }}
                        secondaryTypographyProps={{ variant: 'caption' }}
                      />
                      <ListItemSecondaryAction>
                        <IconButton
                          size="small"
                          onClick={() => handleOpenStreamDialog(undefined, stream.id)}
                          sx={{ mr: 0.5 }}
                          title="Add child stream"
                        >
                          <AddIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleOpenStreamDialog(stream)}
                          sx={{ mr: 0.5 }}
                          title="Edit stream"
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteStream(stream.id)}
                          color="error"
                          title="Delete stream"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                    {/* Render children */}
                    {childrenWithChildren.map(child => renderStream(child, depth + 1))}
                  </React.Fragment>
                );
              };
              
              return buildStreamTree.rootStreams.map(stream => renderStream(stream, 0));
            })()}
            
            {userStreams.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                Add streams for things like joint account contributions, personal spending, etc.
                <br />
                <Typography component="span" variant="caption" color="text.secondary">
                  Tip: Create parent streams and add child items for detailed breakdowns!
                </Typography>
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
              placeholder="e.g., Joint Account, Personal Spending, Xbox Subscription"
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
            <FormControl fullWidth>
              <InputLabel>Parent Stream (optional)</InputLabel>
              <Select
                value={streamParentId || ''}
                onChange={(e) => setStreamParentId(e.target.value || null)}
                label="Parent Stream (optional)"
              >
                <MenuItem value="">
                  <em>None (root level)</em>
                </MenuItem>
                {userStreams
                  .filter(s => s.id !== editingStream?.id) // Can't be parent of itself
                  .filter(s => {
                    // Prevent selecting descendants as parent (would create cycle)
                    if (!editingStream) return true;
                    let current = s;
                    while (current.parentId) {
                      if (current.parentId === editingStream.id) return false;
                      current = userStreams.find(us => us.id === current.parentId) || current;
                      if (!current.parentId) break;
                    }
                    return true;
                  })
                  .map(s => {
                    // Build path to show hierarchy
                    const getPath = (stream: BudgetStream): string => {
                      if (!stream.parentId) return stream.name;
                      const parent = userStreams.find(us => us.id === stream.parentId);
                      return parent ? `${getPath(parent)} → ${stream.name}` : stream.name;
                    };
                    return (
                      <MenuItem key={s.id} value={s.id}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box
                            sx={{
                              width: 12,
                              height: 12,
                              borderRadius: '50%',
                              bgcolor: s.color,
                              flexShrink: 0,
                            }}
                          />
                          {getPath(s)}
                        </Box>
                      </MenuItem>
                    );
                  })}
              </Select>
            </FormControl>
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
