'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Button,
  TextField,
  Typography,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  Switch,
  FormControlLabel,
  CircularProgress,
  Divider,
  Chip,
  Tooltip,
  IconButton,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { auth } from '@/firebase/config';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import SearchIcon from '@mui/icons-material/Search';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import AddIcon from '@mui/icons-material/Add';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import InfoIcon from '@mui/icons-material/Info';
import RecommendIcon from '@mui/icons-material/Recommend';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CloseIcon from '@mui/icons-material/Close';

interface PortfolioPosition {
  symbol: string;
  shares: number;
  current_price: number;
  position_value: number;
}

interface Transaction {
  id: string;
  symbol: string;
  shares: number;
  price: number;
  type: string;
  total: number;
  created_at: string;
}

interface StockAnalysis {
  symbol: string;
  current_price: number;
  predicted_price: number;
  total_cost: number;
  is_good_buy: boolean;
  expected_growth: number;
  confidence: number;
  forecast: number[];
  days: number;
}

export default function TradingPanel() {
  const theme = useTheme();
  const [balance, setBalance] = useState(0);
  const [portfolio, setPortfolio] = useState<PortfolioPosition[]>([]);
  const [totalValue, setTotalValue] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedStock, setSelectedStock] = useState('');
  const [shares, setShares] = useState('');
  const [addFundsAmount, setAddFundsAmount] = useState('');
  const [openAddFunds, setOpenAddFunds] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [useMLAnalysis, setUseMLAnalysis] = useState(false);
  const [analysisDays, setAnalysisDays] = useState(14); // Default to 14 days
  const [analysisResult, setAnalysisResult] = useState<StockAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showAlternatives, setShowAlternatives] = useState(false);
  const [alternativeStocks, setAlternativeStocks] = useState<any[]>([]);
  const [isLoadingAlternatives, setIsLoadingAlternatives] = useState(false);

  const getToken = async () => {
    if (!auth.currentUser) return null;
    try {
      return await auth.currentUser.getIdToken(true);
    } catch (error) {
      console.error("Error refreshing token:", error);
      return null;
    }
  };

  const fetchBalance = async () => {
    try {
      const token = await getToken();
      if (!token) {
        setError('Please log in to view your balance');
        return;
      }
      const response = await fetch('http://localhost:5001/api/trading/balance', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      setBalance(data.cash_balance);
      setPortfolio(data.portfolio);
      setTotalValue(data.total_value);
    } catch (error) {
      setError('Failed to fetch balance');
    }
  };

  const fetchTransactions = async () => {
    try {
      const token = await getToken();
      if (!token) {
        setError('Please log in to view your transactions');
        return;
      }
      const response = await fetch('http://localhost:5001/api/trading/transactions', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      setTransactions(data);
    } catch (error) {
      setError('Failed to fetch transactions');
    }
  };

  useEffect(() => {
    fetchBalance();
    fetchTransactions();
    const interval = setInterval(fetchBalance, 10000); // Update every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const handleAddFunds = async () => {
    try {
      setError('');
      setSuccess('');
      
      if (!addFundsAmount || isNaN(parseFloat(addFundsAmount)) || parseFloat(addFundsAmount) <= 0) {
        setError('Please enter a valid amount');
        return;
      }
      
      const token = await getToken();
      if (!token) {
        setError('Please log in to add funds');
        return;
      }
      
      const response = await fetch('http://localhost:5001/api/trading/add-funds', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: parseFloat(addFundsAmount)
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setSuccess(`Successfully added $${addFundsAmount}`);
        setAddFundsAmount('');
        setOpenAddFunds(false);
        fetchBalance();
      } else {
        setError(data.error || 'Failed to add funds');
      }
    } catch (error) {
      setError('An error occurred while adding funds');
    }
  };

  const handleTrade = async (type: 'buy' | 'sell') => {
    try {
      setError('');
      setSuccess('');
      setAnalysisResult(null);
      
      if (!selectedStock) {
        setError('Please select a stock');
        return;
      }
      
      if (!shares || isNaN(parseFloat(shares)) || parseFloat(shares) <= 0) {
        setError('Please enter a valid number of shares');
        return;
      }
      
      const token = await getToken();
      if (!token) {
        setError('Please log in to trade');
        return;
      }
      
      const endpoint = type === 'buy' ? '/api/trading/buy' : '/api/trading/sell';
      
      // If buying with ML analysis, set the analyze_first flag
      if (type === 'buy' && useMLAnalysis) {
        setIsAnalyzing(true);
        
        const response = await fetch(`http://localhost:5001${endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            symbol: selectedStock,
            shares: parseFloat(shares),
            analyze_first: true,
            days: analysisDays // Send the selected days for analysis
          })
        });
        
        const data = await response.json();
        setIsAnalyzing(false);
        
        if (response.ok && data.analysis) {
          setAnalysisResult(data.analysis);
          return;
        } else {
          setError(data.error || 'Failed to analyze stock');
          return;
        }
      }
      
      // Regular buy/sell without analysis or after analysis
      const response = await fetch(`http://localhost:5001${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          symbol: selectedStock,
          shares: parseFloat(shares)
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setSuccess(`Successfully ${type === 'buy' ? 'bought' : 'sold'} ${shares} shares of ${selectedStock}`);
        setShares('');
        setAnalysisResult(null);
        fetchBalance();
        fetchTransactions();
      } else {
        setError(data.error || `Failed to ${type} shares`);
      }
    } catch (error) {
      setIsAnalyzing(false);
      setError(`An error occurred while ${type === 'buy' ? 'buying' : 'selling'} shares`);
    }
  };

  const findAlternativeStocks = async () => {
    if (!analysisResult) return;
    
    setIsLoadingAlternatives(true);
    
    try {
      const token = await getToken();
      if (!token) {
        setError('Authentication required');
        return;
      }
      
      // Include the days parameter in the request
      const response = await fetch(
        `http://localhost:5001/api/trading/alternative-stocks?sector=technology&budget=${analysisResult.total_cost}&days=${analysisDays}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        setAlternativeStocks(data.alternatives || []);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to fetch alternative stocks');
      }
    } catch (error) {
      console.error('Error finding alternative stocks:', error);
      setError('Error finding alternative stocks');
    } finally {
      setIsLoadingAlternatives(false);
    }
  };

  const proceedWithPurchase = () => {
    // Reset analysis result and proceed with regular purchase
    setAnalysisResult(null);
    handleTrade('buy');
  };

  return (
    <Box sx={{ 
      p: 4, 
      maxWidth: '1200px', 
      margin: '0 auto',
      bgcolor: '#1a1a1a',
      borderRadius: 3,
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
    }}>
      {error && (
        <Alert 
          severity="error" 
          sx={{ 
            mb: 3,
            bgcolor: 'rgba(211, 47, 47, 0.1)',
            color: '#ff5252',
            '& .MuiAlert-icon': { color: '#ff5252' }
          }} 
          onClose={() => setError('')}
        >
          {error}
        </Alert>
      )}
      {success && (
        <Alert 
          severity="success" 
          sx={{ 
            mb: 3,
            bgcolor: 'rgba(76, 175, 80, 0.1)',
            color: '#69f0ae',
            '& .MuiAlert-icon': { color: '#69f0ae' }
          }} 
          onClose={() => setSuccess('')}
        >
          {success}
        </Alert>
      )}

      {/* Analysis Result Dialog */}
      <Dialog 
        open={analysisResult !== null} 
        onClose={() => setAnalysisResult(null)}
        maxWidth="md"
        PaperProps={{
          sx: {
            bgcolor: '#242424',
            color: 'white',
            borderRadius: 2,
            minWidth: '500px'
          }
        }}
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1,
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          pb: 2
        }}>
          <AnalyticsIcon color="primary" />
          <Typography variant="h6">
            ARIMA Model Analysis for {analysisResult?.symbol}
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {analysisResult && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                  <Typography variant="h5">${analysisResult.current_price.toFixed(2)}</Typography>
                  <Typography variant="body2" color="text.secondary">Current Price</Typography>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h6" sx={{ 
                    color: analysisResult.expected_growth > 0 ? '#69f0ae' : '#ff5252',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {analysisResult.expected_growth > 0 ? <TrendingUpIcon fontSize="small" sx={{ mr: 0.5 }} /> : <TrendingDownIcon fontSize="small" sx={{ mr: 0.5 }} />}
                    {Math.abs(analysisResult.expected_growth).toFixed(2)}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">Expected Change</Typography>
                </Box>
                <Box>
                  <Typography variant="h5" sx={{ 
                    color: analysisResult.expected_growth > 0 ? '#69f0ae' : '#ff5252' 
                  }}>
                    ${analysisResult.predicted_price.toFixed(2)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">Predicted Price ({analysisResult.days} days)</Typography>
                </Box>
                <Chip 
                  icon={analysisResult.is_good_buy ? <CheckCircleOutlineIcon /> : <CancelOutlinedIcon />} 
                  label={analysisResult.is_good_buy ? "Good Buy" : "Not Recommended"} 
                  color={analysisResult.is_good_buy ? "success" : "error"}
                  sx={{ fontWeight: 'bold' }}
                />
              </Box>
              
              <Box sx={{ mb: 3 }}>
                <Typography variant="body1" sx={{ mb: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>Confidence:</span>
                  <Box sx={{ 
                    width: '60%', 
                    height: '8px', 
                    bgcolor: 'rgba(255,255,255,0.1)', 
                    borderRadius: '4px',
                    position: 'relative',
                    overflow: 'hidden'
                  }}>
                    <Box sx={{ 
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      height: '100%',
                      width: `${analysisResult.confidence * 100}%`,
                      bgcolor: analysisResult.confidence > 0.7 ? '#69f0ae' : 
                              analysisResult.confidence > 0.4 ? '#ffb74d' : '#ff5252',
                      borderRadius: '4px'
                    }} />
                  </Box>
                  <span>{(analysisResult.confidence * 100).toFixed(0)}%</span>
                </Typography>
                
                <Typography variant="body1" sx={{ mb: 1 }}>
                  Total Cost: ${analysisResult.total_cost.toFixed(2)}
                </Typography>
              </Box>
              
              <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.1)' }} />
              
              <Box sx={{ mt: 3 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  This analysis is based on historical data and ARIMA model predictions for the next {analysisResult.days} days. Past performance is not indicative of future results.
                </Typography>
                
                {!showAlternatives && !analysisResult.is_good_buy && (
                  <Button 
                    variant="outlined" 
                    color="primary" 
                    onClick={findAlternativeStocks}
                    disabled={isLoadingAlternatives}
                    startIcon={isLoadingAlternatives ? <CircularProgress size={20} /> : null}
                    sx={{ mr: 2 }}
                  >
                    Find Alternatives
                  </Button>
                )}
              </Box>
              
              {showAlternatives && alternativeStocks.length > 0 && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle1" sx={{ mb: 2 }}>
                    Alternative Stocks to Consider:
                  </Typography>
                  <TableContainer component={Paper} sx={{ bgcolor: 'rgba(0,0,0,0.2)' }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ color: 'white' }}>Symbol</TableCell>
                          <TableCell sx={{ color: 'white' }}>Price</TableCell>
                          <TableCell sx={{ color: 'white' }}>Expected Growth</TableCell>
                          <TableCell sx={{ color: 'white' }}>Confidence</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {alternativeStocks.map((stock) => (
                          <TableRow key={stock.symbol}>
                            <TableCell sx={{ color: 'white' }}>{stock.symbol}</TableCell>
                            <TableCell sx={{ color: 'white' }}>${stock.price.toFixed(2)}</TableCell>
                            <TableCell sx={{ 
                              color: stock.expected_growth > 0 ? '#69f0ae' : '#ff5252',
                              display: 'flex',
                              alignItems: 'center'
                            }}>
                              {stock.expected_growth > 0 ? <TrendingUpIcon fontSize="small" /> : <TrendingDownIcon fontSize="small" />}
                              {Math.abs(stock.expected_growth).toFixed(2)}%
                            </TableCell>
                            <TableCell sx={{ color: 'white' }}>{(stock.confidence * 100).toFixed(0)}%</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ borderTop: '1px solid rgba(255,255,255,0.1)', p: 2 }}>
          <Button onClick={() => {
            setAnalysisResult(null);
            setShowAlternatives(false);
          }} color="error">
            Cancel
          </Button>
          <Button 
            onClick={proceedWithPurchase} 
            variant="contained" 
            color={analysisResult?.is_good_buy ? "success" : "warning"}
          >
            {analysisResult?.is_good_buy ? "Proceed with Purchase" : "Buy Anyway"}
          </Button>
        </DialogActions>
      </Dialog>

      <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        <Card sx={{ 
          flexGrow: 1, 
          minWidth: '300px', 
          bgcolor: '#242424',
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'rgba(255, 255, 255, 0.1)',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
        }}>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ color: '#69f0ae', fontWeight: 'medium', mb: 3 }}>
              Account Overview
            </Typography>
            <Box sx={{ mt: 2, mb: 4 }}>
              <Typography variant="body1" sx={{ color: '#e0e0e0', mb: 2, display: 'flex', justifyContent: 'space-between' }}>
                <span>Cash Balance:</span>
                <span style={{ color: '#69f0ae', fontWeight: 500 }}>${(balance || 0).toFixed(2)}</span>
              </Typography>
              <Typography variant="body1" sx={{ color: '#e0e0e0', mb: 2, display: 'flex', justifyContent: 'space-between' }}>
                <span>Portfolio Value:</span>
                <span style={{ color: '#69f0ae', fontWeight: 500 }}>${((totalValue || 0) - (balance || 0)).toFixed(2)}</span>
              </Typography>
              <Typography variant="body1" sx={{ color: '#e0e0e0', display: 'flex', justifyContent: 'space-between' }}>
                <span>Total Value:</span>
                <span style={{ color: '#69f0ae', fontWeight: 500 }}>${(totalValue || 0).toFixed(2)}</span>
              </Typography>
            </Box>
            <Button
              variant="contained"
              onClick={() => setOpenAddFunds(true)}
              sx={{ 
                bgcolor: '#69f0ae',
                color: '#1a1a1a',
                '&:hover': { bgcolor: '#4caf50' },
                borderRadius: 2,
                textTransform: 'none',
                px: 4,
                py: 1.5,
                fontWeight: 'medium'
              }}
            >
              Add Funds
            </Button>
          </CardContent>
        </Card>

        <Card sx={{ 
          flexGrow: 1, 
          minWidth: '300px',
          bgcolor: '#242424',
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'rgba(255, 255, 255, 0.1)',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
        }}>
          <CardContent>
            <Typography variant="h6" sx={{ 
              mb: 3, 
              color: '#69f0ae',
              fontWeight: 'bold',
              fontSize: '1.2rem',
              borderBottom: '2px solid rgba(105, 240, 174, 0.3)',
              paddingBottom: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: 1
            }}>
              <TrendingUpIcon fontSize="small" />
              Trade Stocks
            </Typography>
            
            <Box sx={{ 
              bgcolor: 'rgba(26, 26, 26, 0.7)',
              borderRadius: 2,
              p: 3,
              mb: 3,
              border: '1px solid rgba(255, 255, 255, 0.05)',
              boxShadow: 'inset 0 2px 10px rgba(0, 0, 0, 0.2)'
            }}>
              <TextField
                label="Stock Symbol"
                variant="outlined"
                fullWidth
                value={selectedStock}
                onChange={(e) => setSelectedStock(e.target.value.toUpperCase())}
                margin="normal"
                placeholder="e.g. AAPL, MSFT, GOOGL"
                InputProps={{
                  startAdornment: (
                    <Box component="span" sx={{ mr: 1, color: 'rgba(255, 255, 255, 0.5)' }}>
                      <SearchIcon fontSize="small" />
                    </Box>
                  ),
                  sx: { 
                    color: 'white',
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'rgba(255, 255, 255, 0.3)',
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'rgba(105, 240, 174, 0.5)',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#69f0ae',
                    },
                    borderRadius: 2,
                    fontSize: '1.1rem'
                  }
                }}
                InputLabelProps={{
                  sx: { color: 'rgba(255, 255, 255, 0.7)' }
                }}
              />
              
              {selectedStock && (
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  mt: 2,
                  p: 2,
                  borderRadius: 1.5,
                  bgcolor: 'rgba(105, 240, 174, 0.05)',
                  border: '1px dashed rgba(105, 240, 174, 0.3)'
                }}>
                  <Box>
                    <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                      Current Price
                    </Typography>
                    <Typography variant="h6" sx={{ color: '#fff', fontWeight: 'bold' }}>
                      ${selectedStock === 'AAPL' ? '187.42' : 
                         selectedStock === 'MSFT' ? '415.56' : 
                         selectedStock === 'GOOGL' ? '142.89' : 
                         selectedStock === 'AMZN' ? '178.75' : 
                         selectedStock === 'META' ? '474.99' : '0.00'}
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                      Daily Change
                    </Typography>
                    <Typography variant="body1" sx={{ 
                      color: selectedStock === 'AAPL' ? '#ff5252' : '#69f0ae',
                      fontWeight: 'medium',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end'
                    }}>
                      {selectedStock === 'AAPL' ? <ArrowDownwardIcon fontSize="small" sx={{ mr: 0.5 }} /> : 
                                                  <ArrowUpwardIcon fontSize="small" sx={{ mr: 0.5 }} />}
                      {selectedStock === 'AAPL' ? '-1.24%' : 
                       selectedStock === 'MSFT' ? '+0.87%' : 
                       selectedStock === 'GOOGL' ? '+1.32%' : 
                       selectedStock === 'AMZN' ? '+2.15%' : 
                       selectedStock === 'META' ? '+0.76%' : '+0.00%'}
                    </Typography>
                  </Box>
                </Box>
              )}
              
              <TextField
                label="Number of Shares"
                variant="outlined"
                fullWidth
                type="number"
                value={shares}
                onChange={(e) => setShares(e.target.value)}
                margin="normal"
                placeholder="Enter quantity"
                InputProps={{
                  startAdornment: (
                    <Box component="span" sx={{ mr: 1, color: 'rgba(255, 255, 255, 0.5)' }}>
                      <ShowChartIcon fontSize="small" />
                    </Box>
                  ),
                  sx: { 
                    color: 'white',
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'rgba(255, 255, 255, 0.3)',
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'rgba(105, 240, 174, 0.5)',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#69f0ae',
                    },
                    borderRadius: 2,
                    fontSize: '1.1rem'
                  }
                }}
                InputLabelProps={{
                  sx: { color: 'rgba(255, 255, 255, 0.7)' }
                }}
              />
              
              {selectedStock && shares && !isNaN(Number(shares)) && Number(shares) > 0 && (
                <Box sx={{ 
                  mt: 2,
                  p: 2,
                  borderRadius: 1.5,
                  bgcolor: 'rgba(33, 150, 243, 0.05)',
                  border: '1px dashed rgba(33, 150, 243, 0.3)',
                  display: 'flex',
                  justifyContent: 'space-between'
                }}>
                  <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                    Estimated Total:
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 'bold', color: '#2196f3' }}>
                    ${(Number(shares) * (
                      selectedStock === 'AAPL' ? 187.42 : 
                      selectedStock === 'MSFT' ? 415.56 : 
                      selectedStock === 'GOOGL' ? 142.89 : 
                      selectedStock === 'AMZN' ? 178.75 : 
                      selectedStock === 'META' ? 474.99 : 0
                    )).toFixed(2)}
                  </Typography>
                </Box>
              )}
            </Box>
            
            <Box sx={{ 
              mt: 2, 
              mb: 3, 
              display: 'flex', 
              alignItems: 'center',
              bgcolor: 'rgba(26, 26, 26, 0.5)',
              p: 2,
              borderRadius: 2,
              border: '1px solid rgba(255, 255, 255, 0.05)'
            }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={useMLAnalysis}
                    onChange={(e) => setUseMLAnalysis(e.target.checked)}
                    color="primary"
                    sx={{
                      '& .MuiSwitch-switchBase.Mui-checked': {
                        color: '#69f0ae',
                      },
                      '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                        backgroundColor: 'rgba(105, 240, 174, 0.5)',
                      },
                    }}
                  />
                }
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Typography variant="body1" sx={{ mr: 1, fontWeight: 500, color: 'white' }}>Use ML Analysis</Typography>
                    <Tooltip title="Analyze the stock using ARIMA model before buying to predict future performance" arrow placement="top">
                      <InfoOutlinedIcon fontSize="small" sx={{ color: 'rgba(255, 255, 255, 0.7)' }} />
                    </Tooltip>
                  </Box>
                }
              />
              {useMLAnalysis && (
                <FormControl variant="outlined" size="small" sx={{ ml: 2, minWidth: 120 }}>
                  <InputLabel id="analysis-days-label" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>Days</InputLabel>
                  <Select
                    labelId="analysis-days-label"
                    value={analysisDays}
                    onChange={(e) => setAnalysisDays(Number(e.target.value))}
                    label="Days"
                    sx={{
                      color: 'white',
                      '.MuiOutlinedInput-notchedOutline': {
                        borderColor: 'rgba(255, 255, 255, 0.3)',
                      },
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'rgba(105, 240, 174, 0.5)',
                      },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#69f0ae',
                      }
                    }}
                  >
                    <MenuItem value={7}>7 days</MenuItem>
                    <MenuItem value={14}>14 days</MenuItem>
                    <MenuItem value={30}>30 days</MenuItem>
                    <MenuItem value={60}>60 days</MenuItem>
                  </Select>
                </FormControl>
              )}
            </Box>
            
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button 
                variant="contained" 
                color="primary" 
                onClick={() => handleTrade('buy')}
                disabled={isAnalyzing}
                startIcon={isAnalyzing ? <CircularProgress size={20} /> : null}
                sx={{ 
                  flexGrow: 1,
                  bgcolor: theme.palette.primary.main,
                  '&:hover': {
                    bgcolor: theme.palette.primary.dark,
                  }
                }}
              >
                {isAnalyzing ? 'Analyzing...' : 'Buy'}
              </Button>
              
              <Button 
                variant="outlined" 
                color="error" 
                onClick={() => handleTrade('sell')}
                sx={{ 
                  flexGrow: 1,
                  borderColor: theme.palette.error.main,
                  color: theme.palette.error.main,
                  '&:hover': {
                    borderColor: theme.palette.error.dark,
                    bgcolor: 'rgba(211, 47, 47, 0.04)',
                  }
                }}
              >
                Sell
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Box>

      <Card sx={{ 
        mt: 4, 
        bgcolor: '#242424',
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
      }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ color: '#69f0ae', fontWeight: 'medium', mb: 3 }}>
            Portfolio
          </Typography>
          <TableContainer component={Paper} sx={{ bgcolor: '#1a1a1a', borderRadius: 2 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ color: '#9e9e9e', fontWeight: 500, borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>Symbol</TableCell>
                  <TableCell align="right" sx={{ color: '#9e9e9e', fontWeight: 500, borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>Shares</TableCell>
                  <TableCell align="right" sx={{ color: '#9e9e9e', fontWeight: 500, borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>Current Price</TableCell>
                  <TableCell align="right" sx={{ color: '#9e9e9e', fontWeight: 500, borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>Value</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {Array.isArray(portfolio) && portfolio.map((position) => (
                  <TableRow key={position.symbol}>
                    <TableCell sx={{ color: '#e0e0e0', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>{position.symbol}</TableCell>
                    <TableCell align="right" sx={{ color: '#e0e0e0', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>{position.shares}</TableCell>
                    <TableCell align="right" sx={{ color: '#e0e0e0', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>${position.current_price.toFixed(2)}</TableCell>
                    <TableCell align="right" sx={{ color: '#69f0ae', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>${position.position_value.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
                {(!Array.isArray(portfolio) || portfolio.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ color: '#9e9e9e', py: 4 }}>No positions in portfolio</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      <Card sx={{ 
        mt: 4, 
        bgcolor: '#242424',
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
      }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ color: '#69f0ae', fontWeight: 'medium', mb: 3 }}>
            Recent Transactions
          </Typography>
          <TableContainer component={Paper} sx={{ bgcolor: '#1a1a1a', borderRadius: 2 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ color: '#9e9e9e', fontWeight: 500, borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>Date</TableCell>
                  <TableCell sx={{ color: '#9e9e9e', fontWeight: 500, borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>Type</TableCell>
                  <TableCell sx={{ color: '#9e9e9e', fontWeight: 500, borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>Symbol</TableCell>
                  <TableCell align="right" sx={{ color: '#9e9e9e', fontWeight: 500, borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>Shares</TableCell>
                  <TableCell align="right" sx={{ color: '#9e9e9e', fontWeight: 500, borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>Price</TableCell>
                  <TableCell align="right" sx={{ color: '#9e9e9e', fontWeight: 500, borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>Total</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {Array.isArray(transactions) && transactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell sx={{ color: '#e0e0e0', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>{new Date(transaction.created_at).toLocaleDateString()}</TableCell>
                    <TableCell sx={{ 
                      color: transaction.type === 'buy' ? '#69f0ae' : '#ff5252', 
                      fontWeight: 500,
                      borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
                    }}>
                      {transaction.type.toUpperCase()}
                    </TableCell>
                    <TableCell sx={{ color: '#e0e0e0', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>{transaction.symbol}</TableCell>
                    <TableCell align="right" sx={{ color: '#e0e0e0', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>{transaction.shares}</TableCell>
                    <TableCell align="right" sx={{ color: '#e0e0e0', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>${transaction.price.toFixed(2)}</TableCell>
                    <TableCell align="right" sx={{ color: '#69f0ae', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>${transaction.total.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
                {(!Array.isArray(transactions) || transactions.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ color: '#9e9e9e', py: 4 }}>No transaction history</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      <Dialog 
        open={openAddFunds} 
        onClose={() => setOpenAddFunds(false)}
        PaperProps={{
          sx: {
            bgcolor: '#242424',
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'rgba(255, 255, 255, 0.1)',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
          }
        }}
      >
        <DialogTitle sx={{ color: '#69f0ae', fontWeight: 'medium' }}>Add Funds</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Amount"
            type="number"
            fullWidth
            value={addFundsAmount}
            onChange={(e) => setAddFundsAmount(e.target.value)}
            sx={{
              mt: 2,
              '& .MuiOutlinedInput-root': {
                bgcolor: '#1a1a1a',
                '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.1)' },
                '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' },
                '&.Mui-focused fieldset': { borderColor: '#69f0ae' }
              },
              '& .MuiInputLabel-root': { color: '#9e9e9e' },
              '& .MuiOutlinedInput-input': { color: '#e0e0e0' }
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button 
            onClick={() => setOpenAddFunds(false)}
            sx={{ 
              color: '#9e9e9e',
              '&:hover': { color: '#e0e0e0' }
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleAddFunds} 
            variant="contained"
            sx={{
              bgcolor: '#69f0ae',
              color: '#1a1a1a',
              '&:hover': { bgcolor: '#4caf50' },
              borderRadius: 2,
              textTransform: 'none',
              px: 4,
              py: 1.5,
              fontWeight: 'medium'
            }}
          >
            Add
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 