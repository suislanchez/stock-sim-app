"use client";
import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);
  const [visibleSections, setVisibleSections] = useState<Set<number>>(new Set());
  const [visibleElements, setVisibleElements] = useState<Set<string>>(new Set());
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  const sectionRefs = useRef<(HTMLElement | null)[]>([]);
  const elementRefs = useRef<{ [key: string]: HTMLElement | null }>({});

  useEffect(() => {
    const observers = sectionRefs.current.map((ref, index) => {
      if (!ref) return null;
      
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setVisibleSections(prev => new Set([...prev, index]));
            }
          });
        },
        { threshold: 0.1, rootMargin: "50px" }
      );
      
      observer.observe(ref);
      return observer;
    });

    // Observer for individual elements
    const elementObservers = Object.entries(elementRefs.current).map(([key, ref]) => {
      if (!ref) return null;
      
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setVisibleElements(prev => new Set([...prev, key]));
            }
          });
        },
        { threshold: 0.1, rootMargin: "30px" }
      );
      
      observer.observe(ref);
      return observer;
    });

    return () => {
      observers.forEach(observer => observer?.disconnect());
      elementObservers.forEach(observer => observer?.disconnect());
    };
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`
          }
        });

        if (error) throw error;

        // Show success message for signup
        setError(null);
        setSuccessMessage("Please check your email for the confirmation link to complete your registration.");
        return; // Don't redirect, let user see the success message
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push("/dashboard");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const heroSections = [
    {
      id: "master",
      title: "Learn Trading the Smart Way",
      subtitle: "Built by a UC Berkeley CS student who got tired of expensive, bloated trading simulators. Practice with virtual money, master real strategies, and learn from AI guidance — no ads, no paywalls, no BS.",
      features: [
        {
          icon: (
            <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"></path>
            </svg>
          ),
          title: "30,000+ Assets",
          description: "Trade stocks, ETFs, mutual funds, and crypto. More assets than most paid platforms — completely free.",
          bgColor: "bg-green-500/20"
        },
        {
          icon: (
            <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
            </svg>
          ),
          title: "AI Agent Assistant",
          description: "Execute orders in natural language. Ask questions like 'Summarize today's market sentiment on my top 3 holdings' using realtime search AI LLM APIs including Perplexity Sonar",
          bgColor: "bg-blue-500/20"
        },
        {
          icon: (
            <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
            </svg>
          ),
          title: "Built for Anyone",
          description: "Perfect for students and young adults. Learn by doing, not by reading 30 Investopedia articles.",
          bgColor: "bg-purple-500/20"
        }
      ],
      stats: [
        { value: "30K+", label: "Assets Available" },
        { value: "100%", label: "Free & Open Source" },
        { value: "$0", label: "No Paywalls" }
      ]
    },
    {
      id: "professional",
      title: "Advanced Features, Simple Interface",
      subtitle: "Everything you need to learn professional trading strategies without the complexity and cost of traditional platforms. Run locally or online at simutrader.vercel.app.",
      features: [
        {
          icon: (
            <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
            </svg>
          ),
          title: "Futures & Automated Investing",
          description: "Practice futures trading, and DRIP investing with real-time data from free tier APIs.",
          bgColor: "bg-yellow-500/20"
        },
        {
          icon: (
            <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
            </svg>
          ),
          title: "Smart Risk Management",
          description: "Automated risk tools, portfolio diversification tracking, and live sentiment analysis to keep you informed.",
          bgColor: "bg-red-500/20"
        },
        {
          icon: (
            <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
            </svg>
          ),
          title: "Tax & P&L Simulation",
          description: "Realistic tax calculations, capital gains tracking, and comprehensive P&L analysis for real-world learning.",
          bgColor: "bg-green-500/20"
        }
      ],
      stats: [
        { value: "Free", label: "Trial Period" },
        { value: "$5/mo", label: "Future Premium" },
        { value: "MIT", label: "Open Source License" }
      ]
    },
    {
      id: "learn",
      title: "Why I Built This",
      subtitle: "As a CS student at UC Berkeley, I was frustrated with existing platforms. They're either behind account walls, not beginner-friendly, bloated with pro tools, or just plain ugly. SimuTrader AI is different.",
      features: [
        {
          icon: (
            <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
            </svg>
          ),
          title: "Educational Focus",
          description: "Built-in explanations, learning aids, and AI guidance help you understand strategies, not just click buttons.",
          bgColor: "bg-purple-500/20"
        },
        {
          icon: (
            <svg className="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
            </svg>
          ),
          title: "Natural Language Trading",
          description: "Ask 'Give me 3 recent news headlines about my losing stocks' or execute trades using plain English.",
          bgColor: "bg-indigo-500/20"
        },
        {
          icon: (
            <svg className="w-6 h-6 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
            </svg>
          ),
          title: "Made for You",
          description: "Built for anyone to use worldwide. Own your data locally or use online at simutrader.vercel.app.",
          bgColor: "bg-pink-500/20"
        }
      ],
      stats: [
        { value: "No Ads", label: "Clean Experience" },
        { value: "No BS", label: "Honest Platform" },
        { value: "For You", label: "Beginner Friendly" }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-black font-sans overflow-x-hidden">
      {/* Global Matrix Rain Animation */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-30">
        {/* Matrix-like Code Rain that hits borders */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-[5%] w-[1px] h-full bg-gradient-to-b from-transparent via-blue-500/40 to-blue-500/60 animate-[matrix_2s_linear_infinite]"></div>
          <div className="absolute top-0 left-[15%] w-[1px] h-full bg-gradient-to-b from-transparent via-green-500/40 to-green-500/60 animate-[matrix_2.5s_linear_infinite]"></div>
          <div className="absolute top-0 left-[25%] w-[1px] h-full bg-gradient-to-b from-transparent via-purple-500/40 to-purple-500/60 animate-[matrix_3s_linear_infinite]"></div>
          <div className="absolute top-0 left-[35%] w-[1px] h-full bg-gradient-to-b from-transparent via-yellow-500/40 to-yellow-500/60 animate-[matrix_1.5s_linear_infinite]"></div>
          <div className="absolute top-0 left-[45%] w-[1px] h-full bg-gradient-to-b from-transparent via-red-500/40 to-red-500/60 animate-[matrix_2.2s_linear_infinite]"></div>
          <div className="absolute top-0 left-[55%] w-[1px] h-full bg-gradient-to-b from-transparent via-indigo-500/40 to-indigo-500/60 animate-[matrix_2.8s_linear_infinite]"></div>
          <div className="absolute top-0 left-[65%] w-[1px] h-full bg-gradient-to-b from-transparent via-pink-500/40 to-pink-500/60 animate-[matrix_1.8s_linear_infinite]"></div>
          <div className="absolute top-0 left-[75%] w-[1px] h-full bg-gradient-to-b from-transparent via-teal-500/40 to-teal-500/60 animate-[matrix_2.6s_linear_infinite]"></div>
          <div className="absolute top-0 left-[85%] w-[1px] h-full bg-gradient-to-b from-transparent via-orange-500/40 to-orange-500/60 animate-[matrix_3.2s_linear_infinite]"></div>
          <div className="absolute top-0 left-[95%] w-[1px] h-full bg-gradient-to-b from-transparent via-cyan-500/40 to-cyan-500/60 animate-[matrix_2.4s_linear_infinite]"></div>
          
          {/* Right edge matrix */}
          <div className="absolute top-0 right-[5%] w-[1px] h-full bg-gradient-to-b from-transparent via-blue-500/40 to-blue-500/60 animate-[matrix_2.7s_linear_infinite]"></div>
          <div className="absolute top-0 right-[15%] w-[1px] h-full bg-gradient-to-b from-transparent via-green-500/40 to-green-500/60 animate-[matrix_1.9s_linear_infinite]"></div>
          
          {/* Horizontal matrix lines */}
          <div className="absolute left-0 top-[10%] w-full h-[1px] bg-gradient-to-r from-blue-500/60 via-transparent to-blue-500/60 animate-[matrixHorizontal_4s_linear_infinite]"></div>
          <div className="absolute left-0 top-[30%] w-full h-[1px] bg-gradient-to-r from-green-500/60 via-transparent to-green-500/60 animate-[matrixHorizontal_5s_linear_infinite]"></div>
          <div className="absolute left-0 top-[50%] w-full h-[1px] bg-gradient-to-r from-purple-500/60 via-transparent to-purple-500/60 animate-[matrixHorizontal_3.5s_linear_infinite]"></div>
          <div className="absolute left-0 top-[70%] w-full h-[1px] bg-gradient-to-r from-yellow-500/60 via-transparent to-yellow-500/60 animate-[matrixHorizontal_4.5s_linear_infinite]"></div>
          <div className="absolute left-0 top-[90%] w-full h-[1px] bg-gradient-to-r from-red-500/60 via-transparent to-red-500/60 animate-[matrixHorizontal_3.8s_linear_infinite]"></div>
        </div>

        {/* Matrix corner connections */}
        <div className="absolute top-0 left-0 w-8 h-8 border-l-2 border-t-2 border-blue-500/60 animate-pulse"></div>
        <div className="absolute top-0 right-0 w-8 h-8 border-r-2 border-t-2 border-green-500/60 animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-8 h-8 border-l-2 border-b-2 border-purple-500/60 animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-8 h-8 border-r-2 border-b-2 border-yellow-500/60 animate-pulse"></div>

        {/* Digital circuit patterns hitting borders */}
        <div className="absolute inset-0">
          <div className="absolute top-[20%] left-0 w-12 h-12 border border-blue-500/40 rounded-sm animate-[pulseGlow_4s_ease-in-out_infinite]"></div>
          <div className="absolute top-[40%] right-0 w-8 h-8 border border-green-500/40 rounded-sm animate-[pulseGlow_5s_ease-in-out_infinite]"></div>
          <div className="absolute top-[60%] left-0 w-10 h-10 border border-purple-500/40 rounded-sm animate-[pulseGlow_3s_ease-in-out_infinite]"></div>
          <div className="absolute top-[80%] right-0 w-6 h-6 border border-yellow-500/40 rounded-sm animate-[pulseGlow_4.5s_ease-in-out_infinite]"></div>
        </div>
      </div>

      {/* Hero Section with Login */}
      <section className="min-h-screen relative flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 z-10">
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
          </div>

          {/* Floating Elements */}
          <div className="absolute inset-0">
            <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-blue-500/40 rounded-full animate-[float_4s_ease-in-out_infinite]"></div>
            <div className="absolute top-1/3 right-1/4 w-3 h-3 bg-green-500/40 rounded-full animate-[float_5s_ease-in-out_infinite]"></div>
            <div className="absolute bottom-1/4 left-1/3 w-2 h-2 bg-purple-500/40 rounded-full animate-[float_3s_ease-in-out_infinite]"></div>
            <div className="absolute top-2/3 right-1/3 w-3 h-3 bg-blue-500/40 rounded-full animate-[float_4.5s_ease-in-out_infinite]"></div>
          </div>

          {/* Stock Symbols */}
          <div className="absolute inset-0 opacity-15">
            <div className="absolute top-[10%] left-[15%] text-[8px] text-blue-500/20 animate-[float_4s_ease-in-out_infinite]">AAPL</div>
            <div className="absolute top-[20%] right-[20%] text-[8px] text-green-500/20 animate-[float_5s_ease-in-out_infinite]">MSFT</div>
            <div className="absolute top-[40%] left-[25%] text-[8px] text-purple-500/20 animate-[float_3s_ease-in-out_infinite]">GOOGL</div>
            <div className="absolute top-[60%] right-[15%] text-[8px] text-yellow-500/20 animate-[float_4.5s_ease-in-out_infinite]">AMZN</div>
            <div className="absolute top-[80%] left-[30%] text-[8px] text-red-500/20 animate-[float_3.5s_ease-in-out_infinite]">TSLA</div>
          </div>
        </div>

        {/* Content */}
        <div className="relative z-10 w-full max-w-md mx-auto text-center">
          {/* Logo and Title - Animated */}
          <div className="mb-8 animate-[fadeInUp_1s_ease-out]">
            <div className="flex items-center justify-center mb-6">
              <img src="/logo.png" alt="SimuTrader Logo" className="w-20 h-20 rounded-full" />
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-white via-gray-200 to-gray-300 bg-clip-text text-transparent mb-4">
              SimuTrader AI
            </h1>
            <p className="text-gray-400 text-lg mb-2">Learn Trading Without the BS</p>
            <p className="text-gray-500 text-sm">Free AI-powered simulator built by students, for students</p>
          </div>

          {/* Login Form - Animated */}
          <div className="bg-gray-900/95 backdrop-blur-sm border border-gray-800/50 rounded-lg p-6 sm:p-8 relative overflow-hidden animate-[fadeInUp_1s_ease-out_0.3s_both]">
            {/* Border Animation */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-blue-500/60 to-transparent animate-[scan_2s_linear_infinite]"></div>
              <div className="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-purple-500/60 to-transparent animate-[scan_2.5s_linear_infinite]"></div>
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

              {successMessage && (
                <div className="bg-green-900/50 border border-green-700/50 rounded-lg p-3">
                  <p className="text-green-400 text-sm">{successMessage}</p>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-gray-300 font-medium mb-2 text-sm">
                    Email Address
                  </label>
                  <input
                    type="email"
                    className="w-full bg-gray-800/80 border border-gray-700/50 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
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
                    className="w-full bg-gray-800/80 border border-gray-700/50 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
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

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-[fadeInUp_1s_ease-out_0.6s_both]">
          <div className="flex flex-col items-center text-gray-400">
            <p className="text-sm mb-2">Scroll to explore features</p>
            <svg className="w-6 h-6 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
            </svg>
          </div>
        </div>
      </section>

      {/* Feature Sections */}
      {heroSections.map((section, sectionIndex) => (
        <section
          key={section.id}
          ref={(el) => {sectionRefs.current[sectionIndex] = el}}
          className="min-h-screen relative flex flex-col justify-center px-4 sm:px-6 lg:px-8 py-20 z-10"
        >
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-purple-900/20 to-gray-900/40"></div>
          
          {/* Animated background elements */}
          <div className="absolute inset-0">
            <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
          </div>

          <div className="relative z-10 max-w-4xl mx-auto w-full">
            {/* Section Header */}
            <div 
              ref={(el) => {elementRefs.current[`header-${sectionIndex}`] = el}}
              className={`text-center mb-16 transition-all duration-1000 ease-out ${
                visibleElements.has(`header-${sectionIndex}`)
                  ? 'opacity-100 transform translate-y-0'
                  : 'opacity-0 transform translate-y-12'
              }`}
            >
              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
                {section.title}
              </h2>
              <p className="text-xl text-gray-300 mb-8 leading-relaxed max-w-3xl mx-auto">
                {section.subtitle}
              </p>
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
              {section.features.map((feature, index) => (
                <div
                  key={index}
                  ref={(el) => {elementRefs.current[`feature-${sectionIndex}-${index}`] = el}}
                  className={`bg-gray-800/30 backdrop-blur-sm rounded-lg p-6 border border-gray-700/30 transition-all duration-700 ease-out ${
                    visibleElements.has(`feature-${sectionIndex}-${index}`)
                      ? 'opacity-100 transform translate-y-0 scale-100'
                      : 'opacity-0 transform translate-y-12 scale-95'
                  }`}
                  style={{ 
                    transitionDelay: visibleElements.has(`feature-${sectionIndex}-${index}`) ? `${index * 150}ms` : '0ms'
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

            {/* Stats Section */}
            <div 
              ref={(el) => {elementRefs.current[`stats-${sectionIndex}`] = el}}
              className={`grid grid-cols-3 gap-8 transition-all duration-1000 ease-out ${
                visibleElements.has(`stats-${sectionIndex}`)
                  ? 'opacity-100 transform translate-y-0'
                  : 'opacity-0 transform translate-y-12'
              }`}
              style={{ 
                transitionDelay: visibleElements.has(`stats-${sectionIndex}`) ? '400ms' : '0ms'
              }}
            >
              {section.stats.map((stat, index) => (
                <div
                  key={index}
                  className="text-center"
                >
                  <div className="text-3xl sm:text-4xl font-bold text-white mb-2">{stat.value}</div>
                  <div className="text-gray-400 text-sm">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      ))}

      {/* Final CTA Section */}
      <section 
        ref={(el) => {sectionRefs.current[heroSections.length] = el}}
        className="min-h-screen relative flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 z-10"
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black via-gray-900/50 to-transparent"></div>
        
        <div 
          ref={(el) => {elementRefs.current['cta-main'] = el}}
          className={`relative z-10 text-center max-w-2xl mx-auto transition-all duration-1000 ease-out ${
            visibleElements.has('cta-main')
              ? 'opacity-100 transform translate-y-0 scale-100'
              : 'opacity-0 transform translate-y-12 scale-95'
          }`}
        >
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6">
            Ready to Start Learning?
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            Join thousands of students mastering trading with no ads, no paywalls, no BS. Built by a UC Berkeley CS student who believes financial education should be accessible to everyone.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-8 rounded-lg transition-colors duration-200 text-lg transform hover:scale-105"
            >
              Start Free Trial
            </button>
            <a 
              href="https://github.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="bg-gray-800 hover:bg-gray-700 text-white font-semibold py-4 px-8 rounded-lg transition-colors duration-200 text-lg transform hover:scale-105 border border-gray-600"
            >
              View on GitHub
            </a>
          </div>
          <p className="text-gray-400 text-sm mt-4">
            Free trial • No credit card required • Open source forever
          </p>
        </div>

        {/* Additional Features List - Scroll triggered */}
        <div 
          ref={(el) => {elementRefs.current['additional-features'] = el}}
          className={`relative z-10 mt-16 max-w-4xl mx-auto transition-all duration-1000 ease-out ${
            visibleElements.has('additional-features')
              ? 'opacity-100 transform translate-y-0'
              : 'opacity-0 transform translate-y-12'
          }`}
          style={{ 
            transitionDelay: visibleElements.has('additional-features') ? '300ms' : '0ms'
          }}
        >
          <h3 className="text-2xl font-semibold text-white mb-6 text-center">Why Choose SimuTrader AI?</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              "Free-tier APIs (Alpha Vantage, CoinGecko)",
              "Natural language trade execution", 
              "Live sentiment analysis",
              "Real-time news integration",
              "Tax simulation & P&L tracking",
              "Portfolio diversification tools",
              "Built-in learning explanations",
              "Run locally or online"
            ].map((feature, index) => {
              const colors = ['green', 'blue', 'purple', 'orange', 'pink', 'yellow', 'red', 'indigo'];
              const color = colors[index % colors.length];
              return (
                <div 
                  key={index}
                  ref={(el) => {elementRefs.current[`additional-${index}`] = el}}
                  className={`flex items-center space-x-3 transition-all duration-500 ease-out ${
                    visibleElements.has(`additional-${index}`)
                      ? 'opacity-100 transform translate-x-0'
                      : 'opacity-0 transform translate-x-8'
                  }`}
                  style={{ 
                    transitionDelay: visibleElements.has(`additional-${index}`) ? `${600 + (index * 100)}ms` : '0ms' 
                  }}
                >
                  <div className={`w-2 h-2 bg-${color}-400 rounded-full`}></div>
                  <span className="text-gray-300 text-sm">{feature}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <style jsx>{`
        @keyframes scan {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }

        @keyframes float {
          0%, 100% { transform: translateY(0) translateX(0); }
          50% { transform: translateY(-20px) translateX(10px); }
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes pulse {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.1); }
        }

        @keyframes matrix {
          0% { transform: translateY(-100%); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(100vh); opacity: 0; }
        }

        @keyframes matrixHorizontal {
          0% { transform: translateX(-100%); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateX(100vw); opacity: 0; }
        }

        @keyframes pulseGlow {
          0%, 100% { 
            opacity: 0.2; 
            transform: scale(1);
            box-shadow: 0 0 0 rgba(59, 130, 246, 0);
          }
          50% { 
            opacity: 0.6; 
            transform: scale(1.1);
            box-shadow: 0 0 20px rgba(59, 130, 246, 0.5);
          }
        }
      `}</style>
    </div>
  );
}