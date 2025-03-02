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
import { Box, CircularProgress, Alert, Typography, Paper } from '@mui/material';

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

  // Create gradient for chart
  const createGradient = (ctx: CanvasRenderingContext2D) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(0, 255, 179, 0.4)');
    gradient.addColorStop(1, 'rgba(0, 255, 179, 0.05)');
    return gradient;
  };

  const chartData = {
    labels: data.historical.map((item: any) => item.date),
    datasets: [
      {
        label: symbol,
        data: data.historical.map((item: any) => parseFloat(item.close)),
        borderColor: '#00ffb3',
        backgroundColor: function(context: any) {
          const chart = context.chart;
          const {ctx, chartArea} = chart;
          if (!chartArea) {
            return 'rgba(0, 255, 179, 0.2)';
          }
          return createGradient(ctx);
        },
        tension: 0.4,
        fill: true,
        pointRadius: 2,
        pointBackgroundColor: '#00ffb3',
        pointBorderColor: '#00ffb3',
        pointHoverRadius: 5,
        pointHoverBackgroundColor: '#ffffff',
        pointHoverBorderColor: '#00ffb3',
        borderWidth: 3,
        cubicInterpolationMode: 'monotone' as const,
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
        backgroundColor: 'rgba(30, 33, 50, 0.9)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: 'rgba(0, 255, 179, 0.5)',
        borderWidth: 1,
        padding: 10,
        cornerRadius: 4,
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
          maxTicksLimit: 6,
          color: '#ffffff',
          font: {
            size: 10
          }
        },
        border: {
          display: false
        }
      },
      y: {
        grid: {
          color: 'rgba(255, 255, 255, 0.15)',
          drawBorder: false
        },
        ticks: {
          color: '#ffffff',
          font: {
            size: 10
          },
          padding: 10,
          callback: function(value: any) {
            return `$${value}`;
          }
        },
        border: {
          display: false
        }
      }
    },
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    elements: {
      line: {
        borderJoinStyle: 'round' as const
      }
    },
    animation: {
      duration: 1000
    }
  };

  // Calculate price change
  const currentPrice = data.quote.c;
  const previousClose = data.quote.pc;
  const priceChange = data.quote.d;
  const percentChange = data.quote.dp;
  const isPositive = priceChange >= 0;

  return (
    <Box>
      {/* Price Display Section */}
      <Paper sx={{
        p: 2,
        mb: 2,
        backgroundColor: 'rgba(30, 33, 50, 0.7)',
        border: '1px solid rgba(0, 255, 179, 0.2)',
        borderRadius: 2,
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
      }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#ffffff' }}>
              ${currentPrice.toFixed(2)}
            </Typography>
            <Typography 
              variant="body1" 
              sx={{ 
                color: isPositive ? '#00ffb3' : '#ff5252',
                display: 'flex',
                alignItems: 'center',
                mt: 0.5
              }}
            >
              {isPositive ? '▲' : '▼'} ${Math.abs(priceChange).toFixed(2)} ({Math.abs(percentChange).toFixed(2)}%)
            </Typography>
          </Box>
          <Box>
            <Typography variant="body2" sx={{ color: '#9e9e9e', textAlign: 'right' }}>
              Previous Close: ${previousClose.toFixed(2)}
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Chart Section */}
      <Box sx={{ 
        p: 2, 
        height: 400,
        position: 'relative',
        borderRadius: 2,
        backgroundColor: 'rgba(30, 33, 50, 0.7)',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
        border: '1px solid rgba(0, 255, 179, 0.2)'
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
            zIndex: 1,
            borderRadius: 2
          }}>
            <CircularProgress sx={{ color: '#00ffb3' }} />
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
    </Box>
  );
} 