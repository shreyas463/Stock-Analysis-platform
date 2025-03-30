'use client';

import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Paper, CircularProgress } from '@mui/material';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

const ApiDebugger: React.FC = () => {
  const [apiStatus, setApiStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [apiResponse, setApiResponse] = useState<string>('');
  const [apiUrl, setApiUrl] = useState<string>(API_BASE_URL);

  const testApiConnection = async () => {
    setApiStatus('loading');
    try {
      console.log(`Testing API connection to: ${apiUrl}`);
      const response = await fetch(`${apiUrl}/health`);
      
      const data = await response.text();
      console.log('API response:', data);
      
      setApiResponse(data);
      setApiStatus('success');
    } catch (error) {
      console.error('API connection error:', error);
      setApiResponse(`Error: ${error instanceof Error ? error.message : String(error)}`);
      setApiStatus('error');
    }
  };

  useEffect(() => {
    // Auto-test on component mount
    testApiConnection();
  }, []);

  return (
    <Paper 
      elevation={3} 
      sx={{ 
        p: 3, 
        mb: 4, 
        bgcolor: '#2A2E43',
        border: '1px solid #444',
        borderRadius: 2
      }}
    >
      <Typography variant="h6" sx={{ color: 'white', mb: 2 }}>
        API Connection Debugger
      </Typography>
      
      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" sx={{ color: '#CCD6DD', mb: 1 }}>
          API URL: {apiUrl}
        </Typography>
        
        <Typography variant="body2" sx={{ 
          color: 
            apiStatus === 'success' ? '#4CAF50' : 
            apiStatus === 'error' ? '#F44336' : 
            '#CCD6DD'
        }}>
          Status: {apiStatus.toUpperCase()}
        </Typography>
      </Box>
      
      {apiStatus === 'loading' && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
          <CircularProgress size={24} sx={{ color: '#00C805' }} />
        </Box>
      )}
      
      {apiResponse && (
        <Box sx={{ 
          p: 2, 
          bgcolor: 'rgba(0, 0, 0, 0.2)', 
          borderRadius: 1,
          overflowX: 'auto',
          mb: 2
        }}>
          <Typography variant="body2" sx={{ fontFamily: 'monospace', color: '#CCD6DD' }}>
            {apiResponse}
          </Typography>
        </Box>
      )}
      
      <Button 
        variant="contained" 
        onClick={testApiConnection}
        sx={{ 
          bgcolor: '#00C805',
          '&:hover': { bgcolor: '#00A804' }
        }}
      >
        Test API Connection
      </Button>
    </Paper>
  );
};

export default ApiDebugger;
