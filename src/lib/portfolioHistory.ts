import { supabase } from './supabaseClient'

interface PortfolioHistoryEntry {
  date: string
  total_value: number
  daily_return: number
  total_return: number
  market_value: number
  cash_balance: number
}

interface PortfolioPerformanceData {
  date: string
  value: number
  dailyReturn?: number
  totalReturn?: number
  marketValue?: number
  cashBalance?: number
}

export class PortfolioHistoryService {
  /**
   * Fetch portfolio performance history for a user
   */
  static async getPortfolioHistory(
    userId: string,
    days: number = 30
  ): Promise<PortfolioPerformanceData[]> {
    try {
      const { data, error } = await supabase.rpc('get_portfolio_performance', {
        p_user_id: userId,
        p_days: days
      })

   

      if (!data) {
        return []
      }

      // Transform the data to match the expected format
      return data.map((entry: any) => ({
        date: new Date(entry.date).toISOString().split('T')[0],
        value: parseFloat(entry.total_value) || 0,
        dailyReturn: parseFloat(entry.daily_return) || 0,
        totalReturn: parseFloat(entry.total_return) || 0,
        marketValue: parseFloat(entry.market_value) || 0,
        cashBalance: parseFloat(entry.cash_balance) || 0
      }))
    } catch (error) {
      console.error('Error in getPortfolioHistory:', error)
      throw error
    }
  }

  /**
   * Record a portfolio snapshot for the current day
   */
  static async recordPortfolioSnapshot(userId: string): Promise<void> {
    try {
      const { error } = await supabase.rpc('record_portfolio_snapshot', {
        p_user_id: userId
      })

      if (error) {
        console.error('Error recording portfolio snapshot:', error)
        throw new Error(`Failed to record portfolio snapshot: ${error.message}`)
      }
    } catch (error) {
      console.error('Error in recordPortfolioSnapshot:', error)
      throw error
    }
  }

  /**
   * Get the latest portfolio value for a user
   */
  static async getLatestPortfolioValue(userId: string): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('portfolio_history')
        .select('total_value')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        console.error('Error fetching latest portfolio value:', error)
        throw new Error(`Failed to fetch latest portfolio value: ${error.message}`)
      }

      return data?.total_value ? parseFloat(data.total_value) : 0
    } catch (error) {
      console.error('Error in getLatestPortfolioValue:', error)
      return 0
    }
  }

  /**
   * Calculate portfolio metrics from history
   */
  static calculatePortfolioMetrics(history: PortfolioPerformanceData[]) {
    if (!history || history.length === 0) {
      return {
        totalReturn: 0,
        dailyReturn: 0,
        volatility: 0,
        maxDrawdown: 0,
        sharpeRatio: 0
      }
    }

    const values = history.map(h => h.value)
    const returns = history.map(h => h.dailyReturn || 0)
    
    const latestValue = values[values.length - 1] || 0
    const initialValue = values[0] || 0
    const totalReturn = initialValue > 0 ? ((latestValue - initialValue) / initialValue) * 100 : 0
    
    const latestDailyReturn = returns[returns.length - 1] || 0
    
    // Calculate volatility (standard deviation of returns)
    const meanReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - meanReturn, 2), 0) / returns.length
    const volatility = Math.sqrt(variance)
    
    // Calculate max drawdown
    let maxDrawdown = 0
    let peak = values[0] || 0
    
    for (const value of values) {
      if (value > peak) {
        peak = value
      }
      const drawdown = peak > 0 ? ((peak - value) / peak) * 100 : 0
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown
      }
    }
    
    // Calculate Sharpe ratio (simplified, assuming risk-free rate of 0)
    const sharpeRatio = volatility > 0 ? meanReturn / volatility : 0

    return {
      totalReturn,
      dailyReturn: latestDailyReturn,
      volatility,
      maxDrawdown,
      sharpeRatio
    }
  }

  /**
   * Generate simulated historical data for users without history (for demo purposes)
   */
  static generateSimulatedHistory(
    currentValue: number,
    days: number = 30
  ): PortfolioPerformanceData[] {
    const history: PortfolioPerformanceData[] = []
    const today = new Date()
    let value = currentValue * 0.95 // Start slightly lower than current value

    // For very short timeframes (1 day), generate hourly data points
    if (days === 1) {
      for (let i = 24; i >= 0; i--) {
        const date = new Date(today)
        date.setHours(date.getHours() - i)
        
        // Simulate intraday portfolio movements (smaller changes)
        const randomChange = (Math.random() - 0.5) * 0.01 // ±0.5% random change
        const trendChange = i < 12 ? 0.0002 : -0.0001 // Slight upward trend recently
        
        value = value * (1 + randomChange + trendChange)
        
        const dailyReturn = i < 24 ? ((value - history[history.length - 1]?.value || value) / (history[history.length - 1]?.value || value)) * 100 : 0
        const totalReturn = currentValue > 0 ? ((value - currentValue * 0.95) / (currentValue * 0.95)) * 100 : 0

        history.push({
          date: date.toISOString(),
          value: Math.round(value * 100) / 100,
          dailyReturn: Math.round(dailyReturn * 100) / 100,
          totalReturn: Math.round(totalReturn * 100) / 100,
          marketValue: Math.round(value * 0.8 * 100) / 100,
          cashBalance: Math.round(value * 0.2 * 100) / 100
        })
      }
    } else {
      // For longer timeframes, generate daily data points
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(today)
        date.setDate(date.getDate() - i)
        
        // Simulate realistic portfolio movements
        const randomChange = (Math.random() - 0.5) * 0.04 // ±2% random change
        const trendChange = i < days / 2 ? 0.001 : -0.0005 // Slight upward trend recently
        
        value = value * (1 + randomChange + trendChange)
        
        const dailyReturn = i < days - 1 ? ((value - history[history.length - 1]?.value) / history[history.length - 1]?.value) * 100 : 0
        const totalReturn = currentValue > 0 ? ((value - currentValue * 0.95) / (currentValue * 0.95)) * 100 : 0

        history.push({
          date: date.toISOString().split('T')[0],
          value: Math.round(value * 100) / 100,
          dailyReturn: Math.round(dailyReturn * 100) / 100,
          totalReturn: Math.round(totalReturn * 100) / 100,
          marketValue: Math.round(value * 0.8 * 100) / 100,
          cashBalance: Math.round(value * 0.2 * 100) / 100
        })
      }
    }

    return history
  }

  /**
   * Generate simulated historical data that starts from initialValue and ends at targetValue
   */
  static generateSimulatedHistoryToValue(
    initialValue: number,
    targetValue: number,
    days: number = 30
  ): PortfolioPerformanceData[] {
    const history: PortfolioPerformanceData[] = []
    const today = new Date()
    
    // Calculate the total growth needed
    const totalGrowthFactor = targetValue / initialValue
    const dailyGrowthFactor = Math.pow(totalGrowthFactor, 1 / days)
    
    let value = initialValue

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      
      // Add some realistic volatility around the target growth path
      const baseGrowth = dailyGrowthFactor - 1 // Convert to percentage
      const randomVariation = (Math.random() - 0.5) * 0.02 // ±1% random variation
      const growthRate = baseGrowth + randomVariation
      
      value = value * (1 + growthRate)
      
      // For the last day, ensure we hit the target value exactly
      if (i === 0) {
        value = targetValue
      }
      
      const dailyReturn = i < days - 1 ? ((value - history[history.length - 1]?.value) / history[history.length - 1]?.value) * 100 : 0
      const totalReturn = initialValue > 0 ? ((value - initialValue) / initialValue) * 100 : 0

      history.push({
        date: date.toISOString().split('T')[0],
        value: Math.round(value * 100) / 100,
        dailyReturn: Math.round(dailyReturn * 100) / 100,
        totalReturn: Math.round(totalReturn * 100) / 100,
        marketValue: Math.round(value * 0.9 * 100) / 100, // 90% invested
        cashBalance: Math.round(value * 0.1 * 100) / 100 // 10% cash
      })
    }

    return history
  }
} 