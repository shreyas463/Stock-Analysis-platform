'use client';

import React, { useState, useEffect, useRef } from 'react';
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
import { Box, Typography, Paper, ButtonGroup, Button, CircularProgress } from '@mui/material';

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

interface InvestingChartProps {
  cashBalance: number;
  stocksValue: number;
  portfolio: any[];
}

export default function InvestingChart({ cashBalance, stocksValue, portfolio }: InvestingChartProps) {
  const [timeRange, setTimeRange] = useState<'1D' | '1W' | '1M' | '3M' | '1Y' | 'ALL'>('1D');
  const [loading, setLoading] = useState(false);
  const chartRef = useRef<any>(null);
  
  // Total portfolio value
  const totalValue = cashBalance + stocksValue;
  
  // Mock historical data - in a real app, this would come from an API
  const [historicalData, setHistoricalData] = useState<{date: string, value: number}[]>([]);
  
  useEffect(() => {
    // Generate mock historical data based on the selected time range
    // In a real app, you would fetch this data from your backend
    generateMockData();
  }, [timeRange, totalValue]);
  
  const generateMockData = () => {
    setLoading(true);
    
    // Current date
    const endDate = new Date();
    let startDate = new Date();
    let dataPoints = 0;
    
    // Set start date based on time range
    switch(timeRange) {
      case '1D':
        startDate.setDate(endDate.getDate() - 1);
        dataPoints = 24; // hourly data for 1 day
        break;
      case '1W':
        startDate.setDate(endDate.getDate() - 7);
        dataPoints = 7; // daily data for 1 week
        break;
      case '1M':
        startDate.setMonth(endDate.getMonth() - 1);
        dataPoints = 30; // daily data for 1 month
        break;
      case '3M':
        startDate.setMonth(endDate.getMonth() - 3);
        dataPoints = 90; // daily data for 3 months
        break;
      case '1Y':
        startDate.setFullYear(endDate.getFullYear() - 1);
        dataPoints = 52; // weekly data for 1 year
        break;
      case 'ALL':
        startDate.setFullYear(endDate.getFullYear() - 3);
        dataPoints = 36; // monthly data for 3 years
        break;
    }
    
    // Generate random data with a general upward trend
    const data: {date: string, value: number}[] = [];
    const msPerInterval = (endDate.getTime() - startDate.getTime()) / dataPoints;
    
    // Start with a value that's about 20% less than current value
    let baseValue = totalValue * 0.8;
    
    // Add some randomness but ensure the final value is the current total value
    for (let i = 0; i < dataPoints; i++) {
      const currentDate = new Date(startDate.getTime() + (i * msPerInterval));
      
      // More randomness for longer timeframes
      const volatility = timeRange === '1D' ? 0.005 : 
                         timeRange === '1W' ? 0.01 : 
                         timeRange === '1M' ? 0.02 : 0.03;
                         
      // Random change with slight upward bias
      const change = (Math.random() - 0.45) * volatility;
      
      // For the last point, ensure it's the current value
      if (i === dataPoints - 1) {
        data.push({
          date: formatDate(currentDate),
          value: totalValue
        });
      } else {
        baseValue = baseValue * (1 + change);
        data.push({
          date: formatDate(currentDate),
          value: baseValue
        });
      }
    }
    
    setHistoricalData(data);
    setLoading(false);
  };
  
  const formatDate = (date: Date): string => {
    if (timeRange === '1D') {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (timeRange === '1W' || timeRange === '1M' || timeRange === '3M') {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } else {
      return date.toLocaleDateString([], { month: 'short', year: '2-digit' });
    }
  };
  
  // Determine if the current value is higher than the starting value (profit or loss)
  const isProfit = historicalData.length > 0 ? 
    totalValue >= historicalData[0].value : true;
  
  // Calculate the change amount and percentage
  const startValue = historicalData.length > 0 ? historicalData[0].value : totalValue;
  const changeAmount = totalValue - startValue;
  const changePercentage = startValue > 0 ? (changeAmount / startValue) * 100 : 0;
  
  // Create gradient for chart
  const createGradient = (ctx: CanvasRenderingContext2D) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    if (isProfit) {
      gradient.addColorStop(0, 'rgba(0, 200, 5, 0.4)');
      gradient.addColorStop(1, 'rgba(0, 200, 5, 0.05)');
    } else {
      gradient.addColorStop(0, 'rgba(255, 80, 0, 0.4)');
      gradient.addColorStop(1, 'rgba(255, 80, 0, 0.05)');
    }
    return gradient;
  };
  
  const chartData = {
    labels: historicalData.map(item => item.date),
    datasets: [
      {
        label: 'Portfolio Value',
        data: historicalData.map(item => item.value),
        borderColor: isProfit ? '#00c805' : '#ff5000',
        backgroundColor: function(context: any) {
          const chart = context.chart;
          const {ctx, chartArea} = chart;
          if (!chartArea) {
            return isProfit ? 'rgba(0, 200, 5, 0.2)' : 'rgba(255, 80, 0, 0.2)';
          }
          return createGradient(ctx);
        },
        tension: 0.4,
        fill: true,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointHoverBackgroundColor: '#ffffff',
        pointHoverBorderColor: isProfit ? '#00c805' : '#ff5000',
        borderWidth: 2,
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
        borderColor: isProfit ? 'rgba(0, 200, 5, 0.5)' : 'rgba(255, 80, 0, 0.5)',
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
  
  return (
    <Box>
      {/* Price Display Section */}
      <Paper sx={{
        p: 2,
        mb: 2,
        backgroundColor: 'rgba(30, 33, 50, 0.7)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: 2,
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
      }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#ffffff' }}>
              ${totalValue.toFixed(2)}
            </Typography>
            <Typography 
              variant="body1" 
              sx={{ 
                color: isProfit ? '#00c805' : '#ff5000',
                display: 'flex',
                alignItems: 'center',
                mt: 0.5
              }}
            >
              {isProfit ? '▲' : '▼'} ${Math.abs(changeAmount).toFixed(2)} ({Math.abs(changePercentage).toFixed(2)}%) {timeRange}
            </Typography>
          </Box>
          <Box>
            <Typography variant="body2" sx={{ color: '#9e9e9e', textAlign: 'right' }}>
              Cash: ${cashBalance.toFixed(2)}
            </Typography>
            <Typography variant="body2" sx={{ color: '#9e9e9e', textAlign: 'right' }}>
              Stocks: ${stocksValue.toFixed(2)}
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Time Range Selector */}
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
        <ButtonGroup variant="outlined" size="small">
          {(['1D', '1W', '1M', '3M', '1Y', 'ALL'] as const).map((range) => (
            <Button 
              key={range}
              onClick={() => setTimeRange(range)}
              sx={{
                color: timeRange === range ? (isProfit ? '#00c805' : '#ff5000') : '#ffffff',
                borderColor: 'rgba(255, 255, 255, 0.2)',
                backgroundColor: timeRange === range ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  borderColor: 'rgba(255, 255, 255, 0.3)',
                }
              }}
            >
              {range}
            </Button>
          ))}
        </ButtonGroup>
      </Box>

      {/* Chart Section */}
      <Box sx={{ 
        p: 2, 
        height: 400,
        position: 'relative',
        borderRadius: 2,
        backgroundColor: 'rgba(30, 33, 50, 0.7)',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
        border: '1px solid rgba(255, 255, 255, 0.1)'
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
            <CircularProgress sx={{ color: isProfit ? '#00c805' : '#ff5000' }} />
          </Box>
        )}
        <Line data={chartData} options={options} />
      </Box>
      
      {/* LIVE indicator */}
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        mt: 1, 
        ml: 2,
        color: '#ffffff'
      }}>
        <Box 
          component="span" 
          sx={{ 
            width: 8, 
            height: 8, 
            borderRadius: '50%', 
            bgcolor: isProfit ? '#00c805' : '#ff5000',
            mr: 1,
            animation: 'pulse 2s infinite'
          }} 
        />
        <Typography variant="caption" sx={{ mr: 2 }}>LIVE</Typography>
        
        {/* Time range indicators */}
        {(['1D', '1W', '1M', '3M', '1Y', 'ALL'] as const).map((range) => (
          <Typography 
            key={range}
            variant="caption" 
            sx={{ 
              mx: 1, 
              color: timeRange === range ? '#ffffff' : '#9e9e9e',
              cursor: 'pointer'
            }}
            onClick={() => setTimeRange(range)}
          >
            {range}
          </Typography>
        ))}
      </Box>
      
      <style jsx global>{`
        @keyframes pulse {
          0% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
          100% {
            opacity: 1;
          }
        }
      `}</style>
    </Box>
  );
}
