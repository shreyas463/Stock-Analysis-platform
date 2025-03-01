'use client';

import React, { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { Box, CircularProgress, Alert } from '@mui/material';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface StockChartProps {
  symbol: string;
}

interface StockData {
  quote: {
    c: number;
    d: number;
    dp: number;
    h: number;
    l: number;
    o: number;
    pc: number;
  };
  historical: {
    date: string;
    close: string;
  }[];
}

export default function StockChart({ symbol }: StockChartProps) {
  const [data, setData] = useState<StockData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!symbol) return;
      
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`http://localhost:5001/api/stock/${symbol}`);
        const result = await response.json();
        
        if (response.ok && result.quote && result.historical) {
          setData(result);
          setError(null);
        } else {
          setError(result.error || 'Failed to fetch stock data');
          // Keep old data visible if there's an error
          setData(prev => prev);
        }
      } catch (err) {
        setError('Failed to fetch stock data');
        // Keep old data visible if there's an error
        setData(prev => prev);
      }
      setLoading(false);
    };

    fetchData();
    // Refresh data every minute
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [symbol]);

  if (!data && loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!data && error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    );
  }

  if (!data || !data.historical || data.historical.length === 0) {
    return (
      <Alert severity="info" sx={{ m: 2 }}>
        No historical data available for {symbol}
      </Alert>
    );
  }

  const chartData = {
    labels: data.historical.map((item: any) => item.date),
    datasets: [
      {
        label: symbol,
        data: data.historical.map((item: any) => parseFloat(item.close)),
        borderColor: '#69f0ae',
        backgroundColor: 'rgba(105, 240, 174, 0.1)',
        tension: 0.1,
        fill: true,
        pointRadius: 0,
        borderWidth: 2,
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        callbacks: {
          label: function(context: any) {
            return `$${parseFloat(context.raw).toFixed(2)}`;
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        },
        ticks: {
          maxTicksLimit: 5,
          color: '#9e9e9e'
        }
      },
      y: {
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        },
        ticks: {
          color: '#9e9e9e',
          callback: function(value: any) {
            return `$${value}`;
          }
        }
      }
    },
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
  };

  return (
    <Box sx={{ 
      p: 2, 
      height: 400,
      position: 'relative'
    }}>
      {loading && (
        <Box sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(0,0,0,0.7)',
          zIndex: 1
        }}>
          <CircularProgress />
        </Box>
      )}
      <Line data={chartData} options={options} />
      {error && (
        <Alert 
          severity="warning" 
          sx={{ 
            position: 'absolute',
            bottom: 8,
            left: 8,
            right: 8,
            opacity: 0.9
          }}
        >
          {error}
        </Alert>
      )}
    </Box>
  );
} 