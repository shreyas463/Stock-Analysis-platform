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
  TimeScale
} from 'chart.js';
import { Chart } from 'react-chartjs-2';
import { Box, CircularProgress, Alert, Typography } from '@mui/material';
import 'chartjs-adapter-date-fns';

// Register the financial chart type
import { CandlestickController, CandlestickElement, OhlcController, OhlcElement } from 'chartjs-chart-financial';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  CandlestickController,
  CandlestickElement,
  OhlcController,
  OhlcElement
);

interface CandlestickChartProps {
  symbol: string;
}

interface StockData {
  quote: {
    c: number; // current price
    d: number; // change
    dp: number; // percent change
    h: number; // high
    l: number; // low
    o: number; // open
    pc: number; // previous close
  };
  historical: {
    date: string;
    close: string;
    open?: string;
    high?: string;
    low?: string;
  }[];
  profile?: {
    name: string;
    exchange: string;
    industry: string;
  };
}

export default function CandlestickChart({ symbol }: CandlestickChartProps) {
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

  // Format data for candlestick chart
  const chartData = {
    datasets: [
      {
        label: symbol,
        data: data.historical.map((item: any) => ({
          x: new Date(item.date).getTime(),
          o: parseFloat(item.open || data.quote.o.toString()),
          h: parseFloat(item.high || data.quote.h.toString()),
          l: parseFloat(item.low || data.quote.l.toString()),
          c: parseFloat(item.close)
        })),
        color: {
          up: '#69f0ae',
          down: '#ff5252',
          unchanged: '#9e9e9e',
        },
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
            const point = context.raw;
            return [
              `Open: $${point.o.toFixed(2)}`,
              `High: $${point.h.toFixed(2)}`,
              `Low: $${point.l.toFixed(2)}`,
              `Close: $${point.c.toFixed(2)}`
            ];
          }
        }
      }
    },
    scales: {
      x: {
        type: 'time' as const,
        time: {
          unit: 'day' as const,
          displayFormats: {
            day: 'MMM dd'
          }
        },
        grid: {
          display: false
        },
        ticks: {
          maxTicksLimit: 10,
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
      {data.profile && (
        <Typography variant="subtitle1" sx={{ mb: 1, color: '#9e9e9e' }}>
          {data.profile.name} ({data.profile.exchange})
        </Typography>
      )}
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
      <Chart type='candlestick' data={chartData} options={options} />
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