# Bulk Stock Fetching Optimization for Alpha Vantage API

## Overview

This implementation optimizes your Alpha Vantage API usage by utilizing the `REALTIME_BULK_QUOTES` endpoint instead of making individual `GLOBAL_QUOTE` calls. This can reduce your API usage by **90-99%** depending on your use case.

## Key Benefits

✅ **Massive API Call Reduction**: Fetch up to 100 symbols in a single API call  
✅ **Rate Limit Protection**: Avoid hitting Alpha Vantage rate limits  
✅ **Automatic Caching**: 5-minute cache to avoid redundant calls  
✅ **Fallback Support**: Automatically falls back to individual calls if bulk fails  
✅ **Batch Processing**: Automatic batching with configurable delays  

## API Call Reduction Examples

| Scenario | Before (Individual Calls) | After (Bulk Calls) | Reduction |
|----------|---------------------------|-------------------|-----------|
| 10-stock portfolio | 10 API calls | 1 API call | 90% |
| 50-stock portfolio | 50 API calls | 1 API call | 98% |
| 100-stock watchlist | 100 API calls | 1 API call | 99% |
| Hourly updates (25 stocks) | 300 calls/hour | 12 calls/hour | 96% |

## Implementation

### 1. Updated fetchStock.ts

The main implementation is in `src/lib/fetchStock.ts` with these new functions:

```typescript
// Bulk fetch up to 100 symbols at once
fetchBulkStockQuotes(symbols: string[]): Promise<Map<string, BulkStockData>>

// Convenient wrapper for multiple stocks
fetchMultipleStocks(symbols: string[], timePeriod?: string): Promise<{[symbol: string]: any}>

// Get cached data to avoid redundant calls
getCachedStockData(symbol: string): BulkStockData | null

// Enhanced fetchStock with bulk support
fetchStock(symbol: string, timePeriod?: string, forceBulk?: boolean)
```

### 2. Dashboard Integration

The dashboard has been updated with a utility function:

```typescript
// In dashboard/page.tsx
const updatePortfolioWithBulkFetch = async (portfolioData: any[]) => {
  // Dynamically import to avoid conflicts
  const { fetchMultipleStocks } = await import("../../lib/fetchStock");
  const bulkStockData = await fetchMultipleStocks(symbols);
  // Process portfolio with bulk data...
}
```

## Usage Examples

### Portfolio Updates

```typescript
// Before: Multiple individual calls
const portfolioData = await Promise.all(
  symbols.map(symbol => fetchStock(symbol))
);

// After: Single bulk call
const { fetchMultipleStocks } = await import('./lib/fetchStock');
const portfolioData = await fetchMultipleStocks(symbols);
```

### Market Movers

```typescript
const marketSymbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA'];

// Before: 5 API calls
const data = await Promise.all(marketSymbols.map(fetchStock));

// After: 1 API call
const { fetchBulkStockQuotes } = await import('./lib/fetchStock');
const bulkData = await fetchBulkStockQuotes(marketSymbols);
```

### With Caching

```typescript
import { getCachedStockData, fetchMultipleStocks } from './lib/fetchStock';

// Check cache first
const cachedData = getCachedStockData('AAPL');
if (cachedData) {
  console.log('Using cached data:', cachedData);
} else {
  // Fetch fresh data
  const freshData = await fetchMultipleStocks(['AAPL']);
}
```

## Technical Details

### Endpoint Used
- **Bulk**: `https://www.alphavantage.co/query?function=REALTIME_BULK_QUOTES&symbol=MSFT,AAPL,IBM&apikey=...`
- **Individual**: `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=MSFT&apikey=...`

### Caching Strategy
- **TTL**: 5 minutes for real-time data
- **Storage**: In-memory Map for fast access
- **Validation**: Automatic cache invalidation

### Batch Processing
- **Queue**: Symbols are collected for 100ms before batching
- **Limit**: 100 symbols per batch (Alpha Vantage limit)
- **Timeout**: Configurable batch delay (default: 100ms)

### Error Handling
- **Graceful Fallback**: Falls back to individual calls if bulk fails
- **Premium Check**: Detects premium endpoint requirements
- **Rate Limit Handling**: Built-in retry logic

## Premium Endpoint Note

The `REALTIME_BULK_QUOTES` endpoint requires an Alpha Vantage premium subscription. If you don't have a premium subscription, the implementation will:

1. Detect the premium requirement message
2. Log a warning about needing premium subscription
3. Automatically fall back to individual `GLOBAL_QUOTE` calls
4. Still provide the caching benefits

## Monitoring

You can monitor the cache and API usage:

```typescript
import { getStockCacheSize, clearStockCache } from './lib/fetchStock';

console.log('Cache size:', getStockCacheSize());
clearStockCache(); // Manual cache clear if needed
```

## Migration Guide

### Immediate Benefits (No Code Changes)
The existing `fetchStock()` calls will automatically benefit from caching.

### Full Optimization (Code Changes)
Replace individual `fetchStock()` calls with `fetchMultipleStocks()` for maximum efficiency:

```typescript
// Replace this pattern:
const results = await Promise.all(symbols.map(fetchStock));

// With this:
const { fetchMultipleStocks } = await import('./lib/fetchStock');
const results = await fetchMultipleStocks(symbols);
```

## Example Scenarios

See `src/lib/bulk-fetch-example.ts` for detailed examples including:
- Portfolio updates
- Market mover detection  
- Cache utilization
- Batch processing

## Performance Impact

With a typical portfolio of 20 stocks updated every 5 minutes:

**Before**: 20 calls × 12 updates/hour = 240 API calls/hour  
**After**: 1 call × 12 updates/hour = 12 API calls/hour  
**Savings**: 228 fewer API calls/hour (95% reduction)

This optimization will help you stay well within Alpha Vantage rate limits while providing faster data updates for your users. 