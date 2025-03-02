'use client';

import React, { useEffect, useRef } from 'react';
import { Box } from '@mui/material';

interface Candle {
  x: number;
  open: number;
  high: number;
  low: number;
  close: number;
  color: string;
  width: number;
}

const AnimatedCandlestickBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas dimensions to match window size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Define baseY here so it's available throughout the function
    const baseY = canvas.height / 2;
    
    // Generate candlestick data
    const generateCandles = (count: number, volatilityFactor: number = 1): Candle[] => {
      const candles: Candle[] = [];
      const candleWidth = Math.max(canvas.width / (count * 2), 4); // Ensure candles aren't too thin
      const spacing = candleWidth * 1.5;
      const amplitude = canvas.height / 8;
      
      let lastClose = baseY + (Math.random() * amplitude - amplitude / 2);
      
      for (let i = 0; i < count; i++) {
        const open = lastClose;
        const volatility = amplitude * 0.3 * volatilityFactor;
        const close = open + (Math.random() * volatility * 2 - volatility);
        const high = Math.max(open, close) + Math.random() * volatility * 0.5;
        const low = Math.min(open, close) - Math.random() * volatility * 0.5;
        
        candles.push({
          x: i * spacing,
          open,
          high,
          low,
          close,
          color: close > open ? 'rgba(105, 240, 174, 0.7)' : 'rgba(255, 82, 82, 0.7)',
          width: candleWidth
        });
        
        lastClose = close;
      }
      
      return candles;
    };
    
    // Create multiple candlestick charts
    const charts: {
      candles: Candle[];
      speed: number;
      y: number;
      opacity: number;
    }[] = [];
    
    // Create 5 different candlestick charts (increased from 3)
    for (let i = 0; i < 5; i++) {
      const candleCount = Math.floor(canvas.width / 15); // More candles per chart (changed from 20)
      const volatilityFactor = 0.8 + Math.random() * 0.4; // Different volatility for each chart
      
      // Distribute charts more evenly across the screen
      const yPosition = (canvas.height / 6) * (i + 1);
      
      charts.push({
        candles: generateCandles(candleCount, volatilityFactor),
        speed: 0.15 + Math.random() * 0.3, // Varied speeds
        y: yPosition,
        opacity: 0.15 + (i * 0.08) // Varied opacity
      });
    }
    
    // Add 2 more charts with different patterns
    // One near the top
    charts.push({
      candles: generateCandles(Math.floor(canvas.width / 25), 1.5),
      speed: 0.1 + Math.random() * 0.2,
      y: canvas.height * 0.15,
      opacity: 0.2
    });
    
    // One near the bottom
    charts.push({
      candles: generateCandles(Math.floor(canvas.width / 25), 1.5),
      speed: 0.1 + Math.random() * 0.2,
      y: canvas.height * 0.85,
      opacity: 0.2
    });
    
    // Animation variables
    let animationFrameId: number;
    let lastTimestamp = 0;
    
    // Animation function
    const animate = (timestamp: number) => {
      if (!lastTimestamp) lastTimestamp = timestamp;
      const deltaTime = timestamp - lastTimestamp;
      lastTimestamp = timestamp;
      
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Update and draw each chart
      charts.forEach(chart => {
        if (!chart || !chart.candles) return;
        
        // Move candles to the left
        chart.candles.forEach(candle => {
          if (candle) candle.x -= chart.speed * deltaTime * 0.02;
        });
        
        // Remove candles that are off-screen
        while (chart.candles.length > 0 && chart.candles[0] && chart.candles[0].x + chart.candles[0].width < 0) {
          chart.candles.shift();
        }
        
        // Add new candles at the right edge if needed
        const lastCandle = chart.candles[chart.candles.length - 1];
        if (lastCandle && lastCandle.x < canvas.width) {
          const candleWidth = lastCandle.width;
          const spacing = candleWidth * 1.5;
          const newX = lastCandle.x + spacing;
          
          const open = lastCandle.close;
          const volatility = canvas.height / 24;
          const close = open + (Math.random() * volatility * 2 - volatility);
          const high = Math.max(open, close) + Math.random() * volatility * 0.5;
          const low = Math.min(open, close) - Math.random() * volatility * 0.5;
          
          chart.candles.push({
            x: newX,
            open,
            high,
            low,
            close,
            color: close > open ? 'rgba(105, 240, 174, 0.7)' : 'rgba(255, 82, 82, 0.7)',
            width: candleWidth
          });
        }
        
        // Draw the candlesticks
        ctx.globalAlpha = chart.opacity;
        chart.candles.forEach(candle => {
          if (!candle) return;
          
          // Draw the wick (vertical line)
          ctx.beginPath();
          ctx.moveTo(candle.x + candle.width / 2, chart.y - (baseY - candle.high));
          ctx.lineTo(candle.x + candle.width / 2, chart.y - (baseY - candle.low));
          ctx.strokeStyle = candle.color;
          ctx.lineWidth = 2; // Increased line width for better visibility
          ctx.stroke();
          
          // Draw the body (rectangle)
          const bodyHeight = Math.abs(chart.y - (baseY - candle.open) - (chart.y - (baseY - candle.close)));
          const bodyY = candle.close > candle.open 
            ? chart.y - (baseY - candle.open) 
            : chart.y - (baseY - candle.close);
          
          ctx.fillStyle = candle.color;
          ctx.fillRect(
            candle.x, 
            bodyY, 
            candle.width, 
            Math.max(bodyHeight, 1) // Ensure body has at least 1px height
          );
        });
        ctx.globalAlpha = 1;
      });
      
      // Continue animation
      animationFrameId = requestAnimationFrame(animate);
    };
    
    // Start animation
    try {
      animationFrameId = requestAnimationFrame(animate);
    } catch (error) {
      console.error('Animation error:', error);
    }
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, []);
  
  return (
    <Box
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        opacity: 0.5, // Increased opacity from 0.3 to 0.5 for better visibility
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
        }}
      />
    </Box>
  );
};

export default AnimatedCandlestickBackground; 