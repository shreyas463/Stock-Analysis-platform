'use client';

import React, { useEffect, useRef } from 'react';
import { Box } from '@mui/material';

interface Point {
  x: number;
  y: number;
}

const AnimatedStockBackground: React.FC = () => {
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
    
    // Generate multiple stock chart lines
    const charts: {
      points: Point[];
      color: string;
      speed: number;
      amplitude: number;
      offset: number;
    }[] = [];
    
    // Create 3 different chart lines (reduced from 5 for better performance)
    for (let i = 0; i < 3; i++) {
      charts.push({
        points: [],
        color: `rgba(105, 240, 174, ${0.05 + i * 0.03})`,
        speed: 0.3 + Math.random() * 0.7, // Slower speed
        amplitude: 20 + Math.random() * 30, // Reduced amplitude
        offset: Math.random() * 1000
      });
    }
    
    // Generate initial points for each chart
    charts.forEach(chart => {
      const numPoints = Math.floor(canvas.width / 10); // Fewer points for better performance
      for (let i = 0; i < numPoints; i++) {
        chart.points.push({
          x: i * 10,
          y: canvas.height / 2 + Math.sin((i + chart.offset) * 0.05) * chart.amplitude
        });
      }
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
        // Move points to the left
        chart.points.forEach(point => {
          point.x -= chart.speed * deltaTime * 0.03; // Slower movement
        });
        
        // Remove points that are off-screen
        while (chart.points.length > 0 && chart.points[0].x < 0) {
          chart.points.shift();
        }
        
        // Add new points at the right edge
        const lastPoint = chart.points[chart.points.length - 1];
        if (lastPoint && lastPoint.x < canvas.width) {
          const newX = lastPoint.x + 10;
          const newY = canvas.height / 2 + 
            Math.sin((newX + chart.offset) * 0.05) * chart.amplitude + 
            (Math.random() * 5 - 2.5); // Less randomness
          
          chart.points.push({ x: newX, y: newY });
        }
        
        // Draw the chart line
        ctx.beginPath();
        ctx.moveTo(chart.points[0].x, chart.points[0].y);
        
        for (let i = 1; i < chart.points.length; i++) {
          const xc = (chart.points[i].x + chart.points[i - 1].x) / 2;
          const yc = (chart.points[i].y + chart.points[i - 1].y) / 2;
          ctx.quadraticCurveTo(chart.points[i - 1].x, chart.points[i - 1].y, xc, yc);
        }
        
        // Fill area under the curve
        ctx.lineTo(chart.points[chart.points.length - 1].x, canvas.height);
        ctx.lineTo(chart.points[0].x, canvas.height);
        ctx.closePath();
        
        // Set gradient fill
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, chart.color);
        gradient.addColorStop(1, 'rgba(105, 240, 174, 0)');
        
        ctx.fillStyle = gradient;
        ctx.fill();
        
        // Draw the line on top
        ctx.beginPath();
        ctx.moveTo(chart.points[0].x, chart.points[0].y);
        
        for (let i = 1; i < chart.points.length; i++) {
          const xc = (chart.points[i].x + chart.points[i - 1].x) / 2;
          const yc = (chart.points[i].y + chart.points[i - 1].y) / 2;
          ctx.quadraticCurveTo(chart.points[i - 1].x, chart.points[i - 1].y, xc, yc);
        }
        
        ctx.strokeStyle = chart.color.replace(')', ', 0.6)').replace('rgba', 'rgb');
        ctx.lineWidth = 1;
        ctx.stroke();
      });
      
      // Continue animation
      animationFrameId = requestAnimationFrame(animate);
    };
    
    // Start animation
    animationFrameId = requestAnimationFrame(animate);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
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
        opacity: 0.4, // Reduced opacity
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

export default AnimatedStockBackground; 