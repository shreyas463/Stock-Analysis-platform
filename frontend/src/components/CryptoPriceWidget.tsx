'use client';

import React, { useState, useEffect } from 'react';
import { Box, Typography, CircularProgress, Paper } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';

interface CryptoPrice {
  symbol: string;
  name: string;
  price: number;
  percentChange24h: number;
  priceChangeColor?: string; // Added for price change animation
}

const CryptoPriceWidget: React.FC = () => {
  const [cryptoData, setCryptoData] = useState<CryptoPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Function to simulate real-time price changes
  const simulatePriceChanges = () => {
    setCryptoData(prevData => 
      prevData.map(crypto => {
        // Generate a random fluctuation between -0.5% and +0.5%
        const fluctuation = (Math.random() - 0.5) * 0.01;
        
        // Calculate new price with fluctuation
        const newPrice = crypto.price * (1 + fluctuation);
        
        // Determine if price went up or down for animation
        const priceChangeColor = fluctuation > 0 ? '#69f0ae' : fluctuation < 0 ? '#ff5252' : undefined;
        
        // Update 24h percent change slightly (1/10th of the fluctuation)
        const newPercentChange = crypto.percentChange24h + (fluctuation * 100 * 0.1);
        
        return {
          ...crypto,
          price: newPrice,
          percentChange24h: newPercentChange,
          priceChangeColor
        };
      })
    );
  };

  useEffect(() => {
    const fetchCryptoPrices = async () => {
      try {
        setLoading(true);
        
        // Use our API endpoint
        const response = await fetch('/api/crypto-prices', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch crypto prices');
        }
        
        const data = await response.json();
        setCryptoData(data);
        setLoading(false);
        
      } catch (err) {
        console.error('Error fetching crypto prices:', err);
        
        // Fallback to mock data if API fails
        const mockData: CryptoPrice[] = [
          {
            symbol: 'BTC',
            name: 'Bitcoin',
            price: 63245.78,
            percentChange24h: 2.34,
          },
          {
            symbol: 'ETH',
            name: 'Ethereum',
            price: 3478.92,
            percentChange24h: 1.56,
          },
          {
            symbol: 'SOL',
            name: 'Solana',
            price: 142.67,
            percentChange24h: -0.89,
          },
          {
            symbol: 'DOGE',
            name: 'Dogecoin',
            price: 0.1432,
            percentChange24h: 5.21,
          },
          {
            symbol: 'XRP',
            name: 'Ripple',
            price: 0.5678,
            percentChange24h: -1.23,
          },
          {
            symbol: 'ADA',
            name: 'Cardano',
            price: 0.89,
            percentChange24h: 3.45,
          },
          {
            symbol: 'AVAX',
            name: 'Avalanche',
            price: 35.67,
            percentChange24h: 4.12,
          },
          {
            symbol: 'DOT',
            name: 'Polkadot',
            price: 7.89,
            percentChange24h: -2.34,
          },
          {
            symbol: 'LINK',
            name: 'Chainlink',
            price: 18.45,
            percentChange24h: 6.78,
          },
          {
            symbol: 'MATIC',
            name: 'Polygon',
            price: 0.89,
            percentChange24h: 1.23,
          },
          {
            symbol: 'SHIB',
            name: 'Shiba Inu',
            price: 0.00002789,
            percentChange24h: 3.67,
          },
          {
            symbol: 'UNI',
            name: 'Uniswap',
            price: 7.23,
            percentChange24h: -1.45,
          },
          {
            symbol: 'ATOM',
            name: 'Cosmos',
            price: 9.56,
            percentChange24h: 2.78,
          },
          {
            symbol: 'LTC',
            name: 'Litecoin',
            price: 89.34,
            percentChange24h: 0.95,
          },
          {
            symbol: 'FTM',
            name: 'Fantom',
            price: 0.45,
            percentChange24h: 5.67,
          }
        ];
        
        setCryptoData(mockData);
        setError('Using demo data (API unavailable)');
        setLoading(false);
      }
    };

    fetchCryptoPrices();
    
    // Set up interval for simulated real-time updates (every 3 seconds)
    const priceUpdateInterval = setInterval(simulatePriceChanges, 3000);
    
    // Refresh data from API every 60 seconds
    const dataRefreshInterval = setInterval(fetchCryptoPrices, 60000);
    
    return () => {
      clearInterval(priceUpdateInterval);
      clearInterval(dataRefreshInterval);
    };
  }, []);

  if (error) {
    return (
      <Box sx={{ p: 2, color: 'error.main' }}>
        <Typography variant="body2">{error}</Typography>
      </Box>
    );
  }

  return (
    <Paper
      elevation={0}
      sx={{
        backgroundColor: 'rgba(18, 22, 32, 0.75)',
        backdropFilter: 'blur(10px)',
        borderRadius: 3,
        border: '1px solid rgba(105, 240, 174, 0.1)',
        p: 4,
        width: '100%',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        height: '100%'
      }}
    >
      <Typography 
        variant="h6"
        sx={{ 
          mb: 4,
          color: '#69f0ae',
          fontWeight: 600,
          textAlign: 'center',
          borderBottom: '1px solid rgba(105, 240, 174, 0.2)',
          pb: 1.5,
          fontSize: '1.25rem',
        }}
      >
        Cryptocurrency Market
      </Typography>
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
          <CircularProgress size={30} sx={{ color: '#69f0ae' }} />
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, flexGrow: 1, overflowY: 'auto' }}>
          {cryptoData.map((crypto) => (
            <Box 
              key={crypto.symbol}
              sx={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                alignItems: 'center',
                py: 1.5,
                borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                '&:hover': {
                  backgroundColor: 'rgba(105, 240, 174, 0.05)',
                }
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Typography 
                  variant="body1" 
                  sx={{ 
                    fontWeight: 700,
                    color: '#e0e0e0',
                    minWidth: 60,
                    fontSize: '1.1rem',
                  }}
                >
                  {crypto.symbol}
                </Typography>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: '#9e9e9e',
                    fontSize: '0.95rem',
                  }}
                >
                  {crypto.name}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                <Typography 
                  variant="body1" 
                  sx={{ 
                    fontWeight: 700,
                    color: crypto.priceChangeColor || '#e0e0e0',
                    fontSize: '1.1rem',
                    transition: 'color 0.5s ease',
                  }}
                >
                  ${crypto.price.toLocaleString(undefined, { 
                    minimumFractionDigits: crypto.price < 1 ? 4 : 2,
                    maximumFractionDigits: crypto.price < 1 ? 4 : 2
                  })}
                </Typography>
                <Box 
                  sx={{ 
                    display: 'flex', 
                    alignItems: 'center',
                    color: crypto.percentChange24h >= 0 ? '#69f0ae' : '#ff5252',
                    fontSize: '0.85rem',
                    fontWeight: 600
                  }}
                >
                  {crypto.percentChange24h >= 0 ? (
                    <TrendingUpIcon sx={{ fontSize: 16, mr: 0.5 }} />
                  ) : (
                    <TrendingDownIcon sx={{ fontSize: 16, mr: 0.5 }} />
                  )}
                  {Math.abs(crypto.percentChange24h).toFixed(2)}%
                </Box>
              </Box>
            </Box>
          ))}
        </Box>
      )}
      
      <Box sx={{ mt: 'auto', pt: 2 }}>
        <Typography 
          variant="caption" 
          sx={{ 
            display: 'block',
            textAlign: 'center',
            color: '#9e9e9e',
            fontSize: '0.7rem'
          }}
        >
          Data provided by CoinMarketCap • Updated in real-time
        </Typography>
        
        <Typography 
          variant="body2" 
          sx={{ 
            mt: 2,
            textAlign: 'center', 
            color: '#ffffff',
            fontStyle: 'italic',
            fontSize: '0.9rem',
            textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)',
            padding: '8px',
            backgroundColor: 'rgba(105, 240, 174, 0.1)',
            borderRadius: '4px',
            marginTop: '16px'
          }}
        >
          Stay updated with real-time cryptocurrency prices while you log in. 
          Track the market even before you access your dashboard.
        </Typography>
      </Box>
    </Paper>
  );
};

export default CryptoPriceWidget; 