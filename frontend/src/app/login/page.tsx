'use client';

import React, { useState, useEffect } from 'react';
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
  Paper
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';

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

  useEffect(() => {
    console.log("Login page mounted, checking authentication status");
    if (isAuthenticated) {
      router.push('/');
    }
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
        background: 'linear-gradient(135deg, #1a1f2c 0%, #161b26 100%)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Animated particles background */}
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

      {/* Decorative grid lines */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: `
            linear-gradient(rgba(105, 240, 174, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(105, 240, 174, 0.03) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
          opacity: 0.5,
          zIndex: 0,
        }}
      />

      <Container maxWidth="xs" sx={{ position: 'relative', zIndex: 1 }}>
        <Box
          sx={{
            backgroundColor: 'rgba(26, 31, 44, 0.8)',
            backdropFilter: 'blur(20px)',
            borderRadius: 4,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
            p: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            position: 'relative',
            border: '1px solid rgba(105, 240, 174, 0.1)',
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: '-100%',
              width: '200%',
              height: '4px',
              background: 'linear-gradient(90deg, transparent, rgba(105, 240, 174, 0.2), transparent)',
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
          <Typography
            component="h1"
            variant="h4"
            sx={{
              mb: 4,
              fontWeight: 700,
              background: 'linear-gradient(45deg, #69f0ae, #00e676)',
              backgroundClip: 'text',
              textFillColor: 'transparent',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              textAlign: 'center',
              position: 'relative',
              '&::after': {
                content: '""',
                position: 'absolute',
                bottom: '-8px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '40px',
                height: '2px',
                background: '#69f0ae',
                borderRadius: '2px',
              },
            }}
          >
            {isLogin ? 'Welcome Back' : 'Join Stockerr'}
          </Typography>

          {error && (
            <Alert 
              severity="error" 
              sx={{ 
                width: '100%', 
                mb: 3,
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

          <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
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
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
                sx={{
                  mb: 2,
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': {
                      borderColor: 'rgba(255, 255, 255, 0.23)',
                    },
                    '&:hover fieldset': {
                      borderColor: 'rgba(255, 255, 255, 0.5)',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#69f0ae',
                    },
                  },
                  '& .MuiInputLabel-root': {
                    color: 'rgba(255, 255, 255, 0.7)',
                  },
                  '& .MuiInputBase-input': {
                    color: 'white',
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
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              sx={{
                mb: 2,
                '& .MuiOutlinedInput-root': {
                  '& fieldset': {
                    borderColor: 'rgba(255, 255, 255, 0.23)',
                  },
                  '&:hover fieldset': {
                    borderColor: 'rgba(255, 255, 255, 0.5)',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#69f0ae',
                  },
                },
                '& .MuiInputLabel-root': {
                  color: 'rgba(255, 255, 255, 0.7)',
                },
                '& .MuiInputBase-input': {
                  color: 'white',
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
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                      sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{
                mb: 2,
                '& .MuiOutlinedInput-root': {
                  '& fieldset': {
                    borderColor: 'rgba(255, 255, 255, 0.23)',
                  },
                  '&:hover fieldset': {
                    borderColor: 'rgba(255, 255, 255, 0.5)',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#69f0ae',
                  },
                },
                '& .MuiInputLabel-root': {
                  color: 'rgba(255, 255, 255, 0.7)',
                },
                '& .MuiInputBase-input': {
                  color: 'white',
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
                    color: 'rgba(255, 255, 255, 0.7)',
                    '&.Mui-checked': {
                      color: '#69f0ae',
                    },
                  }}
                />
              }
              label="Remember me"
              sx={{
                color: 'rgba(255, 255, 255, 0.7)',
                mb: 2,
              }}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading}
              sx={{
                mt: 3,
                mb: 2,
                py: 1.5,
                bgcolor: '#69f0ae',
                color: '#1a1f2c',
                fontWeight: 600,
                fontSize: '1rem',
                textTransform: 'none',
                borderRadius: 2,
                position: 'relative',
                overflow: 'hidden',
                transition: 'all 0.3s ease',
                '&:hover': {
                  bgcolor: '#4caf50',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 6px 20px rgba(105, 240, 174, 0.2)',
                },
                '&:active': {
                  transform: 'translateY(0)',
                },
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: '-100%',
                  width: '100%',
                  height: '100%',
                  background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent)',
                  animation: loading ? 'shimmer 1.5s infinite' : 'none',
                },
              }}
            >
              {loading ? (
                <CircularProgress
                  size={24}
                  sx={{
                    color: '#1a1f2c',
                  }}
                />
              ) : (
                isLogin ? 'Sign In' : 'Create Account'
              )}
            </Button>

            <Box sx={{ 
              mt: 2, 
              display: 'flex', 
              justifyContent: 'center',
              alignItems: 'center',
              gap: 0.5,
            }}>
              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                {isLogin ? "Don't have an account?" : "Already have an account?"}
              </Typography>
              <Link
                component="button"
                variant="body2"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError(null);
                }}
                sx={{
                  color: '#69f0ae',
                  textDecoration: 'none',
                  fontWeight: 500,
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    color: '#4caf50',
                    textDecoration: 'none',
                  },
                }}
              >
                {isLogin ? 'Sign Up' : 'Sign In'}
              </Link>
            </Box>
          </Box>
        </Box>
      </Container>
    </Box>
  );
} 