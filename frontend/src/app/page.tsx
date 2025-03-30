'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Box, Container, Typography, Paper, Button, CircularProgress, Grid, Divider, Fade, Tooltip, IconButton, Card, CardContent, Tabs, Tab } from '@mui/material';
import SearchBar from '../components/SearchBar';
import StockChart from '@/components/StockChart';
import NewsSection from '../components/NewsSection';
import TradingPanel from '../components/TradingPanel';
import TopGainers from '../components/TopGainers';
import Discussion from '@/components/Discussion';
import StockAnalysisLogo from '@/components/StockAnalysisLogo';
import PortfolioPieChart from '@/components/PortfolioPieChart';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { auth } from '@/firebase/firebase-setup';
import SearchIcon from '@mui/icons-material/Search';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import HomeIcon from '@mui/icons-material/Home';
import RefreshIcon from '@mui/icons-material/Refresh';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ForumIcon from '@mui/icons-material/Forum';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import PersonIcon from '@mui/icons-material/Person';
import ApiDebugger from '@/components/ApiDebugger';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

export default function Home() {
  const [selectedStock, setSelectedStock] = useState<string | null>(null);
  const [stockData, setStockData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user, logout, isAuthenticated, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<'market' | 'discussion' | 'profile'>('market');
  const router = useRouter();
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Portfolio data
  const [cashBalance, setCashBalance] = useState<number>(0);
  const [stocksValue, setStocksValue] = useState<number>(0);
  const [portfolio, setPortfolio] = useState<any[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  // Function to reset to homepage view
  const resetToHomepage = () => {
    setSelectedStock(null);
    setStockData(null);
    setActiveTab('market');
  };

  // Function to focus on search bar
  const focusOnSearch = () => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
      // Scroll to the search bar
      searchInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const fetchStockData = async (symbol: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_BASE_URL}/api/stock/${symbol}`);
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      setStockData(data);
      setSelectedStock(symbol);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to fetch stock data');
    } finally {
      setLoading(false);
    }
  };

  // Fetch real portfolio data from the API
  const fetchPortfolioData = async () => {
    try {
      const token = await auth.currentUser?.getIdToken(true);
      if (!token) {
        console.error('No token available');
        return;
      }
      
      const response = await fetch(`${API_BASE_URL}/api/trading/balance`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      console.log("Portfolio data received:", data);
      
      setCashBalance(data.cash_balance || 0);
      
      // Transform the portfolio data to match our frontend structure
      const transformedPortfolio = Array.isArray(data.portfolio) 
        ? data.portfolio.map((position: any) => ({
            symbol: position.symbol,
            shares: position.shares,
            currentPrice: position.current_price || 0,
            value: (position.shares * position.current_price) || 0
          }))
        : [];
      
      setPortfolio(transformedPortfolio);
      
      // Calculate stocks value from portfolio positions
      const calculatedStocksValue = Array.isArray(data.portfolio) 
        ? data.portfolio.reduce((total: number, position: any) => {
            return total + (position.shares * position.current_price || 0);
          }, 0) 
        : 0;
      
      console.log("Portfolio value calculated:", calculatedStocksValue);
      setStocksValue(calculatedStocksValue);
      
      // Force a refresh of the component
      setRefreshKey(oldKey => oldKey + 1);
    } catch (error) {
      console.error('Error fetching portfolio data:', error);
    }
  };
  
  useEffect(() => {
    if (isAuthenticated) {
      fetchPortfolioData();
      // Refresh portfolio data every 10 seconds
      const interval = setInterval(fetchPortfolioData, 10000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  if (isLoading) {
    return (
      <Box sx={{ 
        minHeight: '100vh', 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        bgcolor: '#1a1e2e'
      }}>
        <CircularProgress sx={{ color: '#4caf50' }} />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  // Profile component
  const ProfileSection = () => (
    <Box>
      <ApiDebugger />
      
      <Card sx={{ bgcolor: '#1E1E1E', borderRadius: 2, p: 2, mt: 4 }}>
        <CardContent>
          <Typography variant="h6" sx={{ color: '#4caf50', mb: 3, fontWeight: 600 }}>
            Profile Information
          </Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" sx={{ color: '#aaa', mb: 1 }}>
              Full Name
            </Typography>
            <Paper 
              sx={{ 
                p: 2, 
                bgcolor: '#2A2A2A', 
                borderRadius: 1, 
                mb: 3,
                border: '1px solid #333'
              }}
            >
              <Typography variant="body1" sx={{ color: '#fff' }}>
                {user?.username || user?.email?.split('@')[0] || 'Not provided'}
              </Typography>
            </Paper>
            
            <Typography variant="subtitle2" sx={{ color: '#aaa', mb: 1 }}>
              Email Address
            </Typography>
            <Paper 
              sx={{ 
                p: 2, 
                bgcolor: '#2A2A2A', 
                borderRadius: 1, 
                mb: 3,
                border: '1px solid #333'
              }}
            >
              <Typography variant="body1" sx={{ color: '#fff' }}>
                {user?.email || 'Not provided'}
              </Typography>
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" sx={{ color: '#aaa', mb: 1 }}>
              Account Type
            </Typography>
            <Paper 
              sx={{ 
                p: 2, 
                bgcolor: '#2A2A2A', 
                borderRadius: 1, 
                mb: 3,
                border: '1px solid #333'
              }}
            >
              <Typography variant="body1" sx={{ color: '#fff' }}>
                Standard
              </Typography>
            </Paper>
            
            <Typography variant="subtitle2" sx={{ color: '#aaa', mb: 1 }}>
              Member Since
            </Typography>
            <Paper 
              sx={{ 
                p: 2, 
                bgcolor: '#2A2A2A', 
                borderRadius: 1, 
                mb: 3,
                border: '1px solid #333'
              }}
            >
              <Typography variant="body1" sx={{ color: '#fff' }}>
                {new Date().toLocaleDateString()}
              </Typography>
            </Paper>
          </Grid>
          
          <Grid item xs={12}>
            <Button 
              variant="outlined" 
              sx={{ 
                color: '#4caf50', 
                borderColor: '#4caf50',
                '&:hover': {
                  borderColor: '#4caf50',
                  bgcolor: 'rgba(76, 175, 80, 0.1)'
                }
              }}
            >
              Edit Profile
            </Button>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
    </Box>
  );

  return (
    <Box sx={{ 
      minHeight: '100vh',
      bgcolor: '#1a1e2e',
      p: 3
    }}>
      <Box sx={{ mb: 4 }}>
        <Typography 
          variant="h4" 
          sx={{ 
            color: '#4caf50', 
            mb: 3, 
            fontWeight: 500,
            cursor: 'pointer' 
          }}
          onClick={resetToHomepage}
        >
          Dashboard
        </Typography>
        
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3
        }}>
          <Box sx={{ width: '100%', maxWidth: 600 }}>
            <SearchBar 
              onStockSelect={(symbol: string) => setSelectedStock(symbol)} 
              inputRef={searchInputRef}
            />
          </Box>
          
          <Box>
            <Button 
              variant="contained" 
              sx={{ 
                bgcolor: activeTab === 'market' ? '#4caf50' : 'transparent',
                color: '#fff',
                mr: 1,
                '&:hover': {
                  bgcolor: activeTab === 'market' ? '#4caf50' : 'rgba(255, 255, 255, 0.1)'
                }
              }}
              onClick={() => {
                setActiveTab('market');
                resetToHomepage();
              }}
            >
              MARKET
            </Button>
            
            <Button 
              variant="contained" 
              sx={{ 
                bgcolor: activeTab === 'discussion' ? '#4caf50' : 'transparent',
                color: '#fff',
                mr: 1,
                '&:hover': {
                  bgcolor: activeTab === 'discussion' ? '#4caf50' : 'rgba(255, 255, 255, 0.1)'
                }
              }}
              onClick={() => setActiveTab('discussion')}
            >
              DISCUSSION
            </Button>
            
            <Button 
              variant="contained" 
              sx={{ 
                bgcolor: activeTab === 'profile' ? '#4caf50' : 'transparent',
                color: '#fff',
                mr: 1,
                '&:hover': {
                  bgcolor: activeTab === 'profile' ? '#4caf50' : 'rgba(255, 255, 255, 0.1)'
                }
              }}
              onClick={() => setActiveTab('profile')}
            >
              PROFILE
            </Button>
            
            <Button 
              variant="outlined" 
              sx={{ 
                color: '#ff5252',
                borderColor: '#ff5252',
                '&:hover': {
                  borderColor: '#ff5252',
                  bgcolor: 'rgba(255, 82, 82, 0.1)'
                }
              }}
              onClick={logout}
            >
              LOGOUT
            </Button>
          </Box>
        </Box>
      </Box>
      
      {activeTab === 'market' && (
        <>
          {selectedStock ? (
            // After stock search - Grid layout
            <Grid container spacing={3}>
              <Grid item xs={12} lg={8}>
                <Card sx={{ bgcolor: '#1E1E1E', mb: 3, borderRadius: 2 }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ color: '#fff', mb: 2 }}>
                      {selectedStock} Stock Chart
                    </Typography>
                    <StockChart symbol={selectedStock} />
                  </CardContent>
                </Card>
                
                <Card sx={{ bgcolor: '#1E1E1E', borderRadius: 2 }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ color: '#fff', mb: 2 }}>
                      Latest News
                    </Typography>
                    <NewsSection symbol={selectedStock} />
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} lg={4}>
                <Card sx={{ bgcolor: '#1E1E1E', mb: 3, borderRadius: 2 }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ color: '#fff', mb: 2 }}>
                      Trade Stocks
                    </Typography>
                    <TradingPanel selectedStockFromParent={selectedStock} />
                  </CardContent>
                </Card>

                <Card sx={{ 
                  bgcolor: '#1E1E1E', 
                  borderRadius: 2,
                  border: '1px solid #333'
                }}>
                  <CardContent>
                    <PortfolioPieChart 
                      cashBalance={cashBalance} 
                      stocksValue={stocksValue} 
                    />
                  </CardContent>
                </Card>

                <Card sx={{ 
                  bgcolor: '#1E1E1E', 
                  borderRadius: 2,
                  border: '1px solid #333',
                  mt: 3
                }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ color: '#fff', mb: 2 }}>
                      Your Portfolio
                    </Typography>
                    
                    {portfolio.length > 0 ? (
                      <Box>
                        <Box sx={{ 
                          display: 'grid', 
                          gridTemplateColumns: '1fr 1fr 1fr 1fr', 
                          borderBottom: '1px solid #333',
                          pb: 1,
                          mb: 1
                        }}>
                          <Typography variant="body2" sx={{ color: '#aaa' }}>Symbol</Typography>
                          <Typography variant="body2" sx={{ color: '#aaa', textAlign: 'right' }}>Shares</Typography>
                          <Typography variant="body2" sx={{ color: '#aaa', textAlign: 'right' }}>Price</Typography>
                          <Typography variant="body2" sx={{ color: '#aaa', textAlign: 'right' }}>Value</Typography>
                        </Box>
                        
                        {portfolio.map((stock) => (
                          <Box 
                            key={stock.symbol}
                            sx={{ 
                              display: 'grid', 
                              gridTemplateColumns: '1fr 1fr 1fr 1fr',
                              py: 1,
                              borderBottom: '1px solid rgba(255,255,255,0.05)'
                            }}
                          >
                            <Typography variant="body1" sx={{ color: '#fff', fontWeight: 'medium' }}>
                              {stock.symbol}
                            </Typography>
                            <Typography variant="body1" sx={{ color: '#fff', textAlign: 'right' }}>
                              {stock.shares}
                            </Typography>
                            <Typography variant="body1" sx={{ color: '#fff', textAlign: 'right' }}>
                              ${(stock.currentPrice || 0).toFixed(2)}
                            </Typography>
                            <Typography variant="body1" sx={{ color: '#4caf50', textAlign: 'right', fontWeight: 'medium' }}>
                              ${(stock.value || 0).toFixed(2)}
                            </Typography>
                          </Box>
                        ))}
                        
                        <Box sx={{ 
                          display: 'flex', 
                          justifyContent: 'space-between',
                          mt: 2,
                          pt: 1,
                          borderTop: '1px solid #333'
                        }}>
                          <Typography variant="body1" sx={{ color: '#fff', fontWeight: 'medium' }}>
                            Total Portfolio Value:
                          </Typography>
                          <Typography variant="body1" sx={{ color: '#4caf50', fontWeight: 'bold' }}>
                            ${(cashBalance + stocksValue).toFixed(2)}
                          </Typography>
                        </Box>
                      </Box>
                    ) : (
                      <Box sx={{ textAlign: 'center', py: 2 }}>
                        <Typography variant="body1" sx={{ color: '#aaa' }}>
                          You don't own any stocks yet.
                        </Typography>
                        <Button 
                          variant="contained" 
                          sx={{ 
                            mt: 2, 
                            bgcolor: '#4caf50',
                            '&:hover': {
                              bgcolor: '#3d8b40'
                            }
                          }}
                          onClick={focusOnSearch}
                        >
                          START TRADING
                        </Button>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          ) : (
            // Before stock search - Different layout
            <Grid container spacing={3}>
              <Grid item xs={12} md={7}>
                <Card sx={{ 
                  bgcolor: '#1E1E1E', 
                  borderRadius: 2,
                  border: '1px solid #333'
                }}>
                  <CardContent>
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      mb: 3,
                      pb: 2,
                      borderBottom: '1px solid #333'
                    }}>
                      <AccountBalanceWalletIcon sx={{ color: '#4caf50', mr: 1, fontSize: 28 }} />
                      <Typography variant="h6" sx={{ color: '#fff' }}>
                        Trade Stocks
                      </Typography>
                    </Box>
                    
                    <TradingPanel selectedStockFromParent={selectedStock} />
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} md={5}>
                <Card sx={{ 
                  bgcolor: '#1E1E1E', 
                  borderRadius: 2,
                  border: '1px solid #333',
                  mb: 3
                }}>
                  <CardContent>
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      mb: 3,
                      pb: 2,
                      borderBottom: '1px solid #333'
                    }}>
                      <ShowChartIcon sx={{ color: '#4caf50', mr: 1, fontSize: 28 }} />
                      <Typography variant="h6" sx={{ color: '#fff' }}>
                        Market Overview
                      </Typography>
                    </Box>
                    <TopGainers maxItems={5} />
                  </CardContent>
                </Card>

                <Card sx={{ 
                  bgcolor: '#1E1E1E', 
                  borderRadius: 2,
                  border: '1px solid #333'
                }}>
                  <CardContent>
                    <PortfolioPieChart 
                      cashBalance={cashBalance} 
                      stocksValue={stocksValue} 
                    />
                  </CardContent>
                </Card>

                <Card sx={{ 
                  bgcolor: '#1E1E1E', 
                  borderRadius: 2,
                  border: '1px solid #333',
                  mt: 3
                }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ color: '#fff', mb: 2 }}>
                      Your Portfolio
                    </Typography>
                    
                    {portfolio.length > 0 ? (
                      <Box>
                        <Box sx={{ 
                          display: 'grid', 
                          gridTemplateColumns: '1fr 1fr 1fr 1fr', 
                          borderBottom: '1px solid #333',
                          pb: 1,
                          mb: 1
                        }}>
                          <Typography variant="body2" sx={{ color: '#aaa' }}>Symbol</Typography>
                          <Typography variant="body2" sx={{ color: '#aaa', textAlign: 'right' }}>Shares</Typography>
                          <Typography variant="body2" sx={{ color: '#aaa', textAlign: 'right' }}>Price</Typography>
                          <Typography variant="body2" sx={{ color: '#aaa', textAlign: 'right' }}>Value</Typography>
                        </Box>
                        
                        {portfolio.map((stock) => (
                          <Box 
                            key={stock.symbol}
                            sx={{ 
                              display: 'grid', 
                              gridTemplateColumns: '1fr 1fr 1fr 1fr',
                              py: 1,
                              borderBottom: '1px solid rgba(255,255,255,0.05)'
                            }}
                          >
                            <Typography variant="body1" sx={{ color: '#fff', fontWeight: 'medium' }}>
                              {stock.symbol}
                            </Typography>
                            <Typography variant="body1" sx={{ color: '#fff', textAlign: 'right' }}>
                              {stock.shares}
                            </Typography>
                            <Typography variant="body1" sx={{ color: '#fff', textAlign: 'right' }}>
                              ${(stock.currentPrice || 0).toFixed(2)}
                            </Typography>
                            <Typography variant="body1" sx={{ color: '#4caf50', textAlign: 'right', fontWeight: 'medium' }}>
                              ${(stock.value || 0).toFixed(2)}
                            </Typography>
                          </Box>
                        ))}
                        
                        <Box sx={{ 
                          display: 'flex', 
                          justifyContent: 'space-between',
                          mt: 2,
                          pt: 1,
                          borderTop: '1px solid #333'
                        }}>
                          <Typography variant="body1" sx={{ color: '#fff', fontWeight: 'medium' }}>
                            Total Portfolio Value:
                          </Typography>
                          <Typography variant="body1" sx={{ color: '#4caf50', fontWeight: 'bold' }}>
                            ${(stocksValue).toFixed(2)}
                          </Typography>
                        </Box>
                      </Box>
                    ) : (
                      <Box sx={{ textAlign: 'center', py: 2 }}>
                        <Typography variant="body1" sx={{ color: '#aaa' }}>
                          You don't own any stocks yet.
                        </Typography>
                        <Button 
                          variant="contained" 
                          sx={{ 
                            mt: 2, 
                            bgcolor: '#4caf50',
                            '&:hover': {
                              bgcolor: '#3d8b40'
                            }
                          }}
                          onClick={focusOnSearch}
                        >
                          START TRADING
                        </Button>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}
        </>
      )}
      
      {activeTab === 'discussion' && (
        <Card sx={{ bgcolor: '#1E1E1E', borderRadius: 2 }}>
          <CardContent>
            <Typography variant="h6" sx={{ color: '#fff', mb: 2 }}>
              Discussion Forum
            </Typography>
            <Discussion />
          </CardContent>
        </Card>
      )}
      
      {activeTab === 'profile' && <ProfileSection />}
    </Box>
  );
} 