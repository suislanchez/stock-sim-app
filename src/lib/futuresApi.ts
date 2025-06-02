interface FuturesApiData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: string;
  openInterest: string;
  expiry: string;
  category: 'commodity' | 'index' | 'currency' | 'energy';
}

// Map Alpha Vantage endpoints to futures-like contracts
const futuresMapping = {
  // Commodities
  'CL': { endpoint: 'WTI', name: 'Crude Oil', category: 'energy' as const },
  'GC': { endpoint: 'GOLD', name: 'Gold', category: 'commodity' as const },
  'NG': { endpoint: 'NATURAL_GAS', name: 'Natural Gas', category: 'energy' as const },
  'HG': { endpoint: 'COPPER', name: 'Copper', category: 'commodity' as const },
  'ZC': { endpoint: 'CORN', name: 'Corn', category: 'commodity' as const },
  'ZW': { endpoint: 'WHEAT', name: 'Wheat', category: 'commodity' as const },
  
  // Forex (as currency futures)
  '6E': { endpoint: 'EURUSD', name: 'Euro FX', category: 'currency' as const },
  '6J': { endpoint: 'USDJPY', name: 'Japanese Yen', category: 'currency' as const },
  '6B': { endpoint: 'GBPUSD', name: 'British Pound', category: 'currency' as const },
  
  // Index ETFs (as index futures)
  'ES': { endpoint: 'SPY', name: 'S&P 500 E-mini', category: 'index' as const },
  'NQ': { endpoint: 'QQQ', name: 'Nasdaq 100 E-mini', category: 'index' as const },
  'YM': { endpoint: 'DIA', name: 'Dow Jones E-mini', category: 'index' as const },
};

class FuturesApiService {
  private apiKey: string;
  
  constructor() {
    this.apiKey = process.env.NEXT_PUBLIC_ALPHA_VANTAGE_KEY!;
  }

  async fetchCommodityData(commodityFunction: string): Promise<any> {
    try {
      const response = await fetch(
        `https://www.alphavantage.co/query?function=${commodityFunction}&interval=monthly&apikey=${this.apiKey}`
      );
      return await response.json();
    } catch (error) {
      console.error('Error fetching commodity data:', error);
      return null;
    }
  }

  async fetchForexData(fromCurrency: string, toCurrency: string): Promise<any> {
    try {
      const response = await fetch(
        `https://www.alphavantage.co/query?function=FX_DAILY&from_symbol=${fromCurrency}&to_symbol=${toCurrency}&apikey=${this.apiKey}`
      );
      return await response.json();
    } catch (error) {
      console.error('Error fetching forex data:', error);
      return null;
    }
  }

  async fetchStockQuote(symbol: string): Promise<any> {
    try {
      const response = await fetch(
        `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${this.apiKey}`
      );
      return await response.json();
    } catch (error) {
      console.error('Error fetching stock quote:', error);
      return null;
    }
  }

  private parseCommodityData(data: any, symbol: string, mapping: any): FuturesApiData | null {
    if (!data || data['Error Message'] || data['Note']) {
      return null;
    }

    const dataKey = Object.keys(data).find(key => key.includes('Monthly'));
    if (!dataKey || !data[dataKey]) {
      return null;
    }

    const timeSeries = data[dataKey];
    const latestDate = Object.keys(timeSeries)[0];
    const latestData = timeSeries[latestDate];

    if (!latestData) return null;

    const currentPrice = parseFloat(latestData['4. close'] || latestData.close || '0');
    const previousDate = Object.keys(timeSeries)[1];
    const previousPrice = previousDate ? parseFloat(timeSeries[previousDate]['4. close'] || timeSeries[previousDate].close || '0') : currentPrice;
    
    const change = currentPrice - previousPrice;
    const changePercent = previousPrice !== 0 ? (change / previousPrice) * 100 : 0;

    return {
      symbol,
      name: mapping.name,
      price: currentPrice,
      change,
      changePercent,
      volume: this.generateRandomVolume(),
      openInterest: this.generateRandomOI(),
      expiry: this.generateExpiry(),
      category: mapping.category
    };
  }

  private parseForexData(data: any, symbol: string, mapping: any): FuturesApiData | null {
    if (!data || data['Error Message'] || data['Note']) {
      return null;
    }

    const dailyData = data['Time Series FX (Daily)'];
    if (!dailyData) return null;

    const latestDate = Object.keys(dailyData)[0];
    const latestData = dailyData[latestDate];

    if (!latestData) return null;

    const currentPrice = parseFloat(latestData['4. close']);
    const previousDate = Object.keys(dailyData)[1];
    const previousPrice = previousDate ? parseFloat(dailyData[previousDate]['4. close']) : currentPrice;
    
    const change = currentPrice - previousPrice;
    const changePercent = previousPrice !== 0 ? (change / previousPrice) * 100 : 0;

    return {
      symbol,
      name: mapping.name,
      price: currentPrice,
      change,
      changePercent,
      volume: this.generateRandomVolume(),
      openInterest: this.generateRandomOI(),
      expiry: this.generateExpiry(),
      category: mapping.category
    };
  }

  private parseStockData(data: any, symbol: string, mapping: any): FuturesApiData | null {
    if (!data || data['Error Message'] || data['Note']) {
      return null;
    }

    const quote = data['Global Quote'];
    if (!quote) return null;

    const currentPrice = parseFloat(quote['05. price']);
    const change = parseFloat(quote['09. change']);
    const changePercent = parseFloat(quote['10. change percent'].replace('%', ''));

    return {
      symbol,
      name: mapping.name,
      price: currentPrice,
      change,
      changePercent,
      volume: this.generateRandomVolume(),
      openInterest: this.generateRandomOI(),
      expiry: this.generateExpiry(),
      category: mapping.category
    };
  }

  private generateRandomVolume(): string {
    const volumes = ['89K', '123K', '245K', '456K', '567K', '789K', '892K'];
    return volumes[Math.floor(Math.random() * volumes.length)];
  }

  private generateRandomOI(): string {
    const ois = ['234K', '456K', '789K', '1.2M', '1.5M', '2.8M', '3.1M'];
    return ois[Math.floor(Math.random() * ois.length)];
  }

  private generateExpiry(): string {
    const today = new Date();
    const expiryDates = [
      new Date(today.getFullYear(), today.getMonth() + 1, 15), // Next month 15th
      new Date(today.getFullYear(), today.getMonth() + 2, 20), // Month after 20th
      new Date(today.getFullYear(), today.getMonth() + 3, 26), // 3 months 26th
    ];
    const randomDate = expiryDates[Math.floor(Math.random() * expiryDates.length)];
    return randomDate.toISOString().split('T')[0];
  }

  async fetchAllFuturesData(): Promise<FuturesApiData[]> {
    const results: FuturesApiData[] = [];
    
    for (const [symbol, mapping] of Object.entries(futuresMapping)) {
      try {
        let data = null;
        let parsed = null;

        if (mapping.category === 'commodity' || mapping.category === 'energy') {
          // Use commodity endpoints
          data = await this.fetchCommodityData(mapping.endpoint);
          parsed = this.parseCommodityData(data, symbol, mapping);
        } else if (mapping.category === 'currency') {
          // Use forex endpoints
          const [fromCurrency, toCurrency] = mapping.endpoint.includes('USD') 
            ? [mapping.endpoint.substring(0, 3), mapping.endpoint.substring(3)]
            : ['USD', mapping.endpoint];
          data = await this.fetchForexData(fromCurrency, toCurrency);
          parsed = this.parseForexData(data, symbol, mapping);
        } else if (mapping.category === 'index') {
          // Use stock/ETF endpoints
          data = await this.fetchStockQuote(mapping.endpoint);
          parsed = this.parseStockData(data, symbol, mapping);
        }

        if (parsed) {
          results.push(parsed);
        }

        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (error) {
        console.error(`Error fetching data for ${symbol}:`, error);
      }
    }

    return results;
  }

  async fetchSingleFuturesContract(symbol: string): Promise<FuturesApiData | null> {
    const mapping = futuresMapping[symbol as keyof typeof futuresMapping];
    if (!mapping) return null;

    try {
      let data = null;
      let parsed = null;

      if (mapping.category === 'commodity' || mapping.category === 'energy') {
        data = await this.fetchCommodityData(mapping.endpoint);
        parsed = this.parseCommodityData(data, symbol, mapping);
      } else if (mapping.category === 'currency') {
        const [fromCurrency, toCurrency] = mapping.endpoint.includes('USD') 
          ? [mapping.endpoint.substring(0, 3), mapping.endpoint.substring(3)]
          : ['USD', mapping.endpoint];
        data = await this.fetchForexData(fromCurrency, toCurrency);
        parsed = this.parseForexData(data, symbol, mapping);
      } else if (mapping.category === 'index') {
        data = await this.fetchStockQuote(mapping.endpoint);
        parsed = this.parseStockData(data, symbol, mapping);
      }

      return parsed;
    } catch (error) {
      console.error(`Error fetching data for ${symbol}:`, error);
      return null;
    }
  }
}

export const futuresApi = new FuturesApiService();
export type { FuturesApiData }; 