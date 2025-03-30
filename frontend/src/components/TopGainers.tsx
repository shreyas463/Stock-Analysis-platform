'use client';

import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, Skeleton, Chip } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

interface GainerStock {
  symbol: string;
  price: number;
  change: number;
}

interface TopGainersProps {
  maxItems?: number;
}

// Fallback data in case the API doesn't return any stocks
const fallbackGainers: GainerStock[] = [
  { symbol: 'AAPL', price: 241.84, change: 1.91 },
  { symbol: 'MSFT', price: 425.22, change: 1.45 },
  { symbol: 'GOOGL', price: 175.98, change: 0.89 },
  { symbol: 'AMZN', price: 182.30, change: 0.57 },
  { symbol: 'NVDA', price: 950.02, change: 2.35 }
];

const TopGainers: React.FC<TopGainersProps> = ({ maxItems = 5 }) => {
  const [gainers, setGainers] = useState<GainerStock[]>(fallbackGainers);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchGainers = async () => {
      setLoading(true);
      try {
        console.log('Fetching top gainers data...');
        const response = await fetch(`${API_BASE_URL}/api/market/top-gainers`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Received data:', data);
        
        if (data && Array.isArray(data) && data.length > 0) {
          console.log('Updating gainers with new data');
          setGainers(data);
        } else {
          console.log('No gainers data from API, using fallback data');
        }
      } catch (error) {
        console.error('Error fetching top gainers:', error);
      } finally {
        setLoading(false);
      }
    };

    // Initial fetch
    fetchGainers();
    
    // Set up polling every 5 seconds for more frequent updates
    const intervalId = setInterval(fetchGainers, 5000);
    console.log('Set up polling interval for top gainers');
    
    return () => {
      console.log('Cleaning up polling interval');
      clearInterval(intervalId);
    };
  }, []);

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        bgcolor: 'transparent',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: 2,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <TrendingUpIcon sx={{ mr: 1, color: '#4CAF50' }} />
        <Typography variant="h6" component="h2" sx={{ color: '#fff' }}>
          Market Overview
        </Typography>
      </Box>

      {loading ? (
        Array.from({ length: maxItems }).map((_, index) => (
          <Box
            key={`skeleton-${index}`}
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              py: 1,
              borderBottom:
                index < maxItems - 1
                  ? '1px solid rgba(255, 255, 255, 0.1)'
                  : 'none',
            }}
          >
            <Skeleton width={60} height={24} />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Skeleton width={80} height={24} />
              <Skeleton width={60} height={24} />
            </Box>
          </Box>
        ))
      ) : (
        gainers.slice(0, maxItems).map((stock, index) => (
          <Box
            key={stock.symbol}
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              py: 1,
              borderBottom:
                index < maxItems - 1
                  ? '1px solid rgba(255, 255, 255, 0.1)'
                  : 'none',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography
                variant="body1"
                sx={{ color: '#fff', fontWeight: 'medium' }}
              >
                {stock.symbol}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography
                variant="body1"
                sx={{ color: '#fff', mr: 2, textAlign: 'right' }}
              >
                ${stock.price.toFixed(2)}
              </Typography>
              <Chip
                icon={<ArrowUpwardIcon />}
                label={`+${stock.change.toFixed(2)}%`}
                size="small"
                sx={{
                  bgcolor: 'rgba(76, 175, 80, 0.1)',
                  color: '#4CAF50',
                  '& .MuiChip-icon': { color: '#4CAF50' },
                }}
              />
            </Box>
          </Box>
        ))
      )}
    </Paper>
  );
};

export default TopGainers; 