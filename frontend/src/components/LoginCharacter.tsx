'use client';

import React from 'react';
import { Box } from '@mui/material';

interface LoginCharacterProps {
  isPasswordFocused: boolean;
  isTyping: boolean;
}

const LoginCharacter: React.FC<LoginCharacterProps> = ({ isPasswordFocused, isTyping }) => {
  // Determine the character's expression based on the input state
  const eyesOpen = !isPasswordFocused || !isTyping;
  
  return (
    <Box
      sx={{
        width: '120px',
        height: '120px',
        borderRadius: '50%',
        backgroundColor: '#FFEB3B',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        margin: '0 auto 20px',
        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
        border: '4px solid rgba(255, 255, 255, 0.1)',
        transition: 'transform 0.3s ease',
        '&:hover': {
          transform: 'scale(1.05)',
        },
        // Brown "hair" on top
        '&::before': {
          content: '""',
          position: 'absolute',
          top: '-10px',
          left: '35px',
          width: '50px',
          height: '15px',
          borderRadius: '50%',
          backgroundColor: '#8D6E63',
        }
      }}
    >
      {/* Eyes */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        width: '70px', 
        position: 'relative',
        top: '-10px'
      }}>
        {eyesOpen ? (
          // Open eyes
          <>
            <Box sx={{ 
              width: '20px', 
              height: '20px', 
              borderRadius: '50%', 
              backgroundColor: '#000',
              position: 'relative',
              '&::after': {
                content: '""',
                position: 'absolute',
                top: '4px',
                right: '4px',
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: '#fff',
              }
            }} />
            <Box sx={{ 
              width: '20px', 
              height: '20px', 
              borderRadius: '50%', 
              backgroundColor: '#000',
              position: 'relative',
              '&::after': {
                content: '""',
                position: 'absolute',
                top: '4px',
                right: '4px',
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: '#fff',
              }
            }} />
          </>
        ) : (
          // Closed eyes (horizontal lines)
          <>
            <Box sx={{ 
              width: '20px', 
              height: '4px', 
              backgroundColor: '#000',
              borderRadius: '2px',
              marginTop: '8px'
            }} />
            <Box sx={{ 
              width: '20px', 
              height: '4px', 
              backgroundColor: '#000',
              borderRadius: '2px',
              marginTop: '8px'
            }} />
          </>
        )}
      </Box>

      {/* Mouth */}
      <Box sx={{ 
        width: '15px', 
        height: '15px', 
        borderRadius: '50%', 
        backgroundColor: '#FFA000',
        position: 'relative',
        top: '10px'
      }} />

      {/* Animation for typing */}
      {isTyping && !isPasswordFocused && (
        <Box
          sx={{
            position: 'absolute',
            top: '-30px',
            right: '-20px',
            fontSize: '24px',
            animation: 'bounce 0.5s infinite alternate',
            '@keyframes bounce': {
              from: { transform: 'translateY(0)' },
              to: { transform: 'translateY(-10px)' }
            }
          }}
        >
          👀
        </Box>
      )}
    </Box>
  );
};

export default LoginCharacter; 