"use client";
import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Profile {
  id: string;
  email: string;
  balance: number;
}

interface NewsItem {
  title: string;
  summary: string;
  url: string;
  sentiment: 'bullish' | 'somewhat_bullish' | 'neutral' | 'somewhat_bearish' | 'bearish';
  tickers: string[];
  topics: string[];
  source: string;
  time: string;
  image?: string;
  author?: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  id: string;
  sources?: Array<{
    name: string;
    url: string;
  }>;
}

// Add CSS animations
const styles = `
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

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

.animate-slideUp {
  animation: slideUp 0.6s ease-out;
}

.animate-fadeIn {
  animation: fadeIn 0.5s ease-out;
}

.animate-shimmer {
  animation: shimmer 2s linear infinite;
}

.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

.animate-blink {
  animation: blink 1s step-end infinite;
}

.glass-effect {
  backdrop-filter: blur(16px);
  background: rgba(17, 24, 39, 0.8);
  border: 1px solid rgba(75, 85, 99, 0.3);
}

.news-gradient {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.gradient-border {
  background: linear-gradient(90deg, #667eea, #764ba2, #f093fb, #f5576c);
  background-size: 400% 400%;
  animation: gradient 3s ease infinite;
}

@keyframes gradient {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}

.sentiment-bullish {
  background: linear-gradient(135deg, #10B981, #059669);
}

.sentiment-bearish {
  background: linear-gradient(135deg, #EF4444, #DC2626);
}

.sentiment-neutral {
  background: linear-gradient(135deg, #6B7280, #4B5563);
}
`;

const sentimentColors = {
  bullish: 'bg-green-900/50 text-green-400 border-green-500',
  somewhat_bullish: 'bg-green-800/50 text-green-300 border-green-400',
  neutral: 'bg-gray-800/50 text-gray-300 border-gray-400',
  somewhat_bearish: 'bg-red-800/50 text-red-300 border-red-400',
  bearish: 'bg-red-900/50 text-red-400 border-red-500'
} as const;

const sentimentLabels = {
  bullish: 'Bullish',
  somewhat_bullish: 'Somewhat Bullish',
  neutral: 'Neutral',
  somewhat_bearish: 'Somewhat Bearish',
  bearish: 'Bearish'
} as const;

export default function NewsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('general');
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredNews, setFilteredNews] = useState<NewsItem[]>([]);
  
  // CoPilot states
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Hi! I\'m your SimuTrader News CoPilot. Ask me about any news article or market trends!',
      id: 'welcome'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  let messageIdCounter = 0;

  const categories = [
    { key: 'general', label: 'General Market', topics: ['market', 'economy', 'finance'] },
    { key: 'technology', label: 'Technology', topics: ['technology', 'innovation', 'digital'] },
    { key: 'energy', label: 'Energy', topics: ['energy', 'oil', 'renewable'] },
    { key: 'healthcare', label: 'Healthcare', topics: ['healthcare', 'pharmaceutical', 'biotech'] },
    { key: 'financial', label: 'Financial Services', topics: ['banking', 'fintech', 'insurance'] },
    { key: 'crypto', label: 'Cryptocurrency', topics: ['blockchain', 'cryptocurrency', 'bitcoin'] }
  ];

  // Generate unique message IDs
  const generateMessageId = () => {
    messageIdCounter += 1;
    return `${Date.now()}_${messageIdCounter}_${Math.random().toString(36).substr(2, 9)}`;
  };

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingMessage]);

  // Load user session & profile
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

  // Inject styles
  useEffect(() => {
    const styleSheet = document.createElement("style");
    styleSheet.innerText = styles;
    document.head.appendChild(styleSheet);
    
    return () => {
      document.head.removeChild(styleSheet);
    };
  }, []);

  // Fetch news based on category
  useEffect(() => {
    if (!profile?.id) return;

    const fetchNews = async () => {
      setNewsLoading(true);
      try {
        const category = categories.find(cat => cat.key === selectedCategory);
        const topics = category?.topics.join(',') || 'market,finance';
        
        console.log('Fetching news for topics:', topics);
        
        // Fetch from AlphaVantage
        const alphaResponse = await fetch(
          `https://www.alphavantage.co/query?function=NEWS_SENTIMENT&topics=${topics}&apikey=${process.env.NEXT_PUBLIC_ALPHA_VANTAGE_KEY}`
        );
        const alphaData = await alphaResponse.json();
        
        console.log('Alpha Vantage response:', alphaData);
        
        let formattedNews: NewsItem[] = [];

        // Process Alpha Vantage news
        if (alphaData.feed) {
          formattedNews = alphaData.feed.map((item: any) => {
            const sentiment = normalizeSentiment(item.overall_sentiment_label || 'neutral');
            return {
              title: item.title,
              summary: item.summary,
              url: item.url,
              sentiment,
              tickers: item.ticker_sentiment?.map((t: any) => t.ticker) || [],
              topics: item.topics?.map((t: any) => t.topic) || [],
              source: item.source,
              time: item.time,
              image: item.banner_image,
              author: item.authors?.[0] || 'Unknown'
            };
          });
        }

        // Sort by time (newest first)
        formattedNews.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
        
        console.log('Formatted news:', formattedNews.length, 'articles');
        setNews(formattedNews);
        setFilteredNews(formattedNews);
      } catch (err) {
        console.error("Error loading news:", err);
        setNews([]);
        setFilteredNews([]);
      } finally {
        setNewsLoading(false);
      }
    };

    fetchNews();
  }, [selectedCategory, profile?.id]);

  // Filter news based on search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredNews(news);
    } else {
      const filtered = news.filter(article => 
        article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.tickers.some(ticker => ticker.toLowerCase().includes(searchQuery.toLowerCase())) ||
        article.source.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredNews(filtered);
    }
  }, [searchQuery, news]);

  // Helper function to normalize sentiment
  const normalizeSentiment = (sentiment: string): keyof typeof sentimentColors => {
    const normalized = sentiment.toLowerCase().replace(/\s+/g, '_');
    if (normalized.includes('bullish')) {
      return normalized.includes('somewhat') ? 'somewhat_bullish' : 'bullish';
    }
    if (normalized.includes('bearish')) {
      return normalized.includes('somewhat') ? 'somewhat_bearish' : 'bearish';
    }
    return 'neutral';
  };

  // Format time for display
  const formatTime = (timeString: string) => {
    try {
      const date = new Date(timeString);
      const now = new Date();
      const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
      
      if (diffInHours < 1) {
        const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
        return `${diffInMinutes}m ago`;
      } else if (diffInHours < 24) {
        return `${diffInHours}h ago`;
      } else {
        const diffInDays = Math.floor(diffInHours / 24);
        return `${diffInDays}d ago`;
      }
    } catch {
      return 'Recently';
    }
  };

  // CoPilot submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    
    const userMessageId = generateMessageId();
    setMessages(prev => [...prev, { role: 'user', content: userMessage, id: userMessageId }]);
    setIsLoading(true);
    setStreamingMessage('');

    try {
      // Make request to Perplexity API
      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_PERPLEXITY_API_KEY}`
        },
        body: JSON.stringify({
          model: 'sonar',
          messages: [
            {
              role: 'system',
              content: `You are SimuTrader News CoPilot, an expert financial news assistant. Help users understand market news, analyze trends, and provide insights about financial markets. You have access to current news and market information.`
            },
            {
              role: 'user',
              content: userMessage
            }
          ],
          stream: true,
          temperature: 0.5,
          max_tokens: 500,
          enable_sources: true
        }),
      });

      if (!response.ok) {
        throw new Error(`Perplexity API error: ${response.status}`);
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader available');

      const decoder = new TextDecoder();
      let accumulatedMessage = '';
      let accumulatedSources: Array<{ name: string; url: string }> = [];
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine || !trimmedLine.startsWith('data: ')) continue;
          
          const data = trimmedLine.slice(6);
          if (data === '[DONE]' || data === '') continue;

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content || '';
            if (content) {
              accumulatedMessage += content;
              setStreamingMessage(accumulatedMessage);
            }
            
            if (parsed.sources && Array.isArray(parsed.sources)) {
              accumulatedSources = parsed.sources.map((source: any) => ({
                name: source.name || source.title || 'Source',
                url: source.url
              }));
            }
          } catch (e) {
            console.warn('Skipping malformed JSON chunk:', data.substring(0, 100) + '...');
            continue;
          }
        }
      }

      if (accumulatedMessage.trim()) {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: accumulatedMessage,
          id: generateMessageId(),
          sources: accumulatedSources.length > 0 ? accumulatedSources : undefined
        }]);
      } else {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: 'I apologize, but I encountered an issue processing your request. Please try again.',
          id: generateMessageId()
        }]);
      }
      
      setStreamingMessage('');

    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error. Please try again.',
        id: generateMessageId()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Add handleLogout function
  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      router.push('/');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  // Add function to handle asking CoPilot about an article
  const handleAskCoPilot = async (article: NewsItem) => {
    const userMessage = `Please analyze this news article: "${article.title}". What are the key implications for investors and the market?`;
    setInput(userMessage);
    
    // Scroll to the CoPilot section
    const copilotSection = document.querySelector('.copilot-section');
    if (copilotSection) {
      copilotSection.scrollIntoView({ behavior: 'smooth' });
    }

    // Trigger the submit handler
    const event = new Event('submit', { cancelable: true, bubbles: true });
    const form = document.querySelector('form');
    if (form) {
      form.dispatchEvent(event);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <p className="text-white">Loading profile…</p>
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
        {/* Replace bottom section with logout button */}
        <div className="p-3 border-t border-gray-800/50">
          <button
            onClick={handleLogout}
            className="w-full text-gray-300 hover:text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800/50 transition-all duration-200 flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Logout
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex-1 ml-48 h-screen overflow-y-auto">
        <div className="flex flex-col items-center p-6 space-y-4 w-full pr-[520px]">
          {/* Header - Make it more compact */}
          <div className="w-full mb-4 animate-slideUp">
            <div className="bg-gradient-to-br from-gray-800/60 to-gray-900/60 backdrop-blur-xl rounded-2xl border border-gray-700/50 p-6 shadow-2xl hover:border-gray-600/50 transition-all duration-500">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-3 h-3 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full animate-pulse"></div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-blue-100 to-purple-200 bg-clip-text text-transparent">
                  Market News & Analysis
                </h1>
              </div>
              <p className="text-gray-300 text-base mb-4">
                Stay updated with the latest financial news, market trends, and expert analysis
              </p>
              
              {/* Search Bar - Make it more compact */}
              <div className="relative mb-4">
                <input
                  type="text"
                  placeholder="Search news, tickers, or topics..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-gray-700/50 text-white rounded-xl px-4 py-3 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-400 text-base placeholder-gray-400 border border-gray-600/50 hover:border-gray-500/50 transition-all duration-300"
                />
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>

              {/* Category Filters - Make them more compact */}
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <button
                    key={category.key}
                    onClick={() => setSelectedCategory(category.key)}
                    className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 transform hover:scale-105 ${
                      selectedCategory === category.key
                        ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                        : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50 hover:text-white border border-gray-600/50'
                    }`}
                  >
                    {category.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* News Grid - Make cards smaller */}
          <div className="w-full">
            {newsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="bg-gray-800/60 backdrop-blur-xl rounded-xl border border-gray-700/50 p-4 animate-pulse">
                    <div className="h-3 bg-gray-700 rounded w-3/4 mb-3"></div>
                    <div className="h-16 bg-gray-700 rounded mb-3"></div>
                    <div className="h-3 bg-gray-700 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : filteredNews.length === 0 ? (
              <div className="text-center py-12 animate-fadeIn">
                <div className="text-5xl mb-3">📰</div>
                <p className="text-gray-400 text-base mb-2">No news found</p>
                <p className="text-gray-500 text-sm">Try adjusting your search or category filter</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredNews.map((article, index) => (
                  <div
                    key={index}
                    className="group bg-gradient-to-br from-gray-800/60 to-gray-900/60 backdrop-blur-xl rounded-xl border border-gray-700/50 p-4 shadow-xl hover:border-gray-600/50 transition-all duration-500 transform hover:scale-[1.02] hover:shadow-2xl animate-slideUp"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    {/* Sentiment Badge */}
                    <div className="flex items-center justify-between mb-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${sentimentColors[article.sentiment]}`}>
                        {sentimentLabels[article.sentiment]}
                      </span>
                      <span className="text-xs text-gray-400">{formatTime(article.time)}</span>
                    </div>

                    {/* Article Image */}
                    {article.image && (
                      <div className="mb-3 overflow-hidden rounded-lg">
                        <img
                          src={article.image}
                          alt={article.title}
                          className="w-full h-32 object-cover group-hover:scale-110 transition-transform duration-500"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      </div>
                    )}

                    {/* Title */}
                    <a
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block group/link"
                    >
                      <h3 className="text-base font-bold text-white mb-2 line-clamp-2 group-hover/link:text-blue-400 transition-colors duration-300">
                        {article.title}
                      </h3>
                    </a>

                    {/* Summary */}
                    <p className="text-xs text-gray-300 line-clamp-3 leading-relaxed mb-3">
                      {article.summary}
                    </p>

                    {/* Tickers */}
                    {article.tickers && article.tickers.length > 0 && (
                      <div className="mb-3">
                        <div className="flex flex-wrap gap-1">
                          {article.tickers.slice(0, 3).map((ticker, i) => (
                            <span
                              key={i}
                              className="px-1.5 py-0.5 bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-blue-300 rounded text-xs font-medium border border-blue-500/30"
                            >
                              {ticker}
                            </span>
                          ))}
                          {article.tickers.length > 3 && (
                            <span className="px-1.5 py-0.5 bg-gray-700/50 text-gray-400 rounded text-xs">
                              +{article.tickers.length - 3}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-3 border-t border-gray-700/50">
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 bg-gradient-to-r from-green-400 to-blue-400 rounded-full animate-pulse"></div>
                        <span className="text-xs text-gray-400 font-medium">{article.source}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleAskCoPilot(article)}
                          className="text-xs text-purple-400 hover:text-purple-300 font-medium transition-colors duration-300 flex items-center gap-1"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                          </svg>
                          Ask CoPilot
                        </button>
                        <a
                          href={article.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors duration-300 flex items-center gap-1"
                        >
                          Read more
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CoPilot Sidebar */}
      <div className="fixed right-0 top-0 w-[500px] h-screen bg-gradient-to-br from-[#181c2a] via-[#23294a] to-[#1a1d2b] shadow-xl flex flex-col border-l border-gray-700 overflow-y-auto copilot-section">
        <div className="flex-1 flex flex-col justify-start items-center pt-8">
          <div className="w-full flex flex-col items-center">
            {/* Title */}
            <h1 className="text-4xl font-extrabold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-4 text-center">News CoPilot</h1>
            <p className="text-lg text-gray-200 mb-8 text-center font-medium">Your intelligent news analysis assistant</p>
            
            {/* Chat Messages */}
            <div className="w-full max-w-md flex-1 overflow-y-auto px-4 space-y-4 mb-4">
              {messages.map((message) => (
                <div 
                  key={message.id} 
                  className={`${message.role === 'user' ? 'ml-auto' : 'mr-auto'} max-w-[80%] group animate-fadeIn`}
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
                    {/* Sources section */}
                    {message.role === 'assistant' && message.sources && message.sources.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-gray-600">
                        <h4 className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">Sources</h4>
                        <div className="space-y-1">
                          {message.sources.map((source, index) => (
                            <div key={index} className="flex items-start space-x-2">
                              <span className="text-blue-400 text-xs font-medium flex-shrink-0">[{index + 1}]</span>
                              <a
                                href={source.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-400 hover:text-blue-300 text-xs underline decoration-blue-400 hover:decoration-blue-300 transition-colors line-clamp-1"
                                title={source.name}
                              >
                                {source.name}
                              </a>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {streamingMessage && (
                <div className="mr-auto max-w-[80%] animate-fadeIn">
                  <div className="bg-[#23294a] rounded-xl p-4 text-white">
                    <div className="prose prose-invert max-w-none break-words whitespace-pre-wrap">
                      {streamingMessage}
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <form onSubmit={handleSubmit} className="w-full max-w-md px-4 mb-6">
              <div className="relative">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onInput={(e) => {
                    e.currentTarget.style.height = 'auto';
                    e.currentTarget.style.height = `${e.currentTarget.scrollHeight}px`;
                  }}
                  placeholder="Ask about any news or market trends..."
                  className="w-full bg-[#23294a] text-white rounded-xl px-6 py-4 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-400 text-lg shadow-lg placeholder-gray-400 resize-none overflow-hidden border border-gray-600/50"
                />
                <button 
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-white text-black p-2 rounded-full hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l7-7 7 7" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19V6" />
                  </svg>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
