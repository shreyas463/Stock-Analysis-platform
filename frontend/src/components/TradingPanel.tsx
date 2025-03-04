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
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import TimelineIcon from '@mui/icons-material/Timeline';
import ErrorIcon from '@mui/icons-material/Error';
import { LineChart, CartesianGrid, XAxis, YAxis, Tooltip as RechartsTooltip, Legend, Line, ReferenceLine, ResponsiveContainer } from 'recharts';

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
  predicted_price?: number;
  total_cost: number;
  is_good_buy: boolean;
  expected_growth: number;
  confidence: number;
  forecast: number[];
  days: number;
  indicator?: {
    type: string;
    values: number[];
    recommendation: string;
    description: string;
    middle_band?: number[];
    upper_band?: number[];
    lower_band?: number[];
    percent_b?: number;
    atr_percentage?: number;
  };
}

interface TradingPanelProps {
  selectedStockFromParent?: string | null;
}

export default function TradingPanel({ selectedStockFromParent }: TradingPanelProps) {
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
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [priceChange, setPriceChange] = useState<{value: number, percentage: string} | null>(null);
  const [isLoadingPrice, setIsLoadingPrice] = useState(false);
  const [selectedIndicator, setSelectedIndicator] = useState<string>('none');
  const [refreshKey, setRefreshKey] = useState(0);
  const [openSellConfirmation, setOpenSellConfirmation] = useState(false);
  const [soldStocks, setSoldStocks] = useState<Transaction[]>([]);
  const [openSellDialog, setOpenSellDialog] = useState(false);
  const [selectedPortfolioStock, setSelectedPortfolioStock] = useState<PortfolioPosition | null>(null);
  const [sellShares, setSellShares] = useState('');

  // Log when analysisResult changes
  useEffect(() => {
    console.log("Analysis result changed:", analysisResult);
    
    // If analysis result is set, ensure the dialog is visible
    if (analysisResult) {
      console.log("Analysis result is set, dialog should be visible");
    }
  }, [analysisResult]);

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
      
      setBalance(data.cash_balance || 0);
      
      if (Array.isArray(data.portfolio)) {
        setPortfolio(data.portfolio);
      } else {
        setPortfolio([]);
      }
      
      setTotalValue(data.total_value || 0);
    } catch (error) {
      console.error("Error fetching balance:", error);
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

  const fetchSoldStocks = async () => {
    try {
      const token = await getToken();
      if (!token) return;
      
      console.log('Fetching sold stocks...');
      
      const response = await fetch('http://localhost:5001/api/trading/transactions', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        console.error('Failed to fetch transactions:', response.status, response.statusText);
        throw new Error('Failed to fetch transactions');
      }
      
      const data = await response.json();
      console.log('All transactions:', data);
      
      // Filter only sell transactions - ensure case insensitive comparison
      const sellTransactions = data.filter((transaction: Transaction) => 
        transaction.type && transaction.type.toLowerCase() === 'sell'
      );
      
      console.log('Filtered sell transactions:', sellTransactions);
      setSoldStocks(sellTransactions);
    } catch (error) {
      console.error('Error fetching sold stocks:', error);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('Refreshing data...', refreshKey); // Debug log
        await fetchBalance();
        await fetchTransactions();
        await fetchSoldStocks();
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };
    
    fetchData();
    
    // Use a less frequent interval to reduce flickering
    const interval = setInterval(fetchData, 30000); // Update every 30 seconds instead of 15
    return () => clearInterval(interval);
  }, [refreshKey]); // Only depend on refreshKey to control when to refresh

  useEffect(() => {
    if (selectedStockFromParent) {
      setSelectedStock(selectedStockFromParent);
    }
  }, [selectedStockFromParent]);

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

  const fetchStockPrice = async (retryCount = 0) => {
    if (!selectedStock) {
      setCurrentPrice(null);
      setPriceChange(null);
      return;
    }
    
    if (!isLoadingPrice) {
      setIsLoadingPrice(true);
    }
    setError('');
    
    try {
      const token = await getToken();
      if (!token) {
        setError('Authentication required');
        setIsLoadingPrice(false);
        return;
      }
      
      console.log(`Fetching price for ${selectedStock}, attempt ${retryCount + 1}`);
      
      const response = await fetch(`http://localhost:5001/api/market/quote?symbol=${selectedStock}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch stock price: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data && typeof data.c === 'number') {
        setCurrentPrice(data.c);
        setPriceChange({
          value: data.d || 0,
          percentage: data.dp ? `${data.dp > 0 ? '+' : ''}${data.dp.toFixed(2)}%` : '+0.00%'
        });
        setError('');
      } else {
        throw new Error('Invalid price data received');
      }
    } catch (error) {
      console.error(`Error fetching stock price for ${selectedStock}:`, error);
      
      if (retryCount < 2) { // Reduced retry count from 3 to 2
        setTimeout(() => fetchStockPrice(retryCount + 1), 2000); // Increased delay to 2 seconds
        return;
      }
      
      // Only set default price if we've exhausted retries
      setCurrentPrice(100);
      setPriceChange({value: 0, percentage: '+0.00%'});
      setError(`Failed to fetch stock price for ${selectedStock}. Using estimated price.`);
    } finally {
      setIsLoadingPrice(false);
    }
  };

  // Update the useEffect for price fetching to use a longer interval
  useEffect(() => {
    fetchStockPrice();
    
    // Refresh price every 15 seconds instead of 10
    const intervalId = setInterval(fetchStockPrice, 15000);
    
    return () => clearInterval(intervalId);
  }, [selectedStock]);

  const handleTrade = async (type: 'buy' | 'sell') => {
    try {
      setError('');
      setSuccess('');
      setIsAnalyzing(false);
      
      if (!selectedStock) {
        setError('Please select a stock');
        return false;
      }
      
      if (!shares || isNaN(parseFloat(shares)) || parseFloat(shares) <= 0) {
        setError('Please enter a valid number of shares');
        return false;
      }
      
      const token = await getToken();
      if (!token) {
        setError('Please log in to trade');
        return false;
      }

      // If ML analysis is enabled and this is a buy action
      if (type === 'buy' && useMLAnalysis) {
        setIsAnalyzing(true);
        
        try {
          const response = await fetch(`http://localhost:5001/api/trading/analyze-stock?symbol=${selectedStock}&days=${analysisDays}&indicator=${selectedIndicator}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (!response.ok) {
            throw new Error('Failed to analyze stock');
          }
          
          const data = await response.json();
          setAnalysisResult(data);
          setIsAnalyzing(false);
          return false; // Stop here and wait for user confirmation
        } catch (error) {
          setIsAnalyzing(false);
          setError('Failed to analyze stock. Proceeding without analysis.');
          // Continue with purchase without analysis
        }
      }

      // Regular buy/sell or after ML analysis confirmation
      const endpoint = type === 'buy' ? '/api/trading/buy' : '/api/trading/sell';
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
        setShowAlternatives(false);
        setOpenSellConfirmation(false);
        await fetchBalance();
        await fetchTransactions();
        
        // Update sold stocks list if it's a sell transaction
        if (type === 'sell') {
          fetchSoldStocks();
        }
        
        return true;
      } else {
        setError(data.error || `Failed to ${type} shares`);
        return false;
      }
    } catch (error) {
      setIsAnalyzing(false);
      setError(`An error occurred while ${type === 'buy' ? 'buying' : 'selling'} shares`);
      return false;
    }
  };

  const proceedWithPurchase = async () => {
    try {
      const token = await getToken();
      if (!token) {
        setError('Please log in to trade');
        return;
      }

      const response = await fetch('http://localhost:5001/api/trading/buy', {
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
        setSuccess(`Successfully bought ${shares} shares of ${selectedStock}`);
        setShares('');
        setAnalysisResult(null);
        setShowAlternatives(false);
        await fetchBalance();
        await fetchTransactions();
      } else {
        setError(data.error || 'Failed to buy shares');
      }
    } catch (error) {
      setError('An error occurred while buying shares');
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

  // Calculate total cost when shares or current price changes
  useEffect(() => {
    if (currentPrice && shares && !isNaN(parseFloat(shares))) {
      const totalCost = currentPrice * parseFloat(shares);
      setAnalysisResult(prev => prev ? {
        ...prev,
        current_price: currentPrice,
        total_cost: totalCost
      } : null);
    }
  }, [currentPrice, shares]);

  // Add a new component for the analysis dialog
  const AnalysisResultDialog = () => {
    console.log("Rendering AnalysisResultDialog, analysisResult:", analysisResult);
    
    if (!analysisResult) {
      console.log("No analysis result, not rendering dialog");
      return null;
    }
    
    return (
      <Dialog 
        open={Boolean(analysisResult)} 
        onClose={() => {
          console.log("Dialog closed, setting analysisResult to null");
          setAnalysisResult(null);
        }}
        maxWidth="md"
        PaperProps={{
          sx: {
            bgcolor: '#1a1a1a',
            color: 'white',
            borderRadius: 3,
            minWidth: '600px',
            backgroundImage: 'linear-gradient(to bottom, #242424, #1a1a1a)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
          }
        }}
      >
        <DialogTitle sx={{ 
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          background: 'linear-gradient(45deg, #2c2c2c, #242424)',
          py: 2.5
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <AnalyticsIcon sx={{ color: '#69f0ae', fontSize: 28 }} />
            <Typography variant="h5" sx={{ fontWeight: '500', color: '#fff' }}>
              ARIMA Model Analysis for {analysisResult?.symbol}
            </Typography>
          </Box>
          <IconButton 
            edge="end" 
            onClick={() => setAnalysisResult(null)} 
            aria-label="close"
            sx={{ 
              color: 'rgba(255, 255, 255, 0.7)',
              '&:hover': { 
                color: '#fff',
                backgroundColor: 'rgba(255, 255, 255, 0.1)' 
              }
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ mt: 3, px: 4, color: '#ffffff' }}>
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" sx={{ 
              color: '#69f0ae',
              fontWeight: '500',
              mb: 3,
              display: 'flex',
              alignItems: 'center',
              gap: 1
            }}>
              <TimelineIcon sx={{ fontSize: 20 }} />
              Prediction Summary
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <Paper sx={{ 
                  p: 3, 
                  bgcolor: 'rgba(20, 20, 20, 0.7)',
                  borderRadius: 2,
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  transition: 'transform 0.2s',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 4px 20px rgba(105, 240, 174, 0.1)'
                  }
                }}>
                  <Typography variant="subtitle2" sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 1 }}>
                    Current Price
                  </Typography>
                  <Typography variant="h4" sx={{ color: '#fff', fontWeight: '500' }}>
                    ${analysisResult?.current_price.toFixed(2)}
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Paper sx={{ 
                  p: 3, 
                  bgcolor: 'rgba(20, 20, 20, 0.7)',
                  borderRadius: 2,
                  backdropFilter: 'blur(10px)',
                  border: `1px solid ${analysisResult?.expected_growth > 0 ? 'rgba(105, 240, 174, 0.3)' : 'rgba(255, 82, 82, 0.3)'}`,
                  transition: 'transform 0.2s',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: `0 4px 20px ${analysisResult?.expected_growth > 0 ? 'rgba(105, 240, 174, 0.1)' : 'rgba(255, 82, 82, 0.1)'}`
                  }
                }}>
                  <Typography variant="subtitle2" sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 1 }}>
                    Expected Growth
                  </Typography>
                  <Typography variant="h4" sx={{ 
                    color: analysisResult?.expected_growth > 0 ? '#69f0ae' : '#ff5252',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                  }}>
                    {analysisResult?.expected_growth > 0 ? <TrendingUpIcon /> : <TrendingDownIcon />}
                    {analysisResult?.expected_growth > 0 ? '+' : ''}{analysisResult?.expected_growth}%
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Paper sx={{ 
                  p: 3, 
                  bgcolor: 'rgba(20, 20, 20, 0.7)',
                  borderRadius: 2,
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  transition: 'transform 0.2s',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 4px 20px rgba(105, 240, 174, 0.1)'
                  }
                }}>
                  <Typography variant="subtitle2" sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 1 }}>
                    Confidence Score
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography variant="h4" sx={{ color: '#fff', fontWeight: '500' }}>
                      {(analysisResult?.confidence * 100).toFixed(1)}%
                    </Typography>
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      bgcolor: analysisResult && analysisResult.confidence > 0.7 ? 'rgba(105, 240, 174, 0.1)' : 
                               analysisResult && analysisResult.confidence > 0.4 ? 'rgba(255, 152, 0, 0.1)' : 
                               'rgba(255, 82, 82, 0.1)',
                      p: 1,
                      borderRadius: 1
                    }}>
                      {analysisResult && analysisResult.confidence > 0.7 ? (
                        <CheckCircleIcon sx={{ color: '#69f0ae' }} />
                      ) : analysisResult && analysisResult.confidence > 0.4 ? (
                        <InfoIcon sx={{ color: '#ff9800' }} />
                      ) : (
                        <ErrorIcon sx={{ color: '#ff5252' }} />
                      )}
                    </Box>
                  </Box>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Paper sx={{ 
                  p: 3, 
                  bgcolor: 'rgba(20, 20, 20, 0.7)',
                  borderRadius: 2,
                  backdropFilter: 'blur(10px)',
                  border: `1px solid ${analysisResult?.is_good_buy ? 'rgba(105, 240, 174, 0.3)' : 'rgba(255, 82, 82, 0.3)'}`,
                  transition: 'transform 0.2s',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: `0 4px 20px ${analysisResult?.is_good_buy ? 'rgba(105, 240, 174, 0.1)' : 'rgba(255, 82, 82, 0.1)'}`
                  }
                }}>
                  <Typography variant="subtitle2" sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 1 }}>
                    Recommendation
                  </Typography>
                  <Typography variant="h4" sx={{ 
                    color: analysisResult?.is_good_buy ? '#69f0ae' : '#ff5252',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                  }}>
                    {analysisResult?.is_good_buy ? (
                      <RecommendIcon sx={{ fontSize: 28 }} />
                    ) : (
                      <WarningAmberIcon sx={{ fontSize: 28 }} />
                    )}
                    {analysisResult?.is_good_buy ? 'Buy' : 'Hold/Avoid'}
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </Box>

          {analysisResult?.indicator && (
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" sx={{ 
                color: '#69f0ae',
                fontWeight: '500',
                mb: 3,
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}>
                <ShowChartIcon sx={{ fontSize: 20 }} />
                {analysisResult.indicator.type} Analysis
              </Typography>
              <Paper sx={{ 
                p: 3, 
                bgcolor: 'rgba(20, 20, 20, 0.7)',
                borderRadius: 2,
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                <Typography variant="body1" sx={{ 
                  mb: 2,
                  color: 'rgba(255, 255, 255, 0.9)',
                  lineHeight: 1.6
                }}>
                  {analysisResult.indicator.description}
                </Typography>
                <Box sx={{ 
                  mt: 2,
                  p: 2,
                  borderRadius: 1,
                  bgcolor: analysisResult.indicator.recommendation === 'Buy' ? 
                    'rgba(105, 240, 174, 0.1)' : 
                    analysisResult.indicator.recommendation === 'Sell' ? 
                      'rgba(255, 82, 82, 0.1)' : 
                      'rgba(255, 152, 0, 0.1)',
                  border: `1px solid ${
                    analysisResult.indicator.recommendation === 'Buy' ? 
                      'rgba(105, 240, 174, 0.3)' : 
                      analysisResult.indicator.recommendation === 'Sell' ? 
                        'rgba(255, 82, 82, 0.3)' : 
                        'rgba(255, 152, 0, 0.3)'
                  }`
                }}>
                  <Typography variant="subtitle1" sx={{ 
                    color: analysisResult.indicator.recommendation === 'Buy' ? 
                      '#69f0ae' : 
                      analysisResult.indicator.recommendation === 'Sell' ? 
                        '#ff5252' : 
                        '#ff9800',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                  }}>
                    {analysisResult.indicator.recommendation === 'Buy' ? (
                      <CheckCircleIcon />
                    ) : analysisResult.indicator.recommendation === 'Sell' ? (
                      <CancelOutlinedIcon />
                    ) : (
                      <InfoIcon />
                    )}
                    Recommendation: {analysisResult.indicator.recommendation}
                  </Typography>
                </Box>
              </Paper>
            </Box>
          )}

          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ 
              color: '#69f0ae',
              fontWeight: '500',
              mb: 3,
              display: 'flex',
              alignItems: 'center',
              gap: 1
            }}>
              <TimelineIcon sx={{ fontSize: 20 }} />
              14-Day Price Forecast
            </Typography>
            <Paper sx={{ 
              p: 3, 
              bgcolor: 'rgba(20, 20, 20, 0.7)',
              borderRadius: 2,
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              height: 350
            }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={analysisResult?.forecast.map((price, index) => ({ day: `Day ${index + 1}`, price }))}
                  margin={{ top: 10, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis 
                    dataKey="day" 
                    stroke="#aaa"
                    tick={{ fill: '#aaa' }}
                    axisLine={{ stroke: 'rgba(255,255,255,0.2)' }}
                  />
                  <YAxis 
                    stroke="#aaa"
                    tick={{ fill: '#aaa' }}
                    axisLine={{ stroke: 'rgba(255,255,255,0.2)' }}
                  />
                  <RechartsTooltip 
                    contentStyle={{ 
                      backgroundColor: '#242424', 
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '4px',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
                    }}
                    itemStyle={{ color: '#fff' }}
                    formatter={(value: any) => [`$${Number(value).toFixed(2)}`, 'Price']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="price" 
                    stroke="#69f0ae" 
                    strokeWidth={2}
                    dot={{ r: 4, fill: '#69f0ae', strokeWidth: 2 }}
                    activeDot={{ r: 6, fill: '#fff', stroke: '#69f0ae', strokeWidth: 2 }}
                  />
                  <ReferenceLine 
                    y={analysisResult?.current_price} 
                    stroke="rgba(255,255,255,0.5)" 
                    strokeDasharray="5 5"
                    label={{ 
                      value: 'Current Price', 
                      position: 'insideBottomRight',
                      fill: 'rgba(255,255,255,0.7)',
                      fontSize: 12
                    }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </Paper>
          </Box>
        </DialogContent>
        <DialogActions sx={{ 
          p: 4, 
          bgcolor: 'rgba(20, 20, 20, 0.7)',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          gap: 2
        }}>
          <Button 
            onClick={() => findAlternativeStocks()} 
            startIcon={isLoadingAlternatives ? <CircularProgress size={20} /> : <SearchIcon />}
            disabled={isLoadingAlternatives}
            sx={{ 
              color: 'white',
              borderColor: 'rgba(255,255,255,0.3)',
              bgcolor: 'rgba(255,255,255,0.05)',
              px: 3,
              '&:hover': {
                bgcolor: 'rgba(255,255,255,0.1)',
                borderColor: 'rgba(255,255,255,0.5)'
              }
            }}
            variant="outlined"
          >
            Find Alternatives
          </Button>
          
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button 
              onClick={() => setAnalysisResult(null)} 
              sx={{ 
                color: 'rgba(255,255,255,0.7)',
                '&:hover': {
                  color: '#fff',
                  bgcolor: 'rgba(255,255,255,0.1)'
                }
              }}
            >
              Cancel
            </Button>
            
            <Button 
              onClick={proceedWithPurchase} 
              variant="contained" 
              startIcon={<ShoppingCartIcon />}
              sx={{ 
                bgcolor: analysisResult?.is_good_buy ? '#69f0ae' : '#ff9800',
                color: '#1a1a1a',
                fontWeight: 'bold',
                px: 4,
                '&:hover': {
                  bgcolor: analysisResult?.is_good_buy ? '#4caf50' : '#f57c00',
                  transform: 'translateY(-1px)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                },
                transition: 'all 0.2s'
              }}
            >
              Buy Now
            </Button>
          </Box>
        </DialogActions>
      </Dialog>
    );
  };

  // Add a new function to handle opening the sell dialog
  const handleOpenSellDialog = () => {
    setError('');
    setSuccess('');
    
    if (portfolio.length === 0) {
      setError('You don\'t have any stocks in your portfolio to sell');
      return;
    }
    
    // Pre-select the first stock in portfolio to improve UX
    if (portfolio.length > 0) {
      setSelectedPortfolioStock(portfolio[0]);
      setSellShares('1'); // Default to 1 share
    }
    
    setOpenSellDialog(true);
  };

  // Add a function to handle stock selection in the sell dialog
  const handleSelectStockToSell = (stock: PortfolioPosition | null) => {
    setSelectedPortfolioStock(stock);
    setSellShares(''); // Reset shares when stock changes
  };

  // Add a function to handle proceeding with the sell
  const handleProceedWithSell = () => {
    if (!selectedPortfolioStock) {
      setError('Please select a stock from your portfolio');
      return;
    }
    
    if (!sellShares || isNaN(parseFloat(sellShares)) || parseFloat(sellShares) <= 0) {
      setError('Please enter a valid number of shares');
      return;
    }
    
    if (parseFloat(sellShares) > selectedPortfolioStock.shares) {
      setError(`You only own ${selectedPortfolioStock.shares} shares of ${selectedPortfolioStock.symbol}`);
      return;
    }
    
    // Set the selected stock and shares for the main sell function
    setSelectedStock(selectedPortfolioStock.symbol);
    setShares(sellShares);
    
    // Close the sell dialog and open the confirmation dialog
    setOpenSellDialog(false);
    setOpenSellConfirmation(true);
  };

  // Add a direct sell function that bypasses the complex flow
  const executeSellTransaction = async (stockSymbol: string, sharesToSell: string) => {
    try {
      setError('');
      setSuccess('');
      
      const token = await getToken();
      if (!token) {
        setError('Please log in to trade');
        return false;
      }
      
      console.log(`Directly selling ${sharesToSell} shares of ${stockSymbol}`);
      
      // Validate the input
      if (!stockSymbol || !sharesToSell) {
        setError('Missing stock symbol or shares');
        return false;
      }
      
      const sharesNum = parseFloat(sharesToSell);
      if (isNaN(sharesNum) || sharesNum <= 0) {
        setError('Please enter a valid number of shares');
        return false;
      }
      
      // Check if user owns the stock
      const stockInPortfolio = portfolio.find(
        (position) => position.symbol.toUpperCase() === stockSymbol.toUpperCase()
      );
      
      if (!stockInPortfolio) {
        setError(`You don't own any shares of ${stockSymbol}`);
        return false;
      }
      
      if (stockInPortfolio.shares < sharesNum) {
        setError(`You only own ${stockInPortfolio.shares} shares of ${stockSymbol}`);
        return false;
      }
      
      // Make the API call
      const response = await fetch(`http://localhost:5001/api/trading/sell`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          symbol: stockSymbol,
          shares: sharesNum
        })
      });
      
      const data = await response.json();
      console.log('Sell API response:', data);
      
      if (response.ok) {
        setSuccess(`Successfully sold ${sharesToSell} shares of ${stockSymbol}`);
        
        // Close dialogs
        setOpenSellDialog(false);
        setOpenSellConfirmation(false);
        
        // Reset states
        setShares('');
        setSellShares('');
        setSelectedPortfolioStock(null);
        
        // Force immediate refresh
        await fetchBalance();
        await fetchTransactions();
        await fetchSoldStocks();
        
        // Force another refresh after a delay to ensure everything is updated
        setTimeout(() => {
          setRefreshKey(prev => prev + 1);
        }, 1000);
        
        return true;
      } else {
        setError(data.error || 'Failed to sell shares');
        return false;
      }
    } catch (error) {
      console.error('Error in executeSellTransaction:', error);
      setError('An error occurred while selling shares');
      return false;
    }
  };

  // Update the SellConfirmationDialog to use the direct sell function
  const SellConfirmationDialog = () => {
    const stockSymbol = selectedPortfolioStock ? selectedPortfolioStock.symbol : selectedStock;
    const stockPrice = selectedPortfolioStock ? selectedPortfolioStock.current_price : currentPrice;
    const sharesToSell = selectedPortfolioStock ? sellShares : shares;
    const [isProcessing, setIsProcessing] = useState(false);
    
    const handleConfirmSell = async () => {
      setIsProcessing(true);
      await executeSellTransaction(stockSymbol, sharesToSell);
      setIsProcessing(false);
    };
    
    return (
      <Dialog
        open={openSellConfirmation}
        onClose={() => !isProcessing && setOpenSellConfirmation(false)}
        PaperProps={{
          sx: {
            bgcolor: '#1a1a1a',
            color: 'white',
            borderRadius: 3,
            minWidth: '400px',
            backgroundImage: 'linear-gradient(to bottom, #242424, #1a1a1a)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
          }
        }}
      >
        <DialogTitle sx={{ 
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)', 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          flexDirection: 'column',
          background: 'linear-gradient(45deg, #2c2c2c, #242424)',
          py: 2.5
        }}>
          <Box sx={{ 
            width: 60, 
            height: 60, 
            bgcolor: '#1a1a1a', 
            borderRadius: '50%', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            mb: 2,
            border: '2px solid #ff5252'
          }}>
            <Typography 
              variant="h5" 
              sx={{ 
                fontWeight: 'bold', 
                color: '#ff5252',
                fontFamily: 'monospace'
              }}
            >
              $
            </Typography>
          </Box>
          <Typography variant="h6" sx={{ fontWeight: '500', color: '#fff', textAlign: 'center' }}>
            Confirm Sale
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ py: 3 }}>
          <Typography variant="body1" sx={{ color: '#e0e0e0', textAlign: 'center', mb: 2 }}>
            Are you sure you want to sell {sharesToSell} shares of {stockSymbol.toUpperCase()}?
          </Typography>
          <Box sx={{ 
            bgcolor: 'rgba(255, 82, 82, 0.1)', 
            p: 2, 
            borderRadius: 2,
            border: '1px solid rgba(255, 82, 82, 0.2)',
            mb: 2
          }}>
            <Typography variant="body2" sx={{ color: '#ff5252' }}>
              This action cannot be undone. The funds will be added to your balance immediately.
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" sx={{ color: '#9e9e9e' }}>
              Shares:
            </Typography>
            <Typography variant="body2" sx={{ color: '#e0e0e0', fontWeight: 'medium' }}>
              {sharesToSell}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" sx={{ color: '#9e9e9e' }}>
              Price per share:
            </Typography>
            <Typography variant="body2" sx={{ color: '#e0e0e0', fontWeight: 'medium' }}>
              ${stockPrice?.toFixed(2) || '0.00'}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" sx={{ color: '#9e9e9e' }}>
              Total value:
            </Typography>
            <Typography variant="body2" sx={{ color: '#69f0ae', fontWeight: 'bold' }}>
              ${((stockPrice || 0) * parseFloat(sharesToSell || '0')).toFixed(2)}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, display: 'flex', justifyContent: 'center', gap: 2 }}>
          <Button 
            onClick={() => setOpenSellConfirmation(false)}
            variant="outlined"
            disabled={isProcessing}
            sx={{ 
              color: '#e0e0e0',
              borderColor: '#e0e0e0',
              '&:hover': { 
                borderColor: '#fff',
                bgcolor: 'rgba(255, 255, 255, 0.05)'
              },
              px: 3
            }}
          >
            No, Cancel
          </Button>
          <Button 
            onClick={handleConfirmSell}
            variant="contained"
            disabled={isProcessing}
            startIcon={isProcessing ? <CircularProgress size={20} color="inherit" /> : null}
            sx={{
              bgcolor: '#ff5252',
              color: '#fff',
              '&:hover': { bgcolor: '#d32f2f' },
              px: 3,
              fontWeight: 'medium'
            }}
          >
            {isProcessing ? 'Processing...' : 'Yes, Sell Now'}
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  // Update the SellStockDialog to use the direct approach
  const SellStockDialog = () => {
    // Local state to prevent flickering
    const [localError, setLocalError] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    
    const handleLocalProceed = () => {
      setLocalError('');
      
      if (!selectedPortfolioStock) {
        setLocalError('Please select a stock from your portfolio');
        return;
      }
      
      if (!sellShares || isNaN(parseFloat(sellShares)) || parseFloat(sellShares) <= 0) {
        setLocalError('Please enter a valid number of shares');
        return;
      }
      
      if (parseFloat(sellShares) > selectedPortfolioStock.shares) {
        setLocalError(`You only own ${selectedPortfolioStock.shares} shares of ${selectedPortfolioStock.symbol}`);
        return;
      }
      
      // Close the sell dialog and open the confirmation dialog
      setOpenSellDialog(false);
      setOpenSellConfirmation(true);
    };
    
    // Add a direct sell option
    const handleDirectSell = async () => {
      setLocalError('');
      setIsProcessing(true);
      
      if (!selectedPortfolioStock) {
        setLocalError('Please select a stock from your portfolio');
        setIsProcessing(false);
        return;
      }
      
      if (!sellShares || isNaN(parseFloat(sellShares)) || parseFloat(sellShares) <= 0) {
        setLocalError('Please enter a valid number of shares');
        setIsProcessing(false);
        return;
      }
      
      if (parseFloat(sellShares) > selectedPortfolioStock.shares) {
        setLocalError(`You only own ${selectedPortfolioStock.shares} shares of ${selectedPortfolioStock.symbol}`);
        setIsProcessing(false);
        return;
      }
      
      // Execute sell directly
      const success = await executeSellTransaction(selectedPortfolioStock.symbol, sellShares);
      setIsProcessing(false);
      
      if (!success) {
        setOpenSellDialog(false); // Close dialog even on error to show the error message
      }
    };
    
    return (
      <Dialog
        open={openSellDialog}
        onClose={() => !isProcessing && setOpenSellDialog(false)}
        PaperProps={{
          sx: {
            bgcolor: '#1a1a1a',
            color: 'white',
            borderRadius: 3,
            minWidth: '400px',
            backgroundImage: 'linear-gradient(to bottom, #242424, #1a1a1a)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
          }
        }}
      >
        <DialogTitle sx={{ 
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)', 
          background: 'linear-gradient(45deg, #2c2c2c, #242424)',
          py: 2
        }}>
          <Typography variant="h6" sx={{ fontWeight: '500', color: '#fff' }}>
            Sell Stock from Your Portfolio
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ py: 3 }}>
          {localError && (
            <Alert 
              severity="error" 
              sx={{ 
                mb: 2, 
                bgcolor: 'rgba(211, 47, 47, 0.1)', 
                color: '#ff5252',
              '& .MuiAlert-icon': { color: '#ff5252' }
            }}
          >
            {localError}
          </Alert>
        )}
          
          <FormControl fullWidth variant="outlined" sx={{ mb: 3, mt: 1 }}>
            <InputLabel id="portfolio-stock-label" sx={{ color: '#9e9e9e' }}>Select Stock</InputLabel>
            <Select
              labelId="portfolio-stock-label"
              value={selectedPortfolioStock ? selectedPortfolioStock.symbol : ''}
              onChange={(e) => {
                const selectedSymbol = e.target.value;
                const stock = portfolio.find(item => item.symbol === selectedSymbol);
                handleSelectStockToSell(stock || null);
              }}
              disabled={isProcessing}
              label="Select Stock"
              sx={{
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(255, 255, 255, 0.2)',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(255, 255, 255, 0.3)',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#ff5252',
                },
                color: '#e0e0e0',
              }}
              MenuProps={{
                PaperProps: {
                  sx: {
                    bgcolor: '#242424',
                    color: '#e0e0e0',
                    '& .MuiMenuItem-root:hover': {
                      bgcolor: 'rgba(255, 82, 82, 0.1)',
                    },
                    '& .MuiMenuItem-root.Mui-selected': {
                      bgcolor: 'rgba(255, 82, 82, 0.2)',
                    },
                    '& .MuiMenuItem-root.Mui-selected:hover': {
                      bgcolor: 'rgba(255, 82, 82, 0.3)',
                    },
                  }
                }
              }}
            >
              {portfolio.map((stock) => (
                <MenuItem key={stock.symbol} value={stock.symbol}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                    <Typography>{stock.symbol}</Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                      <Typography variant="body2" sx={{ color: '#69f0ae' }}>{stock.shares} shares</Typography>
                      <Typography variant="caption" sx={{ color: '#9e9e9e' }}>${stock.current_price.toFixed(2)} per share</Typography>
                    </Box>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          {selectedPortfolioStock && (
            <>
              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" sx={{ color: '#9e9e9e', mb: 1 }}>
                  You own {selectedPortfolioStock.shares} shares of {selectedPortfolioStock.symbol}
                </Typography>
                <Typography variant="body2" sx={{ color: '#9e9e9e', mb: 2 }}>
                  Current value: ${selectedPortfolioStock.position_value.toFixed(2)}
                </Typography>
                
                <TextField
                  fullWidth
                  label="Number of Shares to Sell"
                  variant="outlined"
                  type="number"
                  value={sellShares}
                  onChange={(e) => setSellShares(e.target.value)}
                  disabled={isProcessing}
                  InputProps={{
                    inputProps: { 
                      min: 1, 
                      max: selectedPortfolioStock.shares,
                      step: 1
                    }
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '& fieldset': {
                        borderColor: 'rgba(255, 255, 255, 0.2)',
                      },
                      '&:hover fieldset': {
                        borderColor: 'rgba(255, 255, 255, 0.3)',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#ff5252',
                      },
                    },
                    '& .MuiInputLabel-root': {
                      color: '#9e9e9e',
                    },
                    '& .MuiInputBase-input': {
                      color: '#e0e0e0',
                    },
                  }}
                />
              </Box>
              
              <Box sx={{ 
                bgcolor: 'rgba(255, 255, 255, 0.05)', 
                p: 2, 
                borderRadius: 2,
                border: '1px solid rgba(255, 255, 255, 0.1)',
                mb: 2
              }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" sx={{ color: '#9e9e9e' }}>
                    Price per share:
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#e0e0e0' }}>
                    ${selectedPortfolioStock.current_price.toFixed(2)}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" sx={{ color: '#9e9e9e' }}>
                    Total sale value:
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#69f0ae', fontWeight: 'bold' }}>
                    ${(selectedPortfolioStock.current_price * parseFloat(sellShares || '0')).toFixed(2)}
                  </Typography>
                </Box>
              </Box>
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button 
            onClick={() => setOpenSellDialog(false)}
            disabled={isProcessing}
            sx={{ 
              color: '#9e9e9e',
              '&:hover': { color: '#e0e0e0' }
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleDirectSell}
            variant="contained"
            disabled={isProcessing || !selectedPortfolioStock || !sellShares || parseFloat(sellShares) <= 0 || parseFloat(sellShares) > (selectedPortfolioStock?.shares || 0)}
            startIcon={isProcessing ? <CircularProgress size={20} color="inherit" /> : null}
            sx={{
              bgcolor: '#ff5252',
              color: '#fff',
              '&:hover': { bgcolor: '#d32f2f' },
              '&.Mui-disabled': {
                bgcolor: 'rgba(255, 82, 82, 0.3)',
                color: 'rgba(255, 255, 255, 0.5)'
              }
            }}
          >
            {isProcessing ? 'Processing...' : 'Sell Now'}
          </Button>
        </DialogActions>
      </Dialog>
    );
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

      {/* Render the analysis dialog */}
      {analysisResult && <AnalysisResultDialog />}

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
          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
            <Typography variant="h6" sx={{ 
              mb: 2, 
              color: '#69f0ae',
              fontWeight: 'bold',
              fontSize: '1.1rem',
              borderBottom: '2px solid rgba(105, 240, 174, 0.3)',
              paddingBottom: '6px',
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
              p: 2,
              mb: 2,
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
                  endAdornment: selectedStockFromParent && selectedStockFromParent === selectedStock ? (
                    <Box component="span" sx={{ ml: 1, color: '#69f0ae', display: 'flex', alignItems: 'center' }}>
                      <CheckCircleIcon fontSize="small" />
                    </Box>
                  ) : null,
                  sx: { 
                    color: 'white',
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: selectedStockFromParent && selectedStockFromParent === selectedStock ? 
                        '#69f0ae' : 'rgba(255, 255, 255, 0.3)',
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
                size="small"
              />
              
              {/* Display current price if available */}
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
                      {isLoadingPrice ? (
                        <CircularProgress size={20} sx={{ color: '#69f0ae', mr: 1 }} />
                      ) : (
                        `$${currentPrice ? currentPrice.toFixed(2) : '0.00'}`
                      )}
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                      Daily Change
                    </Typography>
                    <Typography variant="body1" sx={{ 
                      color: priceChange && priceChange.value < 0 ? '#ff5252' : '#69f0ae',
                      fontWeight: 'medium',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end'
                    }}>
                      {priceChange && priceChange.value < 0 ? 
                        <ArrowDownwardIcon fontSize="small" sx={{ mr: 0.5 }} /> : 
                        <ArrowUpwardIcon fontSize="small" sx={{ mr: 0.5 }} />}
                      {priceChange ? priceChange.percentage : '+0.00%'}
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
              
              {/* Display total cost if both stock and shares are selected */}
              {selectedStock && shares && currentPrice && !isNaN(parseFloat(shares)) && (
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  bgcolor: 'rgba(255, 255, 255, 0.05)',
                  p: 2,
                  borderRadius: 1
                }}>
                  <Typography variant="body1" sx={{ color: '#fff' }}>
                    Total Cost:
                  </Typography>
                  <Typography variant="body1" sx={{ 
                    color: '#4caf50',
                    fontWeight: 'bold'
                  }}>
                    ${(currentPrice * parseFloat(shares)).toFixed(2)}
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
                        backgroundColor: '#69f0ae',
                      },
                    }}
                  />
                }
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Typography variant="body2" sx={{ color: 'white' }}>
                      Use ML Analysis
                    </Typography>
                    <Tooltip title="Analyze the stock using machine learning before buying to get a recommendation">
                      <InfoOutlinedIcon fontSize="small" sx={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '16px' }} />
                    </Tooltip>
                  </Box>
                }
                sx={{ mt: 1, mb: 1 }}
              />
            </Box>
            
            {useMLAnalysis && (
              <>
                <Box sx={{ 
                  mt: 2, 
                  mb: 2, 
                  p: 2, 
                  borderRadius: 2, 
                  bgcolor: 'rgba(26, 26, 26, 0.7)',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                }}>
                  <Typography variant="body2" sx={{ 
                    color: 'rgba(255, 255, 255, 0.7)', 
                    mb: 2,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                  }}>
                    <TimelineIcon fontSize="small" sx={{ color: '#69f0ae' }} />
                    Analysis Options
                  </Typography>
                  
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <FormControl variant="outlined" size="small" sx={{ width: '100%' }}>
                        <InputLabel id="analysis-days-label" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>Forecast Period</InputLabel>
                        <Select
                          labelId="analysis-days-label"
                          value={analysisDays}
                          onChange={(e) => setAnalysisDays(Number(e.target.value))}
                          label="Forecast Period"
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
                    </Grid>
                    
                    <Grid item xs={12} sm={6}>
                      <FormControl variant="outlined" size="small" sx={{ width: '100%' }}>
                        <InputLabel id="indicator-select-label" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>Technical Indicator</InputLabel>
                        <Select
                          labelId="indicator-select-label"
                          value={selectedIndicator}
                          onChange={(e) => setSelectedIndicator(e.target.value)}
                          label="Technical Indicator"
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
                          <MenuItem value="none">None</MenuItem>
                          <MenuItem value="sma">Simple Moving Average (SMA)</MenuItem>
                          <MenuItem value="macd">MACD</MenuItem>
                          <MenuItem value="rsi">Relative Strength Index (RSI)</MenuItem>
                          <MenuItem value="bollinger">Bollinger Bands</MenuItem>
                          <MenuItem value="atr">Average True Range (ATR)</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                  </Grid>
                </Box>
              </>
            )}
            
            <Box sx={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr', 
              gap: 2,
              mt: 2
            }}>
              <Button 
                variant="contained" 
                onClick={() => handleTrade('buy')}
                disabled={isAnalyzing}
                startIcon={isAnalyzing ? <CircularProgress size={20} /> : null}
                sx={{ 
                  bgcolor: '#69f0ae',
                  color: '#1a1a1a',
                  fontWeight: 'bold',
                  height: '48px',
                  fontSize: '16px',
                  borderRadius: '8px',
                  '&:hover': {
                    bgcolor: '#4caf50',
                  },
                  '&.Mui-disabled': {
                    bgcolor: 'rgba(105, 240, 174, 0.3)',
                    color: 'rgba(0, 0, 0, 0.5)'
                  }
                }}
              >
                {isAnalyzing ? 'Analyzing...' : 'BUY'}
              </Button>
              
              <Button
                variant="outlined"
                onClick={handleOpenSellDialog}
                sx={{
                  color: '#ff5252',
                  borderColor: '#ff5252',
                  height: '48px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  borderRadius: '8px',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 82, 82, 0.08)',
                    borderColor: '#ff5252'
                  }
                }}
              >
                SELL
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
          <TableContainer component={Paper} sx={{ mt: 3, bgcolor: '#1a1a1a', borderRadius: 2 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold', color: '#e0e0e0', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>Symbol</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold', color: '#e0e0e0', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>Shares</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold', color: '#e0e0e0', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>Current Price</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold', color: '#e0e0e0', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>Value</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {Array.isArray(portfolio) && portfolio.length > 0 ? (
                  portfolio.map((position, index) => (
                    <TableRow key={index}>
                      <TableCell sx={{ color: '#e0e0e0', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>{position.symbol}</TableCell>
                      <TableCell align="right" sx={{ color: '#e0e0e0', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>{position.shares}</TableCell>
                      <TableCell align="right" sx={{ color: '#e0e0e0', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>${position.current_price.toFixed(2)}</TableCell>
                      <TableCell align="right" sx={{ color: '#69f0ae', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>${position.position_value.toFixed(2)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ color: '#9e9e9e', py: 4 }}>
                      No positions in portfolio
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

      <Card sx={{ 
        mt: 4, 
        bgcolor: '#242424',
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
      }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ color: '#ff5252', fontWeight: 'medium', mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
            <TrendingDownIcon />
            Sold Stocks History
          </Typography>
          <TableContainer component={Paper} sx={{ bgcolor: '#1a1a1a', borderRadius: 2 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ color: '#9e9e9e', fontWeight: 500, borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>Date</TableCell>
                  <TableCell sx={{ color: '#9e9e9e', fontWeight: 500, borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>Symbol</TableCell>
                  <TableCell align="right" sx={{ color: '#9e9e9e', fontWeight: 500, borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>Shares</TableCell>
                  <TableCell align="right" sx={{ color: '#9e9e9e', fontWeight: 500, borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>Price</TableCell>
                  <TableCell align="right" sx={{ color: '#9e9e9e', fontWeight: 500, borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>Total</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {Array.isArray(soldStocks) && soldStocks.length > 0 ? (
                  soldStocks.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell sx={{ color: '#e0e0e0', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>{new Date(transaction.created_at).toLocaleDateString()}</TableCell>
                      <TableCell sx={{ color: '#e0e0e0', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>{transaction.symbol}</TableCell>
                      <TableCell align="right" sx={{ color: '#e0e0e0', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>{transaction.shares}</TableCell>
                      <TableCell align="right" sx={{ color: '#e0e0e0', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>${transaction.price.toFixed(2)}</TableCell>
                      <TableCell align="right" sx={{ color: '#ff5252', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>${transaction.total.toFixed(2)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ color: '#9e9e9e', py: 4 }}>No sold stocks history</TableCell>
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

      {/* Add the SellStockDialog component */}
      <SellStockDialog />

      {/* Add the SellConfirmationDialog component */}
      <SellConfirmationDialog />
    </Box>
  );
} 