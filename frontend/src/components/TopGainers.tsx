'use client';

import React, { useEffect, useState } from 'react';

const API_BASE_URL = 'http://localhost:5001';

interface GainerStock {
  symbol: string;
  price: number;
  change: number;
}

const TopGainers: React.FC = () => {
  const [gainers, setGainers] = useState<GainerStock[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGainers = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/market/top-gainers`);
        const data = await response.json();
        setGainers(data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching top gainers:', error);
        setLoading(false);
      }
    };

    fetchGainers();
    const interval = setInterval(fetchGainers, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-gray-700 h-16 rounded-lg"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {gainers.map((stock, index) => (
        <div
          key={index}
          className="p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors cursor-pointer"
        >
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-semibold text-white">{stock.symbol}</h3>
              <p className="text-sm text-gray-400">${stock.price.toFixed(2)}</p>
            </div>
            <div className={`text-lg font-semibold ${stock.change > 0 ? 'text-green-500' : 'text-red-500'}`}>
              {stock.change > 0 ? '+' : ''}{stock.change.toFixed(2)}%
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default TopGainers; 