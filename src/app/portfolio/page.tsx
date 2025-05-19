"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useRouter } from "next/navigation";
import { fetchStock } from "../../lib/fetchStock";
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
}

export default function PortfolioPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
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
  });
  const [selectedTimeframe, setSelectedTimeframe] = useState("1M");
  const [portfolioHistory, setPortfolioHistory] = useState<any[]>([]);

  // Load user session and profile
  useEffect(() => {
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        router.push("/login");
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, balance")
        .eq("id", session.user.id)
        .single();

      if (error || !data) {
        console.error("Error fetching profile:", error);
        router.push("/login");
      } else {
        setProfile(data);
      }
      setLoading(false);
    })();
  }, [router]);

  // Load portfolio data
  useEffect(() => {
    if (!profile?.id) return;

    const fetchPortfolio = async () => {
      try {
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
            };
          })
        );

        setPortfolio(portfolioWithPrices);

        // Calculate portfolio metrics
        const totalValue = portfolioWithPrices.reduce((sum, item) => sum + (item.market_value || 0), 0);
        const totalCost = portfolioWithPrices.reduce((sum, item) => sum + (item.cost_basis || 0), 0);
        const totalGainLoss = totalValue - totalCost;
        const totalGainLossPercentage = (totalGainLoss / totalCost) * 100;
        const dailyGainLoss = portfolioWithPrices.reduce((sum, item) => sum + (item.daily_change_value || 0), 0);
        const dailyGainLossPercentage = (dailyGainLoss / totalValue) * 100;

        const bestPerformer = [...portfolioWithPrices].sort((a, b) => (b.gain_loss_percentage || 0) - (a.gain_loss_percentage || 0))[0];
        const worstPerformer = [...portfolioWithPrices].sort((a, b) => (a.gain_loss_percentage || 0) - (b.gain_loss_percentage || 0))[0];
        const largestPosition = [...portfolioWithPrices].sort((a, b) => (b.market_value || 0) - (a.market_value || 0))[0];
        const smallestPosition = [...portfolioWithPrices].sort((a, b) => (a.market_value || 0) - (b.market_value || 0))[0];

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
        });

        // Generate historical portfolio data
        const today = new Date();
        const historyData = [];
        for (let i = 30; i >= 0; i--) {
          const date = new Date(today);
          date.setDate(date.getDate() - i);
          
          // Simulate portfolio value changes (in a real app, you'd fetch historical prices)
          const randomChange = (Math.random() - 0.5) * 0.02; // Random change between -1% and +1%
          const value = totalValue * (1 + randomChange);
          
          historyData.push({
            date: date.toISOString().split('T')[0],
            value: value
          });
        }
        setPortfolioHistory(historyData);

      } catch (err) {
        console.error("Error fetching portfolio:", err);
      }
    };

    fetchPortfolio();
  }, [profile?.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <p className="text-white">Loading portfolio...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center min-h-screen bg-black">
      {/* Navigation Bar */}
      <nav className="w-full bg-gray-900 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <span className="text-xl font-bold text-white">StockSim</span>
            </div>
            <div className="flex items-center space-x-4">
              <a href="/dashboard" className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium">Dashboard</a>
              <a href="/trade" className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium">Trade</a>
              <a href="/portfolio" className="text-white px-3 py-2 rounded-md text-sm font-medium">Portfolio</a>
              <a href="/watchlist" className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium">Watchlist</a>
              <a href="/leaderboard" className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium">Leaderboard</a>
              <a href="/settings" className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium">Settings</a>
            </div>
          </div>
        </div>
      </nav>

      <div className="w-full max-w-6xl p-8">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <a
              href="/dashboard"
              className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
            >
              <span className="text-xl">←</span>
              <span>Back to Dashboard</span>
            </a>
            <h1 className="text-3xl font-bold text-white">Portfolio</h1>
          </div>
        </div>
        {/* Portfolio Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-900 p-6 rounded-lg">
            <h3 className="text-sm text-gray-400 mb-2">Total Portfolio Value</h3>
            <p className="text-2xl font-bold text-white">
              ${metrics.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className={`text-sm ${metrics.dailyGainLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {metrics.dailyGainLoss >= 0 ? '+' : ''}{metrics.dailyGainLossPercentage.toFixed(2)}% today
            </p>
          </div>
          <div className="bg-gray-900 p-6 rounded-lg">
            <h3 className="text-sm text-gray-400 mb-2">Total Gain/Loss</h3>
            <p className={`text-2xl font-bold ${metrics.totalGainLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              ${metrics.totalGainLoss.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className={`text-sm ${metrics.totalGainLossPercentage >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {metrics.totalGainLossPercentage >= 0 ? '+' : ''}{metrics.totalGainLossPercentage.toFixed(2)}%
            </p>
          </div>
          <div className="bg-gray-900 p-6 rounded-lg">
            <h3 className="text-sm text-gray-400 mb-2">Cost Basis</h3>
            <p className="text-2xl font-bold text-white">
              ${metrics.totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-sm text-gray-400">Total Investment</p>
          </div>
          <div className="bg-gray-900 p-6 rounded-lg">
            <h3 className="text-sm text-gray-400 mb-2">Available Cash</h3>
            <p className="text-2xl font-bold text-white">
              ${profile?.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-sm text-gray-400">Ready to Invest</p>
          </div>
        </div>

        {/* Portfolio Performance */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-gray-900 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-white mb-4">Portfolio Value Over Time</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={portfolioHistory}>
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
                    tick={{ fill: '#9CA3AF' }}
                  />
                  <YAxis 
                    stroke="#9CA3AF"
                    tick={{ fill: '#9CA3AF' }}
                    tickFormatter={(value) => `$${(value/1000).toFixed(1)}k`}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1F2937',
                      border: 'none',
                      borderRadius: '0.5rem',
                      color: '#fff'
                    }}
                    formatter={(value: number) => [`$${value.toFixed(2)}`, 'Portfolio Value']}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#10B981"
                    fillOpacity={1}
                    fill="url(#colorValue)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="bg-gray-900 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-white mb-4">Best & Worst Performers</h3>
            <div className="space-y-4">
              {metrics.bestPerformer && (
                <div className="bg-gray-800 p-4 rounded-lg">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="text-white font-medium">{metrics.bestPerformer.symbol}</h4>
                      <p className="text-sm text-gray-400">{metrics.bestPerformer.shares} shares</p>
                    </div>
                    <div className="text-right">
                      <p className="text-green-500 font-medium">
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
                <div className="bg-gray-800 p-4 rounded-lg">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="text-white font-medium">{metrics.worstPerformer.symbol}</h4>
                      <p className="text-sm text-gray-400">{metrics.worstPerformer.shares} shares</p>
                    </div>
                    <div className="text-right">
                      <p className="text-red-500 font-medium">
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
          <div className="bg-gray-900 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-white mb-4">Position Sizes</h3>
            <div className="space-y-4">
              {metrics.largestPosition && (
                <div className="bg-gray-800 p-4 rounded-lg">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="text-white font-medium">Largest Position</h4>
                      <p className="text-sm text-gray-400">{metrics.largestPosition.symbol}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-medium">
                        ${metrics.largestPosition.market_value?.toFixed(2)}
                      </p>
                      <p className="text-sm text-gray-400">
                        {((metrics.largestPosition.market_value || 0) / metrics.totalValue * 100).toFixed(1)}% of portfolio
                      </p>
                    </div>
                  </div>
                </div>
              )}
              {metrics.smallestPosition && (
                <div className="bg-gray-800 p-4 rounded-lg">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="text-white font-medium">Smallest Position</h4>
                      <p className="text-sm text-gray-400">{metrics.smallestPosition.symbol}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-medium">
                        ${metrics.smallestPosition.market_value?.toFixed(2)}
                      </p>
                      <p className="text-sm text-gray-400">
                        {((metrics.smallestPosition.market_value || 0) / metrics.totalValue * 100).toFixed(1)}% of portfolio
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Detailed Holdings */}
        <div className="bg-gray-900 rounded-lg overflow-hidden">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Detailed Holdings</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-gray-400 text-sm">
                    <th className="pb-4">Symbol</th>
                    <th className="pb-4">Shares</th>
                    <th className="pb-4">Avg. Price</th>
                    <th className="pb-4">Current Price</th>
                    <th className="pb-4">Market Value</th>
                    <th className="pb-4">Cost Basis</th>
                    <th className="pb-4">Gain/Loss</th>
                    <th className="pb-4">Gain/Loss %</th>
                    <th className="pb-4">Daily Change</th>
                    <th className="pb-4">Purchase Date</th>
                  </tr>
                </thead>
                <tbody className="text-white">
                  {portfolio.map((item) => (
                    <tr key={item.symbol} className="border-t border-gray-800">
                      <td className="py-4">
                        <div className="font-medium">{item.symbol}</div>
                      </td>
                      <td className="py-4">{item.shares}</td>
                      <td className="py-4">${item.average_price.toFixed(2)}</td>
                      <td className="py-4">${item.current_price?.toFixed(2)}</td>
                      <td className="py-4">${item.market_value?.toFixed(2)}</td>
                      <td className="py-4">${item.cost_basis?.toFixed(2)}</td>
                      <td className={`py-4 ${item.gain_loss && item.gain_loss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        ${item.gain_loss?.toFixed(2)}
                      </td>
                      <td className={`py-4 ${item.gain_loss_percentage && item.gain_loss_percentage >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {item.gain_loss_percentage?.toFixed(2)}%
                      </td>
                      <td className={`py-4 ${item.daily_change && item.daily_change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {item.daily_change?.toFixed(2)}%
                      </td>
                      <td className="py-4">{item.purchase_date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
