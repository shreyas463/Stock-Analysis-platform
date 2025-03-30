'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Box, TextField, InputAdornment, Paper, List, ListItem, ListItemText, Typography } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

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
  inputRef?: React.RefObject<HTMLInputElement>;
}

export default function SearchBar({ onStockSelect, inputRef }: SearchBarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const defaultInputRef = useRef<HTMLInputElement>(null);
  const finalInputRef = inputRef || defaultInputRef;

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
    <Box ref={searchRef} sx={{ position: 'relative', width: '100%' }}>
      <TextField
        fullWidth
        placeholder="Search stocks..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        onFocus={() => setIsOpen(true)}
        inputRef={finalInputRef}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
        }}
        sx={{
          '& .MuiOutlinedInput-root': {
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            borderRadius: 2,
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: 'rgba(255, 255, 255, 0.3)',
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: '#4caf50',
            },
          },
          '& .MuiOutlinedInput-input': {
            color: '#fff',
          },
          '& .MuiInputAdornment-root': {
            color: 'rgba(255, 255, 255, 0.7)',
          },
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