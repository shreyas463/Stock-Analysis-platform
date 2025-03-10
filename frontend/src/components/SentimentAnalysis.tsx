'use client';

import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, CircularProgress, Chip, Tooltip } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';
import SentimentSatisfiedAltIcon from '@mui/icons-material/SentimentSatisfiedAlt';
import SentimentVeryDissatisfiedIcon from '@mui/icons-material/SentimentVeryDissatisfied';
import SentimentNeutralIcon from '@mui/icons-material/SentimentNeutral';

interface SentimentAnalysisProps {
  symbol: string;
}

interface SentimentData {
  score: number;
  articles: number;
  positive: number;
  negative: number;
  neutral: number;
  trending: 'up' | 'down' | 'neutral';
  keywords: Array<{word: string, count: number, sentiment: number}>;
}

const SentimentAnalysis: React.FC<SentimentAnalysisProps> = ({ symbol }) => {
  const [sentimentData, setSentimentData] = useState<SentimentData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSentimentData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // This would be a real API call in production
        // For now, we'll simulate sentiment data
        const mockData: SentimentData = {
          score: Math.random() * 2 - 1, // Range from -1 to 1
          articles: Math.floor(Math.random() * 50) + 10,
          positive: Math.floor(Math.random() * 70) + 10,
          negative: Math.floor(Math.random() * 40) + 5,
          neutral: Math.floor(Math.random() * 30) + 5,
          trending: ['up', 'down', 'neutral'][Math.floor(Math.random() * 3)] as 'up' | 'down' | 'neutral',
          keywords: [
            { word: 'earnings', count: Math.floor(Math.random() * 20) + 5, sentiment: Math.random() * 2 - 1 },
            { word: 'growth', count: Math.floor(Math.random() * 15) + 3, sentiment: Math.random() * 2 - 1 },
            { word: 'innovation', count: Math.floor(Math.random() * 10) + 2, sentiment: Math.random() * 2 - 1 },
            { word: 'competition', count: Math.floor(Math.random() * 12) + 2, sentiment: Math.random() * 2 - 1 },
            { word: 'market', count: Math.floor(Math.random() * 18) + 4, sentiment: Math.random() * 2 - 1 }
          ]
        };
        
        // Simulate API delay
        setTimeout(() => {
          setSentimentData(mockData);
          setLoading(false);
        }, 1000);
      } catch (err) {
        setError('Failed to fetch sentiment data');
        setLoading(false);
      }
    };

    if (symbol) {
      fetchSentimentData();
    }
  }, [symbol]);

  const getSentimentColor = (score: number) => {
    if (score > 0.3) return '#4caf50';
    if (score > 0) return '#8bc34a';
    if (score > -0.3) return '#ffc107';
    return '#f44336';
  };

  const getSentimentIcon = (score: number) => {
    if (score > 0.3) return <SentimentSatisfiedAltIcon />;
    if (score > -0.3) return <SentimentNeutralIcon />;
    return <SentimentVeryDissatisfiedIcon />;
  };

  const getTrendingIcon = (trend: 'up' | 'down' | 'neutral') => {
    if (trend === 'up') return <TrendingUpIcon sx={{ color: '#4caf50' }} />;
    if (trend === 'down') return <TrendingDownIcon sx={{ color: '#f44336' }} />;
    return <TrendingFlatIcon sx={{ color: '#ffc107' }} />;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress size={30} sx={{ color: '#4caf50' }} />
      </Box>
    );
  }

  if (error || !sentimentData) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="body2" color="error">
          {error || 'No sentiment data available'}
        </Typography>
      </Box>
    );
  }

  const { score, articles, positive, negative, neutral, trending, keywords } = sentimentData;
  const total = positive + negative + neutral;
  
  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Box 
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            bgcolor: getSentimentColor(score),
            color: '#fff',
            width: 40,
            height: 40,
            borderRadius: '50%',
            mr: 2
          }}
        >
          {getSentimentIcon(score)}
        </Box>
        <Box>
          <Typography variant="h6" sx={{ color: '#fff', mb: 0.5 }}>
            {score > 0.3 ? 'Positive' : score > -0.3 ? 'Neutral' : 'Negative'} Sentiment
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography variant="body2" sx={{ color: '#aaa', mr: 1 }}>
              Based on {articles} recent articles
            </Typography>
            {getTrendingIcon(trending)}
          </Box>
        </Box>
      </Box>

      <Paper sx={{ bgcolor: '#2A2A2A', p: 2, borderRadius: 2, mb: 3 }}>
        <Typography variant="body2" sx={{ color: '#aaa', mb: 1 }}>
          Sentiment Distribution
        </Typography>
        <Box sx={{ display: 'flex', mb: 1, height: 20, borderRadius: 1, overflow: 'hidden' }}>
          <Box 
            sx={{ 
              width: `${(positive / total) * 100}%`, 
              bgcolor: '#4caf50',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Typography variant="caption" sx={{ color: '#fff', fontSize: '0.6rem' }}>
              {Math.round((positive / total) * 100)}%
            </Typography>
          </Box>
          <Box 
            sx={{ 
              width: `${(neutral / total) * 100}%`, 
              bgcolor: '#ffc107',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Typography variant="caption" sx={{ color: '#000', fontSize: '0.6rem' }}>
              {Math.round((neutral / total) * 100)}%
            </Typography>
          </Box>
          <Box 
            sx={{ 
              width: `${(negative / total) * 100}%`, 
              bgcolor: '#f44336',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Typography variant="caption" sx={{ color: '#fff', fontSize: '0.6rem' }}>
              {Math.round((negative / total) * 100)}%
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
          <Typography variant="caption" sx={{ color: '#4caf50' }}>Positive</Typography>
          <Typography variant="caption" sx={{ color: '#ffc107' }}>Neutral</Typography>
          <Typography variant="caption" sx={{ color: '#f44336' }}>Negative</Typography>
        </Box>
      </Paper>

      <Typography variant="body2" sx={{ color: '#aaa', mb: 1 }}>
        Key Topics
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {keywords.map((keyword, index) => (
          <Tooltip 
            key={index} 
            title={`Sentiment: ${keyword.sentiment > 0 ? 'Positive' : keyword.sentiment < 0 ? 'Negative' : 'Neutral'}`}
          >
            <Chip 
              label={keyword.word}
              size="small"
              sx={{ 
                bgcolor: getSentimentColor(keyword.sentiment),
                color: '#fff',
                '& .MuiChip-label': {
                  px: 1
                }
              }}
            />
          </Tooltip>
        ))}
      </Box>
    </Box>
  );
};

export default SentimentAnalysis; 