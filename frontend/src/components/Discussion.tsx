'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Box, TextField, Button, Typography, Paper, Alert, CircularProgress } from '@mui/material';
import { auth } from '@/firebase/config';

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

  if (!isAuthenticated) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography color="text.secondary">Please login to participate in discussions</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Paper 
        elevation={0}
        sx={{ 
          p: 3, 
          mb: 3, 
          bgcolor: 'rgba(255, 255, 255, 0.05)',
          borderRadius: 2
        }}
      >
        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            variant="outlined"
            disabled={loading}
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
            }}
          />
          <Button
            type="submit"
            variant="contained"
            disabled={loading}
            sx={{
              bgcolor: '#69f0ae',
              color: '#1E2132',
              '&:hover': {
                bgcolor: '#4caf50',
              },
            }}
          >
            {loading ? <CircularProgress size={24} /> : 'Send'}
          </Button>
        </form>
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </Paper>

      {loading && messages.length === 0 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Box sx={{ maxHeight: '600px', overflow: 'auto' }}>
          {messages.length > 0 ? (
            messages.map((message) => (
              <Paper
                key={message.id}
                sx={{
                  p: 2,
                  mb: 2,
                  bgcolor: message.username === user?.username
                    ? 'rgba(105, 240, 174, 0.1)'
                    : 'rgba(255, 255, 255, 0.05)',
                  borderRadius: 2,
                }}
              >
                <Typography
                  variant="subtitle2"
                  sx={{
                    color: message.username === user?.username ? '#69f0ae' : '#e0e0e0',
                    fontWeight: 600,
                    mb: 1,
                  }}
                >
                  {message.username}
                </Typography>
                <Typography color="text.primary" sx={{ mb: 1 }}>
                  {message.content}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ color: 'text.secondary' }}
                >
                  {new Date(message.created_at).toLocaleString()}
                </Typography>
              </Paper>
            ))
          ) : (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography color="text.secondary">No messages yet. Be the first to start a discussion!</Typography>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
} 