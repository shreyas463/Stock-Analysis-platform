'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Box, TextField, InputAdornment, Paper, List, ListItem, ListItemText, Typography } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';

const API_BASE_URL = 'http://localhost:5001';

interface SearchResult {
  description: string;
  displaySymbol: string;
  symbol: string;
  type: string;
  name: string;
  change: number;
  price?: number;
}

interface SearchBarProps {
  onStockSelect: (symbol: string) => void;
}

export default function SearchBar({ onStockSelect }: SearchBarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const searchStocks = async () => {
      if (searchQuery.length < 1) {
        setSearchResults([]);
        return;
      }

      setLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/api/search?q=${searchQuery}`);
        const data = await response.json();
        const results = data.result || [];
        
        // Fetch current price for each stock
        const resultsWithPrice = await Promise.all(
          results.map(async (result: SearchResult) => {
            try {
              const priceResponse = await fetch(`${API_BASE_URL}/api/stock/${result.symbol}`);
              const priceData = await priceResponse.json();
              return {
                ...result,
                price: priceData.quote?.c || null
              };
            } catch (error) {
              console.error(`Error fetching price for ${result.symbol}:`, error);
              return result;
            }
          })
        );
        
        setSearchResults(resultsWithPrice);
      } catch (error) {
        console.error('Error searching stocks:', error);
      }
      setLoading(false);
    };

    const debounceTimeout = setTimeout(searchStocks, 300);
    return () => clearTimeout(debounceTimeout);
  }, [searchQuery]);

  const handleSelect = (symbol: string) => {
    setSearchQuery(symbol);
    setSearchResults([]);
    onStockSelect(symbol);
  };

  return (
    <Box sx={{ position: 'relative' }}>
      <TextField
        fullWidth
        placeholder="Search stocks..."
        value={searchQuery}
        onChange={(e) => {
          setSearchQuery(e.target.value);
          setIsOpen(true);
        }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon sx={{ color: '#9e9e9e' }} />
            </InputAdornment>
          ),
        }}
        sx={{
          '& .MuiOutlinedInput-root': {
            bgcolor: '#1E2132',
            borderRadius: '12px',
            transition: 'all 0.2s ease-in-out',
            '& fieldset': { 
              borderColor: 'rgba(255, 255, 255, 0.1)',
              borderWidth: '2px'
            },
            '&:hover fieldset': { 
              borderColor: 'rgba(255, 255, 255, 0.2)',
              borderWidth: '2px'
            },
            '&.Mui-focused fieldset': { 
              borderColor: '#69f0ae',
              borderWidth: '2px'
            }
          },
          '& .MuiInputBase-input': { 
            color: '#e0e0e0',
            fontSize: '1.1rem',
            py: 1.8,
            px: 1,
            '&::placeholder': {
              color: '#9e9e9e',
              opacity: 1
            }
          }
        }}
      />
      {searchResults.length > 0 && searchQuery && (
        <Paper 
          sx={{ 
            position: 'absolute', 
            top: '100%', 
            left: 0, 
            right: 0, 
            mt: 1, 
            maxHeight: 400, 
            overflow: 'auto',
            bgcolor: '#2A2D3E',
            borderRadius: '12px',
            border: '2px solid',
            borderColor: 'rgba(255, 255, 255, 0.1)',
            boxShadow: '0 8px 16px rgba(0, 0, 0, 0.2)',
            zIndex: 1000,
            '&::-webkit-scrollbar': {
              width: '8px',
            },
            '&::-webkit-scrollbar-track': {
              background: '#1E2132',
              borderRadius: '4px',
            },
            '&::-webkit-scrollbar-thumb': {
              background: '#4A4D5E',
              borderRadius: '4px',
              '&:hover': {
                background: '#5A5D6E',
              },
            },
          }}
        >
          <List>
            {searchResults.map((result) => (
              <ListItem 
                key={result.symbol}
                onClick={() => handleSelect(result.symbol)}
                sx={{
                  py: 2,
                  px: 3,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    bgcolor: 'rgba(105, 240, 174, 0.1)',
                    transform: 'translateX(4px)'
                  },
                  borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                  '&:last-child': {
                    borderBottom: 'none'
                  }
                }}
              >
                <Box sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                    <Typography 
                      sx={{ 
                        color: '#e0e0e0', 
                        fontWeight: 600,
                        fontSize: '1.1rem',
                        mr: 2
                      }}
                    >
                      {result.symbol}
                    </Typography>
                    {result.price && (
                      <Typography 
                        sx={{ 
                          color: '#9e9e9e',
                          fontWeight: 500,
                          fontSize: '1rem'
                        }}
                      >
                        ${result.price.toFixed(2)}
                      </Typography>
                    )}
                  </Box>
                  <Typography 
                    sx={{ 
                      color: '#9e9e9e', 
                      fontSize: '0.9rem',
                      fontWeight: 400,
                      lineHeight: 1.4
                    }}
                  >
                    {result.name}
                  </Typography>
                </Box>
                <Box sx={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'flex-end',
                  ml: 2
                }}>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: (result.change || 0) >= 0 ? '#69f0ae' : '#ff5252',
                      fontWeight: 600,
                      fontSize: '0.95rem',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    {typeof result.change === 'number' ? (
                      `${result.change >= 0 ? '+' : ''}${result.change.toFixed(2)}%`
                    ) : '-'}
                  </Typography>
                </Box>
              </ListItem>
            ))}
          </List>
        </Paper>
      )}
    </Box>
  );
} 