import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip
} from '@mui/material';
import {
  Add,
  Delete,
  Edit,
  Circle
} from '@mui/icons-material';
import { ExpenseCategory, User } from '../types';
import {
  fetchExpenseCategories,
  createExpenseCategory,
  updateExpenseCategory,
  deleteExpenseCategory
} from '../api';
import { useAuth } from '../AuthContext';

interface ExpenseCategoriesProps {
  currentUser: User;
}

// Predefined colors for categories
const CATEGORY_COLORS = [
  '#ef5350', // Red
  '#ec407a', // Pink
  '#ab47bc', // Purple
  '#7e57c2', // Deep Purple
  '#5c6bc0', // Indigo
  '#42a5f5', // Blue
  '#29b6f6', // Light Blue
  '#26c6da', // Cyan
  '#26a69a', // Teal
  '#66bb6a', // Green
  '#9ccc65', // Light Green
  '#ffca28', // Amber
  '#ffa726', // Orange
  '#8d6e63', // Brown
  '#78909c', // Blue Grey
];

const ExpenseCategories: React.FC<ExpenseCategoriesProps> = ({ currentUser }) => {
  const { allUsers } = useAuth();
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<ExpenseCategory | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    color: CATEGORY_COLORS[0]
  });

  const loadCategories = async () => {
    setIsLoading(true);
    const data = await fetchExpenseCategories();
    setCategories(data);
    setIsLoading(false);
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleOpenDialog = (category?: ExpenseCategory) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        color: category.color
      });
    } else {
      setEditingCategory(null);
      // Pick a random color that's not already used
      const usedColors = new Set(categories.map(c => c.color));
      const availableColors = CATEGORY_COLORS.filter(c => !usedColors.has(c));
      const newColor = availableColors.length > 0 
        ? availableColors[Math.floor(Math.random() * availableColors.length)]
        : CATEGORY_COLORS[Math.floor(Math.random() * CATEGORY_COLORS.length)];
      setFormData({ name: '', color: newColor });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingCategory(null);
    setFormData({ name: '', color: CATEGORY_COLORS[0] });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      return;
    }

    if (editingCategory) {
      await updateExpenseCategory(editingCategory.id, {
        name: formData.name.trim(),
        color: formData.color
      });
    } else {
      await createExpenseCategory({
        name: formData.name.trim(),
        color: formData.color
      });
    }

    handleCloseDialog();
    loadCategories();
  };

  const handleDeleteClick = (category: ExpenseCategory) => {
    setCategoryToDelete(category);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (categoryToDelete) {
      await deleteExpenseCategory(categoryToDelete.id);
      setDeleteConfirmOpen(false);
      setCategoryToDelete(null);
      loadCategories();
    }
  };

  const getUserName = (userId: string): string => {
    const user = allUsers.find(u => u.id === userId);
    return user?.name || userId;
  };

  // Get user color based on their position in allUsers
  const getUserColor = (userId: string): string => {
    const colors = ['#667eea', '#e91e63', '#4caf50', '#ff9800', '#9c27b0', '#00bcd4'];
    const index = allUsers.findIndex(u => u.id === userId);
    return colors[index >= 0 ? index % colors.length : 0];
  };

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" component="h3">
            🏷️ Expense Categories
          </Typography>
          <Button
            variant="outlined"
            size="small"
            startIcon={<Add />}
            onClick={() => handleOpenDialog()}
          >
            Add Category
          </Button>
        </Box>

        {isLoading ? (
          <Typography color="text.secondary" align="center" sx={{ py: 2 }}>
            Loading...
          </Typography>
        ) : categories.length === 0 ? (
          <Typography color="text.secondary" align="center" sx={{ py: 2 }}>
            No categories yet. Add one to organize your recurring expenses!
          </Typography>
        ) : (
          <List dense>
            {categories.map((category) => {
              const isOwner = category.userId === currentUser.id;
              const userColor = getUserColor(category.userId);
              
              return (
                <ListItem
                  key={category.id}
                  sx={{
                    bgcolor: 'grey.50',
                    borderRadius: 1,
                    mb: 0.5,
                    pr: isOwner ? 12 : 2
                  }}
                >
                  <Box
                    sx={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      bgcolor: category.color,
                      mr: 2,
                      flexShrink: 0
                    }}
                  />
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          {category.name}
                        </Typography>
                        <Chip
                          label={getUserName(category.userId)}
                          size="small"
                          sx={{
                            height: 20,
                            fontSize: '0.65rem',
                            bgcolor: `${userColor}20`,
                            color: userColor
                          }}
                        />
                      </Box>
                    }
                  />
                  {isOwner && (
                    <ListItemSecondaryAction>
                      <IconButton
                        size="small"
                        onClick={() => handleOpenDialog(category)}
                        sx={{ mr: 0.5 }}
                      >
                        <Edit fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteClick(category)}
                        color="error"
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </ListItemSecondaryAction>
                  )}
                </ListItem>
              );
            })}
          </List>
        )}

        {/* Add/Edit Dialog */}
        <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="xs" fullWidth>
          <form onSubmit={handleSubmit}>
            <DialogTitle>
              {editingCategory ? 'Edit Category' : 'Add Category'}
            </DialogTitle>
            <DialogContent>
              <TextField
                autoFocus
                fullWidth
                label="Category Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Bills, Subscriptions, Groceries"
                required
                sx={{ mb: 3, mt: 1 }}
              />
              
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                Color
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {CATEGORY_COLORS.map((color) => (
                  <IconButton
                    key={color}
                    onClick={() => setFormData({ ...formData, color })}
                    sx={{
                      width: 36,
                      height: 36,
                      bgcolor: color,
                      border: formData.color === color ? '3px solid' : '2px solid transparent',
                      borderColor: formData.color === color ? 'primary.main' : 'transparent',
                      '&:hover': {
                        bgcolor: color,
                        opacity: 0.8
                      }
                    }}
                  >
                    {formData.color === color && (
                      <Circle sx={{ color: 'white', fontSize: 12 }} />
                    )}
                  </IconButton>
                ))}
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseDialog}>Cancel</Button>
              <Button type="submit" variant="contained">
                {editingCategory ? 'Save' : 'Add'}
              </Button>
            </DialogActions>
          </form>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
          <DialogTitle>Delete Category?</DialogTitle>
          <DialogContent>
            {categoryToDelete && (
              <Typography>
                Are you sure you want to delete "{categoryToDelete.name}"? 
                Any expenses using this category will become uncategorized.
              </Typography>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
            <Button onClick={handleConfirmDelete} color="error" variant="contained">
              Delete
            </Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default ExpenseCategories;
