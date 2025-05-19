export async function fetchStock(symbol: string, timePeriod: string = "1M") {
  const key = process.env.NEXT_PUBLIC_ALPHA_VANTAGE_KEY!;
  
  try {
    // Get current price and change
    const quoteRes = await fetch(
      `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${key}`
    );
    const quoteJson = await quoteRes.json();
    
    // Check for API error messages
    if (quoteJson["Error Message"] || quoteJson["Note"]) {
      console.error("Alpha Vantage API Error:", quoteJson["Error Message"] || quoteJson["Note"]);
      throw new Error(quoteJson["Error Message"] || quoteJson["Note"]);
    }

    const quote = quoteJson["Global Quote"];
    if (!quote || !quote["05. price"] || !quote["10. change percent"]) {
      console.error("Invalid quote data received:", quoteJson);
      throw new Error("Invalid quote data received from API");
    }
    
    // Get historical data
    const historicalRes = await fetch(
      `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&outputsize=full&apikey=${key}`
    );
    const historicalJson = await historicalRes.json();

    // Check for API error messages in historical data
    if (historicalJson["Error Message"] || historicalJson["Note"]) {
      console.error("Alpha Vantage API Error:", historicalJson["Error Message"] || historicalJson["Note"]);
      throw new Error(historicalJson["Error Message"] || historicalJson["Note"]);
    }
    
    if (!historicalJson["Time Series (Daily)"]) {
      console.error("No historical data received:", historicalJson);
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

    return {
      price: parseFloat(quote["05. price"]),
      change: parseFloat(quote["10. change percent"].slice(0, -1)),
      history
    };
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

export interface HistoricalData {
  date: string;
  price: number;
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