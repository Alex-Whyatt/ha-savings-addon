import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  IconButton,
  InputAdornment,
  useMediaQuery,
  useTheme
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import RefreshIcon from '@mui/icons-material/Refresh';
import { format } from 'date-fns';
import { FundPrice, Holding, SavingsPot } from '../types';
import { refreshFundPrices, saveHoldings } from '../api';

interface FundsDialogProps {
  open: boolean;
  pot: SavingsPot;
  holdings: Holding[];
  canEdit: boolean;
  onClose: () => void;
  onSaved: () => void;
}

interface FundRow {
  name: string;
  identifier: string;
  allocation: string;
  expectedReturn: string;
  units: string;
}

const toRow = (h: Holding): FundRow => ({
  name: h.name,
  identifier: h.identifier || '',
  allocation: h.allocation != null ? String(h.allocation) : '',
  expectedReturn: h.expectedReturn != null ? String(h.expectedReturn) : '',
  units: h.units != null ? String(h.units) : ''
});

const emptyRow = (): FundRow => ({ name: '', identifier: '', allocation: '', expectedReturn: '', units: '' });

const formatChange = (value: number | null) =>
  value == null ? null : `${value >= 0 ? '+' : '−'}${Math.abs(value).toFixed(1)}%`;

// One line on how a fund has done, from its looked-up prices
const FundPerformance: React.FC<{ price?: FundPrice | null }> = ({ price }) => {
  if (!price) return null;
  if (price.price == null) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8125rem' }}>
        Couldn't find a price for this fund. Check the ISIN or try its ticker.
      </Typography>
    );
  }
  const parts = [
    `£${price.price.toLocaleString('en-GB', { maximumFractionDigits: 4 })}`,
    price.change1m != null && `1m ${formatChange(price.change1m)}`,
    price.change1y != null && `1y ${formatChange(price.change1y)}`,
    price.averageReturn != null && `${Math.round(price.historyYears || 0)}y avg ${price.averageReturn.toFixed(1)}%/yr`
  ].filter(Boolean);
  return (
    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8125rem' }}>
      {parts.join(' · ')}
      {price.error && ' (last lookup failed, showing the previous price)'}
    </Typography>
  );
};

const parseNumber = (value: string): number | null => {
  const n = parseFloat(value);
  return isNaN(n) ? null : n;
};

// Same rule as the backend: weight by allocation, or average when none are set
export const blendedReturn = (holdings: Holding[]): number | null => {
  const withReturn = holdings.filter(h => typeof h.expectedReturn === 'number');
  if (withReturn.length === 0) return null;
  const allocated = withReturn.filter(h => typeof h.allocation === 'number' && h.allocation > 0);
  if (allocated.length === 0) {
    return withReturn.reduce((sum, h) => sum + (h.expectedReturn as number), 0) / withReturn.length;
  }
  const totalWeight = allocated.reduce((sum, h) => sum + (h.allocation as number), 0);
  return allocated.reduce((sum, h) => sum + (h.allocation as number) * (h.expectedReturn as number), 0) / totalWeight;
};

const FundsDialog: React.FC<FundsDialogProps> = ({ open, pot, holdings, canEdit, onClose, onSaved }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [rows, setRows] = useState<FundRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Reset the form each time it opens, not when prices reload behind it
  useEffect(() => {
    if (open) {
      setRows(holdings.length > 0 ? holdings.map(toRow) : canEdit ? [emptyRow()] : []);
      setError(null);
    }
  }, [open]);

  const priceFor = (identifier: string): FundPrice | null =>
    holdings.find(h => h.identifier && h.identifier === identifier.trim().toUpperCase())?.price ?? null;
  const lastChecked = holdings
    .map(h => h.price?.fetchedAt)
    .filter((d): d is string => !!d)
    .sort()
    .pop();
  const hasIdentifiers = holdings.some(h => h.identifier);

  const parsed: Holding[] = rows
    .filter(r => r.name.trim())
    .map(r => ({
      name: r.name.trim(),
      identifier: r.identifier.trim() || null,
      allocation: parseNumber(r.allocation),
      expectedReturn: parseNumber(r.expectedReturn),
      units: parseNumber(r.units)
    }));
  // Blank expected returns fall back to the fund's own average, as on the server
  const blended = blendedReturn(parsed.map(h => ({
    ...h,
    expectedReturn: h.expectedReturn ?? priceFor(h.identifier || '')?.averageReturn ?? null
  })));
  const allocationTotal = parsed.reduce((sum, h) => sum + (h.allocation || 0), 0);

  const updateRow = (index: number, field: keyof FundRow, value: string) => {
    setRows(rows.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
  };

  const handleSave = async () => {
    setSaving(true);
    const ok = await saveHoldings(pot.id, parsed);
    setSaving(false);
    if (ok) {
      onSaved();
      onClose();
    } else {
      setError('Could not save your funds. Please try again.');
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    const ok = await refreshFundPrices();
    setRefreshing(false);
    if (ok) {
      onSaved();
    } else {
      setError('Could not look up prices just now. Please try again later.');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth fullScreen={isMobile}>
      <DialogTitle sx={{ pb: 0.5, fontWeight: 600 }}>Funds in {pot.name}</DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {canEdit
            ? 'Add each fund\'s ISIN or ticker and the app looks up its price twice a day, moving this account\'s value with the market. Leave the expected return blank to use the fund\'s own average.'
            : 'The funds held in this account.'}
        </Typography>

        {rows.length === 0 && (
          <Typography color="text.secondary">No funds listed yet.</Typography>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {rows.map((row, index) => canEdit ? (
            <Box
              key={index}
              sx={{ border: 1, borderColor: 'divider', borderRadius: 2, p: 1.5, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.25 }}
            >
              <Box sx={{ gridColumn: '1 / -1', display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                <TextField
                  size="small"
                  label="Fund name"
                  value={row.name}
                  onChange={(e) => updateRow(index, 'name', e.target.value)}
                  placeholder="e.g. Vanguard FTSE Global All Cap"
                  fullWidth
                />
                <IconButton
                  aria-label={`Remove ${row.name || 'fund'}`}
                  onClick={() => setRows(rows.filter((_, i) => i !== index))}
                  sx={{ color: 'text.secondary', mt: 0.25 }}
                >
                  <DeleteOutlineIcon />
                </IconButton>
              </Box>
              <TextField
                size="small"
                label="ISIN or ticker"
                value={row.identifier}
                onChange={(e) => updateRow(index, 'identifier', e.target.value)}
                placeholder="Optional"
                sx={{ gridColumn: '1 / -1' }}
              />
              <TextField
                size="small"
                label="Share of account"
                type="number"
                value={row.allocation}
                onChange={(e) => updateRow(index, 'allocation', e.target.value)}
                inputProps={{ step: '1', min: '0', max: '100', inputMode: 'decimal' }}
                InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
              />
              <TextField
                size="small"
                label="Expected a year"
                type="number"
                value={row.expectedReturn}
                onChange={(e) => updateRow(index, 'expectedReturn', e.target.value)}
                placeholder={priceFor(row.identifier)?.averageReturn != null ? `${priceFor(row.identifier)!.averageReturn!.toFixed(1)} avg` : undefined}
                InputLabelProps={priceFor(row.identifier)?.averageReturn != null ? { shrink: true } : undefined}
                inputProps={{ step: '0.1', inputMode: 'decimal' }}
                InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
              />
              <TextField
                size="small"
                label="Units held"
                type="number"
                value={row.units}
                onChange={(e) => updateRow(index, 'units', e.target.value)}
                placeholder="Optional"
                inputProps={{ step: 'any', min: '0', inputMode: 'decimal' }}
                sx={{ gridColumn: '1 / -1' }}
              />
              <Box sx={{ gridColumn: '1 / -1', mt: -0.25 }}>
                <FundPerformance price={priceFor(row.identifier)} />
              </Box>
            </Box>
          ) : (
            <Box key={index} sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, py: 1, borderBottom: 1, borderColor: 'divider' }}>
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontWeight: 600 }}>{row.name}</Typography>
                {row.identifier && (
                  <Typography variant="body2" color="text.secondary">{row.identifier}</Typography>
                )}
                <FundPerformance price={priceFor(row.identifier)} />
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap', textAlign: 'right' }}>
                {row.allocation && `${row.allocation}%`}
                {row.allocation && row.expectedReturn && ' · '}
                {row.expectedReturn && `${row.expectedReturn}% a year`}
              </Typography>
            </Box>
          ))}
        </Box>

        {canEdit && (
          <Button startIcon={<AddIcon />} onClick={() => setRows([...rows, emptyRow()])} sx={{ mt: 1.5 }}>
            Add fund
          </Button>
        )}

        {hasIdentifiers && (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mt: 1.5 }}>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8125rem' }}>
              {lastChecked ? `Prices checked ${format(new Date(lastChecked), 'd MMM, HH:mm')}` : 'Prices not checked yet'}
            </Typography>
            <Button size="small" startIcon={<RefreshIcon />} onClick={handleRefresh} disabled={refreshing}>
              {refreshing ? 'Checking…' : 'Check now'}
            </Button>
          </Box>
        )}

        {blended !== null && (
          <Box sx={{ mt: 2, p: 1.5, borderRadius: 2, bgcolor: 'action.hover' }}>
            <Typography sx={{ fontWeight: 600 }}>
              Expected return: {blended.toFixed(1)}% a year
            </Typography>
            {canEdit && parsed.length > 0 && parsed.every(h => h.units != null && h.units > 0) && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                With units held for every fund, saving sets the account's value to units × today's prices.
              </Typography>
            )}
            {canEdit && allocationTotal > 0 && Math.round(allocationTotal) !== 100 && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Shares add up to {Math.round(allocationTotal)}%, so they're weighted relative to each other.
              </Typography>
            )}
          </Box>
        )}

        {error && (
          <Typography color="error" variant="body2" sx={{ mt: 1.5 }}>{error}</Typography>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} sx={{ color: 'text.secondary' }}>
          {canEdit ? 'Cancel' : 'Close'}
        </Button>
        {canEdit && (
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            Save funds
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default FundsDialog;
