'use client';

import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

const TestComponent = () => {
  return (
    <Paper
      elevation={3}
      sx={{
        p: 3,
        borderRadius: 2,
        bgcolor: '#ff0000',
        border: '4px dashed yellow',
        textAlign: 'center',
        my: 2
      }}
    >
      <Typography
        variant="h4"
        sx={{
          color: 'white',
          fontWeight: 'bold',
          textShadow: '2px 2px 4px rgba(0,0,0,0.5)'
        }}
      >
        TEST COMPONENT - VISIBLE CHANGE
      </Typography>
      <Box
        sx={{
          width: '100px',
          height: '100px',
          bgcolor: 'yellow',
          borderRadius: '50%',
          margin: '20px auto',
          animation: 'spin 2s linear infinite',
          '@keyframes spin': {
            '0%': { transform: 'rotate(0deg)' },
            '100%': { transform: 'rotate(360deg)' }
          }
        }}
      />
    </Paper>
  );
};

export default TestComponent; 