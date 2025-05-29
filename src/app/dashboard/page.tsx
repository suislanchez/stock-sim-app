"use client";
import React, { useState, useEffect, useRef, useMemo } from "react";
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
  ReferenceLine,
  Area,
  AreaChart,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import Link from "next/link";
import TradingViewWidget from '../../components/TradingViewWidget';
import TradingViewMiniWidget from '../../components/TradingViewMiniWidget';

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
  total_value?: number;
  gain_loss?: number;
  gain_loss_percentage?: number;
}

interface StockData {
  price: number;
  change: number;
  history: { timestamp: string; price: number }[];
  dailyData?: {
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    change: number;
    previousClose: number;
  };
  marketData?: {
    marketCap: number;
    peRatio: number;
    avgVolume: number;
  };
  splitCoefficient?: number;
}

interface SearchResult {
  symbol: string;
  name: string;
  type: string;
  region: string;
  currency: string;
  matchScore: number;
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
}

interface TickerNews {
  title: string;
  tickers: string[];
  url: string;
}

interface MarketStatus {
  isOpen: boolean;
  timeRemaining: string;
  nextOpenTime: string;
}

interface WatchlistItem {
  symbol: string;
  added_at: string;
}

// Add this near the top of the file with other interfaces
interface LogoData {
  url: string;
  symbol: string;
}

// Add logo mapping dictionary
const logoMapping: Record<string, string> = {
  // Tech Companies
  'AAPL': 'apple.com',
  'MSFT': 'microsoft.com',
  'GOOGL': 'google.com',
  'AMZN': 'amazon.com',
  'META': 'meta.com',
  'NVDA': 'nvidia.com',
  'TSLA': 'tesla.com',
  'INTC': 'intel.com',
  'AMD': 'amd.com',
  'CRM': 'salesforce.com',
  'ORCL': 'oracle.com',
  'CSCO': 'cisco.com',
  'IBM': 'ibm.com',
  'QCOM': 'qualcomm.com',
  'TXN': 'ti.com',
  'MU': 'micron.com',
  'AVGO': 'broadcom.com',
  'ADBE': 'adobe.com',
  'PYPL': 'paypal.com',
  'SQ': 'squareup.com',
  
  // Financial Companies
  'JPM': 'jpmorganchase.com',
  'BAC': 'bankofamerica.com',
  'WFC': 'wellsfargo.com',
  'GS': 'goldmansachs.com',
  'MS': 'morganstanley.com',
  'C': 'citi.com',
  'AXP': 'americanexpress.com',
  'V': 'visa.com',
  'MA': 'mastercard.com',
  'BLK': 'blackrock.com',
  
  // Retail & Consumer
  'WMT': 'walmart.com',
  'TGT': 'target.com',
  'COST': 'costco.com',
  'HD': 'homedepot.com',
  'LOW': 'lowes.com',
  'MCD': 'mcdonalds.com',
  'SBUX': 'starbucks.com',
  'NKE': 'nike.com',
  'DIS': 'disney.com',
  'NFLX': 'netflix.com',
  
  // Healthcare
  'JNJ': 'jnj.com',
  'PFE': 'pfizer.com',
  'MRK': 'merck.com',
  'UNH': 'unitedhealthgroup.com',
  'ABBV': 'abbvie.com',
  'LLY': 'lilly.com',
  'TMO': 'thermofisher.com',
  'DHR': 'danaher.com',
  'ABT': 'abbott.com',
  'BMY': 'bms.com',
  
  // Energy
  'XOM': 'exxonmobil.com',
  'CVX': 'chevron.com',
  'COP': 'conocophillips.com',
  'SLB': 'slb.com',
  'EOG': 'eogresources.com',
  'PXD': 'pioneernaturalresources.com',
  'MPC': 'marathonpetroleum.com',
  'VLO': 'valero.com',
  'PSX': 'phillips66.com',
  'OXY': 'oxy.com',
  
  // Industrial & Materials
  'BA': 'boeing.com',
  'CAT': 'caterpillar.com',
  'MMM': '3m.com',
  'GE': 'ge.com',
  'HON': 'honeywell.com',
  'LMT': 'lockheedmartin.com',
  'RTX': 'rtx.com',
  'NOC': 'northropgrumman.com',
  'GD': 'gd.com',
  'DE': 'deere.com',
  
  // Telecommunications
  'T': 'att.com',
  'VZ': 'verizon.com',
  'TMUS': 't-mobile.com',
  'CMCSA': 'comcast.com',
  'CHTR': 'charter.com',
  'DISH': 'dish.com',
  'S': 'sprint.com',
  'LUMN': 'lumen.com',
  'CTL': 'centurylink.com',
  'VOD': 'vodafone.com'
};

// Add this CSS animation at the top of the file after the imports
const styles = `
@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

.animate-blink {
  animation: blink 1s step-end infinite;
}

@keyframes shine {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.animate-shine {
  animation: shine 8s linear infinite;
}

@keyframes marquee {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}

@keyframes pieChartAnimation {
  0% {
    transform: scale(0.8) rotate(0deg);
    opacity: 0;
  }
  100% {
    transform: scale(1) rotate(360deg);
    opacity: 1;
  }
}

.pie-chart-container {
  transform-origin: center center;
  animation: pieChartAnimation 1.5s ease-out forwards;
}

.ticker-container {
  width: 100%;
  overflow: hidden;
  position: relative;
  background: inherit;
}

.ticker-track {
  display: inline-flex;
  white-space: nowrap;
  animation: marquee 180s linear infinite;
}

.ticker-track:hover {
  animation-play-state: paused;
}

.placeholder-shine {
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0) 0%,
    rgba(255, 255, 255, 0.3) 25%,
    rgba(255, 255, 255, 0.5) 50%,
    rgba(255, 255, 255, 0.3) 75%,
    rgba(255, 255, 255, 0) 100%
  );
  background-size: 200% 100%;
  animation: shine 8s linear infinite;
  -webkit-background-clip: text;
  background-clip: text;
  color: rgba(255, 255, 255, 0.3);
}

.crypto-shine {
  background: linear-gradient(
    90deg,
    rgba(147, 51, 234, 0) 0%,
    rgba(147, 51, 234, 0.3) 25%,
    rgba(147, 51, 234, 0.5) 50%,
    rgba(147, 51, 234, 0.3) 75%,
    rgba(147, 51, 234, 0) 100%
  );
  background-size: 200% 100%;
  animation: shine 8s linear infinite;
}

.crypto-glow {
  box-shadow: 0 0 15px rgba(147, 51, 234, 0.5);
}

.crypto-text {
  background: linear-gradient(to right, #9333ea, #c084fc);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
`;

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

interface CryptoPrice {
  price: number;
  change: number;
}

interface CryptoPrices {
  BTC: CryptoPrice;
  ETH: CryptoPrice;
  SOL: CryptoPrice;
}

// Add this after the defaultTickers constant and before the timePeriods constant
const stockCategories = {
  magnificent7: ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'TSLA'],
  techGiants: ['AAPL', 'MSFT', 'GOOGL', 'META', 'NVDA', 'INTC', 'AMD', 'CRM', 'ORCL', 'CSCO'],
  financial: ['JPM', 'BAC', 'WFC', 'GS', 'MS', 'C', 'AXP', 'V', 'MA', 'BLK'],
  healthcare: ['JNJ', 'PFE', 'MRK', 'UNH', 'ABBV', 'LLY', 'TMO', 'DHR', 'ABT', 'BMY'],
  energy: ['XOM', 'CVX', 'COP', 'SLB', 'EOG', 'PXD', 'MPC', 'VLO', 'PSX', 'OXY'],
  consumer: ['WMT', 'TGT', 'COST', 'HD', 'LOW', 'MCD', 'SBUX', 'NKE', 'DIS', 'NFLX']
} as const;

type StockCategory = keyof typeof stockCategories;

// Add this after the InfoBubble component
const categoryInfo = {
  magnificent7: "The Magnificent 7 represents the seven largest tech companies by market cap: Apple, Microsoft, Alphabet (Google), Amazon, Meta, NVIDIA, and Tesla. These companies have been major drivers of market growth.",
  techGiants: "Tech Giants includes major technology companies beyond the Magnificent 7, featuring established leaders in hardware, software, and services sectors.",
  financial: "The Financial Sector includes major banks, investment firms, and financial services companies that form the backbone of the global financial system.",
  healthcare: "Healthcare companies include pharmaceutical giants, medical device manufacturers, and healthcare service providers that drive innovation in medical care.",
  energy: "Energy companies include major oil and gas producers, renewable energy leaders, and energy service providers that power the global economy.",
  consumer: "Consumer Goods companies include retail giants, food and beverage producers, and consumer product manufacturers that serve everyday needs."
};

const sectionInfo = {
  trading: "Today's Trading shows the current day's price movements, including opening price, high, low, and closing prices, along with trading volume and price changes.",
  performance: "Performance metrics show key statistics about the stock's price movement over time, including 52-week highs and lows, and year-to-date performance.",
  technical: "Technical Indicators are mathematical calculations based on price and volume data that help traders identify potential trading opportunities and market trends.",
  keyStats: "Key Statistics provide fundamental data about the company, including market cap, P/E ratio, dividend yield, and other important financial metrics."
};

// Add this after the InfoBubble component and before the DashboardPage component
const COLORS = [
  '#7DD3FC', // pastel blue
  '#A5B4FC', // pastel indigo
  '#C4B5FD', // pastel purple
  '#F9A8D4', // pastel pink
  '#FCD34D', // pastel yellow
  '#86EFAC', // pastel green
  '#FCA5A5', // pastel red
  '#94A3B8'  // pastel gray
];

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

const CompactNewsCard = ({ items }: { items: NewsItem[] }) => {
  return (
    <div className="bg-gray-800/80 backdrop-blur-sm rounded-lg border border-gray-700/50 p-4 h-[405px] overflow-y-auto">
      <div className="space-y-4">
        {items.slice(0, 15).map((item, index) => (
          <div key={index} className="p-3 hover:bg-gray-700/50 rounded-lg transition-colors">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium border ${sentimentColors[item.sentiment]}`}>
                  {sentimentLabels[item.sentiment]}
                </span>
                <span className="text-xs text-gray-400">•</span>
                <span className="text-xs text-gray-400">{item.source}</span>
              </div>
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block group"
              >
                <h3 className="text-base font-semibold text-white mb-2 line-clamp-2 group-hover:text-green-400 transition-colors">{item.title}</h3>
                <p className="text-sm text-gray-300 line-clamp-3 leading-relaxed">{item.summary}</p>
              </a>
              {item.tickers && item.tickers.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {item.tickers.map((ticker, i) => (
                    <span key={i} className="px-2 py-0.5 bg-gray-700/50 rounded text-xs text-gray-300">
                      {ticker}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const InfoBubble = ({ title, content }: { title: string; content: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<'top' | 'bottom'>('bottom');
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleClick = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      setPosition(spaceBelow >= 200 ? 'bottom' : 'top');
    }
    setIsOpen(!isOpen);
  };

  return (
    <div className="relative inline-block">
      <div className="flex items-center">
        <button
          ref={buttonRef}
          onClick={handleClick}
          className="text-gray-400 hover:text-white transition-colors"
          aria-label={`Learn more about ${title}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
      {isOpen && (
        <div 
          className={`absolute z-50 w-64 p-4 bg-gray-800 rounded-lg shadow-xl border border-gray-700 text-sm ${
            position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'
          }`}
          style={{ 
            left: '50%',
            transform: 'translateX(-50%)',
            maxHeight: '200px',
            overflowY: 'auto'
          }}
        >
          <div className="flex justify-between items-start mb-2">
            <h4 className="font-semibold text-white">{title}</h4>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-white"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
          <p className="text-gray-300">{content}</p>
        </div>
      )}
    </div>
  );
};

const PortfolioPieChart = ({ portfolio, loading }: { portfolio: PortfolioItem[], loading: boolean }) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [animationKey, setAnimationKey] = useState(0);
  const [isAnimating, setIsAnimating] = useState(true);
  const [animationPhase, setAnimationPhase] = useState<'initial' | 'scale' | 'complete'>('initial');

  // Reset animation when portfolio data changes or after initial load
  useEffect(() => {
    if (!loading && portfolio.length > 0) {
      setIsAnimating(true);
      setAnimationKey(prev => prev + 1);
      setAnimationPhase('initial');
      
      // Initial phase - fade in
      setTimeout(() => {
        setAnimationPhase('scale');
      }, 500);

      // Scale phase
      setTimeout(() => {
        setAnimationPhase('complete');
      }, 1000);

      // Complete animation
      setTimeout(() => {
        setIsAnimating(false);
      }, 1500);
    }
  }, [loading, portfolio]);

  const data = portfolio.map(item => ({
    name: item.symbol,
    value: item.total_value || 0,
    shares: item.shares,
    gainLossPercentage: item.gain_loss_percentage
  }));

  const totalValue = data.reduce((sum, item) => sum + item.value, 0);

  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };

  const onPieLeave = () => {
    setActiveIndex(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center">
        <div className="w-64 h-64 flex-shrink-0 flex items-center justify-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-500"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="animate-pulse text-green-500 text-sm">Loading...</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-start">
      <div className="w-[12rem] h-[12rem] flex-shrink-0 pie-chart-container relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <defs>
              <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>
            <Pie
              key={animationKey}
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={45}
              outerRadius={90}
              paddingAngle={2}
              dataKey="value"
              stroke="none"
              animationBegin={0}
              animationDuration={1500}
              animationEasing="ease-out"
              onMouseEnter={onPieEnter}
              onMouseLeave={onPieLeave}
              startAngle={90}
              endAngle={-270}
              isAnimationActive={isAnimating}
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}-${animationKey}`}
                  fill={COLORS[index % COLORS.length]}
                  className={`transition-all duration-150 ${
                    activeIndex === index ? 'opacity-100 filter drop-shadow-lg' : 'opacity-80'
                  }`}
                  style={{
                    filter: activeIndex === index ? 'url(#glow)' : 'none',
                    transform: `
                      ${activeIndex === index ? 'scale(1.05)' : 'scale(1)'}
                      ${animationPhase === 'initial' ? 'scale(0.5) rotate(-180deg)' : ''}
                      ${animationPhase === 'scale' ? 'scale(1.2) rotate(0deg)' : ''}
                      ${animationPhase === 'complete' ? 'scale(1) rotate(0deg)' : ''}
                    `,
                    opacity: animationPhase === 'initial' ? 0 : 1,
                    transformOrigin: 'center',
                    transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                />
              ))}
            </Pie>
            <text
              x="50%"
              y="50%"
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-white text-base font-bold"
              style={{
                opacity: animationPhase === 'initial' ? 0 : 1,
                transition: 'opacity 0.5s ease-out',
                fill: '#FFFFFF'
              }}
            >
              ${totalValue.toLocaleString()}
            </text>
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  const percentage = ((data.value / totalValue) * 100).toFixed(1);
                  return (
                    <div className="bg-gray-900/95 backdrop-blur-sm p-3 rounded-xl border border-gray-700/50 shadow-xl transform -translate-y-24 z-50 min-w-[180px]">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-white font-semibold text-base">{data.name}</span>
                        <span className="text-gray-400 text-xs">{percentage}%</span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400 text-xs">Value</span>
                          <span className="text-white text-xs font-medium">${data.value.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400 text-xs">Shares</span>
                          <span className="text-white text-xs font-medium">${data.shares.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400 text-xs">Return</span>
                          <span className={`text-xs font-medium ${data.gainLossPercentage >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {data.gainLossPercentage >= 0 ? '+' : ''}{data.gainLossPercentage?.toFixed(2)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="ml-6 space-y-0.5 min-w-[2px] flex flex-col">
        <div className="flex items-center mb-1">
          <span className="text-xs text-gray-400 mr-1">Tickers</span>
          <InfoBubble title="Portfolio Tickers" content="These are the stock symbols in your portfolio. Each dot and symbol shows your allocation and percentage of total value." />
        </div>
        {data.map((entry, index) => {
          const percentage = ((entry.value / totalValue) * 100).toFixed(1);
          return (
            <div 
              key={entry.name}
              className="flex items-center space-x-1 cursor-pointer group"
              onMouseEnter={() => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
            >
              <div 
                className="w-1.5 h-1.5 rounded-full transition-all duration-150"
                style={{ 
                  backgroundColor: COLORS[index % COLORS.length],
                  transform: activeIndex === index ? 'scale(1.2)' : 'scale(1)',
                }}
              />
              <span className="text-gray-300 text-xs group-hover:text-white transition-colors duration-150">{entry.name}</span>
              <span className="text-gray-400 text-xs group-hover:text-gray-300 transition-colors duration-150">{percentage}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const NewsSlider = ({ items, isCryptoMode }: { items: (NewsItem | TickerNews)[], isCryptoMode: boolean }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % items.length);
    }, 5000); // Change item every 5 seconds

    return () => clearInterval(interval);
  }, [items.length]);

  return (
    <div className="h-8 overflow-hidden relative">
      <div
        className="absolute transition-transform duration-500 ease-in-out"
        style={{
          transform: `translateY(-${currentIndex * 100}%)`,
        }}
      >
        {items.map((item, index) => (
          <a
            key={index}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`block h-8 text-white text-sm hover:text-${isCryptoMode ? 'purple' : 'green'}-400 transition-colors duration-200 truncate max-w-[200px]`}
          >
            {item.title}
          </a>
        ))}
      </div>
    </div>
  );
};

export default function DashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [stocks, setStocks] = useState<Record<string, StockData>>({});
  const [selectedStock, setSelectedStock] = useState("AAPL");
  const [timePeriod, setTimePeriod] = useState("1M");
  const [news, setNews] = useState<NewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const [showAllNews, setShowAllNews] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [shareAmount, setShareAmount] = useState(1);
  const [buyLoading, setBuyLoading] = useState(false);
  const [buyError, setBuyError] = useState<string | null>(null);
  const [selectedTimezone, setSelectedTimezone] = useState(() => {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  });
  const [marketStatus, setMarketStatus] = useState<MarketStatus>({
    isOpen: false,
    timeRemaining: "",
    nextOpenTime: ""
  });
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [portfolioLoading, setPortfolioLoading] = useState(true);
  const [showSellModal, setShowSellModal] = useState(false);
  const [sellLoading, setSellLoading] = useState(false);
  const [sellError, setSellError] = useState<string | null>(null);
  const [sellAmount, setSellAmount] = useState(1);
  const [portfolioMetrics, setPortfolioMetrics] = useState({
    totalValue: 0,
    dailyReturn: 0,
    totalReturn: 0,
    totalCost: 0
  });
  const [showWatchlist, setShowWatchlist] = useState(false);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [watchlistLoading, setWatchlistLoading] = useState(true);
  const [tickerNews, setTickerNews] = useState<TickerNews[]>([]);
  const [tickerNewsLoading, setTickerNewsLoading] = useState(true);
  const [currentTopic, setCurrentTopic] = useState<keyof typeof topics>('tech');
  const [logos, setLogos] = useState<Record<string, string>>({});
  const [currentStockIndex, setCurrentStockIndex] = useState(0);
  const [companyOverview, setCompanyOverview] = useState<CompanyOverview | null>(null);
  const [isCryptoMode, setIsCryptoMode] = useState(false);
  const [showNews, setShowNews] = useState(true); // Change default to true
  const [cryptoPrices, setCryptoPrices] = useState<CryptoPrices>({
    BTC: { price: 0, change: 0 },
    ETH: { price: 0, change: 0 },
    SOL: { price: 0, change: 0 }
  });
  const [cryptoMarketCap, setCryptoMarketCap] = useState<number>(0);
  const [cryptoVolume24h, setCryptoVolume24h] = useState<number>(0);
  const [cryptoDominance, setCryptoDominance] = useState<{
    btc: number;
    eth: number;
    sol: number;
  }>({ btc: 0, eth: 0, sol: 0 });
  const [currentCategory, setCurrentCategory] = useState<StockCategory>('magnificent7');
  const [showSearch, setShowSearch] = useState(false);
  const [portfolioHistory, setPortfolioHistory] = useState<{ date: string; value: number }[]>([]);
  const [selectedTimeframe, setSelectedTimeframe] = useState("1M");
  const [portfolioPage, setPortfolioPage] = useState(0);
  const stocksPerPage = 5;
  const pagedPortfolio = useMemo(() => {
    const sorted = [...portfolio].sort((a, b) => (b.total_value ?? 0) - (a.total_value ?? 0));
    const filtered = sorted.filter(item => item.symbol !== selectedStock);
    const start = portfolioPage * stocksPerPage;
    return filtered.slice(start, start + stocksPerPage);
  }, [portfolio, portfolioPage, selectedStock]);

  // Add this effect to handle crypto mode switch
  useEffect(() => {
    if (isCryptoMode) {
      handleSelectStock('BTC');
    }
  }, [isCryptoMode]);

  // Add this new effect
  useEffect(() => {
    setShowNews(isCryptoMode);
  }, [isCryptoMode]);

  const topics = {
    tech: ['AAPL', 'MSFT', 'GOOGL', 'META', 'NVDA', 'TSLA'],
    finance: ['JPM', 'BAC', 'GS', 'MS', 'WFC', 'C'],
    retail: ['WMT', 'TGT', 'COST', 'HD', 'LOW', 'MCD'],
    healthcare: ['JNJ', 'PFE', 'MRK', 'UNH', 'ABBV', 'LLY'],
    energy: ['XOM', 'CVX', 'COP', 'SLB', 'EOG', 'PXD']
  } as const;

  const defaultTickers = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'TSLA', 'NVDA'] as const;

  const timePeriods = [
    { label: "1 Month", value: "1M", days: 30 },
    { label: "3 Months", value: "3M", days: 90 },
    { label: "6 Months", value: "6M", days: 180 },
    { label: "1 Year", value: "1Y", days: 365 },
    { label: "All Time", value: "5Y", days: 1825 },
  ];

  // List of common US timezones
  const timezones = [
    { value: "America/New_York", label: "Eastern Time (ET)" },
    { value: "America/Chicago", label: "Central Time (CT)" },
    { value: "America/Denver", label: "Mountain Time (MT)" },
    { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
    { value: "America/Anchorage", label: "Alaska Time (AKT)" },
    { value: "Pacific/Honolulu", label: "Hawaii Time (HT)" }
  ];

  const cryptoTopics = {
    defi: ['ETH', 'UNI', 'AAVE', 'SNX', 'MKR', 'COMP'],
    layer1: ['BTC', 'ETH', 'SOL', 'AVAX', 'ADA', 'DOT'],
    layer2: ['MATIC', 'ARB', 'OP', 'IMX', 'METIS', 'ZKS'],
    gaming: ['AXS', 'SAND', 'MANA', 'ENJ', 'GALA', 'ILV'],
    ai: ['AGIX', 'FET', 'OCEAN', 'NMR', 'RNDR', 'GRT']
  } as const;

  const defaultCryptoTickers = ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'ADA', 'AVAX'] as const;

  // Add market status calculation
  const calculateMarketStatus = () => {
    const now = new Date();
    const day = now.getDay();
    const hour = now.getHours();
    const minute = now.getMinutes();
    const isWeekend = day === 0 || day === 6; // 0 is Sunday, 6 is Saturday

    // Convert current time to Eastern Time for market hours calculation
    const easternTime = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
    const easternHour = easternTime.getHours();
    const easternMinute = easternTime.getMinutes();
    const easternDay = easternTime.getDay();

    const isMarketOpen = !isWeekend && 
      ((easternHour > 9) || (easternHour === 9 && easternMinute >= 30)) && 
      easternHour < 16;

    let timeRemaining = "";
    let nextOpenTime = "";

    if (isMarketOpen) {
      // Calculate time until market close
      const closeTime = new Date(easternTime);
      closeTime.setHours(16, 0, 0, 0);
      const timeUntilClose = closeTime.getTime() - easternTime.getTime();
      const hoursUntilClose = Math.floor(timeUntilClose / (1000 * 60 * 60));
      const minutesUntilClose = Math.floor((timeUntilClose % (1000 * 60 * 60)) / (1000 * 60));
      timeRemaining = `${hoursUntilClose}h ${minutesUntilClose}m`;
    } else {
      // Calculate next open time
      const nextOpen = new Date(easternTime);
      if (easternHour >= 16 || isWeekend) {
        // If after market close or weekend, next open is next business day
        nextOpen.setDate(nextOpen.getDate() + (easternDay === 5 ? 3 : easternDay === 6 ? 2 : 1));
      }
      
      // Set the time in Eastern Time
      const nextOpenET = new Date(nextOpen);
      nextOpenET.setHours(9, 30, 0, 0);
      
      // Calculate time until next open in user's timezone
      const userTime = new Date(now.toLocaleString("en-US", { timeZone: selectedTimezone }));
      const timeUntilOpen = nextOpenET.getTime() - userTime.getTime();
      const daysUntilOpen = Math.floor(timeUntilOpen / (1000 * 60 * 60 * 24));
      const hoursUntilOpen = Math.floor((timeUntilOpen % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutesUntilOpen = Math.floor((timeUntilOpen % (1000 * 60 * 60)) / (1000 * 60));

      if (daysUntilOpen > 0) {
        nextOpenTime = `${daysUntilOpen}d ${hoursUntilOpen}h ${minutesUntilOpen}m`;
      } else {
        nextOpenTime = `${hoursUntilOpen}h ${minutesUntilOpen}m`;
      }
    }

    return {
      isOpen: isMarketOpen,
      timeRemaining,
      nextOpenTime
    };
  };

  // Handle timezone change
  const handleTimezoneChange = (timezone: string) => {
    setSelectedTimezone(timezone);
  };

  // Update market status every minute
  useEffect(() => {
    const updateMarketStatus = () => {
      setMarketStatus(calculateMarketStatus());
    };

    // Initial update
    updateMarketStatus();

    // Update every minute
    const interval = setInterval(updateMarketStatus, 60000);

    return () => clearInterval(interval);
  }, [selectedTimezone]);

  // 1) Load user session & profile
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

  // 2) Once we have the profile, fetch all stocks in parallel
  useEffect(() => {
    if (loading || !profile?.id) return;

    (async () => {
      try {
        const stocksData: Record<string, StockData> = {};
        // Determine which stocks to fetch based on current view
        const stocksToFetch = showWatchlist 
          ? watchlist.map(item => item.symbol)
          : defaultTickers;

        // Fetch data for all relevant stocks
        for (const symbol of stocksToFetch) {
          // Fetch both basic and detailed data for the selected stock
          if (symbol === selectedStock) {
            const [stock, detailedData] = await Promise.all([
              fetchStock(symbol, timePeriod),
              fetchDetailedStockData(symbol)
            ]);
            
            if (stock && detailedData) {
              stocksData[symbol] = {
                ...stock,
                dailyData: detailedData.dailyData,
                marketData: detailedData.marketData,
                splitCoefficient: detailedData.splitCoefficient,
                history: detailedData.history
              };
            }
          } else {
            // For other stocks, just fetch basic data
            const stock = await fetchStock(symbol, timePeriod);
            if (stock) {
              stocksData[symbol] = stock;
            }
          }
          
          setStocks(prev => ({ ...prev, [symbol]: stocksData[symbol] }));
          // Wait 0.1 seconds before next request to avoid API rate limit
          await new Promise(res => setTimeout(res, 100));
        }
      } catch (err) {
        console.error("Error loading stocks:", err);
      }
    })();
  }, [loading, profile?.id, timePeriod, selectedStock, showWatchlist, watchlist]);

  // Remove the useEffect for selected stock updates (around line 250-274)
  // and replace it with this new useEffect for periodic updates
  useEffect(() => {
    if (!selectedStock) return;

    const updateBasicStockData = async () => {
      try {
        const stock = await fetchStock(selectedStock, timePeriod);
        setStocks(prev => {
          const currentStock = prev[selectedStock];
          return {
            ...prev,
            [selectedStock]: {
              ...stock,
              dailyData: currentStock?.dailyData, // Preserve the detailed data
              marketData: currentStock?.marketData, // Preserve the market data
              splitCoefficient: currentStock?.splitCoefficient,
              history: currentStock?.history
            }
          };
        });
      } catch (err) {
        console.error("Error updating stock data:", err);
      }
    };

    // Initial update
    updateBasicStockData();

    // Update every 5 minutes
    const interval = setInterval(updateBasicStockData, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [selectedStock, timePeriod]);

  // Add this effect after your existing useEffects
  useEffect(() => {
    if (loading || !profile?.id) return;

    const fetchNews = async () => {
      setNewsLoading(true);
      try {
        console.log('Fetching news for:', selectedStock);
        
        // Fetch from multiple sources
        const sources = [
          `https://www.alphavantage.co/query?function=NEWS_SENTIMENT&tickers=${selectedStock}&apikey=${process.env.NEXT_PUBLIC_ALPHA_VANTAGE_KEY}`,
          `https://api.marketaux.com/v1/news/all?api_token=${process.env.NEXT_PUBLIC_MARKETAUX_KEY}&symbols=${selectedStock}&limit=5&language=en`,
          `https://api.polygon.io/v2/reference/news?ticker=${selectedStock}&apiKey=${process.env.NEXT_PUBLIC_POLYGON_KEY}&limit=5&order=desc&sort=published_utc`
        ];

        console.log('Fetching from sources:', sources);
        const responses = await Promise.all(sources.map(url => fetch(url)));
        const data = await Promise.all(responses.map(res => res.json()));
        
        console.log('Raw API responses:', data);
        let formattedNews: NewsItem[] = [];

        // Process Alpha Vantage news
        if (data[0].feed) {
          console.log('Processing Alpha Vantage news:', data[0].feed.length, 'items');
          formattedNews = formattedNews.concat(data[0].feed.map((item: any) => {
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
              image: item.banner_image
            };
          }));
        }

        // Process Marketaux news
        if (data[1].data) {
          console.log('Processing Marketaux news:', data[1].data.length, 'items');
          formattedNews = formattedNews.concat(data[1].data.map((item: any) => {
            const sentiment = normalizeSentiment(item.sentiment || 'neutral');
            return {
              title: item.title,
              summary: item.description,
              url: item.url,
              sentiment,
              tickers: item.symbols || [],
              topics: item.topics || [],
              source: item.source,
              time: item.published_at,
              image: item.image_url
            };
          }));
        } else {
          console.log('Marketaux API response:', data[1]);
        }

        // Process Polygon news
        if (data[2].results) {
          console.log('Processing Polygon news:', data[2].results.length, 'items');
          formattedNews = formattedNews.concat(data[2].results.map((item: any) => {
            const sentiment = normalizeSentiment(item.sentiment || 'neutral');
            return {
              title: item.title,
              summary: item.description,
              url: item.article_url,
              sentiment,
              tickers: [item.tickers],
              topics: item.topics || [],
              source: item.publisher.name,
              time: item.published_utc,
              image: item.image_url
            };
          }));
        } else {
          console.log('Polygon API response:', data[2]);
        }

        // Remove duplicates and sort by time
        const uniqueNews = Array.from(new Set(formattedNews.map(n => n.title)))
          .map(title => formattedNews.find(n => n.title === title))
          .filter((n): n is NewsItem => n !== undefined)
          .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
          .slice(0, 12);

        console.log('Final formatted news:', uniqueNews);
        setNews(uniqueNews);
      } catch (err) {
        console.error("Error loading news:", err);
        setNews([]);
      } finally {
        setNewsLoading(false);
      }
    };

    fetchNews();
  }, [selectedStock, loading, profile?.id]);

  // Add search functionality
  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    setIsSearching(true);
    try {
      const res = await fetch(
        `https://www.alphavantage.co/query?function=SYMBOL_SEARCH&keywords=${query}&apikey=${process.env.NEXT_PUBLIC_ALPHA_VANTAGE_KEY}`
      );
      const data = await res.json();
      
      if (data.bestMatches) {
        const formattedResults = data.bestMatches.map((match: any) => ({
          symbol: match['1. symbol'],
          name: match['2. name'],
          type: match['3. type'],
          region: match['4. region'],
          currency: match['8. currency'],
          matchScore: parseFloat(match['9. matchScore'])
        }));
        setSearchResults(formattedResults);
        setShowSearchResults(true);
      }
    } catch (err) {
      console.error("Error searching symbols:", err);
    } finally {
      setIsSearching(false);
    }
  };

  // Add this helper function before fetchDetailedStockData
  const adjustHistoricalPrices = (timeSeriesData: any, splitCoefficient: number) => {
    const adjustedData: { [key: string]: any } = {};
    
    // Sort dates in reverse chronological order
    const dates = Object.keys(timeSeriesData).sort().reverse();
    
    // Apply split coefficient to all historical prices
    dates.forEach(date => {
      const data = timeSeriesData[date];
      adjustedData[date] = {
        ...data,
        '1. open': (parseFloat(data['1. open']) * splitCoefficient).toFixed(2),
        '2. high': (parseFloat(data['2. high']) * splitCoefficient).toFixed(2),
        '3. low': (parseFloat(data['3. low']) * splitCoefficient).toFixed(2),
        '4. close': (parseFloat(data['4. close']) * splitCoefficient).toFixed(2),
        '5. adjusted close': (parseFloat(data['5. adjusted close']) * splitCoefficient).toFixed(2),
        '6. volume': Math.round(parseInt(data['6. volume']) / splitCoefficient).toString(),
        '7. dividend amount': (parseFloat(data['7. dividend amount']) * splitCoefficient).toFixed(2),
        '8. split coefficient': (parseFloat(data['8. split coefficient']) * splitCoefficient).toFixed(2)
      };
    });
    
    return adjustedData;
  };

  // Modify the fetchDetailedStockData function
  const fetchDetailedStockData = async (symbol: string) => {
    try {
      // Use monthly adjusted data for 5-year view
      const endpoint = timePeriod === "5Y" 
        ? `https://www.alphavantage.co/query?function=TIME_SERIES_MONTHLY_ADJUSTED&symbol=${symbol}&apikey=${process.env.NEXT_PUBLIC_ALPHA_VANTAGE_KEY}`
        : `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY_ADJUSTED&symbol=${symbol}&outputsize=${"full"}&apikey=${process.env.NEXT_PUBLIC_ALPHA_VANTAGE_KEY}`;

      const res = await fetch(endpoint);
      const data = await res.json();
      
      const timeSeriesKey = timePeriod === "5Y" 
        ? 'Monthly Adjusted Time Series'
        : 'Time Series (Daily)';
      
      if (data[timeSeriesKey]) {
        const timeSeriesData = data[timeSeriesKey];
        
        // Sort dates in chronological order (oldest to newest)
        const dates = Object.keys(timeSeriesData).sort();
        
        // Get the most recent dates based on the selected time period
        const daysToShow = timePeriods.find(p => p.value === timePeriod)?.days || 30;
        const recentDates = dates.slice(-daysToShow);
        
        const latestDate = recentDates[recentDates.length - 1];
        const previousDate = recentDates[recentDates.length - 2];
        
        // Get the latest split coefficient
        const latestData = timeSeriesData[latestDate];
        const splitCoefficient = parseFloat(latestData['8. split coefficient']) || 1;
        
        // Adjust historical prices if there's a split
        const adjustedTimeSeriesData = splitCoefficient !== 1 
          ? adjustHistoricalPrices(timeSeriesData, splitCoefficient)
          : timeSeriesData;
        
        const latestAdjustedData = adjustedTimeSeriesData[latestDate];
        const previousAdjustedData = adjustedTimeSeriesData[previousDate];
        
        // Calculate daily/monthly change using adjusted prices
        const currentClose = parseFloat(latestAdjustedData['4. close']);
        const previousClose = parseFloat(previousAdjustedData['4. close']);
        const change = ((currentClose - previousClose) / previousClose) * 100;
        
        // Create adjusted history data for the chart (oldest to newest)
        const adjustedHistory = recentDates.map(date => ({
          timestamp: date,
          price: parseFloat(adjustedTimeSeriesData[date]['4. close'])
        }));

        return {
          dailyData: {
            date: latestDate,
            open: parseFloat(latestAdjustedData['1. open']),
            high: parseFloat(latestAdjustedData['2. high']),
            low: parseFloat(latestAdjustedData['3. low']),
            close: currentClose,
            volume: parseInt(latestAdjustedData['6. volume']),
            change: change,
            previousClose: previousClose
          },
          marketData: {
            marketCap: 0,
            peRatio: 0,
            avgVolume: Math.round(
              recentDates.slice(-20).reduce((sum, date) => sum + parseInt(adjustedTimeSeriesData[date]['6. volume']), 0) / 20
            )
          },
          splitCoefficient: splitCoefficient,
          history: adjustedHistory
        };
      }
      console.error(`No ${timeSeriesKey} data found in response:`, data);
      return null;
    } catch (err) {
      console.error("Error fetching detailed stock data:", err);
      return null;
    }
  };

  // Update the handleSelectStock function
  const handleSelectStock = async (symbol: string) => {
    setSelectedStock(symbol);
    setShowSearchResults(false);
    setSearchQuery("");
    setNewsLoading(true);
    
    try {
      const [stock, detailedData, overview] = await Promise.all([
        fetchStock(symbol, timePeriod),
        fetchDetailedStockData(symbol),
        fetchCompanyOverview(symbol)
      ]);
      
      if (stock && detailedData) {
        const updatedStock: StockData = {
          ...stock,
          dailyData: detailedData.dailyData,
          marketData: detailedData.marketData,
          splitCoefficient: detailedData.splitCoefficient,
          history: detailedData.history
        };
        
        setStocks(prev => ({
          ...prev,
          [symbol]: updatedStock
        }));
      }
    } catch (err) {
      console.error("Error loading stock:", err);
    }
  };

  // Add buy stock function
  const handleBuyStock = async () => {
    if (!profile || !selectedStock || !stocks[selectedStock]) {
      setBuyError("Invalid stock selection");
      return;
    }
    
    setBuyLoading(true);
    setBuyError(null);
    
    try {
      const totalCost = stocks[selectedStock].price * shareAmount;
      
      if (totalCost > profile.balance) {
        setBuyError("Insufficient funds");
        setBuyLoading(false);
        return;
      }

      // Start a transaction
      const { data: existingPosition, error: fetchError } = await supabase
        .from('portfolio')
        .select('shares, average_price')
        .eq('user_id', profile.id)
        .eq('symbol', selectedStock)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        console.error("Error fetching existing position:", fetchError);
        throw new Error(`Failed to check existing position: ${fetchError.message}`);
      }

      let newShares = shareAmount;
      let newAveragePrice = stocks[selectedStock].price;

      if (existingPosition) {
        // Calculate new average price and total shares
        const totalShares = existingPosition.shares + shareAmount;
        const totalValue = (existingPosition.shares * existingPosition.average_price) + (shareAmount * stocks[selectedStock].price);
        newShares = totalShares;
        newAveragePrice = totalValue / totalShares;
      }

      // First update the portfolio
      const { error: portfolioError } = await supabase
        .from('portfolio')
        .upsert({
          user_id: profile.id,
          symbol: selectedStock,
          shares: newShares,
          average_price: newAveragePrice
        }, {
          onConflict: 'user_id,symbol',
          ignoreDuplicates: false
        });

      if (portfolioError) {
        console.error("Error updating portfolio:", portfolioError);
        throw new Error(`Failed to update portfolio: ${portfolioError.message}`);
      }

      // Then update the user's balance
      const { error: balanceError } = await supabase
        .from('profiles')
        .update({ balance: profile.balance - totalCost })
        .eq('id', profile.id);

      if (balanceError) {
        console.error("Error updating balance:", balanceError);
        // If balance update fails, we should try to revert the portfolio update
        const { error: revertError } = await supabase
          .from('portfolio')
          .delete()
          .eq('user_id', profile.id)
          .eq('symbol', selectedStock);
        
        if (revertError) {
          console.error("Error reverting portfolio update:", revertError);
        }
        throw new Error(`Failed to update balance: ${balanceError.message}`);
      }

      // Update local state
      setProfile(prev => prev ? { ...prev, balance: prev.balance - totalCost } : null);
      setShowBuyModal(false);
      setShareAmount(1);

      // Refresh portfolio data
      const { data: portfolioData, error: portfolioFetchError } = await supabase
        .from('portfolio')
        .select('symbol, shares, average_price')
        .eq('user_id', profile.id);

      if (portfolioFetchError) {
        console.error("Error refreshing portfolio:", portfolioFetchError);
      } else {
        // Update portfolio with current prices
        const portfolioWithPrices = await Promise.all(
          portfolioData.map(async (item) => {
            const stockData = await fetchStock(item.symbol);
            const currentPrice = stockData.price;
            const totalValue = currentPrice * item.shares;
            const gainLoss = totalValue - (item.average_price * item.shares);
            const gainLossPercentage = (gainLoss / (item.average_price * item.shares)) * 100;

            return {
              ...item,
              current_price: currentPrice,
              total_value: totalValue,
              gain_loss: gainLoss,
              gain_loss_percentage: gainLossPercentage
            };
          })
        );
        setPortfolio(portfolioWithPrices);
      }

      // Show success message
      alert(`Successfully purchased ${shareAmount} shares of ${selectedStock} at $${stocks[selectedStock].price.toFixed(2)} per share.`);
      
    } catch (err: any) {
      console.error("Error buying stock:", err);
      setBuyError(err.message || "Failed to complete purchase. Please try again.");
    } finally {
      setBuyLoading(false);
    }
  };

  // Add useEffect to fetch portfolio data
  useEffect(() => {
    if (!profile?.id) return;

    const fetchPortfolio = async () => {
      setPortfolioLoading(true);
      try {
        const { data: portfolioData, error } = await supabase
          .from('portfolio')
          .select('symbol, shares, average_price')
          .eq('user_id', profile.id);

        if (error) throw error;

        // Fetch current prices for all portfolio items
        const portfolioWithPrices = await Promise.all(
          portfolioData.map(async (item) => {
            const stockData = await fetchStock(item.symbol);
            const currentPrice = stockData.price;
            const totalValue = currentPrice * item.shares;
            const gainLoss = totalValue - (item.average_price * item.shares);
            const gainLossPercentage = (gainLoss / (item.average_price * item.shares)) * 100;

            return {
              ...item,
              current_price: currentPrice,
              total_value: totalValue,
              gain_loss: gainLoss,
              gain_loss_percentage: gainLossPercentage
            };
          })
        );

        setPortfolio(portfolioWithPrices);

        // Calculate historical portfolio values
        const historicalData = await Promise.all(
          portfolioData.map(async (item) => {
            const stockData = await fetchStock(item.symbol, selectedTimeframe);
            return stockData.history.map(historyItem => ({
              date: historyItem.timestamp,
              value: historyItem.price * item.shares
            }));
          })
        );

        // Combine historical data from all stocks
        const combinedHistory = historicalData[0].map((_, index) => {
          const date = historicalData[0][index].date;
          const totalValue = historicalData.reduce((sum, stockHistory) => 
            sum + (stockHistory[index]?.value || 0), 0);
          return { date, value: totalValue };
        });

        setPortfolioHistory(combinedHistory);
      } catch (err) {
        console.error("Error fetching portfolio:", err);
      } finally {
        setPortfolioLoading(false);
      }
    };

    fetchPortfolio();
  }, [profile?.id, selectedTimeframe]);

  // Add useEffect to calculate portfolio metrics
  useEffect(() => {
    if (!portfolio.length) return;

    const calculateMetrics = async () => {
      try {
        let totalValue = 0;
        let totalCost = 0;
        let previousDayValue = 0;

        for (const item of portfolio) {
          // Use the current_price that was already fetched in fetchPortfolio
          if (!item.current_price) continue;
          
          const currentValue = item.current_price * item.shares;
          const costBasis = item.average_price * item.shares;
          
          totalValue += currentValue;
          totalCost += costBasis;

          // Calculate previous day's value using the change percentage
          const previousPrice = item.current_price / (1 + (stocks[item.symbol]?.change || 0) / 100);
          previousDayValue += previousPrice * item.shares;
        }

        const dailyReturn = previousDayValue ? ((totalValue - previousDayValue) / previousDayValue) * 100 : 0;
        const totalReturn = totalCost ? ((totalValue - totalCost) / totalCost) * 100 : 0;

        setPortfolioMetrics({
          totalValue,
          dailyReturn,
          totalReturn,
          totalCost
        });
      } catch (err) {
        console.error("Error calculating portfolio metrics:", err);
        // Set default values in case of error
        setPortfolioMetrics({
          totalValue: 0,
          dailyReturn: 0,
          totalReturn: 0,
          totalCost: 0
        });
      }
    };

    calculateMetrics();
  }, [portfolio, stocks]);

  // Add handleSellStock function
  const handleSellStock = async () => {
    if (!profile || !selectedStock || !stocks[selectedStock]) {
      setSellError("Invalid stock selection");
      return;
    }
    
    setSellLoading(true);
    setSellError(null);
    
    try {
      // Check if user owns the stock
      const { data: position, error: fetchError } = await supabase
        .from('portfolio')
        .select('shares, average_price')
        .eq('user_id', profile.id)
        .eq('symbol', selectedStock)
        .single();

      if (fetchError) {
        console.error("Error fetching position:", fetchError);
        throw new Error("Failed to check your position in this stock");
      }

      if (!position || position.shares < sellAmount) {
        throw new Error("You don't have enough shares to sell");
      }

      const totalValue = stocks[selectedStock].price * sellAmount;
      const remainingShares = position.shares - sellAmount;

      // Update portfolio
      if (remainingShares > 0) {
        // Update existing position
        const { error: portfolioError } = await supabase
          .from('portfolio')
          .update({
            shares: remainingShares
          })
          .eq('user_id', profile.id)
          .eq('symbol', selectedStock);

        if (portfolioError) {
          console.error("Error updating portfolio:", portfolioError);
          throw new Error(`Failed to update portfolio: ${portfolioError.message}`);
        }
      } else {
        // Delete position if selling all shares
        const { error: portfolioError } = await supabase
          .from('portfolio')
          .delete()
          .eq('user_id', profile.id)
          .eq('symbol', selectedStock);

        if (portfolioError) {
          console.error("Error deleting portfolio position:", portfolioError);
          throw new Error(`Failed to delete portfolio position: ${portfolioError.message}`);
        }
      }

      // Update user's balance
      const { error: balanceError } = await supabase
        .from('profiles')
        .update({ balance: profile.balance + totalValue })
        .eq('id', profile.id);

      if (balanceError) {
        console.error("Error updating balance:", balanceError);
        throw new Error(`Failed to update balance: ${balanceError.message}`);
      }

      // Update local state
      setProfile(prev => prev ? { ...prev, balance: prev.balance + totalValue } : null);
      setShowSellModal(false);
      setSellAmount(1);

      // Refresh portfolio data
      const { data: portfolioData, error: portfolioFetchError } = await supabase
        .from('portfolio')
        .select('symbol, shares, average_price')
        .eq('user_id', profile.id);

      if (portfolioFetchError) {
        console.error("Error refreshing portfolio:", portfolioFetchError);
      } else {
        // Update portfolio with current prices
        const portfolioWithPrices = await Promise.all(
          portfolioData.map(async (item) => {
            const stockData = await fetchStock(item.symbol);
            const currentPrice = stockData.price;
            const totalValue = currentPrice * item.shares;
            const gainLoss = totalValue - (item.average_price * item.shares);
            const gainLossPercentage = (gainLoss / (item.average_price * item.shares)) * 100;

            return {
              ...item,
              current_price: currentPrice,
              total_value: totalValue,
              gain_loss: gainLoss,
              gain_loss_percentage: gainLossPercentage
            };
          })
        );
        setPortfolio(portfolioWithPrices);
      }

      // Show success message
      alert(`Successfully sold ${sellAmount} shares of ${selectedStock} at $${stocks[selectedStock].price.toFixed(2)} per share.`);
      
    } catch (err: any) {
      console.error("Error selling stock:", err);
      setSellError(err.message || "Failed to complete sale. Please try again.");
    } finally {
      setSellLoading(false);
    }
  };

  // Add this after the existing useEffects
  useEffect(() => {
    if (!profile?.id) return;

    const fetchWatchlist = async () => {
      setWatchlistLoading(true);
      try {
        const { data: watchlistData, error: watchlistError } = await supabase
          .from("watchlist")
          .select("symbol, added_at")
          .eq("user_id", profile.id)
          .order("added_at", { ascending: false });

        if (watchlistError) throw watchlistError;
        setWatchlist(watchlistData || []);
      } catch (err) {
        console.error("Error fetching watchlist:", err);
      } finally {
        setWatchlistLoading(false);
      }
    };

    fetchWatchlist();
  }, [profile?.id]);

  const handleAddToWatchlist = async () => {
    if (!profile?.id || !selectedStock) return;

    try {
      const { error } = await supabase
        .from("watchlist")
        .insert({
          user_id: profile.id,
          symbol: selectedStock
        });

      if (error) throw error;

      // Update local state
      setWatchlist(prev => [...prev, { symbol: selectedStock, added_at: new Date().toISOString() }]);
      alert(`Added ${selectedStock} to watchlist`);
    } catch (err: any) {
      console.error("Error adding to watchlist:", err);
      alert(err.message || "Failed to add to watchlist");
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
    } catch (err: any) {
      console.error("Error removing from watchlist:", err);
      alert(err.message || "Failed to remove from watchlist");
    }
  };

  const isInWatchlist = (symbol: string) => {
    return watchlist.some(item => item.symbol === symbol);
  };

  const getSharesOwned = (symbol: string) => {
    const position = portfolio.find(item => item.symbol === symbol);
    return position ? position.shares : 0;
  };

  // Add this after your existing useEffects
  useEffect(() => {
    const fetchTickerNews = async () => {
      setTickerNewsLoading(true);
      try {
        // Get random topic and its companies
        const topicKeys = Object.keys(topics) as Array<keyof typeof topics>;
        const randomTopic = topicKeys[Math.floor(Math.random() * topicKeys.length)];
        setCurrentTopic(randomTopic);
        const tickers = topics[randomTopic];

        const newsPromises = tickers.map(ticker => 
          fetch(`https://www.alphavantage.co/query?function=NEWS_SENTIMENT&tickers=${ticker}&apikey=${process.env.NEXT_PUBLIC_ALPHA_VANTAGE_KEY}`)
            .then(res => res.json())
            .then(data => {
              if (data.feed) {
                return data.feed.map((item: any) => ({
                  title: item.title
                    .replace(/\s*\([^)]*\)/g, '')
                    .replace(/\s*\[[^\]]*\]/g, '')
                    .replace(/\s*-\s*[^-]*$/, '')
                    .replace(/\s*:\s*[^:]*$/, '')
                    .replace(/\s+/g, ' ')
                    .trim(),
                  tickers: item.ticker_sentiment?.map((t: any) => t.ticker) || [],
                  url: item.url
                }));
              }
              return [];
            })
        );

        const allNews = await Promise.all(newsPromises);
        const flattenedNews = allNews.flat();
        
        // Remove duplicates and sort by relevance
        const uniqueNews = Array.from(new Set(flattenedNews.map(n => n.title)))
          .map(title => flattenedNews.find(n => n.title === title))
          .filter((n): n is TickerNews => n !== undefined)
          .slice(0, 20);

        setTickerNews(uniqueNews);
      } catch (err) {
        console.error("Error fetching ticker news:", err);
      } finally {
        setTickerNewsLoading(false);
      }
    };

    fetchTickerNews();
    // Change topic every 1.5 minutes
    const interval = setInterval(fetchTickerNews, 90 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Add this function after other useEffect hooks
  const fetchLogo = async (symbol: string) => {
    try {
      const domain = logoMapping[symbol];
      if (!domain) {
        console.warn(`No logo mapping found for ${symbol}`);
        return null;
      }
      
      const response = await fetch(`https://logo.clearbit.com/${domain}`);
      if (response.ok) {
        return response.url;
      }
      return null;
    } catch (error) {
      console.error(`Error fetching logo for ${symbol}:`, error);
      return null;
    }
  };

  // Add this useEffect to fetch logos for stocks
  useEffect(() => {
    const fetchLogos = async () => {
      const symbolsToFetch = showWatchlist 
        ? watchlist.map(item => item.symbol)
        : defaultTickers;

      const logoPromises = symbolsToFetch.map(async (symbol) => {
        const logoUrl = await fetchLogo(symbol);
        return { symbol, logoUrl };
      });

      const results = await Promise.all(logoPromises);
      const newLogos = results.reduce((acc, { symbol, logoUrl }) => {
        if (logoUrl) {
          acc[symbol] = logoUrl;
        }
        return acc;
      }, {} as Record<string, string>);

      setLogos(prev => ({ ...prev, ...newLogos }));
    };

    fetchLogos();
  }, [showWatchlist, watchlist]);

  const fetchCompanyOverview = async (symbol: string) => {
    try {
      const response = await fetch(
        `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${symbol}&apikey=${process.env.NEXT_PUBLIC_ALPHA_VANTAGE_KEY}`
      );
      const data = await response.json();
      setCompanyOverview(data);
    } catch (error) {
      console.error('Error fetching company overview:', error);
    }
  };

  // Add this useEffect to fetch company overview when selectedStock changes
  useEffect(() => {
    if (selectedStock) {
      fetchCompanyOverview(selectedStock);
    }
  }, [selectedStock]);

  // Add this effect to fetch crypto prices
  useEffect(() => {
    const fetchCryptoPrices = async () => {
      if (!isCryptoMode) return;
      
      try {
        const newPrices: CryptoPrices = {
          BTC: { price: 0, change: 0 },
          ETH: { price: 0, change: 0 },
          SOL: { price: 0, change: 0 }
        };
        
        const symbols: (keyof CryptoPrices)[] = ['BTC', 'ETH', 'SOL'];
        
        for (const symbol of symbols) {
          const response = await fetch(
            `https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=${symbol}&to_currency=USD&apikey=${process.env.NEXT_PUBLIC_ALPHA_VANTAGE_KEY}`
          );
          const data = await response.json();
          
          if (data['Realtime Currency Exchange Rate']) {
            const rate = parseFloat(data['Realtime Currency Exchange Rate']['5. Exchange Rate']);
            const previousRate = parseFloat(data['Realtime Currency Exchange Rate']['8. Bid Price']);
            const change = ((rate - previousRate) / previousRate) * 100;
            
            newPrices[symbol] = {
              price: rate,
              change: change
            };
          }
        }
        
        setCryptoPrices(newPrices);

        // Calculate approximate market cap based on BTC price and dominance
        const btcPrice = newPrices.BTC.price;
        const btcDominance = 0.5; // Assuming 50% dominance
        const totalMarketCap = (btcPrice * 19.5e6) / btcDominance; // 19.5M BTC in circulation
        setCryptoMarketCap(Math.round(totalMarketCap / 1e9)); // Convert to billions
      } catch (error) {
        console.error('Error fetching crypto prices:', error);
      }
    };

    fetchCryptoPrices();
    const interval = setInterval(fetchCryptoPrices, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [isCryptoMode]);

  // Add this effect to fetch crypto news
  useEffect(() => {
    const fetchCryptoNews = async () => {
      if (!isCryptoMode) return;
      
      try {
        const response = await fetch(
          `https://www.alphavantage.co/query?function=NEWS_SENTIMENT&topics=blockchain&apikey=${process.env.NEXT_PUBLIC_ALPHA_VANTAGE_KEY}`
        );
        const data = await response.json();
        
        if (data.feed) {
          const formattedNews = data.feed.map((item: any) => ({
            title: item.title,
            summary: item.summary,
            url: item.url,
            sentiment: item.overall_sentiment_label.toLowerCase().replace(/\s+/g, '_'),
            source: item.source,
            time: item.time
          }));
          setNews(formattedNews);
        }
      } catch (error) {
        console.error('Error fetching crypto news:', error);
      }
    };

    fetchCryptoNews();
    const interval = setInterval(fetchCryptoNews, 300000); // Update every 5 minutes
    return () => clearInterval(interval);
  }, [isCryptoMode]);

  // Add this effect to fetch global crypto data
  useEffect(() => {
    const fetchGlobalCryptoData = async () => {
      if (!isCryptoMode) return;
      
      try {
        const response = await fetch('https://api.coingecko.com/api/v3/global');
        const data = await response.json();
        
        if (data.data) {
          const globalData = data.data;
          setCryptoMarketCap(Math.round(globalData.total_market_cap.usd / 1e9)); // Convert to billions
          setCryptoVolume24h(Math.round(globalData.total_volume.usd / 1e9)); // Convert to billions
          
          // Get market dominance for BTC, ETH, and SOL
          const marketCaps = globalData.market_cap_percentage;
          setCryptoDominance({
            btc: marketCaps.btc || 0,
            eth: marketCaps.eth || 0,
            sol: marketCaps.sol || 0
          });
        }
      } catch (error) {
        console.error('Error fetching global crypto data:', error);
      }
    };

    fetchGlobalCryptoData();
    const interval = setInterval(fetchGlobalCryptoData, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [isCryptoMode]);

  // Add this helper function after the constants
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

  // Add useEffect for style injection
  useEffect(() => {
    const styleSheet = document.createElement("style");
    styleSheet.innerText = styles;
    document.head.appendChild(styleSheet);
    
    // Cleanup function to remove the style when component unmounts
    return () => {
      document.head.removeChild(styleSheet);
    };
  }, []);

  // Add these interfaces and state variables at the top of the DashboardPage component
  interface Message {
    role: 'user' | 'assistant';
    content: string;
    id: string;
  }

  // Add these state variables inside the DashboardPage component
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Hi! I\'m your SimuTrader CoPilot. How can I help you today?',
      id: 'welcome'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // State for CoPilot chat and confirmation
  const [pendingAction, setPendingAction] = useState<any>(null);
  const [confirmationMessage, setConfirmationMessage] = useState('');
  const [editableShares, setEditableShares] = useState<number>(0);
  const [thinkingState, setThinkingState] = useState<'thinking' | 'reasoning' | null>(null);

  // Add this function to scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingMessage]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // You could add a toast notification here
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  // Add this function to rewrite message content by prefilling the input
  const handleRewrite = (text: string) => {
    const rewritePrompt = `Please rewrite the following to be more professional:\n${text}`;
    setInput(rewritePrompt);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    const userMessageId = Date.now().toString();
    setMessages(prev => [...prev, { role: 'user', content: userMessage, id: userMessageId }]);
    setIsLoading(true);
    setStreamingMessage('');
    setThinkingState('thinking');

    try {
      // First check if it's a buy request
      const buyRequest = parseBuyRequest(userMessage);
      
      if (buyRequest) {
        setThinkingState(null);
        // Handle buy request without streaming
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: `You asked me to buy ${buyRequest.shares} shares of ${buyRequest.symbol}. Would you like to confirm this purchase?`,
          id: Date.now().toString()
        }]);
        
        setPendingAction({
          type: 'buy_stock',
          symbol: buyRequest.symbol,
          shares: buyRequest.shares
        });
        setConfirmationMessage(`You asked me to buy ${buyRequest.shares} shares of ${buyRequest.symbol}. Would you like to confirm this purchase?`);
        setEditableShares(buyRequest.shares);
        setIsLoading(false);
        return;
      }

      // For regular chat, use streaming
      setTimeout(() => {
        if (isLoading) setThinkingState('reasoning');
      }, 1500);
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          context: {
            selectedStock,
            portfolio,
            isCryptoMode,
            marketStatus,
            watchlist,
            portfolioMetrics,
            userId: profile?.id
          }
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader available');

      const decoder = new TextDecoder();
      let accumulatedMessage = '';
      setThinkingState(null);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim() !== '');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices[0]?.delta?.content || '';
              accumulatedMessage += content;
              setStreamingMessage(accumulatedMessage);
            } catch (e) {
              console.error('Error parsing streaming response:', e);
            }
          }
        }
      }

      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: accumulatedMessage,
        id: Date.now().toString()
      }]);
      setStreamingMessage('');
      
    } catch (error) {
      console.error('Error:', error);
      setThinkingState(null);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error. Please try again.',
        id: Date.now().toString()
      }]);
    } finally {
      setIsLoading(false);
      setThinkingState(null);
    }
  };

  // Confirmation handlers
  const handleConfirmPurchase = async () => {
    if (!pendingAction || !profile?.id) return;
    
    setIsLoading(true);
    try {
      console.log('Starting purchase:', { pendingAction, editableShares });
      
      // Fetch current stock price
      const alphaVantageKey = process.env.NEXT_PUBLIC_ALPHA_VANTAGE_KEY;
      if (!alphaVantageKey) {
        throw new Error('Alpha Vantage API key not configured');
      }
      
      const stockResponse = await fetch(
        `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${pendingAction.symbol}&apikey=${process.env.NEXT_PUBLIC_ALPHA_VANTAGE_KEY}`
      );
      
      if (!stockResponse.ok) {
        throw new Error(`Stock price fetch failed: ${stockResponse.status}`);
      }
      
      const stockData = await stockResponse.json();
      console.log('Stock data response:', stockData);
      
      if (!stockData['Global Quote']) {
        // Try to use a mock price for demo purposes
        console.warn('Could not fetch real price, using mock price');
        const mockPrice = 150 + Math.random() * 100; // Mock price between $150-250
        
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: `⚠️ Using demo price of $${mockPrice.toFixed(2)} for ${pendingAction.symbol} (real-time data unavailable)`,
          id: Date.now().toString()
        }]);
        
        const totalCost = mockPrice * editableShares;
        
        // Check if user has sufficient balance
        if (profile.balance < totalCost) {
          setMessages(prev => [...prev, { 
            role: 'assistant', 
            content: `Insufficient balance. You need $${totalCost.toFixed(2)} but only have $${profile.balance.toFixed(2)}`,
            id: Date.now().toString()
          }]);
          setPendingAction(null);
          return;
        }
        
        await executeTrade(pendingAction.symbol, editableShares, mockPrice, totalCost);
        return;
      }
      
      const currentPrice = parseFloat(stockData['Global Quote']['05. price']);
      console.log('Current price:', currentPrice);
      
      if (isNaN(currentPrice)) {
        throw new Error('Invalid price data received');
      }
      
      const totalCost = currentPrice * editableShares;
      console.log('Total cost:', totalCost);
      
      // Check if user has sufficient balance
      if (profile.balance < totalCost) {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: `Insufficient balance. You need $${totalCost.toFixed(2)} but only have $${profile.balance.toFixed(2)}`,
          id: Date.now().toString()
        }]);
        setPendingAction(null);
        return;
      }
      
      await executeTrade(pendingAction.symbol, editableShares, currentPrice, totalCost);
      
    } catch (error) {
      console.error('Error executing purchase:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `Failed to execute purchase: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
        id: Date.now().toString()
      }]);
      setPendingAction(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to execute the actual trade
  const executeTrade = async (symbol: string, shares: number, price: number, totalCost: number) => {
    if (!profile?.id) {
      throw new Error('User profile not available');
    }
    
    try {
      console.log('Executing trade:', { symbol, shares, price, totalCost });
      const currentProfile = profile;
       
      // Update user's balance
      const { error: balanceError } = await supabase
        .from('profiles')
        .update({ balance: currentProfile.balance - totalCost })
        .eq('id', currentProfile.id);
        
      if (balanceError) {
        console.error('Balance update error:', balanceError);
        throw new Error(`Failed to update balance: ${balanceError.message}`);
      }
      
      console.log('Balance updated successfully');
      
      // Check if user already owns this stock
      const { data: existingPosition, error: positionError } = await supabase
        .from('portfolio')
        .select('shares, average_price')
        .eq('user_id', currentProfile.id)
        .eq('symbol', symbol)
        .single();
         
      if (positionError && positionError.code !== 'PGRST116') {
        console.error('Position check error:', positionError);
        throw new Error(`Failed to check existing position: ${positionError.message}`);
      }
      
      console.log('Existing position:', existingPosition);
      
      if (existingPosition) {
        // Update existing position
        const newShares = existingPosition.shares + shares;
        const newAveragePrice = ((existingPosition.average_price * existingPosition.shares) + (price * shares)) / newShares;
        
        const { error: updateError } = await supabase
          .from('portfolio')
          .update({
            shares: newShares,
            average_price: newAveragePrice
          })
          .eq('user_id', currentProfile.id)
          .eq('symbol', symbol);
          
        if (updateError) {
          console.error('Portfolio update error:', updateError);
          throw new Error(`Failed to update portfolio: ${updateError.message}`);
        }
        
        console.log('Portfolio position updated');
      } else {
        // Create new position
        const { error: insertError } = await supabase
          .from('portfolio')
          .insert({
            user_id: currentProfile.id,
            symbol: symbol,
            shares: shares,
            average_price: price
          });
          
        if (insertError) {
          console.error('Portfolio insert error:', insertError);
          throw new Error(`Failed to create portfolio position: ${insertError.message}`);
        }
        
        console.log('New portfolio position created');
      }
      
      // Update profile state
      setProfile(prev => prev ? { ...prev, balance: currentProfile.balance - totalCost } : prev);
      
      // Add success message
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `✅ Successfully bought ${shares} shares of ${symbol} at $${price.toFixed(2)} per share for a total of $${totalCost.toFixed(2)}`,
        id: Date.now().toString()
      }]);
      
      // Clear pending action
      setPendingAction(null);
      setConfirmationMessage('');
      
      console.log('Trade executed successfully');
      
      // Refresh portfolio and balance data seamlessly
      await refreshPortfolioData();
      
    } catch (error) {
      // Re-throw error to be caught by handleConfirmPurchase
      throw error;
    }
  };

  // Function to refresh portfolio data without reloading the page
  const refreshPortfolioData = async () => {
    if (!profile?.id) return;
    
    try {
      console.log('Refreshing portfolio data...');
      
      // Refresh profile/balance
      const { data: updatedProfile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profile.id)
        .single();
        
      if (!profileError && updatedProfile) {
        setProfile(updatedProfile);
        console.log('Profile updated:', updatedProfile);
      }
      
      // Refresh portfolio with current prices (full calculation like the main useEffect)
      setPortfolioLoading(true);
      const { data: portfolioData, error: portfolioError } = await supabase
        .from('portfolio')
        .select('symbol, shares, average_price')
        .eq('user_id', profile.id);
        
      if (portfolioError) {
        console.error('Portfolio fetch error:', portfolioError);
        return;
      }
      
      if (portfolioData && portfolioData.length > 0) {
        // Fetch current prices for all portfolio items (same logic as main useEffect)
        const portfolioWithPrices = await Promise.all(
          portfolioData.map(async (item) => {
            try {
              const stockData = await fetchStock(item.symbol);
              const currentPrice = stockData.price;
              const totalValue = currentPrice * item.shares;
              const gainLoss = totalValue - (item.average_price * item.shares);
              const gainLossPercentage = (gainLoss / (item.average_price * item.shares)) * 100;

              return {
                ...item,
                current_price: currentPrice,
                total_value: totalValue,
                gain_loss: gainLoss,
                gain_loss_percentage: gainLossPercentage
              };
            } catch (error) {
              console.error(`Error fetching data for ${item.symbol}:`, error);
              return {
                ...item,
                current_price: 0,
                total_value: 0,
                gain_loss: 0,
                gain_loss_percentage: 0
              };
            }
          })
        );

        setPortfolio(portfolioWithPrices);
        console.log('Portfolio updated with prices:', portfolioWithPrices);

        // Calculate historical portfolio values
        try {
          const historicalData = await Promise.all(
            portfolioData.map(async (item) => {
              try {
                const stockData = await fetchStock(item.symbol, selectedTimeframe);
                return stockData.history.map(historyItem => ({
                  date: historyItem.timestamp,
                  value: historyItem.price * item.shares
                }));
              } catch (error) {
                console.error(`Error fetching historical data for ${item.symbol}:`, error);
                return [];
              }
            })
          );

          // Combine historical data from all stocks
          if (historicalData.length > 0 && historicalData[0].length > 0) {
            const combinedHistory = historicalData[0].map((_, index) => {
              const date = historicalData[0][index].date;
              const totalValue = historicalData.reduce((sum, stockHistory) => 
                sum + (stockHistory[index]?.value || 0), 0);
              return { date, value: totalValue };
            });

            setPortfolioHistory(combinedHistory);
            console.log('Portfolio history updated');
          }
        } catch (error) {
          console.error('Error calculating portfolio history:', error);
        }
      } else {
        // No portfolio data
        setPortfolio([]);
        setPortfolioHistory([]);
        setPortfolioMetrics({
          totalValue: 0,
          dailyReturn: 0,
          totalReturn: 0,
          totalCost: 0
        });
      }
      
      setPortfolioLoading(false);
      console.log('Portfolio data refresh completed');
    } catch (error) {
      console.error('Error refreshing portfolio data:', error);
      setPortfolioLoading(false);
    }
  };

  const handleCancelPurchase = () => {
    setPendingAction(null);
    setConfirmationMessage('');
    setMessages(prev => [...prev, { 
      role: 'assistant', 
      content: 'Purchase cancelled.',
      id: Date.now().toString()
    }]);
  };

  const handleUpdateShares = (newShares: number) => {
    setEditableShares(newShares);
  };

  // Function to parse buy requests (same as API)
  const parseBuyRequest = (message: string) => {
    const buyPatterns = [
      /buy\s+(\d+)\s+(?:shares?\s+of\s+|stocks?\s+of\s+)?([a-zA-Z]+)/i,
      /purchase\s+(\d+)\s+(?:shares?\s+of\s+|stocks?\s+of\s+)?([a-zA-Z]+)/i,
      /get\s+(\d+)\s+(?:shares?\s+of\s+|stocks?\s+of\s+)?([a-zA-Z]+)/i
    ];

    for (const pattern of buyPatterns) {
      const match = message.match(pattern);
      if (match) {
        return {
          shares: parseInt(match[1]),
          symbol: match[2].toUpperCase()
        };
      }
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <p className="text-white">Loading profile…</p>
      </div>
    );
  }
 
  return (
    <div className={`flex min-h-screen font-sans ${isCryptoMode ? 'bg-gray-900' : 'bg-black'}`}>
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
        {/* Market Ticker */}
   
 

        <div className="flex flex-col items-center p-8 space-y-6 w-full pr-[520px]">
          {/* User Info and Portfolio Allocation */}
          <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* User Info */}
            <div className="bg-gray-800/80 backdrop-blur-sm rounded-lg border border-gray-700/50 p-6">
              <div>
                <h1 className="text-xl font-semibold text-gray-300 mb-4">
                  Welcome back, {profile?.email}
                </h1>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Total Balance</p>
                    <p className="text-3xl font-semibold text-white tracking-tight">
                      ${profile?.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Total Return</p>
                      <p className={`text-lg font-semibold ${portfolioMetrics.totalReturn >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {portfolioLoading ? '----' : `${portfolioMetrics.totalReturn >= 0 ? '+' : ''}${portfolioMetrics.totalReturn.toFixed(2)}%`}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400 mb-1">24h Return</p>
                      <p className={`text-lg font-semibold ${portfolioMetrics.dailyReturn >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {portfolioLoading ? '----' : `${portfolioMetrics.dailyReturn >= 0 ? '+' : ''}${portfolioMetrics.dailyReturn.toFixed(2)}%`}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Portfolio Value</p>
                      <p className="text-lg font-semibold text-white">
                        {portfolioLoading ? '----' : `$${portfolioMetrics.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div> 
                      <p className="text-sm text-gray-400 mb-1">Total Cost</p>
                      <p className="text-lg font-semibold text-white">
                        {portfolioLoading ? '----' : `$${portfolioMetrics.totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Holdings</p>
                      <p className="text-lg font-semibold text-white">
                        {portfolioLoading ? '----' : portfolio.length}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Largest Position</p>
                      <p className="text-xl font-semibold text-white font-['SF_Pro_Display']">
                        {portfolioLoading ? '----' : portfolio.length > 0 ? 
                          portfolio.reduce((max, item) => 
                            (item.total_value ?? 0) > (max.total_value ?? 0) ? item : max
                          , portfolio[0]).symbol 
                          : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Portfolio Allocation */}
            <div className="flex items-center justify-center">
              <div className="w-full max-w-[300px]">
                <PortfolioPieChart portfolio={portfolio} loading={portfolioLoading} />
              </div>
            </div>
          </div>

          {/* Portfolio Performance and Stock Info Row */}
          <div className="w-full flex flex-row gap-8 mt-4">
            {/* Portfolio Stock Info List */}
            <div className="flex flex-col w-1/2 max-w-[340px] mx-auto">
              <h3 className="text-lg font-semibold text-white mb-3 text-center">Your Stocks</h3>
              <div className="flex flex-col items-start">
                {pagedPortfolio.length === 0 ? (
                  <div className="text-gray-500">No stocks in portfolio.</div>
                ) : (
                  pagedPortfolio.map((item) => {
                    const change = item.gain_loss_percentage ?? 0;
                    const price = item.current_price ?? 0;
                    return (
                      <div key={item.symbol} className="flex items-center gap-4 mb-3 w-full">
                        {logos[item.symbol] && (
                          <img 
                            src={logos[item.symbol]} 
                            alt={`${item.symbol} logo`} 
                            className="w-8 h-8 rounded-full object-contain bg-white mr-2"
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                          />
                        )}
                        <span className="font-bold text-xl text-white tracking-wide min-w-[60px]">{item.symbol}</span>
                        <span className="text-lg text-gray-200 font-mono">${price.toFixed(2)}</span>
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${change >= 0 ? 'bg-green-900 text-green-400' : 'bg-red-900 text-red-400'}`}>{change >= 0 ? '+' : ''}{change.toFixed(2)}%</span>
                      </div>
                    );
                  })
                )}
                {/* Pagination Button */}
                {portfolio.length > (portfolioPage + 1) * stocksPerPage && (
                  <button
                    className="mt-2 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition font-semibold"
                    onClick={() => setPortfolioPage((prev) => prev + 1)}
                  >
                    Load Next 5
                  </button>
                )}
                {portfolioPage > 0 && (
                  <button
                    className="mt-2 ml-2 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition font-semibold"
                    onClick={() => setPortfolioPage((prev) => prev - 1)}
                  > 
                    Previous
                  </button>
                )}
              </div>
            </div>
            {/* Portfolio Performance Graph on the right */}
            <div className="flex-1 flex justify-end">
              <div className="w-full max-w-xl bg-gray-800 rounded-lg p-4">
                <h3 className="text-lg text-center font-semibold text-white mb-3">Portfolio Performance</h3>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={portfolioHistory}>
                      <defs>
                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis 
                        dataKey="date" 
                        tick={{ fill: '#9CA3AF' }}
                        tickLine={{ stroke: '#4B5563' }}
                        axisLine={{ stroke: '#4B5563' }}
                      />
                      <YAxis 
                        tick={{ fill: '#9CA3AF' }}
                        tickLine={{ stroke: '#4B5563' }}
                        axisLine={{ stroke: '#4B5563' }}
                        tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                      />
                      <Tooltip
                        contentStyle={{ 
                          backgroundColor: '#1F2937',
                          border: '1px solid #374151',
                          borderRadius: '0.5rem',
                          color: '#F3F4F6'
                        }}
                        formatter={(value: number) => [`$${value.toLocaleString()}`, 'Portfolio Value']}
                        labelStyle={{ color: '#9CA3AF' }}
                      />
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
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
            </div>
          </div>

          {/* ChatGPT Copilot Section */}
          <div className="fixed right-0 top-0 w-[500px] h-screen bg-gradient-to-br from-[#181c2a] via-[#23294a] to-[#1a1d2b] shadow-xl flex flex-col border-l border-gray-700 overflow-y-auto">
            <div className="flex-1 flex flex-col justify-start items-center pt-12">
              <div className="w-full flex flex-col items-center">
                {/* Title */}
                <h1 className="text-6xl font-extrabold bg-gradient-to-r from-green-400 via-blue-400 to-purple-400 bg-clip-text text-transparent mb-6 text-center">CoPilot</h1>
                <p className="text-lg text-gray-200 mb-10 text-center font-medium">All of stocks and crypto, one trusted assistant</p>
                
                {/* Chat Messages */}
                <div className="w-full max-w-md flex-1 overflow-y-auto px-4 space-y-4 mb-4">
                  {messages.map((message) => (
                    <div key={message.id} className={`${message.role === 'user' ? 'ml-auto' : 'mr-auto'} max-w-[80%] group`}>
                      {/* Toolbar above assistant messages */}
                        {message.role === 'assistant' && (
                        <div className="flex space-x-1 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => copyToClipboard(message.content)}
                            className="p-1 rounded bg-gray-800 hover:bg-gray-700"
                            aria-label="Copy message"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400 hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleRewrite(message.content)}
                            className="p-1 rounded bg-gray-800 hover:bg-gray-700"
                            aria-label="Rewrite message"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400 hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.5 2.5l3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                        </div>
                      )}
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
                  
                  {streamingMessage && (
                    <div className="mr-auto max-w-[80%]">
                      <div className="bg-[#23294a] rounded-xl p-4 text-white">
                        <div className="prose prose-invert max-w-none break-words whitespace-pre-wrap">
                          {streamingMessage.split('\n').map((line, i) => (
                            <p key={i} className="mb-2 last:mb-0">{line}</p>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {(isLoading && !streamingMessage) || thinkingState ? (
                    <div className="mr-auto max-w-[80%]">
                      <div className="bg-[#23294a] rounded-xl p-4 text-white">
                        <div className="flex items-center space-x-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span className="animated-thinking-text">
                            {thinkingState === 'thinking' && 'Thinking...'}
                            {thinkingState === 'reasoning' && 'Reasoning...'}
                            {!thinkingState && 'Loading...'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ):(
                    <div ref={messagesEndRef} />
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Confirmation UI */}
                {pendingAction && (
                  <div className="w-full max-w-md px-4 mb-4">
                    <div className="bg-[#23294a] border border-yellow-400 rounded-xl p-4">
                      <h3 className="text-yellow-400 font-semibold mb-3">Confirm Purchase</h3>
                      <p className="text-white mb-4">{confirmationMessage}</p>
                      
                      <div className="flex items-center gap-3 mb-4">
                        <label className="text-white">Shares:</label>
                        <input
                          type="number"
                          value={editableShares}
                          onChange={(e) => handleUpdateShares(parseInt(e.target.value) || 0)}
                          className="bg-gray-700 text-white px-3 py-1 rounded border border-gray-600 w-20"
                          min="1"
                        />
                        <span className="text-gray-400">of {pendingAction.symbol}</span>
                      </div>
                      
                      <div className="flex gap-3">
                        <button
                          onClick={handleConfirmPurchase}
                          disabled={isLoading || editableShares <= 0}
                          className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-semibold transition-colors"
                        >
                          {isLoading ? 'Processing...' : 'Buy'}
                        </button>
                        <button
                          onClick={handleCancelPurchase}
                          disabled={isLoading}
                          className="flex-1 bg-gray-600 hover:bg-gray-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Input Form */}
                <form onSubmit={handleSubmit} className="w-full max-w-md px-4 mb-8">
                  <div className="relative">
                    <textarea
                      ref={textareaRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onInput={(e) => {
                        e.currentTarget.style.height = 'auto';
                        e.currentTarget.style.height = `${e.currentTarget.scrollHeight}px`;
                      }}
                      rows={1}
                      placeholder="Start with a question"
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
              </div>
            </div>
          </div>

          {/* ChatGPT-style Search Bar */}
          <div className="w-full max-w-3xl mb-8">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder={isCryptoMode 
                  ? "Search from over 2,000 cryptocurrencies..."
                  : "Search from over 20,000 U.S. Stocks, ETFs, and Mutual Funds..."}
                className={`w-full px-6 py-4 bg-gray-800 text-white border border-gray-700 rounded-xl shadow-lg focus:outline-none focus:ring-1 ${
                  isCryptoMode 
                    ? 'hover:border-purple-400 focus:border-purple-400 focus:ring-purple-400' 
                    : 'hover:border-green-500 focus:border-green-500 focus:ring-green-500'
                } text-lg transition-all duration-200 placeholder-shine`}
              />
              {!searchQuery && (
                <span className={`absolute ${isCryptoMode ? 'left-[22.9rem]' : 'left-[calc(32.519rem+1.5rem)]'} top-[calc(50%-0.1rem)] -translate-y-1/2 text-white animate-[pulse_0.9s_ease-in-out_infinite]`}>|</span>
              )}
              <button
                onClick={() => handleSearch(searchQuery)}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
              {isSearching && (
                <div className="absolute right-12 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-500"></div>
                </div>
              )}
              {showSearchResults && searchResults.length > 0 && (
                <div className="absolute z-10 w-full mt-2 bg-gray-800 border border-gray-700 rounded-xl shadow-lg max-h-96 overflow-auto">
                  {searchResults.map((result) => (
                    <div
                      key={result.symbol}
                      onClick={() => handleSelectStock(result.symbol)}
                      className="px-6 py-4 hover:bg-gray-700 cursor-pointer border-b border-gray-700 last:border-b-0 transition-colors duration-150"
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          {logos[result.symbol] && (
                            <img 
                              src={logos[result.symbol]} 
                              alt={`${result.symbol} logo`} 
                              className="w-8 h-8 rounded-full object-contain bg-white"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          )}
                          <div>
                            <p className="text-white font-medium text-lg">{result.symbol}</p>
                            <span className="text-xs text-gray-500">{result.region}</span>
                            <span className="text-xs text-gray-500 mt-1">{result.type}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Stock/Crypto Price History */}
          <div className={`w-full max-w-7xl p-6 ${isCryptoMode ? 'bg-black' : 'bg-gray-900'} rounded-lg shadow-lg ${isCryptoMode ? 'crypto-glow' : ''}`}> 
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-4">
                
                  <div className="flex items-center justify-center gap-2 ml-4">
                    <button
                      onClick={() => setShowBuyModal(true)}
                      className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-full shadow hover:from-green-600 hover:to-emerald-700 active:scale-95 transition-all font-semibold text-base"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
                      Buy
                    </button>
                    <button
                      onClick={() => setShowSellModal(true)}
                      className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-full shadow hover:from-red-600 hover:to-pink-600 active:scale-95 transition-all font-semibold text-base"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4"/></svg>
                      Sell
                    </button>
                    <button
                      onClick={isInWatchlist(selectedStock) ? () => handleRemoveFromWatchlist(selectedStock) : handleAddToWatchlist}
                      className={`flex items-center gap-2 px-5 py-2.5 ${isInWatchlist(selectedStock) ? 'bg-gradient-to-r from-yellow-400 to-yellow-500' : 'bg-gradient-to-r from-blue-500 to-indigo-500'} text-white rounded-full shadow hover:opacity-90 active:scale-95 transition-all font-semibold text-base`}
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.967a1 1 0 00.95.69h4.175c.969 0 1.371 1.24.588 1.81l-3.38 2.455a1 1 0 00-.364 1.118l1.287 3.966c.3.922-.755 1.688-1.54 1.118l-3.38-2.454a1 1 0 00-1.175 0l-3.38 2.454c-.784.57-1.838-.196-1.54-1.118l1.287-3.966a1 1 0 00-.364-1.118L2.05 9.394c-.783-.57-.38-1.81.588-1.81h4.175a1 1 0 00.95-.69l1.286-3.967z"/></svg>
                      {isInWatchlist(selectedStock) ? 'Watching' : 'Watch'}
                    </button>
                    {getSharesOwned(selectedStock) > 0 && (
                      <div className="px-4 py-2 bg-gray-700 text-white rounded-lg flex items-center gap-2 ml-auto">
                        <span className="text-sm">Current Position: {getSharesOwned(selectedStock)} {isCryptoMode ? 'Coins' : 'Shares'}</span>
                      </div>
                    )}
                  </div>
                </div>
              
            </div>
            {stocks[selectedStock]?.history ? (
              <div className="grid grid-cols-12 gap-6">
                {/* Main Content - Graph and Company Info */}
                <div className="col-span-8 space-y-6">
                  {/* Graph Section */}
                  <div className="bg-gray-800/80 backdrop-blur-sm rounded-lg border border-gray-700/50 p-6">
                    <div className="h-[400px] w-full">
                      {selectedStock ? (
                        <div className="relative h-full">
                          <TradingViewWidget symbol={selectedStock} />
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
                          <span className="ml-3 text-white">Loading chart...</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Company Info and Key Stats */}
                  {companyOverview && !isCryptoMode && (
                    <div className="bg-gray-800/80 backdrop-blur-sm rounded-lg border border-gray-700/50 p-6">
                      <div className="grid grid-cols-2 gap-8">
                        {/* Company Description */}
                        <div className="space-y-4">
                          <h3 className="text-xl font-bold text-white">About {companyOverview.Name}</h3>
                          <p className="text-gray-300 text-sm leading-relaxed">{companyOverview.Description}</p>
                          
                          <div className="grid grid-cols-2 gap-4 mt-4">
                            <div>
                              <p className="text-sm text-gray-400">Sector</p>
                              <p className="text-white font-medium">{companyOverview.Sector}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-400">Industry</p>
                              <p className="text-white font-medium">{companyOverview.Industry}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-400">Country</p>
                              <p className="text-white font-medium">{companyOverview.Country}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-400">Exchange</p>
                              <p className="text-white font-medium">{companyOverview.Exchange}</p>
                            </div>
                          </div>
                        </div>

                        {/* Key Statistics */}
                        <div className="space-y-4">
                          <h3 className="text-xl font-bold text-white">
                            Key Statistics
                            <InfoBubble title="Key Statistics" content={sectionInfo.keyStats} />
                          </h3>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm text-gray-400">Market Cap</p>
                              <p className="text-white font-medium">${Number(companyOverview.MarketCapitalization).toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-400"></p>
                            
                            </div>
                            <div>
                              <p className="text-sm text-gray-400">Revenue (TTM)</p>
                              <p className="text-white font-medium">${Number(companyOverview.RevenueTTM).toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-400"></p>
                            
                            </div>
                            
                            <div>
                              <p className="text-sm text-gray-400">P/E Ratio</p>
                              <p className="text-white font-medium">{companyOverview.PERatio}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-400">Forward P/E</p>
                              <p className="text-white font-medium">{companyOverview.ForwardPE}</p>
                            </div>

                            <div>
                              <p className="text-sm text-gray-400">PEG Ratio</p>
                              <p className="text-white font-medium">{companyOverview.PEGRatio}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-400">EPS</p>
                              <p className="text-white font-medium">${companyOverview.EPS}</p>
                            </div>

                            <div>
                              <p className="text-sm text-gray-400">Profit Margin</p>
                              <p className="text-white font-medium">{companyOverview.ProfitMargin}%</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-400">Operating Margin</p>
                              <p className="text-white font-medium">{companyOverview.OperatingMarginTTM}%</p>
                            </div>

                            <div>
                              <p className="text-sm text-gray-400">Return on Equity</p>
                              <p className="text-white font-medium">{companyOverview.ReturnOnEquityTTM}%</p>
                            </div>
                         

                            <div>
                              <p className="text-sm text-gray-400">Dividend Yield</p>
                              <p className="text-white font-medium">{companyOverview.DividendYield}%</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-400">52 Week High</p>
                              <p className="text-white font-medium">${companyOverview['52WeekHigh']}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-400">52 Week Low</p>
                              <p className="text-white font-medium">${companyOverview['52WeekLow']}</p>
                            </div>

                            <div>
                              <p className="text-sm text-gray-400">Beta</p>
                              <p className="text-white font-medium">{companyOverview.Beta}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-400">Analyst Target</p>
                              <p className="text-white font-medium">${companyOverview.AnalystTargetPrice}</p>
                            </div>

                            <div>
                              <p className="text-sm text-gray-400">Quarterly Growth (YoY)</p>
                              <p className="text-white font-medium">{companyOverview.QuarterlyEarningsGrowthYOY}%</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-400">Revenue Growth (YoY)</p>
                              <p className="text-white font-medium">{companyOverview.QuarterlyRevenueGrowthYOY}%</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Sidebar - Today's Trading and Technical Indicators */}
                <div className="col-span-4 space-y-6">
                  {/* Today's Trading */}
                  <div className="bg-gray-800/80 backdrop-blur-sm rounded-lg border border-gray-700/50 p-6">
                    <h4 className="text-lg font-bold text-white mb-4 border-b border-gray-700/50 pb-2">
                      Today's Trading
                      <InfoBubble title="Today's Trading" content={sectionInfo.trading} />
                    </h4>
                    {stocks[selectedStock]?.dailyData ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-gray-400 mb-1">Open</p>
                            <p className="text-base font-semibold text-white">
                              ${stocks[selectedStock].dailyData.open.toFixed(2)}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-400 mb-1">High</p>
                            <p className="text-base font-semibold text-white">
                              ${stocks[selectedStock].dailyData.high.toFixed(2)}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-400 mb-1">Low</p>
                            <p className="text-base font-semibold text-white">
                              ${stocks[selectedStock].dailyData.low.toFixed(2)}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-400 mb-1">Close</p>
                            <p className="text-base font-semibold text-white">
                              ${stocks[selectedStock].dailyData.close.toFixed(2)}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-400 mb-1">Change</p>
                            <p className={`text-base font-semibold ${stocks[selectedStock].dailyData.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                              {stocks[selectedStock].dailyData.change >= 0 ? '+' : ''}{stocks[selectedStock].dailyData.change.toFixed(2)}%
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-400 mb-1">Volume</p>
                            <p className="text-base font-semibold text-white">
                              {stocks[selectedStock].dailyData.volume.toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="animate-pulse space-y-4">
                        <div className="h-4 bg-gray-700 rounded w-3/4"></div>
                        <div className="h-4 bg-gray-700 rounded w-1/2"></div>
                      </div>
                    )}
                  </div>

                  {/* Technical Indicators */}
                  <div className="bg-gray-800/80 backdrop-blur-sm rounded-lg border border-gray-700/50 p-6">
                    <h4 className="text-lg font-bold text-white mb-4 border-b border-gray-700/50 pb-2">
                      Technical Indicators
                      <InfoBubble title="Technical Indicators" content={sectionInfo.technical} />
                    </h4>
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-gray-400 mb-1">RSI (14)</p>
                        <p className="text-base font-semibold text-white">58.2</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-400 mb-1">MACD</p>
                        <p className="text-base font-semibold text-white">2.5</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-400 mb-1">Moving Avg (50)</p>
                        <p className="text-base font-semibold text-white">${stocks[selectedStock].price.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Latest News */}
                  <div className="bg-gray-800/80 backdrop-blur-sm rounded-lg border border-gray-700/50 p-6">
                    <h4 className="text-lg font-bold text-white mb-4 border-b border-gray-700/50 pb-2">
                      Latest News
                      <InfoBubble title="Latest News" content="Recent news articles about the selected stock with sentiment analysis." />
                    </h4>
                    <CompactNewsCard items={news} />
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-white">Loading graph…</p>
            )}
          </div>

          {/* Portfolio Section */}
          <div className={`w-full max-w-6xl p-6 ${isCryptoMode ? 'bg-purple-900/50' : 'bg-gray-900'} rounded-lg shadow-lg mt-6 ${isCryptoMode ? 'crypto-glow' : ''}`}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-xl text-white">Your Portfolio</h3>
            </div>

            {portfolioLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
                <span className="ml-3 text-white">Loading portfolio...</span>
              </div>
            ) : portfolio.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400">Your portfolio is empty. Start by buying some stocks!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {portfolio.map((item) => (
                  <div key={item.symbol} className="p-4 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        {logos[item.symbol] && (
                          <img 
                            src={logos[item.symbol]} 
                            alt={`${item.symbol} logo`} 
                            className="w-8 h-8 rounded-full object-contain bg-white"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        )}
                        <div>
                          <h4 className="text-lg font-semibold text-white">{item.symbol}</h4>
                          <p className="text-sm text-gray-400">{item.shares} shares</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleSelectStock(item.symbol)}
                        className="text-green-500 hover:text-green-400"
                      >
                        View Details
                      </button>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-400">Avg. Price</span>
                        <span className="text-sm text-white">${item.average_price.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-400">Current Price</span>
                        <span className="text-sm text-white">${item.current_price?.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-400">Total Value</span>
                        <span className="text-sm text-white">${item.total_value?.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-400">Gain/Loss</span>
                        <span className={`text-sm font-medium ${(item.gain_loss ?? 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {(item.gain_loss ?? 0) >= 0 ? '+' : ''}{item.gain_loss?.toFixed(2)} ({item.gain_loss_percentage?.toFixed(2)}%)
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-700">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-400">Position</span>
                        <span className="text-sm text-white">
                          {((item.current_price || 0) * item.shares).toLocaleString('en-US', {
                            style: 'currency',
                            currency: 'USD'
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Buy Stock Modal */}
          {showBuyModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-gray-800 p-6 rounded-lg w-full max-w-md">
                <h3 className="text-xl font-bold text-white mb-4">Buy {selectedStock}</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Number of Shares
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={shareAmount}
                      onChange={(e) => setShareAmount(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  
                  <div className="bg-gray-700 p-4 rounded-lg space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-300">Price per share:</span>
                      <span className="text-white">${stocks[selectedStock].price.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-300">Total cost:</span>
                      <span className="text-white">${(stocks[selectedStock].price * shareAmount).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-300">Available balance:</span>
                      <span className="text-white">${profile?.balance.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-300">Balance after purchase:</span>
                      <span className="text-white">${((profile?.balance || 0) - (stocks[selectedStock].price * shareAmount)).toFixed(2)}</span>
                    </div>
                    <div className="border-t border-gray-600 pt-3 mt-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-300">24h Change:</span>
                        <span className={`${stocks[selectedStock].change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {stocks[selectedStock].change >= 0 ? '+' : ''}{stocks[selectedStock].change.toFixed(2)}%
                        </span>
                      </div>
                      <div className="flex justify-between text-sm mt-1">
                        <span className="text-gray-300">Market Cap:</span>
                        <span className="text-white">${(stocks[selectedStock].marketData?.marketCap || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm mt-1">
                        <span className="text-gray-300">Avg Volume:</span>
                        <span className="text-white">{(stocks[selectedStock].marketData?.avgVolume || 0).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  
                  {buyError && (
                    <p className="text-red-500 text-sm">{buyError}</p>
                  )}
                  
                  <div className="flex justify-end gap-4 mt-6">
                    <button
                      onClick={() => {
                        setShowBuyModal(false);
                        setShareAmount(1);
                        setBuyError(null);
                      }}
                      className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleBuyStock}
                      disabled={buyLoading}
                      className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {buyLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>Processing...</span>
                        </>
                      ) : (
                        'Confirm Purchase'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Sell Stock Modal */}
          {showSellModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-gray-800 p-6 rounded-lg w-full max-w-md">
                <h3 className="text-xl font-bold text-white mb-4">Sell {selectedStock}</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Number of Shares
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={sellAmount}
                      onChange={(e) => setSellAmount(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  
                  <div className="bg-gray-700 p-4 rounded-lg space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-300">Price per share:</span>
                      <span className="text-white">${stocks[selectedStock].price.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-300">Total value:</span>
                      <span className="text-white">${(stocks[selectedStock].price * sellAmount).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">        
                      <span className="text-gray-300">Current balance:</span>
                      <span className="text-white">${profile?.balance.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-300">Balance after sale:</span>
                      <span className="text-white">${((profile?.balance || 0) + (stocks[selectedStock].price * sellAmount)).toFixed(2)}</span>
                    </div>
                    <div className="border-t border-gray-600 pt-3 mt-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-300">24h Change:</span>
                        <span className={`${stocks[selectedStock].change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {stocks[selectedStock].change >= 0 ? '+' : ''}{stocks[selectedStock].change.toFixed(2)}%
                        </span>
                      </div>
                      <div className="flex justify-between text-sm mt-1">
                        <span className="text-gray-300">Market Cap:</span>
                        <span className="text-white">${(stocks[selectedStock].marketData?.marketCap || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm mt-1">
                        <span className="text-gray-300">Avg Volume:</span>
                        <span className="text-white">{(stocks[selectedStock].marketData?.avgVolume || 0).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  
                  {sellError && (
                    <p className="text-red-500 text-sm">{sellError}</p>
                  )}
                  
                  <div className="flex justify-end gap-4 mt-6">
                    <button
                      onClick={() => {
                        setShowSellModal(false);
                        setSellAmount(1);
                        setSellError(null);
                      }}
                      className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSellStock}
                      disabled={sellLoading}
                      className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {sellLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>Processing...</span>
                        </>
                      ) : (
                        'Confirm Sale'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}