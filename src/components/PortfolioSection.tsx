"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { fetchStock } from "../lib/fetchStock";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  RadialBarChart,
  RadialBar,
  ComposedChart,
} from "recharts";

interface Profile {
  id: string;
  email: string;
  balance: number;
}

interface PortfolioItem {
  symbol: string;
  shares: number;
  average_price: number;
  current_price?: number;
  market_value?: number;
  cost_basis?: number;
  gain_loss?: number;
  gain_loss_percentage?: number;
  daily_change?: number;
  daily_change_value?: number;
  daily_change_percentage?: number;
  purchase_date?: string;
  last_updated?: string;
  sector?: string;
  allocation_percentage?: number;
}

interface PortfolioMetrics {
  totalValue: number;
  totalCost: number;
  totalGainLoss: number;
  totalGainLossPercentage: number;
  dailyGainLoss: number;
  dailyGainLossPercentage: number;
  bestPerformer: PortfolioItem | null;
  worstPerformer: PortfolioItem | null;
  largestPosition: PortfolioItem | null;
  smallestPosition: PortfolioItem | null;
  sharpeRatio: number;
  volatility: number;
  beta: number;
  drawdown: number;
}

interface SectorAllocation {
  sector: string;
  value: number;
  percentage: number;
  color: string;
}

interface PortfolioSectionProps {
  profile: Profile | null;
}

const SECTOR_COLORS = {
  'Technology': '#3B82F6',
  'Healthcare': '#10B981',
  'Financial': '#F59E0B',
  'Consumer': '#EF4444',
  'Energy': '#8B5CF6',
  'Industrial': '#F97316',
  'Materials': '#14B8A6',
  'Utilities': '#84CC16',
  'Real Estate': '#EC4899',
  'Communication': '#6366F1',
  'Other': '#6B7280'
};

const PERFORMANCE_COLORS = ['#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#8B5CF6'];

export default function PortfolioSection({ profile }: PortfolioSectionProps) {
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<PortfolioMetrics>({
    totalValue: 0,
    totalCost: 0,
    totalGainLoss: 0,
    totalGainLossPercentage: 0,
    dailyGainLoss: 0,
    dailyGainLossPercentage: 0,
    bestPerformer: null,
    worstPerformer: null,
    largestPosition: null,
    smallestPosition: null,
    sharpeRatio: 0,
    volatility: 0,
    beta: 0,
    drawdown: 0,
  });
  const [portfolioHistory, setPortfolioHistory] = useState<any[]>([]);
  const [sectorAllocation, setSectorAllocation] = useState<SectorAllocation[]>([]);
  const [selectedTimeframe, setSelectedTimeframe] = useState("1M");

  // Stock to sector mapping (simplified)
  const stockSectorMap: Record<string, string> = {
    'AAPL': 'Technology', 'MSFT': 'Technology', 'GOOGL': 'Technology', 'AMZN': 'Technology',
    'META': 'Technology', 'NVDA': 'Technology', 'TSLA': 'Technology', 'INTC': 'Technology',
    'JNJ': 'Healthcare', 'PFE': 'Healthcare', 'UNH': 'Healthcare', 'MRK': 'Healthcare',
    'JPM': 'Financial', 'BAC': 'Financial', 'WFC': 'Financial', 'GS': 'Financial',
    'WMT': 'Consumer', 'PG': 'Consumer', 'KO': 'Consumer', 'MCD': 'Consumer',
    'XOM': 'Energy', 'CVX': 'Energy', 'COP': 'Energy', 'SLB': 'Energy',
  };

  useEffect(() => {
    if (!profile?.id) return;

    const fetchPortfolio = async () => {
      try {
        setLoading(true);
        const { data: portfolioData, error } = await supabase
          .from('portfolio')
          .select('symbol, shares, average_price, created_at')
          .eq('user_id', profile.id);

        if (error) throw error;

        // Fetch current prices and calculate metrics
        const portfolioWithPrices = await Promise.all(
          portfolioData.map(async (item) => {
            const stockData = await fetchStock(item.symbol);
            const currentPrice = stockData.price;
            const marketValue = currentPrice * item.shares;
            const costBasis = item.average_price * item.shares;
            const gainLoss = marketValue - costBasis;
            const gainLossPercentage = (gainLoss / costBasis) * 100;
            const dailyChange = stockData.change;
            const dailyChangeValue = (dailyChange / 100) * marketValue;
            const dailyChangePercentage = dailyChange;
            const sector = stockSectorMap[item.symbol] || 'Other';

            return {
              ...item,
              current_price: currentPrice,
              market_value: marketValue,
              cost_basis: costBasis,
              gain_loss: gainLoss,
              gain_loss_percentage: gainLossPercentage,
              daily_change: dailyChange,
              daily_change_value: dailyChangeValue,
              daily_change_percentage: dailyChangePercentage,
              purchase_date: new Date(item.created_at).toLocaleDateString(),
              last_updated: new Date().toLocaleDateString(),
              sector: sector,
            };
          })
        );

        // Calculate allocation percentages
        const totalValue = portfolioWithPrices.reduce((sum, item) => sum + (item.market_value || 0), 0);
        const portfolioWithAllocations = portfolioWithPrices.map(item => ({
          ...item,
          allocation_percentage: ((item.market_value || 0) / totalValue) * 100
        }));

        setPortfolio(portfolioWithAllocations);

        // Calculate advanced portfolio metrics
        const totalCost = portfolioWithAllocations.reduce((sum, item) => sum + (item.cost_basis || 0), 0);
        const totalGainLoss = totalValue - totalCost;
        const totalGainLossPercentage = (totalGainLoss / totalCost) * 100;
        const dailyGainLoss = portfolioWithAllocations.reduce((sum, item) => sum + (item.daily_change_value || 0), 0);
        const dailyGainLossPercentage = (dailyGainLoss / totalValue) * 100;

        const bestPerformer = [...portfolioWithAllocations].sort((a, b) => (b.gain_loss_percentage || 0) - (a.gain_loss_percentage || 0))[0];
        const worstPerformer = [...portfolioWithAllocations].sort((a, b) => (a.gain_loss_percentage || 0) - (b.gain_loss_percentage || 0))[0];
        const largestPosition = [...portfolioWithAllocations].sort((a, b) => (b.market_value || 0) - (a.market_value || 0))[0];
        const smallestPosition = [...portfolioWithAllocations].sort((a, b) => (a.market_value || 0) - (b.market_value || 0))[0];

        // Calculate advanced metrics (simplified calculations)
        const returns = portfolioWithAllocations.map(item => item.gain_loss_percentage || 0);
        const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
        const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length;
        const volatility = Math.sqrt(variance);
        const sharpeRatio = avgReturn / (volatility || 1); // Simplified, assumes risk-free rate of 0
        const beta = 1.0; // Simplified placeholder
        const drawdown = Math.min(...returns); // Simplified

        setMetrics({
          totalValue,
          totalCost,
          totalGainLoss,
          totalGainLossPercentage,
          dailyGainLoss,
          dailyGainLossPercentage,
          bestPerformer,
          worstPerformer,
          largestPosition,
          smallestPosition,
          sharpeRatio,
          volatility,
          beta,
          drawdown,
        });

        // Calculate sector allocation
        const sectorGroups = portfolioWithAllocations.reduce((acc, item) => {
          const sector = item.sector || 'Other';
          if (!acc[sector]) {
            acc[sector] = { value: 0, count: 0 };
          }
          acc[sector].value += item.market_value || 0;
          acc[sector].count += 1;
          return acc;
        }, {} as Record<string, { value: number; count: number }>);

        const sectorData = Object.entries(sectorGroups).map(([sector, data]) => ({
          sector,
          value: data.value,
          percentage: (data.value / totalValue) * 100,
          color: SECTOR_COLORS[sector as keyof typeof SECTOR_COLORS] || SECTOR_COLORS.Other
        }));

        setSectorAllocation(sectorData);

        // Generate historical portfolio data (enhanced simulation)
        const today = new Date();
        const historyData = [];
        let baseValue = totalValue;
        
        for (let i = 30; i >= 0; i--) {
          const date = new Date(today);
          date.setDate(date.getDate() - i);
          
          // More realistic portfolio value changes
          const volatilityFactor = 0.02;
          const trendFactor = 0.001; // Small upward trend
          const randomChange = (Math.random() - 0.5) * volatilityFactor;
          const trend = trendFactor * (30 - i) / 30;
          
          baseValue = baseValue * (1 + randomChange + trend);
          
          historyData.push({
            date: date.toISOString().split('T')[0],
            value: baseValue,
            gain: baseValue - totalCost,
            gainPercentage: ((baseValue - totalCost) / totalCost) * 100
          });
        }
        setPortfolioHistory(historyData);

      } catch (err) {
        console.error("Error fetching portfolio:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPortfolio();
  }, [profile?.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-gray-300">Loading portfolio...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-white">Portfolio Analytics</h1>
        <div className="flex items-center gap-4">
          <select
            value={selectedTimeframe}
            onChange={(e) => setSelectedTimeframe(e.target.value)}
            className="bg-gray-800 text-white rounded-lg px-4 py-2 border border-gray-700"
          >
            <option value="1D">1 Day</option>
            <option value="1W">1 Week</option>
            <option value="1M">1 Month</option>
            <option value="3M">3 Months</option>
            <option value="1Y">1 Year</option>
          </select>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-900/80 backdrop-blur-sm rounded-lg border border-gray-700/50 p-6">
          <h3 className="text-sm text-gray-400 mb-2">Total Portfolio Value</h3>
          <p className="text-2xl font-bold text-white">
            ${metrics.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className={`text-sm ${metrics.dailyGainLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {metrics.dailyGainLoss >= 0 ? '+' : ''}{metrics.dailyGainLossPercentage.toFixed(2)}% today
          </p>
        </div>
        
        <div className="bg-gray-900/80 backdrop-blur-sm rounded-lg border border-gray-700/50 p-6">
          <h3 className="text-sm text-gray-400 mb-2">Total Return</h3>
          <p className={`text-2xl font-bold ${metrics.totalGainLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            ${metrics.totalGainLoss.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className={`text-sm ${metrics.totalGainLossPercentage >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {metrics.totalGainLossPercentage >= 0 ? '+' : ''}{metrics.totalGainLossPercentage.toFixed(2)}%
          </p>
        </div>

        <div className="bg-gray-900/80 backdrop-blur-sm rounded-lg border border-gray-700/50 p-6">
          <h3 className="text-sm text-gray-400 mb-2">Sharpe Ratio</h3>
          <p className="text-2xl font-bold text-white">
            {metrics.sharpeRatio.toFixed(2)}
          </p>
          <p className="text-sm text-gray-400">Risk-adjusted return</p>
        </div>

        <div className="bg-gray-900/80 backdrop-blur-sm rounded-lg border border-gray-700/50 p-6">
          <h3 className="text-sm text-gray-400 mb-2">Volatility</h3>
          <p className="text-2xl font-bold text-white">
            {metrics.volatility.toFixed(2)}%
          </p>
          <p className="text-sm text-gray-400">Portfolio risk</p>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Portfolio Performance Chart */}
        <div className="bg-gray-900/80 backdrop-blur-sm rounded-lg border border-gray-700/50 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Portfolio Performance</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={portfolioHistory}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="date" 
                  stroke="#9CA3AF"
                  tick={{ fill: '#9CA3AF', fontSize: 12 }}
                />
                <YAxis 
                  stroke="#9CA3AF"
                  tick={{ fill: '#9CA3AF', fontSize: 12 }}
                  tickFormatter={(value) => `$${(value/1000).toFixed(1)}k`}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937',
                    border: 'none',
                    borderRadius: '0.5rem',
                    color: '#fff'
                  }}
                  formatter={(value: number, name: string) => [
                    name === 'value' ? `$${value.toFixed(2)}` : `${value.toFixed(2)}%`,
                    name === 'value' ? 'Portfolio Value' : 'Gain %'
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#10B981"
                  fillOpacity={1}
                  fill="url(#colorValue)"
                />
                <Line
                  type="monotone"
                  dataKey="gainPercentage"
                  stroke="#F59E0B"
                  strokeWidth={2}
                  dot={false}
                  yAxisId="right"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sector Allocation Pie Chart */}
        <div className="bg-gray-900/80 backdrop-blur-sm rounded-lg border border-gray-700/50 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Sector Allocation</h3>
          <div className="h-[300px] flex items-center">
            <div className="w-1/2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sectorAllocation}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={120}
                    dataKey="value"
                    stroke="none"
                  >
                    {sectorAllocation.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1F2937',
                      border: 'none',
                      borderRadius: '0.5rem',
                      color: '#fff'
                    }}
                    formatter={(value: number) => [`$${value.toFixed(2)}`, 'Value']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-1/2 space-y-2">
              {sectorAllocation.map((sector, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: sector.color }}
                    ></div>
                    <span className="text-sm text-gray-300">{sector.sector}</span>
                  </div>
                  <span className="text-sm text-white font-medium">
                    {sector.percentage.toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Performance Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Top/Bottom Performers */}
        <div className="bg-gray-900/80 backdrop-blur-sm rounded-lg border border-gray-700/50 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Performance Leaders</h3>
          <div className="space-y-4">
            {metrics.bestPerformer && (
              <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="text-green-400 font-medium">Best Performer</h4>
                    <p className="text-white font-semibold">{metrics.bestPerformer.symbol}</p>
                    <p className="text-sm text-gray-400">{metrics.bestPerformer.shares} shares</p>
                  </div>
                  <div className="text-right">
                    <p className="text-green-400 font-bold text-lg">
                      +{metrics.bestPerformer.gain_loss_percentage?.toFixed(2)}%
                    </p>
                    <p className="text-sm text-gray-400">
                      ${metrics.bestPerformer.gain_loss?.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {metrics.worstPerformer && (
              <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="text-red-400 font-medium">Needs Attention</h4>
                    <p className="text-white font-semibold">{metrics.worstPerformer.symbol}</p>
                    <p className="text-sm text-gray-400">{metrics.worstPerformer.shares} shares</p>
                  </div>
                  <div className="text-right">
                    <p className="text-red-400 font-bold text-lg">
                      {metrics.worstPerformer.gain_loss_percentage?.toFixed(2)}%
                    </p>
                    <p className="text-sm text-gray-400">
                      ${metrics.worstPerformer.gain_loss?.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Risk Metrics */}
        <div className="bg-gray-900/80 backdrop-blur-sm rounded-lg border border-gray-700/50 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Risk Analysis</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Beta (Market Risk)</span>
              <span className="text-white font-medium">{metrics.beta.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Maximum Drawdown</span>
              <span className={`font-medium ${metrics.drawdown < 0 ? 'text-red-400' : 'text-green-400'}`}>
                {metrics.drawdown.toFixed(2)}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Diversification Score</span>
              <span className="text-white font-medium">
                {sectorAllocation.length > 1 ? ((sectorAllocation.length / 10) * 100).toFixed(0) : 0}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Portfolio Concentration</span>
              <span className="text-white font-medium">
                {metrics.largestPosition ? 
                  (((metrics.largestPosition.market_value || 0) / metrics.totalValue) * 100).toFixed(1) + '%' 
                  : '0%'
                }
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Holdings Table */}
      <div className="bg-gray-900/80 backdrop-blur-sm rounded-lg border border-gray-700/50 overflow-hidden">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Holdings Detail</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-gray-400 text-sm border-b border-gray-700">
                  <th className="pb-3">Symbol</th>
                  <th className="pb-3">Sector</th>
                  <th className="pb-3">Shares</th>
                  <th className="pb-3">Avg. Price</th>
                  <th className="pb-3">Current Price</th>
                  <th className="pb-3">Market Value</th>
                  <th className="pb-3">Allocation</th>
                  <th className="pb-3">Total Return</th>
                  <th className="pb-3">Daily Change</th>
                </tr>
              </thead>
              <tbody className="text-white">
                {portfolio.map((item) => (
                  <tr key={item.symbol} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                    <td className="py-4">
                      <div className="font-medium text-white">{item.symbol}</div>
                    </td>
                    <td className="py-4">
                      <span 
                        className="px-2 py-1 rounded-full text-xs font-medium"
                        style={{ 
                          backgroundColor: `${SECTOR_COLORS[item.sector as keyof typeof SECTOR_COLORS] || SECTOR_COLORS.Other}20`,
                          color: SECTOR_COLORS[item.sector as keyof typeof SECTOR_COLORS] || SECTOR_COLORS.Other
                        }}
                      >
                        {item.sector}
                      </span>
                    </td>
                    <td className="py-4">{item.shares}</td>
                    <td className="py-4">${item.average_price.toFixed(2)}</td>
                    <td className="py-4">${item.current_price?.toFixed(2)}</td>
                    <td className="py-4 font-medium">${item.market_value?.toFixed(2)}</td>
                    <td className="py-4">{item.allocation_percentage?.toFixed(1)}%</td>
                    <td className={`py-4 font-medium ${item.gain_loss && item.gain_loss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {item.gain_loss_percentage?.toFixed(2)}%
                    </td>
                    <td className={`py-4 ${item.daily_change && item.daily_change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {item.daily_change?.toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
} 