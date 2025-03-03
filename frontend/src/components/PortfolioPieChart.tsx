'use client';

import React from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import ShowChartIcon from '@mui/icons-material/ShowChart';

ChartJS.register(ArcElement, Tooltip, Legend);

interface PortfolioPieChartProps {
  cashBalance: number;
  stocksValue: number;
}

const PortfolioPieChart: React.FC<PortfolioPieChartProps> = ({ cashBalance, stocksValue }) => {
  const totalValue = cashBalance + stocksValue;
  
  // Calculate percentages
  const cashPercentage = totalValue > 0 ? ((cashBalance / totalValue) * 100).toFixed(2) : '0';
  const stocksPercentage = totalValue > 0 ? ((stocksValue / totalValue) * 100).toFixed(2) : '0';
  
  // Enhanced color scheme
  const cashColor = 'rgba(54, 162, 235, 0.8)';
  const stocksColor = 'rgba(76, 175, 80, 0.8)';
  const cashBorderColor = 'rgba(54, 162, 235, 1)';
  const stocksBorderColor = 'rgba(76, 175, 80, 1)';
  
  const data = {
    labels: ['Cash', 'Stocks'],
    datasets: [
      {
        data: [cashBalance, stocksValue],
        backgroundColor: [cashColor, stocksColor],
        borderColor: [cashBorderColor, stocksBorderColor],
        borderWidth: 2,
        hoverBackgroundColor: ['rgba(54, 162, 235, 0.9)', 'rgba(76, 175, 80, 0.9)'],
        hoverBorderColor: ['rgba(54, 162, 235, 1)', 'rgba(76, 175, 80, 1)'],
        hoverBorderWidth: 3,
        cutout: '70%', // Makes it a doughnut chart with a larger hole
      },
    ],
  };
  
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false, // Hide default legend, we'll create our own
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const label = context.label || '';
            const value = context.raw || 0;
            const percentage = totalValue > 0 ? ((value / totalValue) * 100).toFixed(2) : '0';
            return `${label}: $${value.toLocaleString()} (${percentage}%)`;
          }
        },
        backgroundColor: 'rgba(30, 30, 30, 0.9)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        padding: 10,
        displayColors: true,
        boxPadding: 5,
      }
    },
    animation: {
      animateRotate: true,
      animateScale: true,
      duration: 1000,
      easing: 'easeOutQuart' as const,
    },
  };

  return (
    <Box sx={{ 
      position: 'relative', 
      height: 280, 
      display: 'flex', 
      flexDirection: 'column',
      alignItems: 'center',
      p: 1
    }}>
      <Typography 
        variant="h6" 
        sx={{ 
          color: '#fff', 
          mb: 1, 
          textAlign: 'center',
          fontWeight: 500,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 1
        }}
      >
        <AccountBalanceWalletIcon sx={{ color: '#4caf50' }} />
        Portfolio Allocation
      </Typography>
      
      <Box sx={{ 
        position: 'relative', 
        height: 200, 
        width: '100%',
        display: 'flex',
        justifyContent: 'center'
      }}>
        <Doughnut data={data} options={options} />
      </Box>
      
      <Box sx={{ 
        position: 'absolute', 
        top: '50%', 
        left: '50%', 
        transform: 'translate(-50%, -50%)',
        textAlign: 'center',
        pointerEvents: 'none',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        maxWidth: 120,
        height: 120,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(40,40,40,0.7) 0%, rgba(30,30,30,0.7) 100%)',
        boxShadow: 'inset 0 0 10px rgba(0,0,0,0.3)'
      }}>
        <Typography variant="body2" sx={{ color: '#aaa', fontSize: '0.75rem' }}>
          Total Value
        </Typography>
        <Typography variant="h6" sx={{ color: '#fff', fontWeight: 'bold' }}>
          ${totalValue.toLocaleString()}
        </Typography>
      </Box>
      
      {/* Custom legend */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-around', 
        width: '100%', 
        mt: 2,
        pt: 1,
        borderTop: '1px solid rgba(255,255,255,0.1)'
      }}>
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center'
        }}>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            mb: 0.5 
          }}>
            <Box sx={{ 
              width: 12, 
              height: 12, 
              borderRadius: '50%', 
              bgcolor: cashColor,
              mr: 1 
            }} />
            <Typography variant="body2" sx={{ color: '#fff' }}>
              Cash
            </Typography>
          </Box>
          <Typography variant="body1" sx={{ color: cashColor, fontWeight: 'bold' }}>
            {cashPercentage}%
          </Typography>
          <Typography variant="body2" sx={{ color: '#aaa' }}>
            ${cashBalance.toLocaleString()}
          </Typography>
        </Box>
        
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center'
        }}>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            mb: 0.5 
          }}>
            <Box sx={{ 
              width: 12, 
              height: 12, 
              borderRadius: '50%', 
              bgcolor: stocksColor,
              mr: 1 
            }} />
            <Typography variant="body2" sx={{ color: '#fff' }}>
              Stocks
            </Typography>
          </Box>
          <Typography variant="body1" sx={{ color: stocksColor, fontWeight: 'bold' }}>
            {stocksPercentage}%
          </Typography>
          <Typography variant="body2" sx={{ color: '#aaa' }}>
            ${stocksValue.toLocaleString()}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default PortfolioPieChart; 