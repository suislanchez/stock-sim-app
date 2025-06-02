"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { futuresApi, FuturesApiData } from '@/lib/futuresApi';
import { supabase } from '@/lib/supabaseClient';

// Custom CSS for animations
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

interface FuturesPortfolio {
  id?: string;
  symbol: string;
  contracts: number;
  entryPrice: number;
  currentPrice: number;
  pnl: number;
  pnlPercent: number;
  margin: number;
  expiry: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  id: string;
}

interface Profile {
  id: string;
  email: string;
  balance: number;
}

const FuturesPage: React.FC = () => {
  const router = useRouter();
  const [selectedContract, setSelectedContract] = useState<FuturesApiData | null>(null);
  const [contracts, setContracts] = useState<number>(1);
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market');
  const [limitPrice, setLimitPrice] = useState<string>('');
  const [futuresPortfolio, setFuturesPortfolio] = useState<FuturesPortfolio[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCryptoMode, setIsCryptoMode] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Real futures data from Alpha Vantage API
  const [futuresData, setFuturesData] = useState<FuturesApiData[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);

  useEffect(() => {
    loadFuturesData();
    
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
    ;(async () => {
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

  // Load futures positions from database
  useEffect(() => {
    if (!profile?.id) return;

    const loadFuturesPositions = async () => {
      try {
        const { data: positions, error } = await supabase
          .from('futures_positions')
          .select('*')
          .eq('user_id', profile.id);

        if (error) throw error;

        if (positions && positions.length > 0) {
          // Convert database positions to component format and calculate current PnL
          const positionsWithCurrentData = await Promise.all(
            positions.map(async (position) => {
              // Find current price from futuresData
              const currentContract = futuresData.find(contract => contract.symbol === position.symbol);
              const currentPrice = currentContract?.price || position.entry_price;
              
              // Calculate PnL
              const priceDiff = currentPrice - position.entry_price;
              const pnl = priceDiff * position.contracts * 100; // Assuming $100 per point
              const pnlPercent = (priceDiff / position.entry_price) * 100;

              return {
                id: position.id,
                symbol: position.symbol,
                contracts: position.contracts,
                entryPrice: position.entry_price,
                currentPrice: currentPrice,
                pnl: pnl,
                pnlPercent: pnlPercent,
                margin: position.margin,
                expiry: position.expiry
              };
            })
          );

          setFuturesPortfolio(positionsWithCurrentData);
        }
      } catch (error) {
        console.error('Error loading futures positions:', error);
      }
    };

    loadFuturesPositions();
  }, [profile?.id, futuresData]);

  const loadFuturesData = async () => {
    try {
      setIsLoadingData(true);
      setDataError(null);
      
      const data = await futuresApi.fetchAllFuturesData();
      
      if (data.length === 0) {
        // Fallback to sample data if API fails
        setFuturesData([
          {
            symbol: 'CL',
            name: 'Crude Oil',
            price: 75.45,
            change: 1.23,
            changePercent: 1.66,
            volume: '245K',
            openInterest: '1.2M',
            expiry: '2024-03-20',
            category: 'energy'
          },
          {
            symbol: 'ES',
            name: 'S&P 500 E-mini',
            price: 4567.25,
            change: -12.50,
            changePercent: -0.27,
            volume: '892K',
            openInterest: '2.8M',
            expiry: '2024-03-15',
            category: 'index'
          },
          {
            symbol: 'GC',
            name: 'Gold',
            price: 2045.60,
            change: -8.40,
            changePercent: -0.41,
            volume: '123K',
            openInterest: '456K',
            expiry: '2024-04-26',
            category: 'commodity'
          }
        ]);
        setDataError('Using sample data - API rate limited');
      } else {
        setFuturesData(data);
      }
    } catch (error) {
      console.error('Error loading futures data:', error);
      setDataError('Failed to load real-time data');
      // Fallback data
      setFuturesData([
        {
          symbol: 'CL',
          name: 'Crude Oil',
          price: 75.45,
          change: 1.23,
          changePercent: 1.66,
          volume: '245K',
          openInterest: '1.2M',
          expiry: '2024-03-20',
          category: 'energy'
        }
      ]);
    } finally {
      setIsLoadingData(false);
    }
  };

  const refreshData = async () => {
    await loadFuturesData();
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'commodity': return 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10';
      case 'index': return 'text-blue-400 border-blue-400/30 bg-blue-400/10';
      case 'currency': return 'text-purple-400 border-purple-400/30 bg-purple-400/10';
      case 'energy': return 'text-orange-400 border-orange-400/30 bg-orange-400/10';
      default: return 'text-gray-400 border-gray-400/30 bg-gray-400/10';
    }
  };

  const generateMessageId = () => {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
      id: generateMessageId()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Enhanced AI responses for futures
    setTimeout(() => {
      let response = '';
      
      if (input.toLowerCase().includes('risk')) {
        response = 'Futures trading involves leverage, which amplifies both potential gains and losses. Key risk management strategies include:\n• Position sizing based on account value\n• Stop-loss orders\n• Understanding margin requirements\n• Diversification across contract types\n• Monitor correlation between contracts';
      } else if (input.toLowerCase().includes('margin')) {
        response = 'Margin requirements vary by contract:\n• Index futures (ES, NQ): ~$12,000-15,000 per contract\n• Energy futures (CL): ~$4,000-6,000 per contract\n• Metal futures (GC): ~$8,000-12,000 per contract\n• Agricultural: ~$2,000-4,000 per contract\n\nRemember: margin is not the cost, it\'s a performance bond.';
      } else if (input.toLowerCase().includes('contract') || input.toLowerCase().includes('symbol')) {
        response = 'Popular futures contracts include:\n• Energy: Crude Oil (CL), Natural Gas (NG)\n• Indices: S&P 500 (ES), Nasdaq (NQ), Dow (YM)\n• Commodities: Gold (GC), Silver (SI), Copper (HG)\n• Currencies: Euro (6E), Yen (6J), Pound (6B)\n• Agriculture: Corn (ZC), Wheat (ZW), Soybeans (ZS)';
      } else if (input.toLowerCase().includes('hour') || input.toLowerCase().includes('time')) {
        response = 'Futures markets trade nearly 24/7:\n• Index futures: Sunday 6 PM - Friday 5 PM ET\n• Energy futures: Sunday 6 PM - Friday 5 PM ET\n• Metals: Sunday 6 PM - Friday 5 PM ET\n• Currencies: Sunday 5 PM - Friday 5 PM ET\n\nMost active during regular stock market hours (9:30 AM - 4 PM ET).';
      } else {
        response = 'Futures are standardized contracts to buy/sell an asset at a predetermined price on a future date. They offer leverage, liquidity, and are used for hedging or speculation.\n\nKey benefits:\n• High leverage (control large positions with less capital)\n• Deep liquidity in major contracts\n• Price discovery for underlying assets\n• Portfolio hedging capabilities';
      }

      const assistantMessage: Message = {
        role: 'assistant',
        content: response,
        id: generateMessageId()
      };
      setMessages(prev => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 1000);
  };

  const handleTrade = async (action: 'buy' | 'sell') => {
    if (!selectedContract || !profile) {
      alert('Please select a contract and ensure you are logged in');
      return;
    }
    
    try {
      const entryPrice = orderType === 'limit' ? parseFloat(limitPrice) : selectedContract.price;
      const marginRequired = entryPrice * contracts * 0.1; // 10% margin requirement
      
      // Check if user has sufficient balance for margin
      if (marginRequired > profile.balance) {
        alert('Insufficient balance for margin requirement');
        return;
      }

      // Save position to database
      const { data: newPosition, error } = await supabase
        .from('futures_positions')
        .insert({
          user_id: profile.id,
          symbol: selectedContract.symbol,
          contracts: action === 'buy' ? contracts : -contracts, // Negative for short positions
          entry_price: entryPrice,
          margin: marginRequired,
          expiry: selectedContract.expiry
        })
        .select()
        .single();

      if (error) throw error;

      // Update user's balance (deduct margin)
      const { error: balanceError } = await supabase
        .from('profiles')
        .update({ balance: profile.balance - marginRequired })
        .eq('id', profile.id);

      if (balanceError) {
        // If balance update fails, delete the position we just created
        await supabase
          .from('futures_positions')
          .delete()
          .eq('id', newPosition.id);
        throw balanceError;
      }

      // Update local state
      setProfile(prev => prev ? { ...prev, balance: prev.balance - marginRequired } : null);

      const newPortfolioPosition: FuturesPortfolio = {
        id: newPosition.id,
        symbol: selectedContract.symbol,
        contracts: action === 'buy' ? contracts : -contracts,
        entryPrice: entryPrice,
        currentPrice: selectedContract.price,
        pnl: 0,
        pnlPercent: 0,
        margin: marginRequired,
        expiry: selectedContract.expiry
      };

      setFuturesPortfolio(prev => [...prev, newPortfolioPosition]);
      alert(`${action.toUpperCase()} order placed for ${contracts} ${selectedContract.symbol} contracts`);
      
    } catch (error) {
      console.error('Error placing trade:', error);
      alert('Failed to place order. Please try again.');
    }
  };

  // Function to close a position
  const closePosition = async (position: FuturesPortfolio) => {
    if (!profile || !position.id) return;

    try {
      // Calculate PnL and return margin + PnL to balance
      const currentContract = futuresData.find(contract => contract.symbol === position.symbol);
      const currentPrice = currentContract?.price || position.currentPrice;
      const priceDiff = currentPrice - position.entryPrice;
      const pnl = priceDiff * position.contracts * 100;
      const returnAmount = position.margin + pnl;

      // Delete position from database
      const { error: deleteError } = await supabase
        .from('futures_positions')
        .delete()
        .eq('id', position.id)
        .eq('user_id', profile.id);

      if (deleteError) throw deleteError;

      // Update user's balance
      const { error: balanceError } = await supabase
        .from('profiles')
        .update({ balance: profile.balance + returnAmount })
        .eq('id', profile.id);

      if (balanceError) throw balanceError;

      // Update local state
      setProfile(prev => prev ? { ...prev, balance: prev.balance + returnAmount } : null);
      setFuturesPortfolio(prev => prev.filter(p => p.id !== position.id));

      alert(`Position closed. PnL: ${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}`);
      
    } catch (error) {
      console.error('Error closing position:', error);
      alert('Failed to close position. Please try again.');
    }
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
      {/* Side Navigation - Same as Dashboard */}
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
            <a href="/futures" className="text-white px-4 py-2 rounded-lg text-sm font-medium bg-gray-800/80 transition-all duration-200 flex items-center gap-2">
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
            <a href="/portfolio" className={`${isCryptoMode ? 'crypto-text' : 'text-gray-300'} hover:text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800/50 transition-all duration-200 flex items-center gap-2`}>
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
        <div className="flex flex-col p-8 space-y-8 w-full pr-[520px]">
          
          {/* Header with modern gradient and animations */}
          <div className="mb-8">
            <div className="flex justify-between items-start">
              <div className="space-y-4">
                <div className="space-y-2">
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-blue-100 to-blue-200 bg-clip-text text-transparent">
                    Futures Trading
                  </h1>
                  <div className="h-1 w-24 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-pulse"></div>
                </div>
                <p className="text-gray-400 text-lg font-medium">
                  Advanced derivatives trading on commodities, indices, currencies, and energy
                </p>
              </div>
              
              <div className="flex items-center gap-4">
                {profile && (
                  <div className="group bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-xl rounded-2xl border border-gray-700/50 px-6 py-4 hover:border-green-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-green-500/10">
                    <div className="text-sm text-gray-400 font-medium">Available Balance</div>
                    <div className="text-2xl font-bold text-transparent bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text">
                      ${profile.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                )}
                
                <button
                  onClick={refreshData}
                  disabled={isLoadingData}
                  className="group relative bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 disabled:from-gray-700 disabled:to-gray-800 text-white px-6 py-3 rounded-xl transition-all duration-300 flex items-center gap-3 shadow-lg hover:shadow-blue-500/25 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95"
                >
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    className={`h-5 w-5 transition-transform duration-500 ${isLoadingData ? 'animate-spin' : 'group-hover:rotate-180'}`} 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span className="font-semibold">
                    {isLoadingData ? 'Refreshing...' : 'Refresh Data'}
                  </span>
                </button>
                
                {dataError && (
                  <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-300 px-4 py-3 rounded-xl text-sm font-medium border border-yellow-500/30 backdrop-blur-sm animate-fadeIn">
                    {dataError}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Futures Portfolio with modern cards */}
          {futuresPortfolio.length > 0 && (
            <div className="bg-gradient-to-br from-gray-800/60 to-gray-900/60 backdrop-blur-xl rounded-3xl border border-gray-700/50 p-8 shadow-2xl hover:border-gray-600/50 transition-all duration-500 animate-slideUp">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-3 h-3 bg-gradient-to-r from-green-400 to-blue-400 rounded-full animate-pulse"></div>
                  <h2 className="text-2xl font-bold text-white">Active Positions</h2>
                  <div className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-sm font-medium">
                    {futuresPortfolio.length} position{futuresPortfolio.length !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>
              
              <div className="grid gap-4 mb-8">
                {futuresPortfolio.map((position, index) => {
                  // Recalculate current PnL with latest prices
                  const currentContract = futuresData.find(contract => contract.symbol === position.symbol);
                  const currentPrice = currentContract?.price || position.currentPrice;
                  const priceDiff = currentPrice - position.entryPrice;
                  const pnl = priceDiff * position.contracts * 100;
                  const pnlPercent = (priceDiff / position.entryPrice) * 100;
                  const isProfit = pnl >= 0;

                  return (
                    <div 
                      key={position.id || index} 
                      className="group bg-gradient-to-r from-gray-700/40 to-gray-800/40 backdrop-blur-sm rounded-2xl p-6 border border-gray-600/30 hover:border-gray-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-gray-500/10 transform hover:scale-[1.02]"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-6 flex-1">
                          {/* Symbol and Direction */}
                          <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-sm ${
                              position.contracts > 0 
                                ? 'bg-gradient-to-br from-green-500/20 to-emerald-500/20 text-green-400 border border-green-500/30'
                                : 'bg-gradient-to-br from-red-500/20 to-rose-500/20 text-red-400 border border-red-500/30'
                            }`}>
                              {position.contracts > 0 ? '↗' : '↙'}
                            </div>
                            <div>
                              <div className="text-xl font-bold text-white">{position.symbol}</div>
                              <div className="text-sm text-gray-400 font-medium">
                                {Math.abs(position.contracts)} contracts • {position.contracts > 0 ? 'Long' : 'Short'}
                              </div>
                            </div>
                          </div>

                          {/* Price Information */}
                          <div className="grid grid-cols-2 gap-6">
                            <div className="text-center">
                              <div className="text-sm text-gray-400 font-medium">Entry Price</div>
                              <div className="text-lg font-bold text-white">${position.entryPrice.toFixed(2)}</div>
                            </div>
                            <div className="text-center">
                              <div className="text-sm text-gray-400 font-medium">Current Price</div>
                              <div className="text-lg font-bold text-white">${currentPrice.toFixed(2)}</div>
                            </div>
                          </div>

                          {/* PnL Display */}
                          <div className="text-center">
                            <div className="text-sm text-gray-400 font-medium">Unrealized PnL</div>
                            <div className={`text-xl font-bold flex items-center gap-2 ${
                              isProfit ? 'text-green-400' : 'text-red-400'
                            }`}>
                              <span>{isProfit ? '↗' : '↘'}</span>
                              <span>{isProfit ? '+' : ''}${pnl.toFixed(2)}</span>
                            </div>
                            <div className={`text-sm font-medium ${
                              isProfit ? 'text-green-400' : 'text-red-400'
                            }`}>
                              {isProfit ? '+' : ''}{pnlPercent.toFixed(2)}%
                            </div>
                          </div>

                          {/* Margin and Expiry */}
                          <div className="text-center">
                            <div className="text-sm text-gray-400 font-medium">Margin Used</div>
                            <div className="text-lg font-bold text-white">${position.margin.toFixed(0)}</div>
                            <div className="text-xs text-gray-500 mt-1">
                              Exp: {new Date(position.expiry).toLocaleDateString()}
                            </div>
                          </div>
                        </div>

                        {/* Close Position Button */}
                        <div className="ml-6">
                          <button
                            onClick={() => closePosition(position)}
                            className="group/btn relative bg-gradient-to-r from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 text-white px-6 py-3 rounded-xl transition-all duration-300 font-semibold shadow-lg hover:shadow-red-500/25 transform hover:scale-105 active:scale-95 overflow-hidden"
                          >
                            <div className="absolute inset-0 bg-gradient-to-r from-red-400 to-red-500 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300"></div>
                            <div className="relative flex items-center gap-2">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                              Close Position
                            </div>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Portfolio Summary Dashboard */}
              <div className="bg-gradient-to-r from-gray-800/40 to-gray-900/40 rounded-2xl p-6 border border-gray-600/30">
                <h3 className="text-lg font-semibold text-white mb-6">Portfolio Summary</h3>
                <div className="grid grid-cols-4 gap-6">
                  <div className="text-center group cursor-pointer">
                    <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 rounded-2xl p-4 border border-blue-500/20 group-hover:border-blue-400/40 transition-all duration-300">
                      <div className="text-sm text-gray-400 font-medium mb-2">Total Positions</div>
                      <div className="text-3xl font-bold text-blue-400">{futuresPortfolio.length}</div>
                    </div>
                  </div>
                  
                  <div className="text-center group cursor-pointer">
                    <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 rounded-2xl p-4 border border-purple-500/20 group-hover:border-purple-400/40 transition-all duration-300">
                      <div className="text-sm text-gray-400 font-medium mb-2">Total Margin</div>
                      <div className="text-3xl font-bold text-purple-400">
                        ${futuresPortfolio.reduce((sum, pos) => sum + pos.margin, 0).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-center group cursor-pointer">
                    {(() => {
                      const totalPnL = futuresPortfolio.reduce((sum, pos) => {
                        const currentContract = futuresData.find(contract => contract.symbol === pos.symbol);
                        const currentPrice = currentContract?.price || pos.currentPrice;
                        const priceDiff = currentPrice - pos.entryPrice;
                        return sum + (priceDiff * pos.contracts * 100);
                      }, 0);
                      const isProfit = totalPnL >= 0;
                      return (
                        <div className={`bg-gradient-to-br ${
                          isProfit ? 'from-green-500/10 to-green-600/10' : 'from-red-500/10 to-red-600/10'
                        } rounded-2xl p-4 border ${
                          isProfit ? 'border-green-500/20 group-hover:border-green-400/40' : 'border-red-500/20 group-hover:border-red-400/40'
                        } transition-all duration-300`}>
                          <div className="text-sm text-gray-400 font-medium mb-2">Unrealized PnL</div>
                          <div className={`text-3xl font-bold ${isProfit ? 'text-green-400' : 'text-red-400'}`}>
                            {isProfit ? '+' : ''}${totalPnL.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                  
                  <div className="text-center group cursor-pointer">
                    <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/10 rounded-2xl p-4 border border-emerald-500/20 group-hover:border-emerald-400/40 transition-all duration-300">
                      <div className="text-sm text-gray-400 font-medium mb-2">Buying Power</div>
                      <div className="text-3xl font-bold text-emerald-400">
                        ${profile?.balance.toLocaleString() || '0'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Futures Contracts Table */}
          <div className="bg-gradient-to-br from-gray-800/60 to-gray-900/60 backdrop-blur-xl rounded-3xl border border-gray-700/50 p-8 shadow-2xl hover:border-gray-600/50 transition-all duration-500">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-3 h-3 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full animate-pulse"></div>
                <h2 className="text-2xl font-bold text-white">Available Contracts</h2>
                <div className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-sm font-medium">
                  Live Market Data
                </div>
              </div>
            </div>
            
            {isLoadingData ? (
              <div className="flex flex-col justify-center items-center py-20">
                <div className="relative">
                  <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-600"></div>
                  <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500 absolute top-0 left-0"></div>
                </div>
                <span className="mt-6 text-gray-400 text-lg font-medium animate-pulse">Loading real-time market data...</span>
              </div>
            ) : (
              <div className="grid gap-4">
                {futuresData.map((contract, index) => (
                  <div 
                    key={contract.symbol}
                    className={`group cursor-pointer bg-gradient-to-r from-gray-700/40 to-gray-800/40 backdrop-blur-sm rounded-2xl p-6 border-2 transition-all duration-300 hover:shadow-lg transform hover:scale-[1.01] ${
                      selectedContract?.symbol === contract.symbol 
                        ? 'border-blue-500 shadow-blue-500/25 bg-gradient-to-r from-blue-900/20 to-purple-900/20' 
                        : 'border-transparent hover:border-gray-500/50 hover:shadow-gray-500/10'
                    }`}
                    onClick={() => setSelectedContract(contract)}
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-6">
                        {/* Contract Symbol and Category */}
                        <div className="flex items-center gap-4">
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-lg border-2 ${getCategoryColor(contract.category)} transition-all duration-300 group-hover:scale-110`}>
                            {contract.symbol}
                          </div>
                          <div>
                            <div className="text-xl font-bold text-white group-hover:text-blue-300 transition-colors">
                              {contract.symbol}
                            </div>
                            <div className={`text-sm font-medium capitalize ${getCategoryColor(contract.category)}`}>
                              {contract.name}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {contract.category}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-8">
                        {/* Price and Change */}
                        <div className="text-center">
                          <div className="text-2xl font-bold text-white font-mono">
                            ${contract.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                          <div className={`text-sm font-semibold flex items-center gap-1 justify-center ${
                            contract.change >= 0 ? 'text-green-400' : 'text-red-400'
                          }`}>
                            <span>{contract.change >= 0 ? '↗' : '↘'}</span>
                            <span>{contract.change >= 0 ? '+' : ''}{contract.changePercent.toFixed(2)}%</span>
                          </div>
                        </div>

                        {/* Volume */}
                        <div className="text-center">
                          <div className="text-sm text-gray-400 font-medium mb-1">Volume</div>
                          <div className="text-lg font-bold text-gray-300">{contract.volume}</div>
                        </div>

                        {/* Open Interest */}
                        <div className="text-center">
                          <div className="text-sm text-gray-400 font-medium mb-1">Open Interest</div>
                          <div className="text-lg font-bold text-gray-300">{contract.openInterest}</div>
                        </div>

                        {/* Expiry */}
                        <div className="text-center">
                          <div className="text-sm text-gray-400 font-medium mb-1">Expiry</div>
                          <div className="text-lg font-bold text-gray-300">
                            {new Date(contract.expiry).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric' 
                            })}
                          </div>
                        </div>

                        {/* Selection Indicator */}
                        <div className="ml-4">
                          {selectedContract?.symbol === contract.symbol ? (
                            <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center animate-pulse">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          ) : (
                            <div className="w-6 h-6 border-2 border-gray-500 rounded-full group-hover:border-blue-400 transition-colors"></div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Enhanced Trading Panel */}
          {selectedContract && (
            <div className="bg-gradient-to-br from-gray-800/60 to-gray-900/60 backdrop-blur-xl rounded-3xl border border-gray-700/50 p-8 shadow-2xl hover:border-gray-600/50 transition-all duration-500 animate-slideUp">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-3 h-3 bg-gradient-to-r from-green-400 to-blue-400 rounded-full animate-pulse"></div>
                <h2 className="text-2xl font-bold text-white">Trade {selectedContract.symbol}</h2>
                <div className="px-3 py-1 bg-green-500/20 text-green-300 rounded-full text-sm font-medium">
                  Live Trading
                </div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Trading Controls */}
                <div className="space-y-6">
                  <div className="space-y-4">
                    <label className="block text-sm font-semibold text-gray-300">Number of Contracts</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={contracts}
                        onChange={(e) => setContracts(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full bg-gradient-to-r from-gray-700/50 to-gray-800/50 text-white border border-gray-600/50 rounded-xl px-6 py-4 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 hover:border-gray-500/70"
                        min="1"
                        placeholder="1"
                      />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">
                        contracts
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="block text-sm font-semibold text-gray-300">Order Type</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setOrderType('market')}
                        className={`px-6 py-4 rounded-xl font-semibold transition-all duration-300 ${
                          orderType === 'market'
                            ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25'
                            : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
                        }`}
                      >
                        Market Order
                      </button>
                      <button
                        onClick={() => setOrderType('limit')}
                        className={`px-6 py-4 rounded-xl font-semibold transition-all duration-300 ${
                          orderType === 'limit'
                            ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg shadow-purple-500/25'
                            : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
                        }`}
                      >
                        Limit Order
                      </button>
                    </div>
                  </div>

                  {orderType === 'limit' && (
                    <div className="space-y-4 animate-slideDown">
                      <label className="block text-sm font-semibold text-gray-300">Limit Price</label>
                      <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">
                          $
                        </div>
                        <input
                          type="number"
                          value={limitPrice}
                          onChange={(e) => setLimitPrice(e.target.value)}
                          placeholder={selectedContract.price.toFixed(2)}
                          className="w-full bg-gradient-to-r from-gray-700/50 to-gray-800/50 text-white border border-gray-600/50 rounded-xl pl-12 pr-6 py-4 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 hover:border-gray-500/70"
                          step="0.01"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Order Summary Card */}
                <div className="space-y-6">
                  <div className="bg-gradient-to-br from-gray-700/30 to-gray-800/30 rounded-2xl p-6 border border-gray-600/30">
                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Order Summary
                    </h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center py-2 border-b border-gray-600/30">
                        <span className="text-gray-400 font-medium">Contract</span>
                        <span className="text-white font-bold">{selectedContract.symbol}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-600/30">
                        <span className="text-gray-400 font-medium">Quantity</span>
                        <span className="text-white font-bold">{contracts} contracts</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-600/30">
                        <span className="text-gray-400 font-medium">Entry Price</span>
                        <span className="text-white font-bold font-mono">
                          ${(orderType === 'limit' && limitPrice ? parseFloat(limitPrice) : selectedContract.price).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-600/30">
                        <span className="text-gray-400 font-medium">Required Margin</span>
                        <span className="text-yellow-400 font-bold">
                          ${((orderType === 'limit' && limitPrice ? parseFloat(limitPrice) : selectedContract.price) * contracts * 0.1).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-gray-400 font-medium">Order Type</span>
                        <span className={`font-bold ${orderType === 'market' ? 'text-blue-400' : 'text-purple-400'}`}>
                          {orderType === 'market' ? 'Market' : 'Limit'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Trading Buttons */}
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => handleTrade('buy')}
                      disabled={!profile || ((orderType === 'limit' && limitPrice ? parseFloat(limitPrice) : selectedContract.price) * contracts * 0.1) > profile.balance}
                      className="group relative bg-gradient-to-r from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-green-500/25 transform hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:transform-none overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-green-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      <div className="relative flex items-center justify-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                        Buy Long
                      </div>
                    </button>
                    <button
                      onClick={() => handleTrade('sell')}
                      disabled={!profile || ((orderType === 'limit' && limitPrice ? parseFloat(limitPrice) : selectedContract.price) * contracts * 0.1) > profile.balance}
                      className="group relative bg-gradient-to-r from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-red-500/25 transform hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:transform-none overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-red-400 to-red-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      <div className="relative flex items-center justify-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                        </svg>
                        Sell Short
                      </div>
                    </button>
                  </div>

                  {/* Risk Warning */}
                  <div className="bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/30 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-orange-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      <div>
                        <div className="text-orange-400 font-semibold text-sm">Risk Warning</div>
                        <div className="text-gray-300 text-xs mt-1">
                          Futures trading involves substantial risk of loss. Only trade with capital you can afford to lose.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Copilot Section - Same as Dashboard */}
      <div className="fixed right-0 top-0 w-[500px] h-screen bg-gradient-to-br from-[#181c2a] via-[#23294a] to-[#1a1d2b] shadow-xl flex flex-col border-l border-gray-700 overflow-y-auto">
        <div className="flex-1 flex flex-col justify-start items-center pt-50">
          <div className="w-full flex flex-col items-center">
            {/* Title */}
            <h1 className="text-6xl font-extrabold bg-gradient-to-r from-green-400 via-blue-400 to-purple-400 bg-clip-text text-transparent mb-6 text-center">CoPilot</h1>
            <p className="text-lg text-gray-200 mb-10 text-center font-medium">Futures trading guidance and analysis</p>
            
            {/* Show suggestions when no messages */}
            {messages.length === 0 ? (
              <div className="w-full max-w-md px-4 space-y-6 mb-8">
                {/* Input Form */}
                <form onSubmit={handleSubmit} className="w-full mb-6">
                  <div className="relative">
                    <textarea
                      ref={textareaRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Ask about futures trading..."
                      className="w-full bg-[#23294a] text-white rounded-xl px-6 py-4 pr-12 focus:outline-none focus:ring-2 focus:ring-green-400 text-lg shadow-lg placeholder-shine resize-none overflow-hidden"
                    />
                    <button 
                      type="submit"
                      disabled={isLoading || !input.trim()}
                      className="absolute right-4 top-1/2 -translate-y-1/2 bg-white text-black p-2 rounded-full hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l7-7 7 7" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19V6" />
                      </svg>
                    </button>
                  </div>
                </form>

                {/* Suggestion Buttons */}
                <div className="w-full grid grid-cols-2 gap-4 mt-6 mb-6">
                  <button
                    onClick={() => setInput("What are the margin requirements for ES futures?")}
                    className="min-h-[80px] p-4 bg-gray-800 hover:bg-gray-700 rounded-xl text-white text-sm transition-all duration-200 border-2 border-blue-500 hover:border-blue-400 text-left shadow-lg"
                  >
                    <div className="font-semibold text-blue-400 mb-2">Margin & Risk</div>
                    <div className="text-xs text-gray-300">What are the margin requirements for ES futures?</div>
                  </button>
                  <button
                    onClick={() => setInput("Explain the difference between commodity and index futures")}
                    className="min-h-[80px] p-4 bg-gray-800 hover:bg-gray-700 rounded-xl text-white text-sm transition-all duration-200 border-2 border-green-500 hover:border-green-400 text-left shadow-lg"
                  >
                    <div className="font-semibold text-green-400 mb-2">Contract Types</div>
                    <div className="text-xs text-gray-300">Explain the difference between commodity and index futures</div>
                  </button>
                  <button
                    onClick={() => setInput("How do I manage risk when trading crude oil futures?")}
                    className="min-h-[80px] p-4 bg-gray-800 hover:bg-gray-700 rounded-xl text-white text-sm transition-all duration-200 border-2 border-purple-500 hover:border-purple-400 text-left shadow-lg"
                  >
                    <div className="font-semibold text-purple-400 mb-2">Risk Management</div>
                    <div className="text-xs text-gray-300">How do I manage risk when trading crude oil futures?</div>
                  </button>
                  <button
                    onClick={() => setInput("What factors affect futures prices?")}
                    className="min-h-[80px] p-4 bg-gray-800 hover:bg-gray-700 rounded-xl text-white text-sm transition-all duration-200 border-2 border-yellow-500 hover:border-yellow-400 text-left shadow-lg"
                  >
                    <div className="font-semibold text-yellow-400 mb-2">Price Factors</div>
                    <div className="text-xs text-gray-300">What factors affect futures prices?</div>
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Chat Messages */}
                <div className="w-full max-w-md flex-1 overflow-y-auto px-4 space-y-4 mb-4">
                  {messages.map((message) => (
                    <div 
                      key={message.id} 
                      className={`${message.role === 'user' ? 'ml-auto' : 'mr-auto'} max-w-[80%] group animate-fade-in`}
                    >
                      <div className={`rounded-xl p-4 ${
                        message.role === 'user' 
                          ? 'bg-gray-700 text-white' 
                          : 'bg-[#23294a] text-white'
                      }`}>
                        <div className="prose prose-invert max-w-none break-words whitespace-pre-wrap">
                          {message.content.split('\n').map((line, i) => (
                            <p key={i} className="mb-2 last:mb-0">{line}</p>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="mr-auto max-w-[80%]">
                      <div className="bg-[#23294a] rounded-xl p-4">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Chat Input */}
                <form onSubmit={handleSubmit} className="w-full max-w-md px-4 mb-4">
                  <div className="relative">
                    <textarea
                      ref={textareaRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Ask about futures..."
                      className="w-full bg-[#23294a] text-white rounded-xl px-6 py-4 pr-12 focus:outline-none focus:ring-2 focus:ring-green-400 text-lg shadow-lg resize-none overflow-hidden"
                      rows={1}
                    />
                    <button 
                      type="submit"
                      disabled={isLoading || !input.trim()}
                      className="absolute right-4 top-1/2 -translate-y-1/2 bg-white text-black p-2 rounded-full hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l7-7 7 7" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19V6" />
                      </svg>
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FuturesPage; 