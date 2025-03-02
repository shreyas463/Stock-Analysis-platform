'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Box, 
  TextField, 
  Button, 
  Typography, 
  Paper, 
  Alert, 
  CircularProgress, 
  Avatar, 
  Divider,
  IconButton,
  InputAdornment
} from '@mui/material';
import { auth } from '@/firebase/config';
import SendIcon from '@mui/icons-material/Send';
import ChatIcon from '@mui/icons-material/Chat';

interface Message {
  id: string;
  content: string;
  username: string;
  created_at: string;
}

export default function Discussion() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, isAuthenticated } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getToken = async () => {
    if (!auth.currentUser) return null;
    try {
      return await auth.currentUser.getIdToken(true);
    } catch (error) {
      console.error("Error refreshing token:", error);
      return null;
    }
  };

  const fetchMessages = async () => {
    if (!isAuthenticated) return;
    
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) {
        setError('Authentication error. Please log in again.');
        return;
      }
      
      const response = await fetch('http://localhost:5001/api/discussions', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }

      const data = await response.json();
      setMessages(data);
      setError('');
    } catch (err) {
      console.error("Error fetching messages:", err);
      setError('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchMessages();
      // Refresh messages every 10 seconds
      const interval = setInterval(fetchMessages, 10000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    setLoading(true);
    try {
      const token = await getToken();
      if (!token) {
        setError('Authentication error. Please log in again.');
        return;
      }
      
      const response = await fetch('http://localhost:5001/api/discussions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ content: newMessage }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send message');
      }

      const data = await response.json();
      setMessages([data, ...messages]);
      setNewMessage('');
      setError('');
    } catch (err: any) {
      console.error("Error sending message:", err);
      setError(err.message || 'Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 1);
  };

  // A few brighter/different colors for avatars
  const getAvatarColor = (username: string) => {
    const colors = [
      '#8A56E8', 
      '#6C5CE7', 
      '#7D5FFF', 
      '#5E60CE', 
      '#2EBAC5',
      '#FF7B54'
    ];
    const hash = username.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  if (!isAuthenticated) {
    return (
      <Box sx={{ 
        textAlign: 'center', 
        py: 8,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
        bgcolor: '#20232b', // Lighter background
        color: '#f5f5f5'
      }}>
        <ChatIcon sx={{ fontSize: 60, color: '#999', opacity: 0.7 }} />
        <Typography color="inherit" variant="h6">
          Please login to participate in discussions
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{ 
        p: 3, 
        display: 'flex', 
        flexDirection: 'column', 
        height: 'calc(100vh - 200px)',
        maxHeight: '800px',
        bgcolor: '#20232b', // Main background color
        color: '#e0e0e0'
      }}
    >
      {/* Header area */}
      <Paper 
        elevation={0}
        sx={{ 
          p: 2, 
          mb: 3, 
          bgcolor: '#2c2f3a',
          borderRadius: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ChatIcon sx={{ color: '#2EBAC5' }} />
          <Typography variant="h6" sx={{ color: '#fff', fontWeight: 500 }}>
            Community Discussion
          </Typography>
        </Box>
        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
          {messages.length} messages
        </Typography>
      </Paper>

      {/* Messages container */}
      {loading && messages.length === 0 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4, flexGrow: 1 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Paper
          elevation={0}
          sx={{
            flexGrow: 1,
            mb: 3,
            bgcolor: '#2c2f3a',
            borderRadius: 2,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <Box sx={{ 
            flexGrow: 1, 
            overflow: 'auto',
            display: 'flex',
            flexDirection: 'column-reverse',
            px: 1
          }}>
            <div ref={messagesEndRef} />
            {messages.length > 0 ? (
              messages.map((message, index) => {
                const isCurrentUser = message.username === user?.username;
                const showDate = 
                  index === messages.length - 1 ||
                  new Date(message.created_at).toDateString() !==
                  new Date(messages[index + 1].created_at).toDateString();
                
                return (
                  <React.Fragment key={message.id}>
                    {showDate && (
                      <Box sx={{ 
                        textAlign: 'center', 
                        my: 2,
                        position: 'relative'
                      }}>
                        <Divider sx={{ 
                          '&::before, &::after': { 
                            borderColor: 'rgba(255, 255, 255, 0.15)' 
                          },
                          mb: 1
                        }}>
                          <Typography 
                            variant="caption" 
                            sx={{ 
                              color: 'rgba(255, 255, 255, 0.7)',
                              px: 2,
                              py: 0.5,
                              borderRadius: 1,
                              bgcolor: 'rgba(255, 255, 255, 0.06)'
                            }}
                          >
                            {new Date(message.created_at).toLocaleDateString()}
                          </Typography>
                        </Divider>
                      </Box>
                    )}
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: isCurrentUser ? 'flex-end' : 'flex-start',
                        mb: 2,
                      }}
                    >
                      {!isCurrentUser && (
                        <Avatar 
                          sx={{ 
                            bgcolor: getAvatarColor(message.username),
                            mr: 1,
                            width: 32,
                            height: 32,
                            fontSize: '0.9rem',
                            fontWeight: 'bold'
                          }}
                        >
                          {getInitials(message.username)}
                        </Avatar>
                      )}
                      <Box
                        sx={{
                          maxWidth: '70%',
                        }}
                      >
                        {!isCurrentUser && (
                          <Typography
                            variant="caption"
                            sx={{
                              color: 'rgba(255, 255, 255, 0.7)',
                              ml: 1,
                              mb: 0.5,
                              display: 'block',
                              fontSize: '0.75rem'
                            }}
                          >
                            {message.username}
                          </Typography>
                        )}
                        <Box
                          sx={{
                            p: 1.5,
                            borderRadius: 2,
                            // Different backgrounds for current user vs. others
                            bgcolor: isCurrentUser
                              ? 'rgba(46, 186, 197, 0.15)'
                              : 'rgba(255, 255, 255, 0.08)',
                            borderTopRightRadius: isCurrentUser ? 0 : 2,
                            borderTopLeftRadius: isCurrentUser ? 2 : 0,
                            position: 'relative',
                          }}
                        >
                          <Typography 
                            sx={{ 
                              wordBreak: 'break-word', 
                              fontSize: '0.9rem', 
                              color: '#fff' 
                            }}
                          >
                            {message.content}
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{ 
                              color: 'rgba(255, 255, 255, 0.6)',
                              display: 'block',
                              textAlign: 'right',
                              mt: 0.5,
                              fontSize: '0.7rem'
                            }}
                          >
                            {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </Typography>
                        </Box>
                      </Box>
                      {isCurrentUser && (
                        <Avatar 
                          sx={{ 
                            bgcolor: getAvatarColor(message.username),
                            ml: 1,
                            width: 32,
                            height: 32,
                            fontSize: '0.9rem',
                            fontWeight: 'bold'
                          }}
                        >
                          {getInitials(message.username)}
                        </Avatar>
                      )}
                    </Box>
                  </React.Fragment>
                );
              })
            ) : (
              <Box sx={{ 
                textAlign: 'center', 
                py: 4, 
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                opacity: 0.7
              }}>
                <ChatIcon sx={{ fontSize: 48, color: 'rgba(255,255,255,0.5)', mb: 2 }} />
                <Typography sx={{ color: 'rgba(255,255,255,0.7)' }}>
                  No messages yet. Be the first to start a discussion!
                </Typography>
              </Box>
            )}
          </Box>
        </Paper>
      )}

      {/* Message input */}
      <TextField
        fullWidth
        value={newMessage}
        onChange={(e) => setNewMessage(e.target.value)}
        placeholder="Type your message..."
        variant="outlined"
        disabled={loading}
        InputProps={{
          style: {
            color: '#f5f5f5', // Text color
            backgroundColor: 'rgba(255, 255, 255, 0.07)', // Slightly lighter input background
          },
          endAdornment: (
            <InputAdornment position="end">
              <IconButton 
                onClick={handleSubmit}
                disabled={loading || !newMessage.trim()}
                sx={{
                  color: newMessage.trim() ? '#2EBAC5' : 'text.disabled',
                }}
              >
                {loading ? <CircularProgress size={20} /> : <SendIcon />}
              </IconButton>
            </InputAdornment>
          ),
        }}
        sx={{
          '& .MuiOutlinedInput-root': {
            borderRadius: 2,
            '& fieldset': {
              borderColor: 'rgba(255, 255, 255, 0.2)',
            },
            '&:hover fieldset': {
              borderColor: 'rgba(46, 186, 197, 0.3)',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#2EBAC5',
            },
          },
          'input::placeholder': {
            color: 'rgba(255, 255, 255, 0.6)',
          },
          // Make the font a bit bigger for readability
          '& input': {
            fontSize: '0.95rem',
          },
        }}
      />
      
      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}
    </Box>
  );
}
