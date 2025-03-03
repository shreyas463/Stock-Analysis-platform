'use client';

import React, { useState, useEffect } from 'react';
import { Box, Container, Typography, Paper, Button, CircularProgress, Grid, Divider, Fade, Tooltip, IconButton, Card, CardContent } from '@mui/material';
import SearchBar from '../components/SearchBar';
import StockChart from '@/components/StockChart';
import NewsSection from '../components/NewsSection';
import TradingPanel from '../components/TradingPanel';
import TopGainers from '../components/TopGainers';
import Discussion from '@/components/Discussion';
import StockerrLogo from '@/components/StockerrLogo';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import SearchIcon from '@mui/icons-material/Search';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import HomeIcon from '@mui/icons-material/Home';
import RefreshIcon from '@mui/icons-material/Refresh';
import DashboardIcon from '@mui/icons-material/Dashboard';
import BarChartIcon from '@mui/icons-material/BarChart';
import ForumIcon from '@mui/icons-material/Forum';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import TestComponent from '@/components/TestComponent';

const API_BASE_URL = 'http://localhost:5001';

export default function Home() {
  const [selectedStock, setSelectedStock] = useState<string | null>(null);
  const [stockData, setStockData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user, logout, isAuthenticated, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<'market' | 'discussion'>('market');
  const router = useRouter();

  // Function to reset to homepage view
  const resetToHomepage = () => {
    setSelectedStock(null);
    setStockData(null);
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
        bgcolor: 'grey.900'
      }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  // COMPLETELY NEW LAYOUT
  return (
    <Box sx={{ 
      display: 'flex',
      minHeight: '100vh',
      bgcolor: '#121212',
    }}>
      {/* Sidebar */}
      <Box sx={{ 
        width: 240, 
        bgcolor: '#1E1E1E', 
        borderRight: '1px solid #333',
        p: 2,
        display: 'flex',
        flexDirection: 'column'
      }}>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          mb: 4, 
          cursor: 'pointer',
          p: 2,
          borderRadius: 2,
          bgcolor: '#333',
          '&:hover': { bgcolor: '#444' }
        }} onClick={resetToHomepage}>
          <StockerrLogo size={40} />
          <Typography variant="h5" sx={{ ml: 2, color: '#fff', fontWeight: 'bold' }}>
            Stockerr
          </Typography>
        </Box>
        
        <Button 
          startIcon={<DashboardIcon />} 
          sx={{ 
            justifyContent: 'flex-start', 
            color: '#fff', 
            mb: 1,
            p: 1.5,
            borderRadius: 2,
            bgcolor: activeTab === 'market' ? '#ff5252' : 'transparent',
            '&:hover': { bgcolor: activeTab === 'market' ? '#ff5252' : '#333' }
          }}
          onClick={() => setActiveTab('market')}
        >
          Dashboard
        </Button>
        
        <Button 
          startIcon={<BarChartIcon />} 
          sx={{ 
            justifyContent: 'flex-start', 
            color: '#fff', 
            mb: 1,
            p: 1.5,
            borderRadius: 2,
            '&:hover': { bgcolor: '#333' }
          }}
        >
          Analytics
        </Button>
        
        <Button 
          startIcon={<ForumIcon />} 
          sx={{ 
            justifyContent: 'flex-start', 
            color: '#fff', 
            mb: 1,
            p: 1.5,
            borderRadius: 2,
            bgcolor: activeTab === 'discussion' ? '#ff5252' : 'transparent',
            '&:hover': { bgcolor: activeTab === 'discussion' ? '#ff5252' : '#333' }
          }}
          onClick={() => setActiveTab('discussion')}
        >
          Discussion
        </Button>
        
        <Box sx={{ flexGrow: 1 }} />
        
        <Button 
          startIcon={<ExitToAppIcon />} 
          sx={{ 
            justifyContent: 'flex-start', 
            color: '#ff5252', 
            p: 1.5,
            borderRadius: 2,
            '&:hover': { bgcolor: 'rgba(255, 82, 82, 0.1)' }
          }}
          onClick={logout}
        >
          Logout
        </Button>
      </Box>
      
      {/* Main Content */}
      <Box sx={{ flexGrow: 1, p: 3, overflow: 'auto' }}>
        <TestComponent />
        
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" sx={{ color: '#fff', mb: 2 }}>
            {selectedStock ? `${selectedStock} Dashboard` : 'Trading Dashboard'}
          </Typography>
          <SearchBar onStockSelect={(symbol: string) => setSelectedStock(symbol)} />
        </Box>
        
        {activeTab === 'market' ? (
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
                        Top Performers
                      </Typography>
                      <TopGainers />
                    </CardContent>
                  </Card>
                  
                  <Card sx={{ bgcolor: '#1E1E1E', borderRadius: 2 }}>
                    <CardContent>
                      <Typography variant="h6" sx={{ color: '#fff', mb: 2 }}>
                        Trade Stocks
                      </Typography>
                      <TradingPanel selectedStockFromParent={selectedStock} />
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
                    height: '100%',
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
                        <AccountBalanceWalletIcon sx={{ color: '#ff5252', mr: 1, fontSize: 28 }} />
                        <Typography variant="h6" sx={{ color: '#fff' }}>
                          Trading Platform
                        </Typography>
                      </Box>
                      
                      <Box sx={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        mb: 4,
                        p: 4,
                        borderRadius: 2,
                        bgcolor: '#2A2A2A',
                        border: '1px dashed #444'
                      }}>
                        <SearchIcon sx={{ fontSize: 48, color: '#ff5252', mb: 2 }} />
                        <Typography variant="h6" sx={{ color: '#fff', mb: 1, textAlign: 'center' }}>
                          Search for a stock above to view charts and news
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#aaa', textAlign: 'center' }}>
                          Meanwhile, you can manage your portfolio and place trades below
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
                    height: '100%',
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
                        <ShowChartIcon sx={{ color: '#ff5252', mr: 1, fontSize: 28 }} />
                        <Typography variant="h6" sx={{ color: '#fff' }}>
                          Top Performers
                        </Typography>
                      </Box>
                      <TopGainers />
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            )}
          </>
        ) : (
          <Card sx={{ bgcolor: '#1E1E1E', borderRadius: 2 }}>
            <CardContent>
              <Typography variant="h6" sx={{ color: '#fff', mb: 2 }}>
                Discussion Forum
              </Typography>
              <Discussion />
            </CardContent>
          </Card>
        )}
      </Box>
    </Box>
  );
} 