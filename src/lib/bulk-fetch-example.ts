// Example demonstrating bulk stock fetching to reduce Alpha Vantage API calls
// This file shows how to efficiently fetch multiple stocks at once

import { fetchBulkStockQuotes, fetchMultipleStocks, getCachedStockData } from './fetchStock';

// Example 1: Fetching a portfolio of stocks efficiently
export async function updatePortfolioEfficiently(portfolioSymbols: string[]) {
  console.log(`Updating portfolio with ${portfolioSymbols.length} stocks using bulk API`);
  
  try {
    // This will use the REALTIME_BULK_QUOTES endpoint (up to 100 symbols per call)
    const stockData = await fetchMultipleStocks(portfolioSymbols);
    
    console.log('Successfully fetched data for:', Object.keys(stockData));
    
    // Process the data
    const portfolioValues = Object.entries(stockData).map(([symbol, data]) => ({
      symbol,
      price: data.price,
      change: data.change,
      value: data.price * 100 // assuming 100 shares for demo
    }));
    
    return portfolioValues;
    
  } catch (error) {
    console.error('Error in bulk portfolio update:', error);
    throw error;
  }
}

// Example 2: Efficiently fetching market movers
export async function getMarketMoversEfficiently() {
  // Common market symbols to monitor
  const marketSymbols = [
    'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA',
    'META', 'NVDA', 'NFLX', 'CRM', 'ADBE',
    'PYPL', 'INTC', 'AMD', 'ORCL', 'CSCO',
    'V', 'MA', 'JPM', 'BAC', 'WFC'
  ];

  console.log(`Fetching ${marketSymbols.length} market symbols with single bulk API call`);
  
  // Instead of 20 individual API calls, this makes just 1 bulk call
  const bulkQuotes = await fetchBulkStockQuotes(marketSymbols);
  
  // Convert to array for processing
  const stockData = Array.from(bulkQuotes.values());
  
  // Find top gainers and losers
  const gainers = stockData
    .filter(stock => stock.changePercent > 0)
    .sort((a, b) => b.changePercent - a.changePercent)
    .slice(0, 5);
    
  const losers = stockData
    .filter(stock => stock.changePercent < 0)
    .sort((a, b) => a.changePercent - b.changePercent)
    .slice(0, 5);

  return { gainers, losers };
}

// Example 3: Using cache to avoid redundant API calls
export function getStockFromCacheFirst(symbol: string) {
  // Check cache first (5-minute TTL)
  const cached = getCachedStockData(symbol);
  if (cached) {
    console.log(`Using cached data for ${symbol}`);
    return {
      price: cached.price,
      change: cached.changePercent,
      timestamp: cached.timestamp,
      fromCache: true
    };
  }
  
  console.log(`No cache data for ${symbol}, needs fresh fetch`);
  return null;
}

// Example 4: Batch processing with delay
export async function batchFetchWithDelay(symbols: string[]) {
  // This demonstrates the automatic batching with 100ms delay
  const promises = symbols.map(symbol => 
    import('./fetchStock').then(module => 
      module.fetchStock(symbol, '1M', true) // forceBulk = true
    )
  );
  
  // All symbols will be collected and fetched in a single bulk call
  const results = await Promise.all(promises);
  
  return results.map((data, index) => ({
    symbol: symbols[index],
    ...data
  }));
}

// Example usage in a dashboard component:
export const exampleUsage = {
  // Before: Multiple individual API calls
  inefficientWay: async (portfolioSymbols: string[]) => {
    const results = [];
    for (const symbol of portfolioSymbols) {
      // This makes 1 API call per symbol = N calls total
      const { fetchStock } = await import('./fetchStock');
      const data = await fetchStock(symbol);
      results.push({ symbol, data });
    }
    return results;
  },
  
  // After: Single bulk API call
  efficientWay: async (portfolioSymbols: string[]) => {
    // This makes 1 API call for up to 100 symbols
    const { fetchMultipleStocks } = await import('./fetchStock');
    const bulkData = await fetchMultipleStocks(portfolioSymbols);
    
    return Object.entries(bulkData).map(([symbol, data]) => ({ symbol, data }));
  }
};

// API Call Reduction Examples:
/*
Scenario 1: Portfolio with 10 stocks
- Before: 10 individual API calls (GLOBAL_QUOTE × 10)
- After: 1 bulk API call (REALTIME_BULK_QUOTES × 1)
- Reduction: 90% fewer API calls

Scenario 2: Portfolio with 50 stocks  
- Before: 50 individual API calls
- After: 1 bulk API call
- Reduction: 98% fewer API calls

Scenario 3: Watchlist with 25 stocks updated every 5 minutes
- Before: 25 calls × 12 updates/hour = 300 calls/hour
- After: 1 call × 12 updates/hour = 12 calls/hour  
- Reduction: 96% fewer API calls

Scenario 4: Market overview with 100 stocks
- Before: 100 individual API calls
- After: 1 bulk API call (exactly at the 100 symbol limit)
- Reduction: 99% fewer API calls
*/ 