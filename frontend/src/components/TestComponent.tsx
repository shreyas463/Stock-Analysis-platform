'use client';

import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

const TestComponent: React.FC = () => {
  return (
    <Paper 
      elevation={3} 
      sx={{ 
        p: 3, 
        mb: 4, 
        width: '100%',
        bgcolor: '#2A2E43',
        border: '2px solid #00C805',
        borderRadius: 2
      }}
    >
      <Typography variant="h5" sx={{ color: 'white', mb: 2 }}>
        Test Component Successfully Loaded
      </Typography>
      
      <Typography variant="body1" sx={{ color: '#CCD6DD' }}>
        This component is being properly imported and rendered, confirming that your build process is working correctly.
      </Typography>
      
      <Box sx={{ mt: 2, p: 2, bgcolor: 'rgba(0, 200, 5, 0.1)', borderRadius: 1 }}>
        <Typography variant="body2" sx={{ color: '#00C805' }}>
          Firebase configuration is now using environment variables for better security and deployment compatibility.
        </Typography>
      </Box>
    </Paper>
  );
};

export default TestComponent;
