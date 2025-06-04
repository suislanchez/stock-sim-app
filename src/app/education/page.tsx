"use client"
import React, { useState, useEffect, useRef } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useRouter } from "next/navigation"
import Link from "next/link"

interface Profile {
  id: string
  email: string
  balance: number
}

interface Message {
  role: 'user' | 'assistant'
  content: string
  id: string
  sources?: Array<{
    name: string
    url: string
  }>
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

.glass-effect {
  backdrop-filter: blur(16px);
  background: rgba(17, 24, 39, 0.8);
  border: 1px solid rgba(75, 85, 99, 0.3);
}

.education-gradient {
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

.section-gradient {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
}

.term-card {
  transition: all 0.3s ease;
}

.term-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
}
`

const mainEducationCategories = [
  { id: 'investing-101', title: 'Investing 101', icon: '📈' },
  { id: 'futures-trading', title: 'Futures Trading', icon: '⚡' },
  { id: 'taxes', title: 'Taxes & Regulations', icon: '📝' },
  { id: 'glossary', title: 'Trading Glossary', icon: '📚' },
]

// Simplified and corrected educationContent
const educationContent: Record<string, { title: string; icon: string; subSections?: Array<{ title: string; content: string }>; terms?: Array<{ term: string; definition: string }> }> = {
  'investing-101': {
    title: 'Investing 101',
    icon: '📈',
    subSections: [
      {
        title: 'Understanding the Stock Market',
        content: 'The stock market is a complex network of exchanges where shares of publicly traded companies are bought and sold. Key concepts include understanding stock exchanges (like NYSE, NASDAQ), how stock prices are influenced by supply and demand, corporate earnings, economic news, and investor sentiment. It\'s crucial to grasp how orders are executed (market orders, limit orders) and the role of brokers.'
      },
      {
        title: 'Fundamental vs. Technical Analysis',
        content: 'Fundamental analysis involves assessing a company\'s intrinsic value by examining its financial statements, management, and economic factors. Technical analysis uses historical price charts and trading volumes to identify patterns and predict future price movements.'
      },
      {
        title: 'Risk and Return',
        content: 'Investing inherently involves risk. Higher potential returns often come with higher risk. Understanding your risk tolerance, investment horizon, and financial goals is essential.'
      },
    ]
  },
  'futures-trading': {
    title: 'Futures Trading',
    icon: '⚡',
    subSections: [
      {
        title: 'Introduction to Futures Contracts',
        content: 'Futures contracts are standardized agreements to buy or sell an asset at a predetermined price on a future date. They are traded on regulated exchanges.'
      },
      {
        title: 'Leverage and Margin in Futures',
        content: 'Futures trading is highly leveraged, allowing control of a large contract value with a small margin deposit. This amplifies both potential profits and losses.'
      },
    ]
  },
  'taxes': {
    title: 'Taxes & Regulations',
    icon: '📝',
    subSections: [
      {
        title: 'Understanding Capital Gains',
        content: 'Capital gains tax is levied on profits from selling assets. Rates can differ for short-term (held <1 year) vs. long-term holdings.'
      },
      {
        title: 'Taxation of Futures (Section 1256)',
        content: 'Regulated futures contracts often receive special tax treatment (60% long-term, 40% short-term gains/losses), regardless of holding period.'
      },
    ]
  },
  'glossary': {
    title: 'Trading Glossary',
    icon: '📚',
    terms: [
      { term: 'Arbitrage', definition: 'The practice of taking advantage of price differences in different markets.' },
      { term: 'Ask Price', definition: 'The price at which a seller is willing to sell a security.' },
      { term: 'Asset', definition: 'Any resource with economic value that an individual or company owns or controls with the expectation that it will provide future benefit.' },
      { term: 'Bid Price', definition: 'The price at which a buyer is willing to buy a security.' },
      { term: 'Bond', definition: 'A debt investment in which an investor loans money to an entity (typically corporate or governmental) which borrows the funds for a defined period of time at a variable or fixed interest rate.'},
      { term: 'Broker', definition: 'An individual or firm that acts as an intermediary between an investor and a securities exchange.' },
      { term: 'Bull Market', definition: 'A market characterized by rising prices and optimistic sentiment.' },
      { term: 'Call Option', definition: 'A contract giving the holder the right, but not the obligation, to buy an asset at a specified price within a specific time period.' },
      { term: 'Capital', definition: 'Financial assets or the financial value of assets, such as cash.' },
      { term: 'Contract Size', definition: 'The standardized quantity of the underlying asset in a futures contract.' }
    ].sort((a, b) => a.term.localeCompare(b.term))
  }
};

export default function EducationPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeSection, setActiveSection] = useState('investing-101')
  const [searchQuery, setSearchQuery] = useState('')
  
  // CoPilot states
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hi! I'm your SimuTrader Education CoPilot. Ask me anything about trading and investing!",
      id: 'welcome'
    }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [streamingMessage, setStreamingMessage] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  let messageIdCounter = 0

  // Generate unique message IDs
  const generateMessageId = () => {
    messageIdCounter += 1
    return `${Date.now()}_${messageIdCounter}_${Math.random().toString(36).substr(2, 9)}`
  }

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, streamingMessage])

  // Load user session & profile
  useEffect(() => {
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user) {
        router.push("/login")
        return
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, balance")
        .eq("id", session.user.id)
        .single()

      if (error || !data) {
        console.error("Error fetching profile:", error)
        router.push("/login")
      } else {
        setProfile(data)
      }
      setLoading(false)
    })()
  }, [router])

  // Inject styles
  useEffect(() => {
    const styleSheet = document.createElement("style")
    styleSheet.innerText = styles
    document.head.appendChild(styleSheet)
    
    return () => {
      document.head.removeChild(styleSheet)
    }
  }, [])

  // CoPilot submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    
    const userMessageId = generateMessageId()
    setMessages(prev => [...prev, { role: 'user', content: userMessage, id: userMessageId }])
    setIsLoading(true)
    setStreamingMessage('')

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
              content: `You are SimuTrader Education CoPilot, an expert trading and investing assistant. Help users understand trading concepts, strategies, and market analysis. Provide clear, educational responses about futures trading, technical analysis, and risk management.`
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
      })

      if (!response.ok) {
        throw new Error(`Perplexity API error: ${response.status}`)
      }

      // Handle streaming response
      const reader = response.body?.getReader()
      if (!reader) throw new Error('No reader available')

      const decoder = new TextDecoder()
      let accumulatedMessage = ''
      let accumulatedSources: Array<{ name: string; url: string }> = []
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmedLine = line.trim()
          if (!trimmedLine || !trimmedLine.startsWith('data: ')) continue
          
          const data = trimmedLine.slice(6)
          if (data === '[DONE]' || data === '') continue

          try {
            const parsed = JSON.parse(data)
            const content = parsed.choices?.[0]?.delta?.content || ''
            if (content) {
              accumulatedMessage += content
              setStreamingMessage(accumulatedMessage)
            }
            
            if (parsed.sources && Array.isArray(parsed.sources)) {
              accumulatedSources = parsed.sources.map((source: any) => ({
                name: source.name || source.title || 'Source',
                url: source.url
              }))
            }
          } catch (e) {
            console.warn('Skipping malformed JSON chunk:', data.substring(0, 100) + '...')
            continue
          }
        }
      }

      if (accumulatedMessage.trim()) {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: accumulatedMessage,
          id: generateMessageId(),
          sources: accumulatedSources.length > 0 ? accumulatedSources : undefined
        }])
      } else {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: 'I apologize, but I encountered an issue processing your request. Please try again.',
          id: generateMessageId()
        }])
      }
      
      setStreamingMessage('')

    } catch (error) {
      console.error('Error:', error)
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error. Please try again.',
        id: generateMessageId()
      }])
    } finally {
      setIsLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <p className="text-white">Loading profile…</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen font-sans bg-black">
      {/* Left Navigation */}
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
            <Link href="/dashboard" className="text-gray-300 hover:text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800/50 transition-all duration-200 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Dashboard
            </Link>
            <Link href="/futures" className="text-gray-300 hover:text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800/50 transition-all duration-200 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              Futures
            </Link>
            <Link href="/orders" className="text-gray-300 hover:text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800/50 transition-all duration-200 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Orders
            </Link>
            <Link href="/watchlist" className="text-gray-300 hover:text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800/50 transition-all duration-200 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              Watchlist
            </Link>
            <Link href="/taxes" className="text-gray-300 hover:text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800/50 transition-all duration-200 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              Taxes
            </Link>
            <Link href="/news" className="text-gray-300 hover:text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800/50 transition-all duration-200 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21H5a2 2 0 01-2-2V7a2 2 0 012-2h14a2 2 0 012 2v12a2 2 0 01-2 2z" />
              </svg>
              News
            </Link>
            <Link href="/education" className="bg-gray-800/50 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800/50 transition-all duration-200 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5zm0 7v-6m0 0l-7-4m7 4l7-4" />
              </svg>
              Education
            </Link>
            <Link href="/portfolio" className="text-gray-300 hover:text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800/50 transition-all duration-200 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                <line x1="12" y1="22.08" x2="12" y2="12"/>
              </svg>
              Portfolio
            </Link>
          </div>
        </div>
        {/* Bottom Left Section */}
        <div className="p-3 border-t border-gray-800/50 flex flex-col gap-3">
          <Link href="/account" className="text-gray-200 hover:text-white text-base flex items-center gap-3 px-3 py-3 rounded-lg bg-gray-800/80 transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Account
          </Link>
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
        <div className="flex flex-col items-center p-8 space-y-6 w-full pr-[520px]">
          {/* Header */}
          <div className="w-full mb-8 animate-slideUp">
            <div className="bg-gradient-to-br from-gray-800/60 to-gray-900/60 backdrop-blur-xl rounded-3xl border border-gray-700/50 p-8 shadow-2xl hover:border-gray-600/50 transition-all duration-500">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-4 h-4 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full animate-pulse"></div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-blue-100 to-purple-200 bg-clip-text text-transparent">
                  {educationContent[activeSection]?.title || 'Education Hub'}
                </h1>
              </div>
              
              {/* Search Bar */}
              <div className="relative mb-6">
                <input
                  type="text"
                  placeholder="Search topics, terms, or concepts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-gray-700/50 text-white rounded-2xl px-6 py-4 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-400 text-lg placeholder-gray-400 border border-gray-600/50 hover:border-gray-500/50 transition-all duration-300"
                />
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
               {/* Section Navigation Buttons */}
              <div className="flex flex-wrap gap-3 mb-6">
                {mainEducationCategories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setActiveSection(category.id)}
                    className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 transform hover:scale-105 ${
                      activeSection === category.id
                        ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                        : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50 hover:text-white border border-gray-600/50'
                    }`}
                  >
                    <span className="mr-2">{category.icon}</span>
                    {category.title}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Content Sections */}
          <div className="w-full space-y-6">
            {activeSection === 'glossary' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {educationContent.glossary.terms
                  ?.filter(term => term.term.toLowerCase().includes(searchQuery.toLowerCase()) || term.definition.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((term, index) => (
                  <div
                    key={index}
                    className="term-card bg-gradient-to-br from-gray-800/60 to-gray-900/60 backdrop-blur-xl rounded-2xl border border-gray-700/50 p-6 shadow-xl hover:border-gray-600/50 transition-all duration-500 animate-slideUp"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <h4 className="text-xl font-bold text-blue-400 mb-2">{term.term}</h4>
                    <p className="text-gray-300 text-sm leading-relaxed">{term.definition}</p>
                  </div>
                ))}
              </div>
            ) : (
              educationContent[activeSection]?.subSections
              ?.filter(subSection => subSection.title.toLowerCase().includes(searchQuery.toLowerCase()) || subSection.content.toLowerCase().includes(searchQuery.toLowerCase()))
              .map((subSection, index) => (
                <div
                  key={index}
                  className="bg-gradient-to-br from-gray-800/60 to-gray-900/60 backdrop-blur-xl rounded-2xl border border-gray-700/50 p-6 shadow-xl hover:border-gray-600/50 transition-all duration-500 animate-slideUp"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <h3 className="text-2xl font-bold text-white mb-3 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">{subSection.title}</h3>
                  <p className="text-gray-300 leading-relaxed text-base">{subSection.content}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* CoPilot Sidebar */}
      <div className="fixed right-0 top-0 w-[500px] h-screen bg-gradient-to-br from-[#181c2a] via-[#23294a] to-[#1a1d2b] shadow-xl flex flex-col border-l border-gray-700 overflow-y-auto">
        <div className="flex-1 flex flex-col justify-start items-center pt-8">
          <div className="w-full flex flex-col items-center">
            {/* Title */}
            <h1 className="text-4xl font-extrabold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-4 text-center">Education CoPilot</h1>
            <p className="text-lg text-gray-200 mb-8 text-center font-medium">Your intelligent trading education assistant</p>
            
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
                    e.currentTarget.style.height = 'auto'
                    e.currentTarget.style.height = `${e.currentTarget.scrollHeight}px`
                  }}
                  placeholder="Ask about trading concepts or strategies..."
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
  )
}
