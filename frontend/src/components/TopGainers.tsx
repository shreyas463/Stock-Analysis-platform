'use client';

import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, Skeleton, Chip } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ShowChartIcon from '@mui/icons-material/ShowChart';

const API_BASE_URL = 'http://localhost:5001';

interface GainerStock {
  symbol: string;
  price: number;
  change: number;
}

interface TopGainersProps {
  maxItems?: number;
  onSelectStock?: (symbol: string) => void;
}

// Fallback data in case the API doesn't return any stocks
const fallbackGainers: GainerStock[] = [
  { symbol: 'AAPL', price: 241.84, change: 1.91 },
  { symbol: 'MSFT', price: 425.22, change: 1.45 },
  { symbol: 'GOOGL', price: 175.98, change: 0.89 },
  { symbol: 'AMZN', price: 182.30, change: 0.57 },
  { symbol: 'NVDA', price: 950.02, change: 2.35 }
];

const TopGainers: React.FC<TopGainersProps> = ({ maxItems = 10, onSelectStock }) => {
  // Initialize with fallback data immediately
  const [gainers, setGainers] = useState<GainerStock[]>(fallbackGainers);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchGainers = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/market/top-gainers`);
        const data = await response.json();
        
        // Use the API data if available, otherwise keep using fallback data
        if (data && Array.isArray(data) && data.length > 0) {
          setGainers(data);
        } else {
          console.log('No gainers data from API, using fallback data');
          // Keep using fallback data (already set in state)
        }
      } catch (error) {
        console.error('Error fetching top gainers:', error);
        // Keep using fallback data (already set in state)
      }
    };

    // Try to fetch real data, but we already have fallback data displayed
    fetchGainers();
    const interval = setInterval(fetchGainers, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  // Limit the number of gainers displayed based on maxItems prop
  const displayedGainers = maxItems ? gainers.slice(0, maxItems) : gainers;

  // Add a function to handle stock selection
  const handleStockClick = (symbol: string) => {
    if (onSelectStock) {
      onSelectStock(symbol);
    }
  };

  return (
    <Box>
      {/* Stocks list */}
      <Box>
        {loading ? (
          // Loading skeletons
          Array.from(new Array(5)).map((_, index) => (
            <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Skeleton variant="rectangular" width={60} height={24} sx={{ mr: 2 }} />
              <Skeleton variant="rectangular" width={80} height={24} sx={{ mr: 2 }} />
              <Skeleton variant="rectangular" width={60} height={24} />
            </Box>
          ))
        ) : (
          // Actual data
          displayedGainers.map((stock, index) => (
            <Box 
              key={index}
              sx={{ 
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                py: 1.5,
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                cursor: onSelectStock ? 'pointer' : 'default',
                '&:hover': {
                  bgcolor: onSelectStock ? 'rgba(255,255,255,0.05)' : 'transparent'
                }
              }}
              onClick={() => onSelectStock && handleStockClick(stock.symbol)}
            >
              <Box>
                <Typography variant="subtitle1" sx={{ color: '#e0e0e0', fontWeight: 'bold' }}>
                  {stock.symbol}
                </Typography>
                <Typography variant="body2" sx={{ color: '#9e9e9e' }}>
                  ${stock.price.toFixed(2)}
                </Typography>
              </Box>
              <Chip
                icon={<ArrowUpwardIcon fontSize="small" />}
                label={`+${stock.change.toFixed(2)}%`}
                sx={{
                  bgcolor: 'rgba(105, 240, 174, 0.1)',
                  color: '#69f0ae',
                  fontWeight: 'bold',
                  border: '1px solid rgba(105, 240, 174, 0.2)'
                }}
                size="small"
              />
            </Box>
          ))
        )}
      </Box>
    </Box>
  );
};

export default TopGainers; 