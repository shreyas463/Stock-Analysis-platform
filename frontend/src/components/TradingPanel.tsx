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
  Grid,
  LinearProgress,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { auth } from '@/firebase/config';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import AddIcon from '@mui/icons-material/Add';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import InfoIcon from '@mui/icons-material/Info';
import RecommendIcon from '@mui/icons-material/Recommend';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';

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
        open={!!analysisResult} 
        onClose={() => {
          setAnalysisResult(null);
          setShowAlternatives(false);
        }}
        maxWidth="md"
        PaperProps={{
          sx: {
            bgcolor: 'rgba(36, 36, 36, 0.95)',
            borderRadius: 3,
            border: '1px solid rgba(105, 240, 174, 0.3)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
            backgroundImage: 'linear-gradient(to bottom right, rgba(105, 240, 174, 0.05), rgba(36, 36, 36, 0.95))',
            overflow: 'hidden'
          }
        }}
      >
        <DialogTitle sx={{ 
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)', 
          p: 3,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5
        }}>
          <AnalyticsIcon sx={{ color: '#69f0ae' }} />
          <Typography variant="h6" component="div" sx={{ 
            color: '#fff',
            fontWeight: 'bold',
            flexGrow: 1
          }}>
            ARIMA Model Analysis: {analysisResult?.symbol}
          </Typography>
          <IconButton 
            edge="end" 
            color="inherit" 
            onClick={() => {
              setAnalysisResult(null);
              setShowAlternatives(false);
            }}
            sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          {analysisResult && (
            <Box>
              <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ 
                    p: 2.5, 
                    bgcolor: 'rgba(26, 26, 26, 0.7)',
                    borderRadius: 2,
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    height: '100%'
                  }}>
                    <Typography variant="subtitle1" sx={{ color: '#9e9e9e', mb: 2 }}>
                      Current Price
                    </Typography>
                    <Typography variant="h4" sx={{ 
                      color: '#fff', 
                      fontWeight: 'bold',
                      mb: 1
                    }}>
                      ${analysisResult.current_price.toFixed(2)}
                    </Typography>
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 1,
                      mt: 2
                    }}>
                      <Chip 
                        label={analysisResult.is_good_buy ? "Good Buy" : "Not Recommended"} 
                        color={analysisResult.is_good_buy ? "success" : "error"}
                        sx={{ 
                          fontWeight: 'bold',
                          px: 1
                        }}
                      />
                    </Box>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ 
                    p: 2.5, 
                    bgcolor: 'rgba(26, 26, 26, 0.7)',
                    borderRadius: 2,
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    height: '100%'
                  }}>
                    <Typography variant="subtitle1" sx={{ color: '#9e9e9e', mb: 2 }}>
                      Predicted Price (in {analysisDays} days)
                    </Typography>
                    <Typography variant="h4" sx={{ 
                      color: '#fff', 
                      fontWeight: 'bold',
                      mb: 1
                    }}>
                      ${analysisResult.predicted_price.toFixed(2)}
                    </Typography>
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 1,
                      mt: 2
                    }}>
                      <Typography variant="body2" sx={{ color: '#9e9e9e' }}>
                        Total Cost:
                      </Typography>
                      <Typography variant="body1" sx={{ color: '#69f0ae', fontWeight: 'medium' }}>
                        ${analysisResult.total_cost.toFixed(2)}
                      </Typography>
                    </Box>
                  </Paper>
                </Grid>
              </Grid>

              <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ 
                    p: 2.5, 
                    bgcolor: 'rgba(26, 26, 26, 0.7)',
                    borderRadius: 2,
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                  }}>
                    <Typography variant="subtitle1" sx={{ color: '#9e9e9e', mb: 2 }}>
                      Expected Growth
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {analysisResult.expected_growth >= 0 ? (
                        <ArrowUpwardIcon sx={{ color: '#69f0ae' }} />
                      ) : (
                        <ArrowDownwardIcon sx={{ color: '#ff5252' }} />
                      )}
                      <Typography variant="h5" sx={{ 
                        color: analysisResult.expected_growth >= 0 ? '#69f0ae' : '#ff5252',
                        fontWeight: 'bold'
                      }}>
                        {Math.abs(analysisResult.expected_growth * 100).toFixed(2)}%
                      </Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={Math.min(Math.abs(analysisResult.expected_growth * 100), 100)}
                      sx={{ 
                        mt: 2,
                        height: 8,
                        borderRadius: 4,
                        bgcolor: 'rgba(255, 255, 255, 0.1)',
                        '& .MuiLinearProgress-bar': {
                          bgcolor: analysisResult.expected_growth >= 0 ? '#69f0ae' : '#ff5252',
                        }
                      }}
                    />
                  </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ 
                    p: 2.5, 
                    bgcolor: 'rgba(26, 26, 26, 0.7)',
                    borderRadius: 2,
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                  }}>
                    <Typography variant="subtitle1" sx={{ color: '#9e9e9e', mb: 2 }}>
                      Confidence Level
                    </Typography>
                    <Box sx={{ position: 'relative', display: 'inline-flex', width: '100%' }}>
                      <CircularProgress
                        variant="determinate"
                        value={analysisResult.confidence * 100}
                        size={80}
                        thickness={4}
                        sx={{
                          color: '#69f0ae',
                          '& .MuiCircularProgress-circle': {
                            strokeLinecap: 'round',
                          },
                        }}
                      />
                      <Box
                        sx={{
                          top: 0,
                          left: 0,
                          bottom: 0,
                          right: 0,
                          position: 'absolute',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Typography
                          variant="h6"
                          component="div"
                          sx={{ color: '#fff', fontWeight: 'bold' }}
                        >
                          {(analysisResult.confidence * 100).toFixed(0)}%
                        </Typography>
                      </Box>
                    </Box>
                  </Paper>
                </Grid>
              </Grid>

              <Paper sx={{ 
                p: 2.5, 
                bgcolor: 'rgba(26, 26, 26, 0.7)',
                borderRadius: 2,
                border: '1px solid rgba(255, 255, 255, 0.1)',
                mb: 3
              }}>
                <Typography variant="subtitle1" sx={{ color: '#fff', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <InfoIcon fontSize="small" sx={{ color: '#69f0ae' }} />
                  Analysis Summary
                </Typography>
                <Typography variant="body2" sx={{ color: '#e0e0e0', mb: 2 }}>
                  This analysis is based on historical data and uses the ARIMA model to predict future price movements.
                  {!analysisResult.is_good_buy && " Based on our analysis, this may not be the best investment at this time."}
                </Typography>
                {!analysisResult.is_good_buy && (
                  <Button
                    variant="outlined"
                    color="primary"
                    onClick={findAlternativeStocks}
                    disabled={isLoadingAlternatives}
                    startIcon={isLoadingAlternatives ? <CircularProgress size={20} /> : <SearchIcon />}
                    sx={{ 
                      mt: 1,
                      borderColor: 'rgba(105, 240, 174, 0.5)',
                      color: '#69f0ae',
                      '&:hover': {
                        borderColor: '#69f0ae',
                        bgcolor: 'rgba(105, 240, 174, 0.1)'
                      }
                    }}
                  >
                    Find Alternative Stocks
                  </Button>
                )}
              </Paper>

              {showAlternatives && alternativeStocks.length > 0 && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="h6" sx={{ color: '#69f0ae', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <RecommendIcon fontSize="small" />
                    Recommended Alternatives
                  </Typography>
                  <TableContainer component={Paper} sx={{ 
                    bgcolor: 'rgba(26, 26, 26, 0.7)', 
                    borderRadius: 2,
                    boxShadow: 'inset 0 0 10px rgba(0, 0, 0, 0.2)'
                  }}>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ color: '#9e9e9e', fontWeight: 600, borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>Symbol</TableCell>
                          <TableCell align="right" sx={{ color: '#9e9e9e', fontWeight: 600, borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>Price</TableCell>
                          <TableCell align="right" sx={{ color: '#9e9e9e', fontWeight: 600, borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>Expected Growth</TableCell>
                          <TableCell align="right" sx={{ color: '#9e9e9e', fontWeight: 600, borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>Confidence</TableCell>
                          <TableCell align="right" sx={{ color: '#9e9e9e', fontWeight: 600, borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>Action</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {alternativeStocks.map((stock) => (
                          <TableRow key={stock.symbol} sx={{ 
                            '&:hover': { 
                              bgcolor: 'rgba(105, 240, 174, 0.05)'
                            }
                          }}>
                            <TableCell sx={{ color: 'white', fontWeight: 500 }}>{stock.symbol}</TableCell>
                            <TableCell align="right" sx={{ color: 'white' }}>${stock.price.toFixed(2)}</TableCell>
                            <TableCell align="right">
                              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                                {stock.expected_growth >= 0 ? (
                                  <ArrowUpwardIcon fontSize="small" sx={{ color: '#69f0ae' }} />
                                ) : (
                                  <ArrowDownwardIcon fontSize="small" sx={{ color: '#ff5252' }} />
                                )}
                                <Typography sx={{ 
                                  color: stock.expected_growth >= 0 ? '#69f0ae' : '#ff5252',
                                  fontWeight: 'medium'
                                }}>
                                  {Math.abs(stock.expected_growth * 100).toFixed(2)}%
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell align="right" sx={{ color: 'white' }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                                <LinearProgress 
                                  variant="determinate" 
                                  value={stock.confidence * 100}
                                  sx={{ 
                                    width: 50,
                                    mr: 1,
                                    height: 6,
                                    borderRadius: 3,
                                    bgcolor: 'rgba(255, 255, 255, 0.1)',
                                    '& .MuiLinearProgress-bar': {
                                      bgcolor: '#69f0ae',
                                    }
                                  }}
                                />
                                {(stock.confidence * 100).toFixed(0)}%
                              </Box>
                            </TableCell>
                            <TableCell align="right">
                              <Button 
                                size="small" 
                                variant="outlined"
                                onClick={() => {
                                  setSelectedStock(stock.symbol);
                                  setAnalysisResult(null);
                                  setShowAlternatives(false);
                                }}
                                sx={{ 
                                  borderColor: 'rgba(105, 240, 174, 0.5)',
                                  color: '#69f0ae',
                                  '&:hover': {
                                    borderColor: '#69f0ae',
                                    bgcolor: 'rgba(105, 240, 174, 0.1)'
                                  }
                                }}
                              >
                                Select
                              </Button>
                            </TableCell>
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
        <DialogActions sx={{ borderTop: '1px solid rgba(255,255,255,0.1)', p: 2, justifyContent: 'space-between' }}>
          <Button 
            onClick={() => {
              setAnalysisResult(null);
              setShowAlternatives(false);
            }} 
            color="error"
            startIcon={<CancelOutlinedIcon />}
            sx={{
              borderRadius: 2,
              px: 2
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={proceedWithPurchase} 
            variant="contained" 
            color={analysisResult?.is_good_buy ? "success" : "warning"}
            startIcon={analysisResult?.is_good_buy ? <CheckCircleOutlineIcon /> : <WarningAmberIcon />}
            sx={{
              borderRadius: 2,
              px: 3,
              py: 1,
              fontWeight: 'bold'
            }}
          >
            {analysisResult?.is_good_buy ? "Proceed with Purchase" : "Buy Anyway"}
          </Button>
        </DialogActions>
      </Dialog>

      <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        <Card sx={{ 
          flexGrow: 1, 
          minWidth: '300px', 
          bgcolor: 'rgba(36, 36, 36, 0.8)',
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'rgba(105, 240, 174, 0.2)',
          boxShadow: '0 8px 16px rgba(0, 0, 0, 0.2)',
          transition: 'all 0.3s ease',
          '&:hover': {
            boxShadow: '0 12px 20px rgba(0, 0, 0, 0.3)',
            borderColor: 'rgba(105, 240, 174, 0.4)',
          }
        }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ 
              color: '#69f0ae', 
              fontWeight: 'bold', 
              mb: 3,
              fontSize: '1.2rem',
              borderBottom: '2px solid rgba(105, 240, 174, 0.3)',
              paddingBottom: '8px'
            }}>
              Account Overview
            </Typography>
            <Box sx={{ mt: 2, mb: 4 }}>
              <Typography variant="body1" sx={{ color: '#e0e0e0', mb: 2, display: 'flex', justifyContent: 'space-between', fontSize: '1rem' }}>
                <span>Cash Balance:</span>
                <span style={{ color: '#69f0ae', fontWeight: 600 }}>${(balance || 0).toFixed(2)}</span>
              </Typography>
              <Typography variant="body1" sx={{ color: '#e0e0e0', mb: 2, display: 'flex', justifyContent: 'space-between', fontSize: '1rem' }}>
                <span>Portfolio Value:</span>
                <span style={{ color: '#69f0ae', fontWeight: 600 }}>${((totalValue || 0) - (balance || 0)).toFixed(2)}</span>
              </Typography>
              <Divider sx={{ my: 2, bgcolor: 'rgba(255, 255, 255, 0.1)' }} />
              <Typography variant="body1" sx={{ 
                color: '#e0e0e0', 
                display: 'flex', 
                justifyContent: 'space-between', 
                fontSize: '1.1rem',
                fontWeight: 500,
                mt: 2
              }}>
                <span>Total Value:</span>
                <span style={{ color: '#69f0ae', fontWeight: 700 }}>${(totalValue || 0).toFixed(2)}</span>
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
                fontWeight: 'bold',
                boxShadow: '0 4px 8px rgba(105, 240, 174, 0.3)',
                width: '100%'
              }}
              startIcon={<AddIcon />}
            >
              Add Funds
            </Button>
          </CardContent>
        </Card>

        <Card sx={{ 
          flexGrow: 1, 
          minWidth: '300px',
          bgcolor: 'rgba(36, 36, 36, 0.8)',
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'rgba(105, 240, 174, 0.2)',
          boxShadow: '0 8px 16px rgba(0, 0, 0, 0.2)',
          transition: 'all 0.3s ease',
          '&:hover': {
            boxShadow: '0 12px 20px rgba(0, 0, 0, 0.3)',
            borderColor: 'rgba(105, 240, 174, 0.4)',
          }
        }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ 
              mb: 2, 
              color: '#69f0ae',
              fontWeight: 'bold',
              fontSize: '1.2rem',
              borderBottom: '2px solid rgba(105, 240, 174, 0.3)',
              paddingBottom: '8px'
            }}>
              Trade Stocks
            </Typography>
            
            <TextField
              label="Stock Symbol"
              variant="outlined"
              fullWidth
              value={selectedStock}
              onChange={(e) => setSelectedStock(e.target.value.toUpperCase())}
              margin="normal"
              InputProps={{
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
                  }
                }
              }}
              InputLabelProps={{
                sx: { color: 'rgba(255, 255, 255, 0.7)' }
              }}
            />
            
            <TextField
              label="Number of Shares"
              variant="outlined"
              fullWidth
              type="number"
              value={shares}
              onChange={(e) => setShares(e.target.value)}
              margin="normal"
              InputProps={{
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
                  }
                }
              }}
              InputLabelProps={{
                sx: { color: 'rgba(255, 255, 255, 0.7)' }
              }}
            />
            
            <Box sx={{ mt: 2, mb: 3, display: 'flex', alignItems: 'center' }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={useMLAnalysis}
                    onChange={(e) => setUseMLAnalysis(e.target.checked)}
                    color="primary"
                  />
                }
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Typography variant="body2" sx={{ mr: 1 }}>Use ML Analysis</Typography>
                    <Tooltip title="Analyze the stock using ARIMA model before buying">
                      <InfoOutlinedIcon fontSize="small" color="action" />
                    </Tooltip>
                  </Box>
                }
              />
              {useMLAnalysis && (
                <FormControl variant="outlined" size="small" sx={{ ml: 2, minWidth: 120 }}>
                  <InputLabel id="analysis-days-label">Days</InputLabel>
                  <Select
                    labelId="analysis-days-label"
                    value={analysisDays}
                    onChange={(e) => setAnalysisDays(Number(e.target.value))}
                    label="Days"
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
        bgcolor: 'rgba(36, 36, 36, 0.8)',
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'rgba(105, 240, 174, 0.2)',
        boxShadow: '0 8px 16px rgba(0, 0, 0, 0.2)',
        transition: 'all 0.3s ease',
        '&:hover': {
          boxShadow: '0 12px 20px rgba(0, 0, 0, 0.3)',
          borderColor: 'rgba(105, 240, 174, 0.4)',
        },
        mb: 4
      }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ 
            color: '#69f0ae', 
            fontWeight: 'bold', 
            mb: 3,
            fontSize: '1.2rem',
            borderBottom: '2px solid rgba(105, 240, 174, 0.3)',
            paddingBottom: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}>
            <AccountBalanceIcon fontSize="small" />
            Portfolio
          </Typography>
          <TableContainer component={Paper} sx={{ 
            bgcolor: 'rgba(26, 26, 26, 0.7)', 
            borderRadius: 2,
            boxShadow: 'inset 0 0 10px rgba(0, 0, 0, 0.2)'
          }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ color: '#9e9e9e', fontWeight: 600, borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>Symbol</TableCell>
                  <TableCell align="right" sx={{ color: '#9e9e9e', fontWeight: 600, borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>Shares</TableCell>
                  <TableCell align="right" sx={{ color: '#9e9e9e', fontWeight: 600, borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>Current Price</TableCell>
                  <TableCell align="right" sx={{ color: '#9e9e9e', fontWeight: 600, borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>Value</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {Array.isArray(portfolio) && portfolio.map((position) => (
                  <TableRow key={position.symbol} sx={{ 
                    '&:hover': { 
                      bgcolor: 'rgba(105, 240, 174, 0.05)'
                    }
                  }}>
                    <TableCell sx={{ color: '#e0e0e0', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', fontWeight: 500 }}>{position.symbol}</TableCell>
                    <TableCell align="right" sx={{ color: '#e0e0e0', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>{position.shares}</TableCell>
                    <TableCell align="right" sx={{ color: '#e0e0e0', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>${position.current_price.toFixed(2)}</TableCell>
                    <TableCell align="right" sx={{ color: '#69f0ae', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', fontWeight: 600 }}>${position.position_value.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
                {(!Array.isArray(portfolio) || portfolio.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ color: '#9e9e9e', py: 4 }}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, py: 2 }}>
                        <AccountBalanceWalletIcon sx={{ fontSize: 40, color: 'rgba(255,255,255,0.2)' }} />
                        <Typography>No positions in portfolio</Typography>
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                          Start trading to build your portfolio
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      <Card sx={{ 
        mt: 4, 
        bgcolor: 'rgba(36, 36, 36, 0.8)',
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'rgba(105, 240, 174, 0.2)',
        boxShadow: '0 8px 16px rgba(0, 0, 0, 0.2)',
        transition: 'all 0.3s ease',
        '&:hover': {
          boxShadow: '0 12px 20px rgba(0, 0, 0, 0.3)',
          borderColor: 'rgba(105, 240, 174, 0.4)',
        },
        mb: 4
      }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ 
            color: '#69f0ae', 
            fontWeight: 'bold', 
            mb: 3,
            fontSize: '1.2rem',
            borderBottom: '2px solid rgba(105, 240, 174, 0.3)',
            paddingBottom: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}>
            <ReceiptLongIcon fontSize="small" />
            Recent Transactions
          </Typography>
          <TableContainer component={Paper} sx={{ 
            bgcolor: 'rgba(26, 26, 26, 0.7)', 
            borderRadius: 2,
            boxShadow: 'inset 0 0 10px rgba(0, 0, 0, 0.2)'
          }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ color: '#9e9e9e', fontWeight: 600, borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>Date</TableCell>
                  <TableCell sx={{ color: '#9e9e9e', fontWeight: 600, borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>Type</TableCell>
                  <TableCell sx={{ color: '#9e9e9e', fontWeight: 600, borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>Symbol</TableCell>
                  <TableCell align="right" sx={{ color: '#9e9e9e', fontWeight: 600, borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>Shares</TableCell>
                  <TableCell align="right" sx={{ color: '#9e9e9e', fontWeight: 600, borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>Price</TableCell>
                  <TableCell align="right" sx={{ color: '#9e9e9e', fontWeight: 600, borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>Total</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {Array.isArray(transactions) && transactions.map((transaction) => (
                  <TableRow key={transaction.id} sx={{ 
                    '&:hover': { 
                      bgcolor: 'rgba(105, 240, 174, 0.05)'
                    }
                  }}>
                    <TableCell sx={{ color: '#e0e0e0', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>{new Date(transaction.created_at).toLocaleDateString()}</TableCell>
                    <TableCell sx={{ 
                      borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
                    }}>
                      <Chip 
                        label={transaction.type.toUpperCase()} 
                        size="small"
                        sx={{
                          bgcolor: transaction.type === 'buy' ? 'rgba(105, 240, 174, 0.2)' : 'rgba(255, 82, 82, 0.2)',
                          color: transaction.type === 'buy' ? '#69f0ae' : '#ff5252',
                          fontWeight: 600,
                          fontSize: '0.75rem'
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ color: '#e0e0e0', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', fontWeight: 500 }}>{transaction.symbol}</TableCell>
                    <TableCell align="right" sx={{ color: '#e0e0e0', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>{transaction.shares}</TableCell>
                    <TableCell align="right" sx={{ color: '#e0e0e0', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>${transaction.price.toFixed(2)}</TableCell>
                    <TableCell align="right" sx={{ color: '#69f0ae', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', fontWeight: 600 }}>${transaction.total.toFixed(2)}</TableCell>
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