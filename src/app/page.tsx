"use client";
import React, { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);
  const [currentSection, setCurrentSection] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error } = isSignUp
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password });

      if (error) throw error;

      if (isSignUp && data.user) {
        // Create a profile for new users
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([
            {
              id: data.user.id,
              email: data.user.email,
              balance: 10000.00 // Starting balance
            }
          ]);

        if (profileError) throw profileError;
      }

      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const heroSections = [
    {
      title: "Master the Market",
      subtitle: "Practice trading with virtual money. Learn strategies, analyze trends, and build confidence before investing real capital. Join thousands of traders who started their journey with SimuTrader AI.",
      features: [
        {
          icon: (
            <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"></path>
            </svg>
          ),
          title: "30,000+ Assets",
          description: "Trade stocks, ETFs, mutual funds, and 2,000+ cryptocurrencies with real-time data.",
          bgColor: "bg-green-500/20"
        },
        {
          icon: (
            <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
            </svg>
          ),
          title: "AI-Powered Insights",
          description: "Integrated RAG system using GPT-4o and Claude 3.5 for natural language queries and trade execution.",
          bgColor: "bg-blue-500/20"
        },
        {
          icon: (
            <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
            </svg>
          ),
          title: "Advanced Analytics",
          description: "Live sentiment analysis, news insights, and comprehensive portfolio metrics.",
          bgColor: "bg-purple-500/20"
        },
        {
          icon: (
            <svg className="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
            </svg>
          ),
          title: "Local & Private",
          description: "Runs entirely on your machine with local data storage and multi-user support.",
          bgColor: "bg-orange-500/20"
        }
      ],
      additionalFeatures: [
        "Futures trading simulation",
        "Crypto wallet tracking",
        "DRIP investing support",
        "Automated risk management",
        "Tax-aware portfolio logic",
        "Real-time market data",
        "Multi-user local support",
        "Free API integration"
      ],
      stats: [
        { value: "30K+", label: "Tradable Assets" },
        { value: "2K+", label: "Cryptocurrencies" },
        { value: "100%", label: "Local & Free" }
      ]
    },
    {
      title: "Professional Trading",
      subtitle: "Access advanced trading features including futures contracts, automated risk management, and comprehensive tax reporting. Trade like a professional with institutional-grade tools.",
      features: [
        {
          icon: (
            <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
            </svg>
          ),
          title: "Futures Trading",
          description: "Trade commodity, currency, and index futures with real-time margin calculations.",
          bgColor: "bg-yellow-500/20"
        },
        {
          icon: (
            <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
            </svg>
          ),
          title: "Risk Management",
          description: "Automated stop-losses, portfolio rebalancing, and diversification metrics.",
          bgColor: "bg-red-500/20"
        },
        {
          icon: (
            <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
            </svg>
          ),
          title: "Tax Logic",
          description: "Realistic tax calculations, P&L tracking, and capital gains simulation.",
          bgColor: "bg-green-500/20"
        },
        {
          icon: (
            <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
            </svg>
          ),
          title: "Market Insights",
          description: "Live sentiment analysis and news insights for individual equities and sectors.",
          bgColor: "bg-blue-500/20"
        }
      ],
      additionalFeatures: [
        "Portfolio diversification tools",
        "Risk assessment metrics",
        "Market sentiment analysis",
        "Crypto portfolio tracking",
        "DRIP investment simulation",
        "Tax-loss harvesting",
        "Multi-user support",
        "Local data storage"
      ],
      stats: [
        { value: "24/7", label: "Market Access" },
        { value: "100%", label: "Local Data" },
        { value: "0%", label: "Ads & Paywalls" }
      ]
    },
    {
      title: "Learn While Trading",
      subtitle: "Built-in educational features help you understand trading concepts, market dynamics, and investment strategies. Learn through hands-on experience with real market data.",
      features: [
        {
          icon: (
            <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
            </svg>
          ),
          title: "Info Bubbles",
          description: "Learn about trading terms and concepts with built-in explanations and examples.",
          bgColor: "bg-purple-500/20"
        },
        {
          icon: (
            <svg className="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
            </svg>
          ),
          title: "AI Guidance",
          description: "Get help understanding trading strategies and risk management from CoPilot.",
          bgColor: "bg-indigo-500/20"
        },
        {
          icon: (
            <svg className="w-6 h-6 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
            </svg>
          ),
          title: "Multi-User",
          description: "Multiple users can manage their own portfolios on the same machine.",
          bgColor: "bg-pink-500/20"
        },
        {
          icon: (
            <svg className="w-6 h-6 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
            </svg>
          ),
          title: "Free APIs",
          description: "Uses free-tier API services like Alpha Vantage, CoinGecko, and more",
          bgColor: "bg-teal-500/20"
        }
      ],
      additionalFeatures: [
        "Built-in term explanations",
        "Real-time market data",
        "Portfolio analytics",
        "Risk management tools",
        "Tax calculation guides",
        "Market news integration",
        "Local data storage",
        "Open source code"
      ],
      stats: [
        { value: "100%", label: "Free & Open" },
        { value: "0%", label: "Ads" },
        { value: "MIT", label: "License" }
      ]
    }
  ];

  const nextSection = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setAnimationKey(prev => prev + 1);
    setCurrentSection((prev) => (prev + 1) % heroSections.length);
    setTimeout(() => setIsAnimating(false), 100);
  };

  const prevSection = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setAnimationKey(prev => prev + 1);
    setCurrentSection((prev) => (prev - 1 + heroSections.length) % heroSections.length);
    setTimeout(() => setIsAnimating(false), 100);
  };

  const goToSection = (index: number) => {
    if (isAnimating || index === currentSection) return;
    setIsAnimating(true);
    setAnimationKey(prev => prev + 1);
    setCurrentSection(index);
    setTimeout(() => setIsAnimating(false), 100);
  };

  const currentHero = heroSections[currentSection];

  return (
    <div className="flex min-h-screen bg-black font-sans">
      {/* Left side - Login Form */}
      <div className="w-[35%] flex items-center justify-center p-8 relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 bg-black">
          {/* Grid Pattern */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px]"></div>
          </div>
          
          {/* Animated Lines */}
          <div className="absolute inset-0">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-blue-500/60 to-transparent animate-[scan_2s_linear_infinite]"></div>
            <div className="absolute top-1/4 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-green-500/60 to-transparent animate-[scan_3s_linear_infinite]"></div>
            <div className="absolute top-2/4 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-purple-500/60 to-transparent animate-[scan_2.5s_linear_infinite]"></div>
            <div className="absolute top-3/4 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-blue-500/60 to-transparent animate-[scan_1.5s_linear_infinite]"></div>
            <div className="absolute top-1/3 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-yellow-500/60 to-transparent animate-[scan_4s_linear_infinite]"></div>
            <div className="absolute top-2/3 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-red-500/60 to-transparent animate-[scan_3.5s_linear_infinite]"></div>
          </div>

          {/* Floating Elements */}
          <div className="absolute inset-0">
            <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-blue-500/40 rounded-full animate-[float_4s_ease-in-out_infinite]"></div>
            <div className="absolute top-1/3 right-1/4 w-3 h-3 bg-green-500/40 rounded-full animate-[float_5s_ease-in-out_infinite]"></div>
            <div className="absolute bottom-1/4 left-1/3 w-2 h-2 bg-purple-500/40 rounded-full animate-[float_3s_ease-in-out_infinite]"></div>
            <div className="absolute top-2/3 right-1/3 w-3 h-3 bg-blue-500/40 rounded-full animate-[float_4.5s_ease-in-out_infinite]"></div>
            <div className="absolute top-1/2 left-1/2 w-4 h-4 bg-yellow-500/40 rounded-full animate-[float_6s_ease-in-out_infinite]"></div>
            <div className="absolute bottom-1/3 right-1/2 w-2 h-2 bg-red-500/40 rounded-full animate-[float_3.5s_ease-in-out_infinite]"></div>
          </div>

          {/* Matrix-like Code Rain */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 left-1/4 w-[1px] h-full bg-gradient-to-b from-transparent via-blue-500/40 to-transparent animate-[matrix_2s_linear_infinite]"></div>
            <div className="absolute top-0 left-1/2 w-[1px] h-full bg-gradient-to-b from-transparent via-green-500/40 to-transparent animate-[matrix_2.5s_linear_infinite]"></div>
            <div className="absolute top-0 right-1/4 w-[1px] h-full bg-gradient-to-b from-transparent via-purple-500/40 to-transparent animate-[matrix_3s_linear_infinite]"></div>
            <div className="absolute top-0 left-1/6 w-[1px] h-full bg-gradient-to-b from-transparent via-yellow-500/40 to-transparent animate-[matrix_1.5s_linear_infinite]"></div>
            <div className="absolute top-0 right-1/6 w-[1px] h-full bg-gradient-to-b from-transparent via-red-500/40 to-transparent animate-[matrix_2.2s_linear_infinite]"></div>
          </div>

          {/* Stock Symbols */}
          <div className="absolute inset-0 opacity-15">
            <div className="absolute top-[10%] left-[15%] text-[8px] text-blue-500/20 animate-[float_4s_ease-in-out_infinite]">AAPL</div>
            <div className="absolute top-[20%] right-[20%] text-[8px] text-green-500/20 animate-[float_5s_ease-in-out_infinite]">MSFT</div>
            <div className="absolute top-[40%] left-[25%] text-[8px] text-purple-500/20 animate-[float_3s_ease-in-out_infinite]">GOOGL</div>
            <div className="absolute top-[60%] right-[15%] text-[8px] text-yellow-500/20 animate-[float_4.5s_ease-in-out_infinite]">AMZN</div>
            <div className="absolute top-[80%] left-[30%] text-[8px] text-red-500/20 animate-[float_3.5s_ease-in-out_infinite]">TSLA</div>
            <div className="absolute top-[30%] right-[30%] text-[8px] text-blue-500/20 animate-[float_6s_ease-in-out_infinite]">META</div>
          </div>

          {/* Digital Circuit Pattern */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-[20%] left-[10%] w-8 h-8 border border-blue-500/40 rounded-sm animate-[pulse_4s_ease-in-out_infinite]"></div>
            <div className="absolute top-[40%] right-[15%] w-6 h-6 border border-green-500/40 rounded-sm animate-[pulse_5s_ease-in-out_infinite]"></div>
            <div className="absolute top-[60%] left-[20%] w-10 h-10 border border-purple-500/40 rounded-sm animate-[pulse_3s_ease-in-out_infinite]"></div>
            <div className="absolute top-[80%] right-[25%] w-8 h-8 border border-yellow-500/40 rounded-sm animate-[pulse_4.5s_ease-in-out_infinite]"></div>
          </div>

          {/* Connection Lines */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-[20%] left-[10%] w-[100px] h-[1px] bg-gradient-to-r from-blue-500/40 to-transparent transform rotate-45"></div>
            <div className="absolute top-[40%] right-[15%] w-[80px] h-[1px] bg-gradient-to-l from-green-500/40 to-transparent transform -rotate-45"></div>
            <div className="absolute top-[60%] left-[20%] w-[120px] h-[1px] bg-gradient-to-r from-purple-500/40 to-transparent transform rotate-30"></div>
            <div className="absolute top-[80%] right-[25%] w-[90px] h-[1px] bg-gradient-to-l from-yellow-500/40 to-transparent transform -rotate-30"></div>
          </div>
        </div>

        <div className="w-full max-w-sm relative z-10">
          <div className="bg-gray-900/95 backdrop-blur-sm border border-gray-800/50 rounded-lg p-8 relative overflow-hidden">
            {/* Border Animation */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-blue-500/60 to-transparent animate-[scan_2s_linear_infinite]"></div>
              <div className="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-purple-500/60 to-transparent animate-[scan_2.5s_linear_infinite]"></div>
            </div>

            {/* Logo and Title */}
            <div className="text-center mb-8">
              <div className="flex items-center justify-center mb-4">
                <img src="/logo.png" alt="SimuTrader Logo" className="w-16 h-16 rounded-full" />
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-gray-200 to-gray-300 bg-clip-text text-transparent mb-2">
                SimuTrader
              </h1>
              <p className="text-gray-400 text-sm">Welcome to the future of stock trading simulation</p>
            </div>

            <form onSubmit={handleAuth} className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-semibold text-white">
                  {isSignUp ? "Create Account" : "Welcome Back"}
                </h2>
                <p className="text-gray-400 mt-2">
                  {isSignUp ? "Start your trading journey today" : "Sign in to your account"}
                </p>
              </div>

              {error && (
                <div className="bg-red-900/50 border border-red-700/50 rounded-lg p-3">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-gray-300 font-medium mb-2 text-sm">
                    Email Address
                  </label>
          <input
            type="email"
                    className="w-full bg-gray-800/80 border border-gray-700/50 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-gray-600/50 focus:ring-1 focus:ring-gray-600/50 transition-all"
                    placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

                <div>
                  <label className="block text-gray-300 font-medium mb-2 text-sm">
                    Password
                  </label>
          <input
            type="password"
                    className="w-full bg-gray-800/80 border border-gray-700/50 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-gray-600/50 focus:ring-1 focus:ring-gray-600/50 transition-all"
                    placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
                </div>
        </div>

        <button
          type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {isSignUp ? "Creating Account..." : "Signing In..."}
                  </div>
                ) : (
                  isSignUp ? "Create Account" : "Sign In"
                )}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  className="text-gray-400 hover:text-white text-sm transition-colors duration-200"
                  onClick={() => setIsSignUp(!isSignUp)}
                >
                  {isSignUp
                    ? "Already have an account? Sign in"
                    : "Don't have an account? Sign up"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Right side - Hero Section */}
      <div className="w-[65%] relative overflow-hidden">
        {/* Navigation Arrows */}
        <button
          onClick={prevSection}
          className="absolute left-4 top-1/2 transform -translate-y-1/2  z-30 bg-gray-800/80 hover:bg-gray-700/80 backdrop-blur-sm border border-gray-600/50 rounded-full p-3 transition-all duration-200 group"
        >
          <svg className="w-6 h-6 text-gray-300 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
          </svg>
        </button>

        <button
          onClick={nextSection}
          className="absolute right-4 top-1/2 transform -translate-y-1/2 z-30 bg-gray-800/80 hover:bg-gray-700/80 backdrop-blur-sm border border-gray-600/50 rounded-full p-3 transition-all duration-200 group"
        >
          <svg className="w-6 h-6 text-gray-300 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
          </svg>
        </button>

        {/* Section Indicators */}
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-30 flex space-x-2">
          {heroSections.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSection(index)}
              className={`w-3 h-3 rounded-full transition-all duration-200 ${
                index === currentSection ? 'bg-white' : 'bg-gray-500 hover:bg-gray-400'
              }`}
            />
          ))}
        </div>

        {/* Progressive blur overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/20 to-transparent z-10"></div>
        
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-purple-900/20 to-gray-900/40"></div>
        
        {/* Animated background elements */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-green-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '4s' }}></div>
        </div>

        {/* Main Content */}
        <div className="relative z-20 h-full flex flex-col justify-center items-center p-12">
          <div className="max-w-2xl w-full">
            <div 
              key={`header-${animationKey}`}
              className={`mb-12 transition-all duration-500 ease-out text-center ${
                isAnimating 
                  ? 'opacity-0 blur-sm transform translate-y-8' 
                  : 'opacity-100 blur-0 transform translate-y-0'
              }`}
              style={{ transitionDelay: isAnimating ? '0ms' : '100ms' }}
            >
              <h2 className="text-6xl font-bold text-white mb-6 leading-tight">
                {currentHero.title}
              </h2>
              <p className="text-xl text-gray-300 mb-8 leading-relaxed">
                {currentHero.subtitle}
              </p>
            </div>

            {/* Feature Grid */}
            <div 
              key={`features-${animationKey}`}
              className={`grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12 transition-all duration-700 ease-out ${
                isAnimating 
                  ? 'opacity-0 blur-sm transform translate-y-12' 
                  : 'opacity-100 blur-0 transform translate-y-0'
              }`}
              style={{ transitionDelay: isAnimating ? '0ms' : '100ms' }}
            >
              {currentHero.features.map((feature, index) => (
                <div 
                  key={`feature-${index}-${animationKey}`}
                  className={`bg-gray-800/30 backdrop-blur-sm rounded-lg p-6 border border-gray-700/30 transition-all duration-700 ease-out ${
                    isAnimating 
                      ? 'opacity-0 blur-sm transform translate-y-8 scale-95' 
                      : 'opacity-100 blur-0 transform translate-y-0 scale-100'
                  }`}
                  style={{ 
                    transitionDelay: isAnimating ? '0ms' : `${200 + (index * 150)}ms`
                  }}
                >
                  <div className={`w-12 h-12 ${feature.bgColor} rounded-lg flex items-center justify-center mb-4`}>
                    {feature.icon}
                  </div>
                  <h3 className="text-white font-semibold text-lg mb-2">{feature.title}</h3>
                  <p className="text-gray-400 text-sm">{feature.description}</p>
                </div>
              ))}
            </div>

            {/* Additional Features List */}
            <div 
              key={`additional-${animationKey}`}
              className={`space-y-4 transition-all duration-600 ease-out ${
                isAnimating 
                  ? 'opacity-0 blur-sm transform translate-y-10' 
                  : 'opacity-100 blur-0 transform translate-y-0'
              }`}
              style={{ transitionDelay: isAnimating ? '0ms' : '400ms' }}
            >
              <h3 className="text-2xl font-semibold text-white mb-6">Everything You Need to Succeed</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentHero.additionalFeatures.map((feature, index) => {
                  const colors = ['green', 'blue', 'purple', 'orange', 'pink', 'yellow', 'red', 'indigo'];
                  const color = colors[index % colors.length];
                  return (
                    <div 
                      key={`additional-feature-${index}-${animationKey}`}
                      className={`flex items-center space-x-3 transition-all duration-400 ease-out ${
                        isAnimating 
                          ? 'opacity-0 blur-sm transform translate-x-4' 
                          : 'opacity-100 blur-0 transform translate-x-0'
                      }`}
                      style={{ 
                        transitionDelay: isAnimating ? '0ms' : `${800 + (index * 50)}ms` 
                      }}
                    >
                      <div className={`w-2 h-2 bg-${color}-400 rounded-full`}></div>
                      <span className="text-gray-300">{feature}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Stats Section */}
            <div 
              key={`stats-${animationKey}`}
              className={`mt-12 grid grid-cols-3 gap-8 transition-all duration-600 ease-out ${
                isAnimating 
                  ? 'opacity-0 blur-sm transform translate-y-8' 
                  : 'opacity-100 blur-0 transform translate-y-0'
              }`}
              style={{ transitionDelay: isAnimating ? '0ms' : '600ms' }}
            >
              {currentHero.stats.map((stat, index) => (
                <div 
                  key={`stat-${index}-${animationKey}`}
                  className={`text-center transition-all duration-500 ease-out ${
                    isAnimating 
                      ? 'opacity-0 blur-sm transform translate-y-6 scale-90' 
                      : 'opacity-100 blur-0 transform translate-y-0 scale-100'
                  }`}
                  style={{ 
                    transitionDelay: isAnimating ? '0ms' : `${1300 + (index * 100)}ms` 
                  }}
                >
                  <div className="text-3xl font-bold text-white mb-2">{stat.value}</div>
                  <div className="text-gray-400 text-sm">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Add these keyframes at the end of the file, before the last closing brace
const keyframes = `
@keyframes scan {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

@keyframes float {
  0%, 100% { transform: translateY(0) translateX(0); }
  50% { transform: translateY(-20px) translateX(10px); }
}

@keyframes matrix {
  0% { transform: translateY(-100%); }
  100% { transform: translateY(100%); }
}

@keyframes pulse {
  0%, 100% { opacity: 0.2; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(1.1); }
}
`;

// Add the style tag to the head
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = keyframes;
  document.head.appendChild(style);
}