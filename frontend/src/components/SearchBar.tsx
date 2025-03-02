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
    <Box sx={{ position: 'relative', zIndex: 1100 }}>
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
      <Box sx={{ position: 'relative', height: 0 }}>
        {searchResults.length > 0 && searchQuery && isOpen && (
          <Paper 
            ref={searchRef}
            sx={{ 
              position: 'absolute', 
              top: 8, 
              left: 0, 
              right: 0, 
              maxHeight: 400, 
              overflow: 'auto',
              bgcolor: '#2A2D3E',
              borderRadius: '12px',
              border: '2px solid',
              borderColor: 'rgba(255, 255, 255, 0.1)',
              boxShadow: '0 8px 16px rgba(0, 0, 0, 0.2)',
              zIndex: 9999,
            }}
          >
            <List sx={{ py: 0 }}>
              {searchResults.map((result) => (
                <ListItem 
                  key={result.symbol} 
                  onClick={() => handleSelect(result.symbol)}
                  sx={{ 
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    '&:hover': { 
                      bgcolor: 'rgba(105, 240, 174, 0.1)',
                    },
                    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                    '&:last-child': {
                      borderBottom: 'none'
                    }
                  }}
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body1" sx={{ fontWeight: 'bold', color: '#e0e0e0' }}>
                          {result.symbol}
                        </Typography>
                        {result.price && (
                          <Typography variant="body2" sx={{ color: '#69f0ae', fontWeight: 'medium' }}>
                            ${result.price.toFixed(2)}
                          </Typography>
                        )}
                      </Box>
                    }
                    secondary={
                      <Typography variant="body2" sx={{ color: '#9e9e9e', fontSize: '0.85rem' }}>
                        {result.description || result.name}
                      </Typography>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        )}
      </Box>
    </Box>
  );
} 