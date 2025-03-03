'use client';

import React from 'react';
import { Box, Typography, Card, CardContent, useTheme } from '@mui/material';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

interface PortfolioPieChartProps {
  cashBalance: number;
  stocksValue: number;
}

const PortfolioPieChart: React.FC<PortfolioPieChartProps> = ({ cashBalance, stocksValue }) => {
  const theme = useTheme();
  
  // Ensure values are numbers and not NaN
  const cashBalanceValue = isNaN(cashBalance) ? 0 : cashBalance;
  const stocksValueValue = isNaN(stocksValue) ? 0 : stocksValue;
  
  // Calculate total portfolio value
  const totalValue = cashBalanceValue + stocksValueValue;
  
  // Calculate percentages (avoid division by zero)
  const cashPercentage = totalValue > 0 ? (cashBalanceValue / totalValue) * 100 : 100;
  const stocksPercentage = totalValue > 0 ? (stocksValueValue / totalValue) * 100 : 0;
  
  console.log("Pie Chart Values:", {
    cashBalance: cashBalanceValue,
    stocksValue: stocksValueValue,
    totalValue,
    cashPercentage: cashPercentage.toFixed(2),
    stocksPercentage: stocksPercentage.toFixed(2)
  });

  const data = {
    labels: ['Cash', 'Stocks'],
    datasets: [
      {
        data: [cashBalanceValue, stocksValueValue],
        backgroundColor: [
          theme.palette.primary.main,
          theme.palette.success.main,
        ],
        borderColor: [
          theme.palette.primary.dark,
          theme.palette.success.dark,
        ],
        borderWidth: 1,
        hoverOffset: 4,
      },
    ],
  };

  const options = {
    cutout: '70%',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const value = context.raw;
            const percentage = totalValue > 0 ? (value / totalValue) * 100 : 0;
            return `${context.label}: $${value.toFixed(2)} (${percentage.toFixed(2)}%)`;
          }
        }
      }
    },
  };

  return (
    <Card sx={{ height: '100%', bgcolor: 'background.paper', borderRadius: 2, boxShadow: 3 }}>
      <CardContent>
        <Typography variant="h6" component="div" sx={{ mb: 2, color: 'text.primary', display: 'flex', alignItems: 'center' }}>
          <Box component="span" sx={{ 
            bgcolor: 'success.main', 
            width: 24, 
            height: 24, 
            borderRadius: 1, 
            display: 'inline-flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            mr: 1
          }}>
            $
          </Box>
          Portfolio Allocation
        </Typography>
        
        <Box sx={{ height: 200, position: 'relative', mb: 2 }}>
          <Doughnut data={data} options={options} />
          <Box sx={{ 
            position: 'absolute', 
            top: '50%', 
            left: '50%', 
            transform: 'translate(-50%, -50%)', 
            textAlign: 'center' 
          }}>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>Total Value</Typography>
            <Typography variant="h6" sx={{ color: 'text.primary' }}>${totalValue.toFixed(2)}</Typography>
          </Box>
        </Box>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: theme.palette.primary.main, mr: 1 }} />
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>Cash</Typography>
          </Box>
          <Box>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>{cashPercentage.toFixed(2)}%</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>${cashBalanceValue.toFixed(2)}</Typography>
          </Box>
        </Box>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: theme.palette.success.main, mr: 1 }} />
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>Stocks</Typography>
          </Box>
          <Box>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>{stocksPercentage.toFixed(2)}%</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>${stocksValueValue.toFixed(2)}</Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default PortfolioPieChart; 