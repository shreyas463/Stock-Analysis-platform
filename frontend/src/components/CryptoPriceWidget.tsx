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
  logo?: string;
}

const CryptoPriceWidget: React.FC = () => {
  const [cryptoData, setCryptoData] = useState<CryptoPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
          }
        ];
        
        setCryptoData(mockData);
        setError('Using demo data (API unavailable)');
        setLoading(false);
      }
    };

    fetchCryptoPrices();
    
    // Refresh data every 60 seconds
    const intervalId = setInterval(fetchCryptoPrices, 60000);
    
    return () => clearInterval(intervalId);
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
        p: 3,
        width: '100%',
        overflow: 'hidden',
      }}
    >
      <Typography 
        variant="subtitle1" 
        sx={{ 
          mb: 3, 
          color: '#69f0ae',
          fontWeight: 600,
          textAlign: 'center',
          borderBottom: '1px solid rgba(105, 240, 174, 0.2)',
          pb: 1
        }}
      >
        Cryptocurrency Market
      </Typography>
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
          <CircularProgress size={24} sx={{ color: '#69f0ae' }} />
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {cryptoData.map((crypto) => (
            <Box 
              key={crypto.symbol}
              sx={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                alignItems: 'center',
                py: 1,
                borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Typography 
                  variant="body1" 
                  sx={{ 
                    fontWeight: 700,
                    color: '#e0e0e0',
                    minWidth: 50
                  }}
                >
                  {crypto.symbol}
                </Typography>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: '#9e9e9e',
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
                    color: '#e0e0e0'
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
                    fontSize: '0.75rem',
                    fontWeight: 600
                  }}
                >
                  {crypto.percentChange24h >= 0 ? (
                    <TrendingUpIcon sx={{ fontSize: 14, mr: 0.5 }} />
                  ) : (
                    <TrendingDownIcon sx={{ fontSize: 14, mr: 0.5 }} />
                  )}
                  {Math.abs(crypto.percentChange24h).toFixed(2)}%
                </Box>
              </Box>
            </Box>
          ))}
        </Box>
      )}
      
      <Typography 
        variant="caption" 
        sx={{ 
          display: 'block',
          textAlign: 'center',
          mt: 2,
          color: '#9e9e9e',
          fontSize: '0.65rem'
        }}
      >
        Data provided by CoinMarketCap
      </Typography>
    </Paper>
  );
};

export default CryptoPriceWidget; 