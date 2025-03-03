'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  Box,
  Button,
  Container,
  TextField,
  Typography,
  Alert,
  CircularProgress,
  Checkbox,
  FormControlLabel,
  Link,
  IconButton,
  InputAdornment,
  Paper,
  Grid,
  Chip
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import AnimatedCandlestickBackground from '@/components/AnimatedCandlestickBackground';
import StockerrLogo from '@/components/StockerrLogo';
import CryptoPriceWidget from '@/components/CryptoPriceWidget';
import LoginCharacter from '@/components/LoginCharacter';

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const { login, register, isAuthenticated } = useAuth();
  const router = useRouter();
  
  // States for the character animation
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [isEmailFocused, setIsEmailFocused] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Handle typing animation
  const handleTyping = () => {
    setIsTyping(true);
    
    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set a timeout to stop the typing animation after 1 second of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
    }, 1000);
  };

  useEffect(() => {
    console.log("Login page mounted, checking authentication status");
    if (isAuthenticated) {
      router.push('/');
    }
    
    // Cleanup typing timeout on unmount
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        await login(email, password);
        console.log("Login successful, redirecting to home");
        router.push('/');
      } else {
        if (!username) {
          throw new Error("Username is required");
        }
        await register(username, email, password);
        console.log("Registration successful, redirecting to home");
        router.push('/');
      }
    } catch (err: any) {
      console.error("Authentication error:", err);
      
      // Handle Firebase error codes
      if (err.code) {
        switch (err.code) {
          case 'auth/email-already-in-use':
            setError('This email is already registered. Please log in instead.');
            break;
          case 'auth/invalid-email':
            setError('Please enter a valid email address.');
            break;
          case 'auth/user-disabled':
            setError('This account has been disabled. Please contact support.');
            break;
          case 'auth/user-not-found':
            setError('No account found with this email. Please register.');
            break;
          case 'auth/wrong-password':
            setError('Incorrect password. Please try again.');
            break;
          case 'auth/too-many-requests':
            setError('Too many failed login attempts. Please try again later.');
            break;
          case 'auth/network-request-failed':
            setError('Network error. Please check your connection and try again.');
            break;
          default:
            setError(err.message || 'An error occurred during authentication. Please try again.');
        }
      } else {
        setError(err.message || 'An error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #121620 0%, #0d1118 100%)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <AnimatedCandlestickBackground />
      
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          overflow: 'hidden',
          zIndex: 0,
          '&::before, &::after': {
            content: '""',
            position: 'absolute',
            width: '200px',
            height: '200px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(105, 240, 174, 0.15) 0%, rgba(105, 240, 174, 0) 70%)',
            animation: 'float 20s infinite',
          },
          '&::before': {
            top: '10%',
            left: '10%',
            animationDelay: '0s',
          },
          '&::after': {
            bottom: '10%',
            right: '10%',
            width: '300px',
            height: '300px',
            animationDelay: '-10s',
          },
          '@keyframes float': {
            '0%, 100%': {
              transform: 'translate(0, 0) scale(1)',
            },
            '25%': {
              transform: 'translate(10%, 10%) scale(1.1)',
            },
            '50%': {
              transform: 'translate(5%, -5%) scale(0.9)',
            },
            '75%': {
              transform: 'translate(-10%, 5%) scale(1.05)',
            },
          },
        }}
      />

      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: 
            'linear-gradient(rgba(105, 240, 174, 0.03) 1px, transparent 1px), ' +
            'linear-gradient(90deg, rgba(105, 240, 174, 0.03) 1px, transparent 1px)',
          backgroundSize: '50px 50px',
          opacity: 0.5,
          zIndex: 0,
        }}
      />

      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            minHeight: '100vh',
          }}
        >
          {/* Login Form */}
          <Box
            sx={{
              backgroundColor: 'rgba(18, 22, 32, 0.85)',
              backdropFilter: 'blur(20px)',
              borderRadius: 4,
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)',
              p: 4,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              position: 'relative',
              border: '1px solid rgba(105, 240, 174, 0.2)',
              overflow: 'hidden',
              width: '100%',
              maxWidth: '400px',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: '-100%',
                width: '200%',
                height: '4px',
                background: 'linear-gradient(90deg, transparent, rgba(105, 240, 174, 0.4), transparent)',
                animation: 'shimmer 3s infinite',
              },
              '@keyframes shimmer': {
                '0%': {
                  transform: 'translateX(-100%)',
                },
                '100%': {
                  transform: 'translateX(100%)',
                },
              },
            }}
          >
            <StockerrLogo size={90} />
            
            <Typography 
              component="h1" 
              variant="h4" 
              sx={{ 
                color: 'white', 
                fontWeight: 700, 
                mt: 2,
                mb: 1,
                textAlign: 'center',
              }}
            >
              Welcome
            </Typography>
            
            <Typography 
              variant="body1" 
              sx={{ 
                color: '#9e9e9e', 
                mb: 3,
                textAlign: 'center',
              }}
            >
              Please sign in to continue
            </Typography>
            
            {/* Add the LoginCharacter component */}
            <LoginCharacter 
              isPasswordFocused={isPasswordFocused} 
              isTyping={isTyping} 
            />
            
            {error && (
              <Alert 
                severity="error" 
                sx={{ 
                  width: '100%', 
                  mb: 3,
                  mt: 2,
                  backgroundColor: 'rgba(211, 47, 47, 0.1)',
                  color: '#ff5252',
                  border: '1px solid rgba(244, 67, 54, 0.1)',
                  borderRadius: 2,
                  '& .MuiAlert-icon': {
                    color: '#ff5252'
                  }
                }}
              >
                {error}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%', mt: 2 }}>
              {!isLogin && (
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  id="username"
                  label="Username"
                  name="username"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    handleTyping();
                  }}
                  onFocus={() => setIsEmailFocused(true)}
                  onBlur={() => setIsEmailFocused(false)}
                  sx={{
                    mb: 2,
                    '& .MuiOutlinedInput-root': {
                      color: 'white',
                      '& fieldset': {
                        borderColor: 'rgba(255, 255, 255, 0.1)',
                      },
                      '&:hover fieldset': {
                        borderColor: 'rgba(255, 255, 255, 0.2)',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#69f0ae',
                      },
                    },
                    '& .MuiInputLabel-root': {
                      color: '#9e9e9e',
                    },
                    '& .MuiInputLabel-root.Mui-focused': {
                      color: '#69f0ae',
                    },
                  }}
                />
              )}
              <TextField
                margin="normal"
                required
                fullWidth
                id="email"
                label="Email Address"
                name="email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  handleTyping();
                }}
                onFocus={() => setIsEmailFocused(true)}
                onBlur={() => setIsEmailFocused(false)}
                sx={{
                  mb: 2,
                  '& .MuiOutlinedInput-root': {
                    color: 'white',
                    '& fieldset': {
                      borderColor: 'rgba(255, 255, 255, 0.1)',
                    },
                    '&:hover fieldset': {
                      borderColor: 'rgba(255, 255, 255, 0.2)',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#69f0ae',
                    },
                  },
                  '& .MuiInputLabel-root': {
                    color: '#9e9e9e',
                  },
                  '& .MuiInputLabel-root.Mui-focused': {
                    color: '#69f0ae',
                  },
                }}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                name="password"
                label="Password"
                type={showPassword ? 'text' : 'password'}
                id="password"
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  handleTyping();
                }}
                onFocus={() => setIsPasswordFocused(true)}
                onBlur={() => setIsPasswordFocused(false)}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                        sx={{ color: '#9e9e9e' }}
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{
                  mb: 2,
                  '& .MuiOutlinedInput-root': {
                    color: 'white',
                    '& fieldset': {
                      borderColor: 'rgba(255, 255, 255, 0.1)',
                    },
                    '&:hover fieldset': {
                      borderColor: 'rgba(255, 255, 255, 0.2)',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#69f0ae',
                    },
                  },
                  '& .MuiInputLabel-root': {
                    color: '#9e9e9e',
                  },
                  '& .MuiInputLabel-root.Mui-focused': {
                    color: '#69f0ae',
                  },
                }}
              />
              <FormControlLabel
                control={
                  <Checkbox 
                    value="remember" 
                    color="primary" 
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    sx={{
                      color: '#9e9e9e',
                      '&.Mui-checked': {
                        color: '#69f0ae',
                      },
                    }}
                  />
                }
                label="Remember me"
                sx={{ 
                  color: '#9e9e9e',
                  mb: 2,
                }}
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={loading}
                sx={{
                  mt: 2,
                  mb: 3,
                  py: 1.5,
                  bgcolor: '#69f0ae',
                  color: '#1a1f2c',
                  fontWeight: 600,
                  '&:hover': {
                    bgcolor: '#4caf50',
                  },
                  '&.Mui-disabled': {
                    bgcolor: 'rgba(105, 240, 174, 0.3)',
                  },
                }}
              >
                {loading ? (
                  <CircularProgress size={24} sx={{ color: '#1a1f2c' }} />
                ) : (
                  isLogin ? 'Sign In' : 'Sign Up'
                )}
              </Button>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                <Link 
                  href="#" 
                  variant="body2" 
                  onClick={(e) => {
                    e.preventDefault();
                    setIsLogin(!isLogin);
                    setError(null);
                  }}
                  sx={{ 
                    color: '#69f0ae',
                    textDecoration: 'none',
                    '&:hover': {
                      textDecoration: 'underline',
                    }
                  }}
                >
                  {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
                </Link>
                {isLogin && (
                  <Link 
                    href="#" 
                    variant="body2"
                    onClick={(e) => e.preventDefault()}
                    sx={{ 
                      color: '#9e9e9e',
                      textDecoration: 'none',
                      '&:hover': {
                        color: '#69f0ae',
                        textDecoration: 'underline',
                      }
                    }}
                  >
                    Forgot password?
                  </Link>
                )}
              </Box>
            </Box>
          </Box>
          
          {/* Info Section */}
          <Box
            sx={{
              display: { xs: 'none', md: 'flex' },
              flexDirection: 'column',
              justifyContent: 'center',
              maxWidth: '500px',
            }}
          >
            <Typography 
              variant="h3" 
              sx={{ 
                color: 'white', 
                fontWeight: 700, 
                mb: 2,
                textShadow: '0 2px 10px rgba(0, 0, 0, 0.5)',
              }}
            >
              Trade Smarter, <br />Not Harder
            </Typography>
            <Typography 
              variant="h6" 
              sx={{ 
                color: '#9e9e9e', 
                mb: 4,
                lineHeight: 1.6,
              }}
            >
              Join thousands of traders using Stockerr to analyze, track, and trade stocks with confidence.
            </Typography>
            
            <Box sx={{ mb: 4 }}>
              <CryptoPriceWidget />
            </Box>
            
            <Box
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 2,
                mb: 4,
              }}
            >
              {['Real-time Data', 'Smart Analysis', 'Portfolio Tracking', 'Trading Simulation'].map((feature) => (
                <Chip
                  key={feature}
                  label={feature}
                  sx={{
                    bgcolor: 'rgba(105, 240, 174, 0.1)',
                    color: '#69f0ae',
                    border: '1px solid rgba(105, 240, 174, 0.2)',
                    '&:hover': {
                      bgcolor: 'rgba(105, 240, 174, 0.2)',
                    },
                  }}
                />
              ))}
            </Box>
          </Box>
        </Box>
      </Container>
    </Box>
  );
} 