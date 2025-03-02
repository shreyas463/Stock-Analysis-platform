import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Use the provided API key
    const apiKey = '0b7d4cbe-ec2d-4d0a-8235-767b3895f574';
    
    // For development/demo purposes, we'll use mock data instead of making actual API calls
    // In production, you would uncomment the fetch code below
    
    /*
    const response = await fetch('https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest', {
      method: 'GET',
      headers: {
        'X-CMC_PRO_API_KEY': apiKey,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    
    const data = await response.json();
    
    // Transform the data to match our frontend needs
    const cryptoPrices = data.data.slice(0, 15).map((crypto: any) => ({
      symbol: crypto.symbol,
      name: crypto.name,
      price: crypto.quote.USD.price,
      percentChange24h: crypto.quote.USD.percent_change_24h,
    }));
    */
    
    // Mock data for development
    const cryptoPrices = [
      {
        symbol: 'BTC',
        name: 'Bitcoin',
        price: 86268.02,
        percentChange24h: 1.53,
      },
      {
        symbol: 'ETH',
        name: 'Ethereum',
        price: 2224.72,
        percentChange24h: -0.46,
      },
      {
        symbol: 'USDT',
        name: 'Tether USDt',
        price: 0.9993,
        percentChange24h: -0.03,
      },
      {
        symbol: 'XRP',
        name: 'XRP',
        price: 2.29,
        percentChange24h: 4.73,
      },
      {
        symbol: 'BNB',
        name: 'BNB',
        price: 610.02,
        percentChange24h: 2.45,
      },
      {
        symbol: 'SOL',
        name: 'Solana',
        price: 142.67,
        percentChange24h: -0.89,
      },
      {
        symbol: 'DOGE',
        name: 'Dogecoin',
        price: 0.1432,
        percentChange24h: 5.21,
      },
      {
        symbol: 'ADA',
        name: 'Cardano',
        price: 0.89,
        percentChange24h: 3.45,
      },
      {
        symbol: 'AVAX',
        name: 'Avalanche',
        price: 35.67,
        percentChange24h: 4.12,
      },
      {
        symbol: 'DOT',
        name: 'Polkadot',
        price: 7.89,
        percentChange24h: -2.34,
      },
      {
        symbol: 'SHIB',
        name: 'Shiba Inu',
        price: 0.00002789,
        percentChange24h: 3.67,
      },
      {
        symbol: 'LTC',
        name: 'Litecoin',
        price: 89.34,
        percentChange24h: 0.95,
      },
      {
        symbol: 'LINK',
        name: 'Chainlink',
        price: 18.45,
        percentChange24h: 6.78,
      },
      {
        symbol: 'MATIC',
        name: 'Polygon',
        price: 0.89,
        percentChange24h: 1.23,
      },
      {
        symbol: 'UNI',
        name: 'Uniswap',
        price: 7.23,
        percentChange24h: -1.45,
      }
    ];
    
    return NextResponse.json(cryptoPrices);
  } catch (error) {
    console.error('Error fetching cryptocurrency prices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cryptocurrency prices' },
      { status: 500 }
    );
  }
} 