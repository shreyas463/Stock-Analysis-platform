'use client';

import React, { useState, useEffect } from 'react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
import {
  Box,
  List,
  ListItem,
  ListItemText,
  Typography,
  Link,
  CircularProgress,
  Alert,
  Divider
} from '@mui/material';

interface NewsItem {
  datetime: number;
  headline: string;
  summary: string;
  url: string;
  source: string;
}

interface NewsSectionProps {
  symbol: string;
}

export default function NewsSection({ symbol }: NewsSectionProps) {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchNews = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`${API_BASE_URL}/api/stock/${symbol}/news`);
        const data = await response.json();
        if (response.ok) {
          setNews(data);
        } else {
          setError(data.error || 'Failed to fetch news');
        }
      } catch (err) {
        setError('Failed to fetch news');
      }
      setLoading(false);
    };

    if (symbol) {
      fetchNews();
    }
  }, [symbol]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <List sx={{ width: '100%', bgcolor: 'transparent' }}>
      {news.map((item, index) => (
        <React.Fragment key={index}>
          <ListItem 
            alignItems="flex-start"
            component="a"
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            sx={{
              p: 3,
              cursor: 'pointer',
              transition: 'all 0.2s ease-in-out',
              borderRadius: '12px',
              '&:hover': {
                bgcolor: 'rgba(105, 240, 174, 0.05)',
                transform: 'translateX(4px)'
              },
              textDecoration: 'none'
            }}
          >
            <ListItemText
              primary={
                <Typography
                  sx={{
                    color: '#e0e0e0',
                    fontSize: '1.1rem',
                    fontWeight: 600,
                    lineHeight: 1.4,
                    mb: 1.5,
                    '&:hover': {
                      color: '#69f0ae'
                    }
                  }}
                >
                  {item.headline}
                </Typography>
              }
              secondary={
                <Box>
                  <Typography
                    component="p"
                    variant="body2"
                    sx={{
                      color: '#9e9e9e',
                      fontSize: '0.95rem',
                      lineHeight: 1.6,
                      mb: 2,
                      fontWeight: 400
                    }}
                  >
                    {item.summary}
                  </Typography>
                  <Box 
                    sx={{ 
                      display: 'flex', 
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <Typography
                      component="span"
                      sx={{
                        color: '#69f0ae',
                        bgcolor: 'rgba(105, 240, 174, 0.1)',
                        px: 2,
                        py: 0.5,
                        borderRadius: '16px',
                        fontSize: '0.85rem',
                        fontWeight: 500
                      }}
                    >
                      {item.source}
                    </Typography>
                    <Typography
                      component="span"
                      sx={{
                        color: '#9e9e9e',
                        fontSize: '0.85rem',
                        fontWeight: 500
                      }}
                    >
                      {new Date(item.datetime * 1000).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </Typography>
                  </Box>
                </Box>
              }
            />
          </ListItem>
          {index < news.length - 1 && (
            <Divider 
              sx={{ 
                my: 1,
                borderColor: 'rgba(255, 255, 255, 0.05)'
              }} 
            />
          )}
        </React.Fragment>
      ))}
      {news.length === 0 && (
        <Box 
          sx={{ 
            textAlign: 'center', 
            py: 6,
            px: 3,
            borderRadius: '12px',
            bgcolor: 'rgba(255, 255, 255, 0.02)'
          }}
        >
          <Typography 
            sx={{ 
              color: '#9e9e9e',
              fontSize: '1rem',
              fontWeight: 500
            }}
          >
            No news available for {symbol}
          </Typography>
        </Box>
      )}
    </List>
  );
} 