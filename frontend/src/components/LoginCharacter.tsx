'use client';

import React from 'react';
import { Box } from '@mui/material';

interface LoginCharacterProps {
  isPasswordFocused: boolean;
  isTyping: boolean;
  isEmailFocused?: boolean;
}

const LoginCharacter: React.FC<LoginCharacterProps> = ({ 
  isPasswordFocused, 
  isTyping, 
  isEmailFocused 
}) => {
  // Determine the character's expression based on the input state
  // Only close eyes when typing in password field
  const eyesClosed = isPasswordFocused && isTyping;
  
  // Determine if the character should look interested (when typing email/username)
  const lookingAtTyping = isTyping && !isPasswordFocused;
  
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
        top: lookingAtTyping ? '-5px' : '-10px', // Move eyes down when looking at typing
        transition: 'top 0.3s ease',
        animation: lookingAtTyping ? 'lookAround 3s infinite' : 'none',
        '@keyframes lookAround': {
          '0%': { transform: 'translateY(0)' },
          '25%': { transform: 'translateY(2px) translateX(-1px)' },
          '50%': { transform: 'translateY(3px)' },
          '75%': { transform: 'translateY(2px) translateX(1px)' },
          '100%': { transform: 'translateY(0)' },
        }
      }}>
        {!eyesClosed ? (
          // Open eyes - with different positions based on focus
          <>
            <Box sx={{ 
              width: '20px', 
              height: lookingAtTyping ? '18px' : '20px', // Slightly squint when looking down
              borderRadius: '50%', 
              backgroundColor: '#000',
              position: 'relative',
              transition: 'all 0.3s ease',
              '&::after': {
                content: '""',
                position: 'absolute',
                top: lookingAtTyping ? '10px' : '4px', // Move pupil down significantly when typing
                right: lookingAtTyping ? '3px' : '4px',
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: '#fff',
                transition: 'all 0.2s ease',
                animation: lookingAtTyping ? 'movePupilDown 1.5s infinite' : 'none',
                '@keyframes movePupilDown': {
                  '0%': { top: '9px', right: '3px' },
                  '25%': { top: '10px', right: '2px' },
                  '50%': { top: '11px', right: '3px' },
                  '75%': { top: '10px', right: '4px' },
                  '100%': { top: '9px', right: '3px' },
                }
              }
            }} />
            <Box sx={{ 
              width: '20px', 
              height: lookingAtTyping ? '18px' : '20px', // Slightly squint when looking down
              borderRadius: '50%', 
              backgroundColor: '#000',
              position: 'relative',
              transition: 'all 0.3s ease',
              '&::after': {
                content: '""',
                position: 'absolute',
                top: lookingAtTyping ? '10px' : '4px', // Move pupil down significantly when typing
                right: lookingAtTyping ? '3px' : '4px',
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: '#fff',
                transition: 'all 0.2s ease',
                animation: lookingAtTyping ? 'movePupilDown 1.5s infinite' : 'none',
                '@keyframes movePupilDown': {
                  '0%': { top: '9px', right: '3px' },
                  '25%': { top: '10px', right: '2px' },
                  '50%': { top: '11px', right: '3px' },
                  '75%': { top: '10px', right: '4px' },
                  '100%': { top: '9px', right: '3px' },
                }
              }
            }} />
          </>
        ) : (
          // Closed eyes when typing password
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

      {/* Mouth - changes based on state */}
      <Box sx={{ 
        width: eyesClosed ? '10px' : (lookingAtTyping ? '12px' : '15px'), 
        height: eyesClosed ? '10px' : (lookingAtTyping ? '12px' : '15px'), 
        borderRadius: '50%', 
        backgroundColor: eyesClosed ? '#E65100' : (lookingAtTyping ? '#FF8F00' : '#FFA000'), // Different color when looking
        position: 'relative',
        top: lookingAtTyping ? '15px' : '10px', // Move mouth down when looking down
        transition: 'all 0.3s ease',
      }} />
    </Box>
  );
};

export default LoginCharacter; 