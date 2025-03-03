'use client';

import React from 'react';
import { Box, Typography, Button, Container } from '@mui/material';
import { useRouter } from 'next/navigation';
import TestComponent from '@/components/TestComponent';

export default function TestPage() {
  const router = useRouter();
  
  return (
    <Container maxWidth="md" sx={{ 
      py: 4,
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      bgcolor: '#1E2132',
    }}>
      <Typography variant="h2" sx={{ color: 'white', mb: 4, textAlign: 'center' }}>
        Test Page - Confirming Changes
      </Typography>
      
      <TestComponent />
      
      <Box sx={{ 
        p: 4, 
        borderRadius: 2, 
        bgcolor: '#ff5252',
        border: '4px solid yellow',
        width: '100%',
        textAlign: 'center',
        mb: 4
      }}>
        <Typography variant="h4" sx={{ color: 'white', mb: 2 }}>
          This is a test page to confirm changes are being applied
        </Typography>
        <Typography variant="body1" sx={{ color: 'white', mb: 4 }}>
          If you can see this page with red background and yellow borders, the changes are working!
        </Typography>
      </Box>
      
      <Button 
        variant="contained" 
        size="large"
        onClick={() => router.push('/')}
        sx={{ 
          bgcolor: 'yellow',
          color: 'black',
          '&:hover': { bgcolor: '#d4d400' }
        }}
      >
        Return to Dashboard
      </Button>
    </Container>
  );
} 