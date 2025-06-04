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

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#F97316', '#84CC16'];

const PortfolioChart = ({ portfolio, loading }: { portfolio: PortfolioItem[], loading: boolean }) => {
  const [activeIndex, setActiveIndex] = useState(-1);

  if (loading) {
    return (
      <div className="h-[400px] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const data = portfolio.map((item, index) => ({
    name: item.symbol,
    value: item.market_value || 0,
    shares: item.shares,
    color: COLORS[index % COLORS.length]
  }));

  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };

  const onPieLeave = () => {
    setActiveIndex(-1);
  };

  return (
    <div className="h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={140}
            paddingAngle={2}
            dataKey="value"
            onMouseEnter={onPieEnter}
            onMouseLeave={onPieLeave}
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.color}
                stroke={activeIndex === index ? "#fff" : "none"}
                strokeWidth={activeIndex === index ? 2 : 0}
                style={{
                  filter: activeIndex === index ? 'brightness(1.1)' : 'none',
                  transform: activeIndex === index ? 'scale(1.05)' : 'scale(1)',
                  transformOrigin: 'center',
                  transition: 'all 0.2s ease-in-out'
                }}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: '#1F2937',
              border: 'none',
              borderRadius: '0.75rem',
              color: '#fff',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
            }}
            formatter={(value: number, name: string, props: any) => [
              `$${value.toLocaleString()}`,
              `${name} (${props.payload.shares} shares)`
            ]}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

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
          
          // Simulate portfolio value changes
          const randomChange = (Math.random() - 0.5) * 0.02;
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
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <p className="text-white text-lg">Loading portfolio...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen font-sans bg-black">
      {/* Side Navigation */}
      <nav className="w-48 bg-gray-900/95 backdrop-blur-sm border-r border-gray-800/50 fixed h-full flex flex-col justify-between">
        <div>
          <div className="p-3 border-b border-gray-800/50">
            <div className="flex items-center">
              <img src="/logo.png" alt="SimuTrader Logo" className="w-12 h-12 rounded-full mr-2" />
              <span className="text-xl font-bold bg-gradient-to-r from-white via-gray-200 to-gray-300 bg-clip-text text-transparent">
                SimuTrader
              </span>
            </div>
          </div>
          <div className="p-3 space-y-1">
            <a href="/dashboard" className="text-gray-300 hover:text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800/50 transition-all duration-200 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Dashboard
            </a>
            <a href="/futures" className="text-gray-300 hover:text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800/50 transition-all duration-200 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              Futures
            </a>
            <a href="/orders" className="text-gray-300 hover:text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800/50 transition-all duration-200 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Orders
            </a>
            <a href="/watchlist" className="text-gray-300 hover:text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800/50 transition-all duration-200 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              Watchlist
            </a>
            <a href="/taxes" className="text-gray-300 hover:text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800/50 transition-all duration-200 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              Taxes
            </a>
            <a href="/news" className="text-gray-300 hover:text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800/50 transition-all duration-200 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21H5a2 2 0 01-2-2V7a2 2 0 012-2h14a2 2 0 012 2v12a2 2 0 01-2 2z" />
              </svg>
              News
            </a>
            <a href="/education" className="text-gray-300 hover:text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800/50 transition-all duration-200 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5zm0 7v-6m0 0l-7-4m7 4l7-4" />
              </svg>
              Education
            </a>
            <a href="/portfolio" className="text-white bg-gray-800/80 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                <line x1="12" y1="22.08" x2="12" y2="12"/>
              </svg>
              Portfolio
            </a>
          </div>
        </div>
        
        {/* Bottom Left Section */}
        <div className="p-3 border-t border-gray-800/50 flex flex-col gap-3">
          <a href="/account" className="text-gray-200 hover:text-white text-base flex items-center gap-3 px-3 py-3 rounded-lg bg-gray-800/80 transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Account
          </a>
          <button className="text-gray-200 hover:text-white text-base flex items-center gap-3 px-3 py-3 rounded-lg bg-gray-800/80 transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7" />
            </svg>
            Log out
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex-1 ml-48 h-screen overflow-y-auto">
        <div className="p-8 space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-blue-100 to-blue-200 bg-clip-text text-transparent">
                Portfolio Overview
              </h1>
              <p className="text-gray-400 mt-2">
                Track your investments and performance
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-br from-gray-800/60 to-gray-900/60 backdrop-blur-xl rounded-2xl border border-gray-700/50 px-6 py-3">
                <div className="text-sm text-gray-400">Total Portfolio Value</div>
                <div className="text-2xl font-bold text-white">
                  ${metrics.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          </div>

          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-gradient-to-br from-gray-800/60 to-gray-900/60 backdrop-blur-xl rounded-3xl border border-gray-700/50 p-6 shadow-2xl hover:border-gray-600/50 transition-all duration-500 group">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-3 h-3 bg-gradient-to-r from-blue-400 to-blue-500 rounded-full animate-pulse"></div>
                <h3 className="text-sm text-gray-400 font-medium">Total Value</h3>
              </div>
              <p className="text-3xl font-bold text-transparent bg-gradient-to-r from-blue-400 to-blue-500 bg-clip-text">
                ${metrics.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className={`text-sm mt-2 ${metrics.dailyGainLossPercentage >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {metrics.dailyGainLossPercentage >= 0 ? '+' : ''}{metrics.dailyGainLossPercentage.toFixed(2)}% today
              </p>
            </div>

            <div className="bg-gradient-to-br from-gray-800/60 to-gray-900/60 backdrop-blur-xl rounded-3xl border border-gray-700/50 p-6 shadow-2xl hover:border-gray-600/50 transition-all duration-500 group">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-3 h-3 bg-gradient-to-r from-green-400 to-green-500 rounded-full animate-pulse"></div>
                <h3 className="text-sm text-gray-400 font-medium">Total Gain/Loss</h3>
              </div>
              <p className={`text-3xl font-bold ${metrics.totalGainLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                ${metrics.totalGainLoss.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className={`text-sm mt-2 ${metrics.totalGainLossPercentage >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {metrics.totalGainLossPercentage >= 0 ? '+' : ''}{metrics.totalGainLossPercentage.toFixed(2)}%
              </p>
            </div>

            <div className="bg-gradient-to-br from-gray-800/60 to-gray-900/60 backdrop-blur-xl rounded-3xl border border-gray-700/50 p-6 shadow-2xl hover:border-gray-600/50 transition-all duration-500 group">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-3 h-3 bg-gradient-to-r from-purple-400 to-purple-500 rounded-full animate-pulse"></div>
                <h3 className="text-sm text-gray-400 font-medium">Cost Basis</h3>
              </div>
              <p className="text-3xl font-bold text-transparent bg-gradient-to-r from-purple-400 to-purple-500 bg-clip-text">
                ${metrics.totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-sm text-gray-400 mt-2">Total Investment</p>
            </div>

            <div className="bg-gradient-to-br from-gray-800/60 to-gray-900/60 backdrop-blur-xl rounded-3xl border border-gray-700/50 p-6 shadow-2xl hover:border-gray-600/50 transition-all duration-500 group">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-3 h-3 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full animate-pulse"></div>
                <h3 className="text-sm text-gray-400 font-medium">Available Cash</h3>
              </div>
              <p className="text-3xl font-bold text-transparent bg-gradient-to-r from-yellow-400 to-yellow-500 bg-clip-text">
                ${profile?.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-sm text-gray-400 mt-2">Ready to Invest</p>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Portfolio Allocation Pie Chart */}
            <div className="lg:col-span-2 bg-gradient-to-br from-gray-800/60 to-gray-900/60 backdrop-blur-xl rounded-3xl border border-gray-700/50 p-8 shadow-2xl hover:border-gray-600/50 transition-all duration-500">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-3 h-3 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full animate-pulse"></div>
                <h3 className="text-2xl font-bold text-white">Portfolio Allocation</h3>
              </div>
              <PortfolioChart portfolio={portfolio} loading={false} />
            </div>

            {/* Portfolio Stats */}
            <div className="space-y-6">
              {/* Performance Stats */}
              <div className="bg-gradient-to-br from-gray-800/60 to-gray-900/60 backdrop-blur-xl rounded-3xl border border-gray-700/50 p-6 shadow-2xl hover:border-gray-600/50 transition-all duration-500">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-3 h-3 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full animate-pulse"></div>
                  <h3 className="text-xl font-bold text-white">Performance</h3>
                </div>
                <div className="space-y-4">
                  {metrics.bestPerformer && (
                    <div className="bg-gradient-to-r from-green-500/10 to-green-600/10 rounded-2xl p-4 border border-green-500/20">
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="text-white font-medium">Best Performer</h4>
                          <p className="text-sm text-gray-400">{metrics.bestPerformer.symbol}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-green-400 font-bold">
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
                    <div className="bg-gradient-to-r from-red-500/10 to-red-600/10 rounded-2xl p-4 border border-red-500/20">
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="text-white font-medium">Worst Performer</h4>
                          <p className="text-sm text-gray-400">{metrics.worstPerformer.symbol}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-red-400 font-bold">
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

              {/* Position Sizes */}
              <div className="bg-gradient-to-br from-gray-800/60 to-gray-900/60 backdrop-blur-xl rounded-3xl border border-gray-700/50 p-6 shadow-2xl hover:border-gray-600/50 transition-all duration-500">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-3 h-3 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-full animate-pulse"></div>
                  <h3 className="text-xl font-bold text-white">Position Sizes</h3>
                </div>
                <div className="space-y-4">
                  {metrics.largestPosition && (
                    <div className="bg-gradient-to-r from-blue-500/10 to-blue-600/10 rounded-2xl p-4 border border-blue-500/20">
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="text-white font-medium">Largest Position</h4>
                          <p className="text-sm text-gray-400">{metrics.largestPosition.symbol}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-blue-400 font-bold">
                            ${metrics.largestPosition.market_value?.toFixed(2)}
                          </p>
                          <p className="text-sm text-gray-400">
                            {((metrics.largestPosition.market_value || 0) / metrics.totalValue * 100).toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {metrics.smallestPosition && (
                    <div className="bg-gradient-to-r from-purple-500/10 to-purple-600/10 rounded-2xl p-4 border border-purple-500/20">
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="text-white font-medium">Smallest Position</h4>
                          <p className="text-sm text-gray-400">{metrics.smallestPosition.symbol}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-purple-400 font-bold">
                            ${metrics.smallestPosition.market_value?.toFixed(2)}
                          </p>
                          <p className="text-sm text-gray-400">
                            {((metrics.smallestPosition.market_value || 0) / metrics.totalValue * 100).toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Portfolio Performance Chart */}
          <div className="bg-gradient-to-br from-gray-800/60 to-gray-900/60 backdrop-blur-xl rounded-3xl border border-gray-700/50 p-8 shadow-2xl hover:border-gray-600/50 transition-all duration-500">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-3 h-3 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full animate-pulse"></div>
              <h3 className="text-2xl font-bold text-white">Portfolio Value Over Time</h3>
            </div>
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
                      borderRadius: '0.75rem',
                      color: '#fff',
                      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
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

          {/* Detailed Holdings Table */}
          <div className="bg-gradient-to-br from-gray-800/60 to-gray-900/60 backdrop-blur-xl rounded-3xl border border-gray-700/50 shadow-2xl hover:border-gray-600/50 transition-all duration-500 overflow-hidden">
            <div className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-3 h-3 bg-gradient-to-r from-indigo-400 to-purple-400 rounded-full animate-pulse"></div>
                <h3 className="text-2xl font-bold text-white">Detailed Holdings</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-gray-400 text-sm border-b border-gray-700/50">
                      <th className="pb-4 font-medium">Symbol</th>
                      <th className="pb-4 font-medium">Shares</th>
                      <th className="pb-4 font-medium">Avg. Price</th>
                      <th className="pb-4 font-medium">Current Price</th>
                      <th className="pb-4 font-medium">Market Value</th>
                      <th className="pb-4 font-medium">Cost Basis</th>
                      <th className="pb-4 font-medium">Gain/Loss</th>
                      <th className="pb-4 font-medium">Gain/Loss %</th>
                      <th className="pb-4 font-medium">Daily Change</th>
                      <th className="pb-4 font-medium">Purchase Date</th>
                    </tr>
                  </thead>
                  <tbody className="text-white">
                    {portfolio.map((item, index) => (
                      <tr key={item.symbol} className="border-t border-gray-700/30 hover:bg-gray-700/20 transition-colors group">
                        <td className="py-4">
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: COLORS[index % COLORS.length] }}
                            ></div>
                            <div className="font-semibold text-white group-hover:text-blue-300 transition-colors">
                              {item.symbol}
                            </div>
                          </div>
                        </td>
                        <td className="py-4 font-medium">{item.shares}</td>
                        <td className="py-4 font-mono">${item.average_price.toFixed(2)}</td>
                        <td className="py-4 font-mono">${item.current_price?.toFixed(2)}</td>
                        <td className="py-4 font-mono font-semibold">${item.market_value?.toFixed(2)}</td>
                        <td className="py-4 font-mono">${item.cost_basis?.toFixed(2)}</td>
                        <td className={`py-4 font-mono font-semibold ${item.gain_loss && item.gain_loss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          ${item.gain_loss?.toFixed(2)}
                        </td>
                        <td className={`py-4 font-mono font-bold ${item.gain_loss_percentage && item.gain_loss_percentage >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {item.gain_loss_percentage?.toFixed(2)}%
                        </td>
                        <td className={`py-4 font-mono ${item.daily_change && item.daily_change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {item.daily_change?.toFixed(2)}%
                        </td>
                        <td className="py-4 text-gray-400">{item.purchase_date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
