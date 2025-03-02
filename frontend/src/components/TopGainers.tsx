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

// Fallback data in case the API doesn't return any stocks
const fallbackGainers: GainerStock[] = [
  { symbol: 'AAPL', price: 241.84, change: 1.91 },
  { symbol: 'MSFT', price: 425.22, change: 1.45 },
  { symbol: 'GOOGL', price: 175.98, change: 0.89 },
  { symbol: 'AMZN', price: 182.30, change: 0.57 },
  { symbol: 'NVDA', price: 950.02, change: 2.35 }
];

const TopGainers: React.FC = () => {
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

  // We don't need a loading state anymore since we initialize with fallback data
  return (
    <Box>
      {/* Title with icon */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <ShowChartIcon sx={{ color: '#69f0ae', mr: 1 }} />
        <Typography variant="h6" sx={{ color: '#e0e0e0', fontWeight: 'bold' }}>
          Top Performers
        </Typography>
      </Box>
      
      {/* Stocks list */}
      <Box>
        {gainers.map((stock, index) => (
          <Paper
            key={index}
            sx={{
              p: 1.5,
              mb: 1.5,
              bgcolor: '#1E2132',
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'rgba(255, 255, 255, 0.05)',
              transition: 'all 0.2s',
              '&:hover': {
                bgcolor: '#252A3D',
                transform: 'translateY(-2px)',
                boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)'
              },
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
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
          </Paper>
        ))}
      </Box>
    </Box>
  );
};

export default TopGainers; 