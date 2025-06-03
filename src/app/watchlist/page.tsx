"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useRouter } from "next/navigation";
import { fetchStock } from "../../lib/fetchStock";

// Custom CSS for animations - same as futures page
const customStyles = `
  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes shimmer {
    0% {
      background-position: -1000px 0;
    }
    100% {
      background-position: 1000px 0;
    }
  }

  .animate-slideUp {
    animation: slideUp 0.6s ease-out;
  }

  .animate-slideDown {
    animation: slideDown 0.3s ease-out;
  }

  .animate-fadeIn {
    animation: fadeIn 0.5s ease-out;
  }

  .placeholder-shine::placeholder {
    background: linear-gradient(90deg, #6b7280 25%, #9ca3af 50%, #6b7280 75%);
    background-size: 1000px 100%;
    animation: shimmer 2s infinite;
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .glass-effect {
    backdrop-filter: blur(16px);
    background: rgba(17, 24, 39, 0.8);
    border: 1px solid rgba(75, 85, 99, 0.3);
  }
`;

interface Profile {
  id: string;
  email: string;
  balance: number;
}

interface WatchlistItem {
  symbol: string;
  added_at: string;
  current_price?: number;
  change?: number;
  changePercent?: number;
  volume?: string;
  marketCap?: string;
}

interface CompanyOverview {
  Symbol: string;
  Name: string;
  Description: string;
  Exchange: string;
  Currency: string;
  Country: string;
  Sector: string;
  Industry: string;
  MarketCapitalization: string;
  EBITDA: string;
  PERatio: string;
  PEGRatio: string;
  BookValue: string;
  DividendPerShare: string;
  DividendYield: string;
  EPS: string;
  RevenuePerShareTTM: string;
  ProfitMargin: string;
  OperatingMarginTTM: string;
  ReturnOnAssetsTTM: string;
  ReturnOnEquityTTM: string;
  RevenueTTM: string;
  GrossProfitTTM: string;
  QuarterlyEarningsGrowthYOY: string;
  QuarterlyRevenueGrowthYOY: string;
  AnalystTargetPrice: string;
  TrailingPE: string;
  ForwardPE: string;
  PriceToSalesRatioTTM: string;
  PriceToBookRatio: string;
  EVToRevenue: string;
  EVToEBITDA: string;
  Beta: string;
  '52WeekHigh': string;
  '52WeekLow': string;
  '50DayMovingAverage': string;
  '200DayMovingAverage': string;
  SharesOutstanding: string;
  SharesFloat: string;
  SharesShort: string;
  SharesShortPriorMonth: string;
  ShortRatio: string;
  ShortPercentOutstanding: string;
  ShortPercentFloat: string;
  PercentInsiders: string;
  PercentInstitutions: string;
  ForwardAnnualDividendRate: string;
  ForwardAnnualDividendYield: string;
  PayoutRatio: string;
  DividendDate: string;
  ExDividendDate: string;
  LastSplitFactor: string;
  LastSplitDate: string;
}

const WatchlistPage: React.FC = () => {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingWatchlist, setIsLoadingWatchlist] = useState(true);
  const [selectedStock, setSelectedStock] = useState<WatchlistItem | null>(null);
  const [companyOverview, setCompanyOverview] = useState<CompanyOverview | null>(null);
  const [newSymbol, setNewSymbol] = useState('');
  const [isAddingStock, setIsAddingStock] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 6;

  useEffect(() => {
    // Inject custom styles
    const styleElement = document.createElement('style');
    styleElement.textContent = customStyles;
    document.head.appendChild(styleElement);
    
    return () => {
      // Cleanup styles on unmount
      document.head.removeChild(styleElement);
    };
  }, []);

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

  // Fetch company overview
  const fetchCompanyOverview = async (symbol: string) => {
    try {
      const response = await fetch(
        `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${symbol}&apikey=${process.env.NEXT_PUBLIC_ALPHA_VANTAGE_KEY}`
      );
      const data = await response.json();
      
      if (data && !data["Error Message"] && !data["Note"]) {
        setCompanyOverview(data);
      } else {
        console.error("Error fetching company overview:", data["Error Message"] || data["Note"]);
        setCompanyOverview(null);
      }
    } catch (error) {
      console.error('Error fetching company overview:', error);
      setCompanyOverview(null);
    }
  };

  // Load watchlist
  useEffect(() => {
    if (!profile?.id) return;

    const fetchWatchlist = async () => {
      setIsLoadingWatchlist(true);
      try {
        const { data: watchlistData, error: watchlistError } = await supabase
          .from("watchlist")
          .select("symbol, added_at")
          .eq("user_id", profile.id)
          .order("added_at", { ascending: false });

        if (watchlistError) throw watchlistError;

        // Fetch current prices for all watchlist items
        const watchlistWithPrices = await Promise.all(
          watchlistData.map(async (item) => {
            try {
            const stockData = await fetchStock(item.symbol);
            return {
              ...item,
              current_price: stockData.price,
                change: stockData.change,
                changePercent: stockData.change,
                volume: Math.floor(Math.random() * 1000000).toLocaleString() + 'K', // Mock volume
                marketCap: '$' + Math.floor(Math.random() * 100).toLocaleString() + 'B' // Mock market cap
              };
            } catch (error) {
              console.error(`Error fetching data for ${item.symbol}:`, error);
              return {
                ...item,
                current_price: 0,
                change: 0,
                changePercent: 0,
                volume: 'N/A',
                marketCap: 'N/A'
              };
            }
          })
        );

        setWatchlist(watchlistWithPrices);
        if (watchlistWithPrices.length > 0) {
          setSelectedStock(watchlistWithPrices[0]);
          fetchCompanyOverview(watchlistWithPrices[0].symbol);
        }
      } catch (err: any) {
        console.error("Error fetching watchlist:", err);
        setError(err.message);
      } finally {
        setIsLoadingWatchlist(false);
      }
    };

    fetchWatchlist();
  }, [profile?.id]);

  const handleAddToWatchlist = async () => {
    if (!profile?.id || !newSymbol.trim()) return;

    setIsAddingStock(true);
    try {
      // Check if already in watchlist
      const existing = watchlist.find(item => item.symbol.toLowerCase() === newSymbol.toLowerCase());
      if (existing) {
        alert('Stock is already in your watchlist');
        return;
      }

      // Add to database
      const { error } = await supabase
        .from("watchlist")
        .insert({
          user_id: profile.id,
          symbol: newSymbol.toUpperCase(),
          added_at: new Date().toISOString()
        });

      if (error) throw error;

      // Fetch stock data and add to local state
      const stockData = await fetchStock(newSymbol.toUpperCase());
      const newWatchlistItem: WatchlistItem = {
        symbol: newSymbol.toUpperCase(),
        added_at: new Date().toISOString(),
        current_price: stockData.price,
        change: stockData.change,
        changePercent: stockData.change,
        volume: Math.floor(Math.random() * 1000000).toLocaleString() + 'K',
        marketCap: '$' + Math.floor(Math.random() * 100).toLocaleString() + 'B'
      };

      setWatchlist(prev => [newWatchlistItem, ...prev]);
      setNewSymbol('');
      alert(`${newSymbol.toUpperCase()} added to watchlist`);
    } catch (err: any) {
      console.error("Error adding to watchlist:", err);
      alert('Failed to add stock to watchlist');
    } finally {
      setIsAddingStock(false);
    }
  };

  const handleRemoveFromWatchlist = async (symbol: string) => {
    if (!profile?.id) return;

    try {
      const { error } = await supabase
        .from("watchlist")
        .delete()
        .eq("user_id", profile.id)
        .eq("symbol", symbol);

      if (error) throw error;

      // Update local state
      setWatchlist(prev => prev.filter(item => item.symbol !== symbol));
      
      // If removed stock was selected, select another or null
      if (selectedStock?.symbol === symbol) {
        const remaining = watchlist.filter(item => item.symbol !== symbol);
        if (remaining.length > 0) {
          setSelectedStock(remaining[0]);
          fetchCompanyOverview(remaining[0].symbol);
        } else {
          setSelectedStock(null);
          setCompanyOverview(null);
        }
      }
    } catch (err: any) {
      console.error("Error removing from watchlist:", err);
      setError(err.message);
    }
  };

  const handleSelectStock = (stock: WatchlistItem) => {
    setSelectedStock(stock);
    fetchCompanyOverview(stock.symbol);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <p className="text-white">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen font-sans bg-black">
      {/* Side Navigation - Same as Futures */}
      <nav className="w-48 bg-gray-900/95 backdrop-blur-sm border-r border-gray-800/50 fixed h-full flex flex-col justify-between">
        <div>
          <div className="p-3 border-b border-gray-800/50">
            <div className="flex items-center">
              <img src="/logo.png" alt="SimuTrader Logo" className="w-12 h-12 rounded-full mr-2" />
              <span className="text-xl font-bold bg-gradient-to-r from-white via-gray-200 to-gray-300 bg-clip-text text-transparent relative">
                <span className="relative z-10">SimuTrader</span>
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
            <a href="/watchlist" className="text-white px-4 py-2 rounded-lg text-sm font-medium bg-gray-800/80 transition-all duration-200 flex items-center gap-2">
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
            <a href="/portfolio" className="text-gray-300 hover:text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800/50 transition-all duration-200 flex items-center gap-2">
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m8.66-13.66l-.71.71M4.05 19.07l-.71.71M21 12h-1M4 12H3m16.66 6.66l-.71-.71M4.05 4.93l-.71-.71" />
            </svg>
            Theme
          </button>
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
        <div className="flex flex-col p-8 space-y-8 w-full">
          
          {/* Header with modern gradient and animations */}
          <div className="mb-8">
            <div className="flex justify-between items-start">
              <div className="space-y-4">
                <div className="space-y-2">
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-purple-100 to-purple-200 bg-clip-text text-transparent">
                    Watchlist
                  </h1>
                  <div className="h-1 w-24 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full animate-pulse"></div>
                </div>
                <p className="text-gray-400 text-lg font-medium">
                  Track your favorite stocks with real-time charts and market data
                </p>
        </div>

              <div className="flex items-center gap-4">
                {profile && (
                  <div className="group bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-xl rounded-2xl border border-gray-700/50 px-6 py-4 hover:border-purple-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/10">
                    <div className="text-sm text-gray-400 font-medium">Available Balance</div>
                    <div className="text-2xl font-bold text-transparent bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text">
                      ${profile.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
          </div>
        )}

                <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-xl rounded-2xl border border-gray-700/50 px-6 py-4 hover:border-purple-500/50 transition-all duration-300">
                  <div className="text-sm text-gray-400 font-medium">Watchlist Items</div>
                  <div className="text-2xl font-bold text-transparent bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text">
                    {watchlist.length}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Add to Watchlist */}
          <div className="bg-gradient-to-br from-gray-800/60 to-gray-900/60 backdrop-blur-xl rounded-3xl border border-gray-700/50 p-8 shadow-2xl hover:border-gray-600/50 transition-all duration-500 animate-slideUp">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-3 h-3 bg-gradient-to-r from-green-400 to-blue-400 rounded-full animate-pulse"></div>
              <h2 className="text-2xl font-bold text-white">Add Stock to Watchlist</h2>
            </div>
            
            <div className="flex gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  value={newSymbol}
                  onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
                  placeholder="Enter stock symbol (e.g., AAPL)"
                  className="w-full bg-gradient-to-r from-gray-700/50 to-gray-800/50 text-white border border-gray-600/50 rounded-xl px-6 py-4 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 hover:border-gray-500/70 placeholder-shine"
                  onKeyPress={(e) => e.key === 'Enter' && handleAddToWatchlist()}
                />
              </div>
              <button
                onClick={handleAddToWatchlist}
                disabled={isAddingStock || !newSymbol.trim()}
                className="group relative bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-400 hover:to-purple-500 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold py-4 px-8 rounded-xl transition-all duration-300 shadow-lg hover:shadow-purple-500/25 transform hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:transform-none overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative flex items-center gap-2">
                  {isAddingStock ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Adding...
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Add to Watchlist
                    </>
                  )}
                </div>
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-gradient-to-r from-red-500/20 to-orange-500/20 text-red-300 px-6 py-4 rounded-xl text-sm font-medium border border-red-500/30 backdrop-blur-sm animate-fadeIn">
              {error}
            </div>
          )}

          {/* Watchlist Grid */}
          {isLoadingWatchlist ? (
            <div className="bg-gradient-to-br from-gray-800/60 to-gray-900/60 backdrop-blur-xl rounded-3xl border border-gray-700/50 p-8 shadow-2xl">
              <div className="flex flex-col justify-center items-center py-20">
                <div className="relative">
                  <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-600"></div>
                  <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-purple-500 absolute top-0 left-0"></div>
                </div>
                <span className="mt-6 text-gray-400 text-lg font-medium animate-pulse">Loading your watchlist...</span>
              </div>
            </div>
          ) : watchlist.length === 0 ? (
            <div className="bg-gradient-to-br from-gray-800/60 to-gray-900/60 backdrop-blur-xl rounded-3xl border border-gray-700/50 p-12 shadow-2xl text-center animate-slideUp">
              <div className="w-24 h-24 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Your watchlist is empty</h3>
              <p className="text-gray-400 text-lg mb-8">Add stocks to track their performance with real-time charts</p>
          </div>
        ) : (
            <div className="bg-gradient-to-br from-gray-800/60 to-gray-900/60 backdrop-blur-xl rounded-3xl border border-gray-700/50 p-8 shadow-2xl hover:border-gray-600/50 transition-all duration-500 animate-slideUp">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-3 h-3 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full animate-pulse"></div>
                  <h2 className="text-2xl font-bold text-white">Watchlist Overview</h2>
                  <div className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-sm font-medium">
                    {watchlist.length} stocks
                  </div>
                </div>
                
                {/* Navigation Controls */}
                {watchlist.length > itemsPerPage && (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                      disabled={currentPage === 0}
                      className="group relative bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 disabled:from-gray-800 disabled:to-gray-900 text-white p-3 rounded-xl transition-all duration-300 shadow-lg hover:shadow-purple-500/25 transform hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:transform-none"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <span className="text-gray-400 font-medium">
                      {currentPage + 1} of {Math.ceil(watchlist.length / itemsPerPage)}
                    </span>
                  <button
                      onClick={() => setCurrentPage(prev => Math.min(Math.ceil(watchlist.length / itemsPerPage) - 1, prev + 1))}
                      disabled={currentPage >= Math.ceil(watchlist.length / itemsPerPage) - 1}
                      className="group relative bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 disabled:from-gray-800 disabled:to-gray-900 text-white p-3 rounded-xl transition-all duration-300 shadow-lg hover:shadow-purple-500/25 transform hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:transform-none"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
              
              {/* Display 6 items at a time */}
              <div className="grid grid-cols-2 gap-6 mb-8">
                {watchlist
                  .slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage)
                  .map((item, index) => (
                  <div 
                    key={item.symbol}
                    className={`group cursor-pointer bg-gradient-to-br from-gray-700/40 to-gray-800/40 backdrop-blur-sm rounded-2xl border-2 p-6 shadow-xl transition-all duration-500 hover:shadow-lg transform hover:scale-[1.02] animate-slideUp ${
                      selectedStock?.symbol === item.symbol 
                        ? 'border-purple-500 shadow-purple-500/25 bg-gradient-to-r from-purple-900/20 to-pink-900/20' 
                        : 'border-gray-600/30 hover:border-gray-500/50 hover:shadow-gray-500/10'
                    }`}
                    onClick={() => handleSelectStock(item)}
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    {/* Stock Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl flex items-center justify-center font-bold text-purple-400 border border-purple-500/30">
                          {item.symbol.charAt(0)}
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-white group-hover:text-purple-300 transition-colors">
                            {item.symbol}
                          </h3>
                          <p className="text-xs text-gray-400">
                            {new Date(item.added_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveFromWatchlist(item.symbol);
                        }}
                        className="text-red-400 hover:text-red-300 p-1 rounded-lg hover:bg-red-500/10 transition-all"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                  </button>
                </div>

                    {/* Stock Details */}
                <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="text-center">
                          <div className="text-xs text-gray-400 font-medium mb-1">Price</div>
                          <div className="text-lg font-bold text-white font-mono">
                            ${item.current_price?.toFixed(2)}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-gray-400 font-medium mb-1">Change</div>
                          <div className={`text-lg font-bold flex items-center gap-1 justify-center ${
                            (item.changePercent ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'
                          }`}>
                            <span>{(item.changePercent ?? 0) >= 0 ? '↗' : '↘'}</span>
                            <span>{(item.changePercent ?? 0) >= 0 ? '+' : ''}{item.changePercent?.toFixed(2)}%</span>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="text-center">
                          <div className="text-xs text-gray-400 font-medium mb-1">Volume</div>
                          <div className="text-sm font-semibold text-gray-300">
                            {item.volume}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-gray-400 font-medium mb-1">Market Cap</div>
                          <div className="text-sm font-semibold text-gray-300">
                            {item.marketCap}
                          </div>
                        </div>
                      </div>

                      {/* Quick Action */}
                      <div className="pt-3 border-t border-gray-600/30">
                        <a
                          href={`/dashboard?symbol=${item.symbol}`}
                          className="w-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-300 py-2 px-3 rounded-lg transition-all duration-300 hover:from-purple-500/30 hover:to-pink-500/30 font-semibold flex items-center justify-center gap-2 border border-purple-500/30 text-sm"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Trade {item.symbol}
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Summary Stats */}
              <div className="bg-gradient-to-r from-gray-700/30 to-gray-800/30 rounded-2xl p-6 border border-gray-600/30">
                <h3 className="text-lg font-semibold text-white mb-4">Portfolio Summary</h3>
                <div className="grid grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-sm text-gray-400 font-medium mb-1">Total Stocks</div>
                    <div className="text-xl font-bold text-purple-400">{watchlist.length}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-gray-400 font-medium mb-1">Gainers</div>
                    <div className="text-xl font-bold text-green-400">
                      {watchlist.filter(item => (item.changePercent ?? 0) > 0).length}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-gray-400 font-medium mb-1">Losers</div>
                    <div className="text-xl font-bold text-red-400">
                      {watchlist.filter(item => (item.changePercent ?? 0) < 0).length}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-gray-400 font-medium mb-1">Avg Change</div>
                    <div className={`text-xl font-bold ${
                      (watchlist.reduce((sum, item) => sum + (item.changePercent ?? 0), 0) / watchlist.length) >= 0 
                        ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {((watchlist.reduce((sum, item) => sum + (item.changePercent ?? 0), 0) / watchlist.length) || 0).toFixed(2)}%
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Detailed View with Chart and Company Overview */}
          {selectedStock && (
            <div className="bg-gradient-to-br from-gray-800/60 to-gray-900/60 backdrop-blur-xl rounded-3xl border border-gray-700/50 p-8 shadow-2xl hover:border-gray-600/50 transition-all duration-500 animate-slideUp">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-3 h-3 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full animate-pulse"></div>
                <h2 className="text-2xl font-bold text-white">Detailed Analysis: {selectedStock.symbol}</h2>
                <div className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-sm font-medium">
                  Live Chart & Overview
                </div>
                <div className="flex-1"></div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-white font-mono">
                    ${selectedStock.current_price?.toFixed(2)}
                  </div>
                  <div className={`text-lg font-semibold ${
                    (selectedStock.changePercent ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {(selectedStock.changePercent ?? 0) >= 0 ? '+' : ''}{selectedStock.changePercent?.toFixed(2)}%
                  </div>
                  </div>
                </div>

              {/* Chart and Company Overview Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {/* TradingView Chart */}
                <div className="bg-gradient-to-br from-gray-700/20 to-gray-800/20 rounded-2xl p-4 border border-gray-600/30">
                  <h3 className="text-lg font-semibold text-white mb-4">Price Chart</h3>
                  <div className="h-96">
                    <iframe
                      src={`https://s.tradingview.com/widgetembed/?frameElementId=tradingview_detailed_${selectedStock.symbol}&symbol=${selectedStock.symbol}&interval=D&hidesidetoolbar=0&hidetabs=0&style=1&locale=en&theme=dark&timezone=Etc%2FUTC&studies=%5B%5D&format=price&utm_source=localhost&utm_medium=widget&utm_campaign=chart&utm_term=${selectedStock.symbol}`}
                      className="w-full h-full rounded-xl"
                      frameBorder="0"
                      scrolling="no"
                    ></iframe>
                  </div>
                </div>

                {/* Company Overview */}
                <div className="bg-gradient-to-br from-gray-700/20 to-gray-800/20 rounded-2xl p-6 border border-gray-600/30">
                  <h3 className="text-lg font-semibold text-white mb-4">Company Overview</h3>
                  {companyOverview ? (
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      <div>
                        <h4 className="text-lg font-bold text-purple-400">{companyOverview.Name}</h4>
                        <p className="text-sm text-gray-400">{companyOverview.Exchange} • {companyOverview.Country}</p>
                        <p className="text-sm text-gray-300 mt-2">{companyOverview.Sector} - {companyOverview.Industry}</p>
                      </div>
                      
                      <div className="text-sm text-gray-300 leading-relaxed">
                        {companyOverview.Description}
                      </div>

                      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-600/30">
                        <div>
                          <div className="text-xs text-gray-400 font-medium">Market Cap</div>
                          <div className="text-sm font-bold text-white">
                            ${companyOverview.MarketCapitalization ? 
                              (parseInt(companyOverview.MarketCapitalization) / 1000000000).toFixed(2) + 'B' : 
                              'N/A'
                            }
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-400 font-medium">P/E Ratio</div>
                          <div className="text-sm font-bold text-white">
                            {companyOverview.PERatio && companyOverview.PERatio !== 'None' ? 
                              parseFloat(companyOverview.PERatio).toFixed(2) : 
                              'N/A'
                            }
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-400 font-medium">EPS</div>
                          <div className="text-sm font-bold text-white">
                            ${companyOverview.EPS && companyOverview.EPS !== 'None' ? 
                              parseFloat(companyOverview.EPS).toFixed(2) : 
                              'N/A'
                            }
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-400 font-medium">Dividend Yield</div>
                          <div className="text-sm font-bold text-white">
                            {companyOverview.DividendYield && companyOverview.DividendYield !== 'None' ? 
                              (parseFloat(companyOverview.DividendYield) * 100).toFixed(2) + '%' : 
                              'N/A'
                            }
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-64">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-500 border-t-transparent mx-auto mb-2"></div>
                        <p className="text-gray-400">Loading company data...</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Key Statistics */}
              {companyOverview && (
                <div className="bg-gradient-to-r from-gray-700/30 to-gray-800/30 rounded-2xl p-6 border border-gray-600/30">
                  <h3 className="text-lg font-semibold text-white mb-6">Key Statistics</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                    <div className="text-center">
                      <div className="text-xs text-gray-400 font-medium mb-1">52W High</div>
                      <div className="text-sm font-bold text-green-400">
                        ${companyOverview['52WeekHigh'] && companyOverview['52WeekHigh'] !== 'None' ? 
                          parseFloat(companyOverview['52WeekHigh']).toFixed(2) : 
                          'N/A'
                        }
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-400 font-medium mb-1">52W Low</div>
                      <div className="text-sm font-bold text-red-400">
                        ${companyOverview['52WeekLow'] && companyOverview['52WeekLow'] !== 'None' ? 
                          parseFloat(companyOverview['52WeekLow']).toFixed(2) : 
                          'N/A'
                        }
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-400 font-medium mb-1">Beta</div>
                      <div className="text-sm font-bold text-white">
                        {companyOverview.Beta && companyOverview.Beta !== 'None' ? 
                          parseFloat(companyOverview.Beta).toFixed(2) : 
                          'N/A'
                        }
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-400 font-medium mb-1">Revenue TTM</div>
                      <div className="text-sm font-bold text-white">
                        ${companyOverview.RevenueTTM && companyOverview.RevenueTTM !== 'None' ? 
                          (parseInt(companyOverview.RevenueTTM) / 1000000000).toFixed(2) + 'B' : 
                          'N/A'
                        }
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-400 font-medium mb-1">Profit Margin</div>
                      <div className="text-sm font-bold text-white">
                        {companyOverview.ProfitMargin && companyOverview.ProfitMargin !== 'None' ? 
                          (parseFloat(companyOverview.ProfitMargin) * 100).toFixed(2) + '%' : 
                          'N/A'
                        }
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-400 font-medium mb-1">ROE</div>
                      <div className="text-sm font-bold text-white">
                        {companyOverview.ReturnOnEquityTTM && companyOverview.ReturnOnEquityTTM !== 'None' ? 
                          (parseFloat(companyOverview.ReturnOnEquityTTM) * 100).toFixed(2) + '%' : 
                          'N/A'
                        }
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WatchlistPage; 