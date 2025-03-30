'use client';

import React, { useEffect, useState } from 'react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

interface NewsItem {
  datetime: number;
  headline: string;
  summary: string;
  url: string;
  source: string;
}

interface StockNewsProps {
  symbol: string;
}

const StockNews: React.FC<StockNewsProps> = ({ symbol }) => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_BASE_URL}/api/stock/${symbol}/news`);
        const data = await response.json();
        setNews(data);
      } catch (error) {
        console.error('Error fetching news:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, [symbol]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-gray-700 rounded-lg p-4 space-y-2">
            <div className="h-4 bg-gray-600 rounded w-3/4"></div>
            <div className="h-3 bg-gray-600 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {news.map((item, index) => (
        <a
          key={index}
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors group"
        >
          <h3 className="font-semibold text-white group-hover:text-green-400 transition-colors line-clamp-2 mb-2">
            {item.headline}
          </h3>
          <p className="text-sm text-gray-400 line-clamp-2 mb-3">
            {item.summary}
          </p>
          <div className="flex justify-between items-center text-xs text-gray-500">
            <span className="bg-gray-800 px-2 py-1 rounded">
              {item.source}
            </span>
            <span>
              {new Date(item.datetime * 1000).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
          </div>
        </a>
      ))}
      {news.length === 0 && (
        <div className="text-center text-gray-400 py-4">
          No news available for {symbol}
        </div>
      )}
    </div>
  );
};

export default StockNews; 