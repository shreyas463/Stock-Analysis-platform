'use client';

import React from 'react';
import { Box, Typography } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';

interface StockAnalysisLogoProps {
  size?: number;
}

const StockAnalysisLogo: React.FC<StockAnalysisLogoProps> = ({ size = 80 }) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        mb: 3,
      }}
    >
      {/* Circular logo container with gradient background */}
      <Box
        sx={{
          width: size,
          height: size,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #69f0ae 0%, #00e676 100%)',
          boxShadow: '0 8px 16px rgba(105, 240, 174, 0.3)',
          position: 'relative',
          mb: 2,
          '&::before': {
            content: '""',
            position: 'absolute',
            top: -4,
            left: -4,
            right: -4,
            bottom: -4,
            background: 'linear-gradient(135deg, #69f0ae 0%, #00e676 50%, #69f0ae 100%)',
            borderRadius: '50%',
            opacity: 0.5,
            zIndex: -1,
            animation: 'pulse 2s infinite',
          },
          '@keyframes pulse': {
            '0%': {
              transform: 'scale(1)',
              opacity: 0.5,
            },
            '50%': {
              transform: 'scale(1.05)',
              opacity: 0.3,
            },
            '100%': {
              transform: 'scale(1)',
              opacity: 0.5,
            },
          },
        }}
      >
        {/* Stock chart icon */}
        <TrendingUpIcon 
          sx={{ 
            fontSize: size * 0.5, 
            color: '#121620',
            filter: 'drop-shadow(0 2px 3px rgba(0, 0, 0, 0.2))',
          }} 
        />
        
        {/* Decorative elements */}
        <Box
          sx={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            '&::before, &::after': {
              content: '""',
              position: 'absolute',
              background: 'rgba(255, 255, 255, 0.4)',
              borderRadius: '50%',
            },
            '&::before': {
              width: size * 0.15,
              height: size * 0.15,
              top: size * 0.2,
              right: size * 0.2,
            },
            '&::after': {
              width: size * 0.1,
              height: size * 0.1,
              top: size * 0.15,
              right: size * 0.15,
            },
          }}
        />
      </Box>
      
      {/* Logo text */}
      <Typography
        variant="h5"
        sx={{
          fontWeight: 700,
          letterSpacing: 1,
          background: 'linear-gradient(45deg, #69f0ae, #00e676)',
          backgroundClip: 'text',
          textFillColor: 'transparent',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))',
          fontSize: size > 60 ? '1.2rem' : '0.9rem',
          textAlign: 'center',
          width: '100%',
        }}
      >
        STOCK ANALYSIS PLATFORM
      </Typography>
    </Box>
  );
};

export default StockAnalysisLogo; 