import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const apiKey = '0b7d4cbe-ec2d-4d0a-8235-767b3895f574'; // Your CoinMarketCap API key
    
    const response = await fetch(
      'https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest?limit=5&convert=USD',
      {
        headers: {
          'X-CMC_PRO_API_KEY': apiKey,
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`CoinMarketCap API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Transform the data to match our frontend needs
    const cryptoData = data.data.map((crypto: any) => ({
      symbol: crypto.symbol,
      name: crypto.name,
      price: crypto.quote.USD.price,
      percentChange24h: crypto.quote.USD.percent_change_24h,
    }));

    return NextResponse.json(cryptoData);
  } catch (error) {
    console.error('Error fetching cryptocurrency data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cryptocurrency data' },
      { status: 500 }
    );
  }
} 