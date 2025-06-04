// Cache for bulk stock data
interface BulkStockData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: string;
  extendedHours?: {
    price: number;
    change: number;
    changePercent: number;
  };
}

// Interface for fetchStock return type
export interface StockResponse {
  price: number;
  change: number;
  history: { timestamp: string; price: number }[];
}

// Interface for multiple stocks response
export interface MultipleStocksResponse {
  [symbol: string]: StockResponse;
}

interface StockCache {
  data: BulkStockData;
  timestamp: number;
}

export interface HistoricalData {
  date: string;
  price: number;
}

// Cache with 5-minute TTL for real-time data
const stockCache = new Map<string, StockCache>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Batch queue for bulk requests
const batchQueue: Set<string> = new Set();
let batchTimeout: NodeJS.Timeout | null = null;
const BATCH_DELAY = 100; // 100ms delay to collect symbols
const MAX_BATCH_SIZE = 100; // Alpha Vantage limit

// Helper function to check if cache is valid
function isCacheValid(cacheEntry: StockCache): boolean {
  return Date.now() - cacheEntry.timestamp < CACHE_TTL;
}

// Bulk fetch function using REALTIME_BULK_QUOTES
export async function fetchBulkStockQuotes(symbols: string[]): Promise<Map<string, BulkStockData>> {
  const key = process.env.NEXT_PUBLIC_ALPHA_VANTAGE_KEY!;
  const results = new Map<string, BulkStockData>();
  
  // Split symbols into batches of 100
  const batches: string[][] = [];
  for (let i = 0; i < symbols.length; i += MAX_BATCH_SIZE) {
    batches.push(symbols.slice(i, i + MAX_BATCH_SIZE));
  }

  try {
    const batchPromises: Promise<Map<string, BulkStockData>>[] = batches.map(async (batch) => {
      const symbolsParam = batch.join(',');
      console.log(`Fetching bulk quotes for: ${symbolsParam}`);
      
      const response = await fetch(
        `https://www.alphavantage.co/query?function=REALTIME_BULK_QUOTES&symbol=${symbolsParam}&apikey=${key}`
      );
      
      const data = await response.json();
      
      // Check for API errors
      if (data["Error Message"] || data["Note"]) {
        const errorMessage = String(data["Error Message"] || data["Note"] || "Unknown API error");
        console.error("Alpha Vantage Bulk API Error:", errorMessage);
        throw new Error(errorMessage);
      }

      // Check if this is premium endpoint message
      if (data.message && typeof data.message === 'string' && data.message.includes("premium endpoint")) {
        console.warn("Bulk quotes requires premium subscription, falling back to individual calls");
        return new Map<string, BulkStockData>();
      }

      // Process the bulk response
      if (data.data && Array.isArray(data.data)) {
        const entries: [string, BulkStockData][] = data.data.map((quote: any) => {
          const bulkData: BulkStockData = {
            symbol: quote.symbol,
            price: parseFloat(quote.close),
            change: parseFloat(quote.change),
            changePercent: parseFloat(quote.change_percent),
            volume: parseInt(String(quote.volume || '0')),
            timestamp: quote.timestamp,
            extendedHours: quote.extended_hours_quote ? {
              price: parseFloat(quote.extended_hours_quote),
              change: parseFloat(String(quote.extended_hours_change || '0')),
              changePercent: parseFloat(String(quote.extended_hours_change_percent || '0'))
            } : undefined
          };
          return [quote.symbol, bulkData] as [string, BulkStockData];
        });
        return new Map<string, BulkStockData>(entries);
      }

      return new Map<string, BulkStockData>();
    });

    const batchResults = await Promise.all(batchPromises);
    
    // Combine all batch results
    batchResults.forEach((batchMap: Map<string, BulkStockData>) => {
      batchMap.forEach((value: BulkStockData, key: string) => {
        results.set(key, value);
        // Update cache
        stockCache.set(key, {
          data: value,
          timestamp: Date.now()
        });
      });
    });

    console.log(`Successfully fetched ${results.size} quotes from bulk API`);
    return results;

  } catch (error) {
    console.error("Error in bulk fetch:", error);
    return results;
  }
}

// Enhanced fetchStock function with bulk fetching support
export async function fetchStock(symbol: string, timePeriod: string = "1M", forceBulk: boolean = false): Promise<StockResponse> {
  // Check cache first
  const cached = stockCache.get(symbol);
  if (cached && isCacheValid(cached) && !forceBulk) {
    return {
      price: cached.data.price,
      change: cached.data.changePercent,
      history: [] // Return empty history for cached data, fetch separately if needed
    };
  }

  // If forceBulk is true, add to batch queue
  if (forceBulk) {
    return new Promise<StockResponse>((resolve) => {
      batchQueue.add(symbol);
      
      // Clear existing timeout
      if (batchTimeout) {
        clearTimeout(batchTimeout);
      }
      
      // Set new timeout to process batch
      batchTimeout = setTimeout(async () => {
        const symbolsToFetch = Array.from(batchQueue);
        batchQueue.clear();
        
        try {
          const bulkResults = await fetchBulkStockQuotes(symbolsToFetch);
          const result = bulkResults.get(symbol);
          
          if (result) {
            resolve({
              price: result.price,
              change: result.changePercent,
              history: [] // Bulk quotes don't include history
            });
          } else {
            // Fallback to individual fetch
            resolve(await fetchStockIndividual(symbol, timePeriod));
          }
        } catch (error) {
          console.error(`Error in batch fetch for ${symbol}:`, error);
          resolve(await fetchStockIndividual(symbol, timePeriod));
        }
      }, BATCH_DELAY);
    });
  }

  // Fallback to individual fetch
  return await fetchStockIndividual(symbol, timePeriod);
}

// Original individual fetch function (renamed)
async function fetchStockIndividual(symbol: string, timePeriod: string = "1M"): Promise<StockResponse> {
  const key = process.env.NEXT_PUBLIC_ALPHA_VANTAGE_KEY!;
  
  try {
    // Get current price and change
    const quoteRes = await fetch(
      `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${key}`
    );
    const quoteJson = await quoteRes.json();
    
    // Check for API error messages
    if (quoteJson["Error Message"] || quoteJson["Note"]) {
      const quoteErrorMessage = quoteJson["Error Message"];
      const quoteNote = quoteJson["Note"];
      const errorMessage = String(quoteErrorMessage || quoteNote || "Unknown API error");
      console.error("Alpha Vantage API Error:", errorMessage);
      throw new Error(errorMessage);
    }

    const quote = quoteJson["Global Quote"];
    if (!quote || !quote["05. price"] || !quote["10. change percent"]) {
      console.error("Invalid quote data received:", JSON.stringify(quoteJson));
      throw new Error("Invalid quote data received from API");
    }
    
    // Get historical data
    const historicalRes = await fetch(
      `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&outputsize=full&apikey=${key}`
    );
    const historicalJson = await historicalRes.json();

    // Check for API error messages in historical data
    if (historicalJson["Error Message"] || historicalJson["Note"]) {
      const historicalErrorMessage = historicalJson["Error Message"];
      const historicalNote = historicalJson["Note"];
      const errorMessage = String(historicalErrorMessage || historicalNote || "Unknown API error");
      console.error("Alpha Vantage API Error:", errorMessage);
      throw new Error(errorMessage);
    }
    
    if (!historicalJson["Time Series (Daily)"]) {
      console.error("No historical data received:", JSON.stringify(historicalJson));
      return {
        price: parseFloat(quote["05. price"]),
        change: parseFloat(quote["10. change percent"].slice(0, -1)),
        history: []
      };
    }

    const timeSeriesData = historicalJson["Time Series (Daily)"];
    const days = {
      "1M": 30,
      "3M": 90,
      "6M": 180,
      "1Y": 365,
      "5Y": 1825
    }[timePeriod] || 30;

    const history = Object.entries(timeSeriesData)
      .slice(0, days)
      .map(([date, values]: [string, any]) => ({
        timestamp: date,
        price: parseFloat(values["4. close"])
      }))
      .reverse();

    const result: StockResponse = {
      price: parseFloat(quote["05. price"]),
      change: parseFloat(quote["10. change percent"].slice(0, -1)),
      history
    };

    // Cache the result
    stockCache.set(symbol, {
      data: {
        symbol,
        price: result.price,
        change: result.price * (result.change / 100), // Convert percentage to absolute change
        changePercent: result.change,
        volume: 0, // Not available in GLOBAL_QUOTE
        timestamp: new Date().toISOString()
      },
      timestamp: Date.now()
    });

    return result;
  } catch (error) {
    console.error(`Error fetching stock data for ${symbol}:`, error);
    // Return mock data in case of error
    return {
      price: 0,
      change: 0,
      history: Array.from({ length: 30 }, (_, i) => ({
        timestamp: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        price: 0
      }))
    };
  }
}

// New function to fetch multiple stocks efficiently
export async function fetchMultipleStocks(symbols: string[], timePeriod: string = "1M"): Promise<MultipleStocksResponse> {
  console.log(`Fetching data for ${symbols.length} stocks using bulk API`);
  
  // Try bulk fetch first
  const bulkResults = await fetchBulkStockQuotes(symbols);
  const results: MultipleStocksResponse = {};
  const missingSymbols: string[] = [];

  // Process bulk results
  symbols.forEach(symbol => {
    const bulkData = bulkResults.get(symbol);
    if (bulkData) {
      results[symbol] = {
        price: bulkData.price,
        change: bulkData.changePercent,
        history: [] // Bulk API doesn't provide history
      };
    } else {
      missingSymbols.push(symbol);
    }
  });

  // Fetch missing symbols individually
  if (missingSymbols.length > 0) {
    console.log(`Fetching ${missingSymbols.length} missing symbols individually`);
    const individualPromises = missingSymbols.map(symbol => 
      fetchStockIndividual(symbol, timePeriod).then(data => ({ symbol, data }))
    );
    
    const individualResults = await Promise.all(individualPromises);
    individualResults.forEach(({ symbol, data }) => {
      results[symbol] = data;
    });
  }

  return results;
}

// Function to get cached stock data
export function getCachedStockData(symbol: string): BulkStockData | null {
  const cached = stockCache.get(symbol);
  if (cached && isCacheValid(cached)) {
    return cached.data;
  }
  return null;
}

// Function to clear cache (useful for testing or manual refresh)
export function clearStockCache(): void {
  stockCache.clear();
}

// Export the cache size for monitoring
export function getStockCacheSize(): number {
  return stockCache.size;
}

export async function fetchHistoricalData(symbol: string): Promise<HistoricalData[]> {
  const key = process.env.NEXT_PUBLIC_ALPHA_VANTAGE_KEY!;
  const res = await fetch(
    `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&apikey=${key}`
  );
  const json = await res.json();
  
  if (!json["Time Series (Daily)"]) {
    return [];
  }

  const timeSeriesData = json["Time Series (Daily)"];
  return Object.entries(timeSeriesData)
    .slice(0, 30) // Get last 30 days
    .map(([date, values]: [string, any]) => ({
      date,
      price: parseFloat(values["4. close"])
    }))
    .reverse();
}