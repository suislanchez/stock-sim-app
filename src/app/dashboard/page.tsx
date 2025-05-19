"use client";
import React, { useState, useEffect, useRef } from "react";
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
const COLORS = ['#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#EF4444', '#6366F1', '#14B8A6'];

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
      <div className="bg-gray-800 p-4 rounded-lg flex items-center justify-center">
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
    <div className="bg-gray-800 p-4 rounded-lg flex items-center justify-center">
      <div className="w-[18rem] h-[18rem] flex-shrink-0 pie-chart-container relative">
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
              innerRadius={60}
              outerRadius={120}
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
              className="text-white text-lg font-bold"
              style={{
                opacity: animationPhase === 'initial' ? 0 : 1,
                transition: 'opacity 0.5s ease-out',
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
                    <div className="bg-gray-900/95 backdrop-blur-sm p-4 rounded-xl border border-gray-700/50 shadow-xl transform -translate-y-28 z-50 min-w-[200px]">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-white font-semibold text-lg">{data.name}</span>
                        <span className="text-gray-400 text-sm">{percentage}%</span>
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400 text-sm">Value</span>
                          <span className="text-white font-medium">${data.value.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400 text-sm">Shares</span>
                          <span className="text-white font-medium">${data.shares.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400 text-sm">Return</span>
                          <span className={`font-medium ${data.gainLossPercentage >= 0 ? 'text-green-400' : 'text-red-400'}`}>
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
      <div className="ml-12 space-y-3 min-w-[2px]">
        {data.map((entry, index) => {
          const percentage = ((entry.value / totalValue) * 100).toFixed(1);
          return (
            <div 
              key={entry.name}
              className="flex items-center space-x-2 cursor-pointer group"
              onMouseEnter={() => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
            >
              <div 
                className="w-3 h-3 rounded-full transition-all duration-150"
                style={{ 
                  backgroundColor: COLORS[index % COLORS.length],
                  transform: activeIndex === index ? 'scale(1.2)' : 'scale(1)',
                }}
              />
              <span className="text-gray-300 text-sm group-hover:text-white transition-colors duration-150">{entry.name}</span>
              <span className="text-gray-400 text-sm group-hover:text-gray-300 transition-colors duration-150">{percentage}%</span>
            </div>
          );
        })}
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
      let totalValue = 0;
      let totalCost = 0;
      let previousDayValue = 0;

      for (const item of portfolio) {
        const stockData = await fetchStock(item.symbol);
        const currentValue = stockData.price * item.shares;
        const costBasis = item.average_price * item.shares;
        
        totalValue += currentValue;
        totalCost += costBasis;

        // Calculate previous day's value
        const previousPrice = stockData.price / (1 + (stockData.change / 100));
        previousDayValue += previousPrice * item.shares;
      }

      const dailyReturn = ((totalValue - previousDayValue) / previousDayValue) * 100;
      const totalReturn = ((totalValue - totalCost) / totalCost) * 100;

      setPortfolioMetrics({
        totalValue,
        dailyReturn,
        totalReturn,
        totalCost
      });
    };

    calculateMetrics();
  }, [portfolio]);

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

  // Update the sentiment mapping constants
  const sentimentColors = {
    bullish: 'bg-green-500/20 text-green-400 border-green-500/30',
    somewhat_bullish: 'bg-green-500/10 text-green-300 border-green-500/20',
    neutral: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    somewhat_bearish: 'bg-red-500/10 text-red-300 border-red-500/20',
    bearish: 'bg-red-500/20 text-red-400 border-red-500/30'
  } as const;

  const sentimentLabels = {
    bullish: 'Bullish',
    somewhat_bullish: 'Somewhat Bullish',
    neutral: 'Neutral',
    somewhat_bearish: 'Somewhat Bearish',
    bearish: 'Bearish'
  } as const;

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <p className="text-white">Loading profile…</p>
      </div>
    );
  }
 
  return (
    <div className={`flex flex-col items-center min-h-screen ${isCryptoMode ? 'bg-gray-900' : 'bg-black'}`}>
      {/* Professional Navigation Bar */}
      <nav className="w-full bg-gray-900/95 backdrop-blur-sm border-b border-gray-800/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <img src="/logo.png" alt="SimuTrader Logo" className="w-14 h-14 rounded-full mr-3" />
              <span className={`text-xl font-bold ${isCryptoMode ? 'crypto-text' : 'bg-gradient-to-r from-green-400 to-green-600 bg-clip-text text-transparent'}`}>SimuTrader AI</span>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setIsCryptoMode(!isCryptoMode)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                  isCryptoMode 
                    ? 'bg-green-600/80 text-white hover:bg-green-700/80' 
                    : 'bg-purple-500 text-white hover:bg-purple-600'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2v8M12 14v8M4.93 4.93l4.24 4.24M14.83 14.83l4.24 4.24M2 12h8M14 12h8M4.93 19.07l4.24-4.24M14.83 9.17l4.24-4.24"/>
                </svg>
                {isCryptoMode ? 'Switch to Stocks' : 'Switch to Crypto'}
              </button>
              <a href="/dashboard" className={`${isCryptoMode ? 'crypto-text' : 'text-gray-300'} hover:text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800/50 transition-all duration-200`}>Dashboard</a>
              <a href="/about" className={`${isCryptoMode ? 'crypto-text' : 'text-gray-300'} hover:text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800/50 transition-all duration-200`}>About</a>
              <a href="/portfolio" className={`${isCryptoMode ? 'crypto-text' : 'text-gray-300'} hover:text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800/50 transition-all duration-200`}>Portfolio</a>
              <a href="/account" className={`${isCryptoMode ? 'crypto-text' : 'text-gray-300'} hover:text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800/50 transition-all duration-200`}>Account</a>
              <a href="/settings" className={`${isCryptoMode ? 'crypto-text' : 'text-gray-300'} hover:text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800/50 transition-all duration-200`}>Settings</a>
            </div>
          </div>
        </div>
      </nav>

      {/* Market Ticker */}
      <div className={`w-full ${isCryptoMode ? 'bg-purple-900/80' : 'bg-gray-800'} border-b ${isCryptoMode ? 'border-purple-800' : 'border-gray-700'} overflow-hidden`}>
        <div className="ticker-container py-2">
          <div className={`ticker-track ${isCryptoMode ? 'crypto-shine' : ''}`}>
            {isCryptoMode ? (
              <>
                <div className="flex">
                  <span className="text-white mx-4">BTC: ${cryptoPrices.BTC.price.toFixed(2)} ({cryptoPrices.BTC.change >= 0 ? '+' : ''}{cryptoPrices.BTC.change.toFixed(2)}%)</span>
                  <span className="text-white mx-4">ETH: $    1                                                                                                                                     {cryptoPrices.ETH.price.toFixed(2)} ({cryptoPrices.ETH.change >= 0 ? '+' : ''}{cryptoPrices.ETH.change.toFixed(2)}%)</span>
                  <span className="text-white mx-4">SOL: ${cryptoPrices.SOL.price.toFixed(2)} ({cryptoPrices.SOL.change >= 0 ? '+' : ''}{cryptoPrices.SOL.change.toFixed(2)}%)</span>
                  {news.map((item, index) => (
                    <a
                      key={index}
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white hover:text-purple-400 mx-4 transition-colors duration-200"
                    >
                      {item.title}
                    </a>
                  ))}
                </div>
                <div className="flex">
                  <span className="text-white mx-4">BTC: ${cryptoPrices.BTC.price.toFixed(2)} ({cryptoPrices.BTC.change >= 0 ? '+' : ''}{cryptoPrices.BTC.change.toFixed(2)}%)</span>
                  <span className="text-white mx-4">ETH: ${cryptoPrices.ETH.price.toFixed(2)} ({cryptoPrices.ETH.change >= 0 ? '+' : ''}{cryptoPrices.ETH.change.toFixed(2)}%)</span>
                  <span className="text-white mx-4">SOL: ${cryptoPrices.SOL.price.toFixed(2)} ({cryptoPrices.SOL.change >= 0 ? '+' : ''}{cryptoPrices.SOL.change.toFixed(2)}%)</span>
                  {news.map((item, index) => (
                    <a
                      key={`dup-${index}`}
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white hover:text-purple-400 mx-4 transition-colors duration-200"
                    >
                      {item.title}
                    </a>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="flex">
                  <span className="text-white mx-4">S&P 500: 4,783.45 (+0.32%)</span>
                  <span className="text-white mx-4">Dow Jones: 37,305.16 (+0.07%)</span>
                  <span className="text-white mx-4">Nasdaq: 14,963.23 (+0.09%)</span>
                  {tickerNews.map((item, index) => (
                    <a
                      key={index}
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white hover:text-green-400 mx-4 transition-colors duration-200"
                    >
                      {item.title}
                    </a>
                  ))}
                </div>
                <div className="flex">
                  <span className="text-white mx-4">S&P 500: 4,783.45 (+0.32%)</span>
                  <span className="text-white mx-4">Dow Jones: 37,305.16 (+0.07%)</span>
                  <span className="text-white mx-4">Nasdaq: 14,963.23 (+0.09%)</span>
                  {tickerNews.map((item, index) => (
                    <a
                      key={`dup-${index}`}
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white hover:text-green-400 mx-4 transition-colors duration-200"
                    >
                      {item.title}
                    </a>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
        </div>

      <div className="flex flex-col items-center p-8 space-y-6 w-full">
        {/* User Info, Graph, and Pie Chart Side by Side */}
        <div className="w-full">
          <div className="flex flex-col lg:flex-row gap-8 w-full mb-8 items-stretch">
            {/* User Info */}
            <div className="flex-1 min-w-[250px] max-w-md flex flex-col justify-center">
              <div>
                <h1 className="text-xl text-gray-400 mb-4">
                  Welcome back, {profile?.email}
                </h1>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Total Balance</p>
                    <p className="text-5xl font-semibold text-white font-['SF_Pro_Display'] tracking-tight">
                      ${profile?.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-8">
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Total Return</p>
                      <p className={`text-2xl font-semibold ${portfolioMetrics.totalReturn >= 0 ? 'text-green-500' : 'text-red-500'} font-['SF_Pro_Display']`}>
                        {portfolioLoading ? '----' : `${portfolioMetrics.totalReturn >= 0 ? '+' : ''}${portfolioMetrics.totalReturn.toFixed(2)}%`}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400 mb-1">24h Return</p>
                      <p className={`text-2xl font-semibold ${portfolioMetrics.dailyReturn >= 0 ? 'text-green-500' : 'text-red-500'} font-['SF_Pro_Display']`}>
                        {portfolioLoading ? '----' : `${portfolioMetrics.dailyReturn >= 0 ? '+' : ''}${portfolioMetrics.dailyReturn.toFixed(2)}%`}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Portfolio Value</p>
                      <p className="text-2xl font-semibold text-white font-['SF_Pro_Display']">
                        {portfolioLoading ? '----' : `$${portfolioMetrics.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-8 mt-4">
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Total Cost</p>
                      <p className="text-2xl font-semibold text-white font-['SF_Pro_Display']">
                        {portfolioLoading ? '----' : `$${portfolioMetrics.totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Holdings</p>
                      <p className="text-2xl font-semibold text-white font-['SF_Pro_Display']">
                        {portfolioLoading ? '----' : portfolio.length}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Largest Position</p>
                      <p className="text-2xl font-semibold text-white font-['SF_Pro_Display']">
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
            {/* Graph */}
            <div className="flex-1 min-w-[220px] max-w-lg bg-gray-800 rounded-lg p-4 flex items-center justify-center">
              <ResponsiveContainer width="100%" height={260}>
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
            {/* Pie Chart */}
            <div className="flex-1 min-w-[220px] max-w-lg bg-gray-800 rounded-lg p-4 flex items-center justify-center">
              <PortfolioPieChart portfolio={portfolio} loading={portfolioLoading} />
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-6 justify-center">
          <a
            href="/portfolio"
            className={`group relative px-8 py-4 bg-transparent text-white border-2 ${
              isCryptoMode 
                ? 'border-purple-500 hover:border-purple-400' 
                : 'border-green-500 hover:border-green-400'
            } rounded-xl shadow-lg transition-all duration-300 text-lg font-semibold flex items-center gap-2 overflow-hidden hover:scale-105 hover:shadow-xl`}
          >
            <div className={`absolute inset-0 ${
              isCryptoMode 
                ? 'bg-purple-500/10 group-hover:bg-purple-500/20' 
                : 'bg-green-500/10 group-hover:bg-green-500/20'
            } transition-all duration-300`}></div>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 transform group-hover:scale-110 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span className="relative z-10">View Portfolio</span>
          </a>
          <button
            onClick={() => setShowSearch(true)}
            className={`group relative px-8 py-4 bg-transparent text-white border-2 ${
              isCryptoMode 
                ? 'border-purple-500 hover:border-purple-400' 
                : 'border-green-500 hover:border-green-400'
            } rounded-xl shadow-lg transition-all duration-300 text-lg font-semibold flex items-center gap-2 overflow-hidden hover:scale-105 hover:shadow-xl`}
          >
            <div className={`absolute inset-0 ${
              isCryptoMode 
                ? 'bg-purple-500/10 group-hover:bg-purple-500/20' 
                : 'bg-green-500/10 group-hover:bg-green-500/20'
            } transition-all duration-300`}></div>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 transform group-hover:scale-110 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span className="relative z-10">Search</span>
          </button>
          <Link
            href="/leaderboard"   
            className={`group relative px-8 py-4 bg-transparent text-white border-2 ${
              isCryptoMode 
                ? 'border-purple-500 hover:border-purple-400' 
                : 'border-green-500 hover:border-green-400'
            } rounded-xl shadow-lg transition-all duration-300 text-lg font-semibold flex items-center gap-2 overflow-hidden hover:scale-105 hover:shadow-xl`}
          >
            <div className={`absolute inset-0 ${
              isCryptoMode 
                ? 'bg-purple-500/10 group-hover:bg-purple-500/20' 
                : 'bg-green-500/10 group-hover:bg-green-500/20'
            } transition-all duration-300`}></div>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 transform group-hover:scale-110 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="relative z-10">Leaderboard</span>
          </Link>
          <a
            href="/watchlist"
            className={`group relative px-8 py-4 bg-transparent text-white border-2 ${
              isCryptoMode 
                ? 'border-purple-500 hover:border-purple-400' 
                : 'border-green-500 hover:border-green-400'
            } rounded-xl shadow-lg transition-all duration-300 text-lg font-semibold flex items-center gap-2 overflow-hidden hover:scale-105 hover:shadow-xl`}
          >
            <div className={`absolute inset-0 ${
              isCryptoMode 
                ? 'bg-purple-500/10 group-hover:bg-purple-500/20' 
                : 'bg-green-500/10 group-hover:bg-green-500/20'
            } transition-all duration-300`}></div>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 transform group-hover:scale-110 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
            <span className="relative z-10">Watchlist</span>
          </a>
        </div>

        {/* Top Stocks/Crypto */}
        <div className="w-full max-w-7xl">
          <div className="flex gap-6">
            {/* Category Selector Sidebar */}
            {!showWatchlist && !isCryptoMode && (
              <div className="w-48 flex-shrink-0">
                <div className="sticky top-24 space-y-2">
                  <h3 className="text-lg font-semibold text-white mb-4">
                    Categories
                    <InfoBubble
                      title="Stock Categories"
                      content="Categories help organize stocks by sector or theme, making it easier to find and analyze related companies. Each category represents a different segment of the market."
                    />
                  </h3>
                  <div
                    onClick={() => {
                      setCurrentCategory('magnificent7');
                      setCurrentStockIndex(0);
                    }}
                    className={`w-full px-4 py-3 rounded-lg transition-all duration-200 text-left cursor-pointer ${
                      currentCategory === 'magnificent7'
                        ? 'bg-green-500 text-white' 
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    Magnificent 7
                  </div>
                  <div
                    onClick={() => {
                      setCurrentCategory('techGiants');
                      setCurrentStockIndex(0);
                    }}
                    className={`w-full px-4 py-3 rounded-lg transition-all duration-200 text-left cursor-pointer ${
                      currentCategory === 'techGiants'
                        ? 'bg-green-500 text-white' 
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    Tech Giants
                    <InfoBubble title="Tech Giants" content={categoryInfo.techGiants} />
                  </div>
                  <div
                    onClick={() => {
                      setCurrentCategory('financial');
                      setCurrentStockIndex(0);
                    }}
                    className={`w-full px-4 py-3 rounded-lg transition-all duration-200 text-left cursor-pointer ${
                      currentCategory === 'financial'
                        ? 'bg-green-500 text-white' 
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    Financial Sector
                    <InfoBubble title="Financial Sector" content={categoryInfo.financial} />
                  </div>
                  <div
                    onClick={() => {
                      setCurrentCategory('healthcare');
                      setCurrentStockIndex(0);
                    }}
                    className={`w-full px-4 py-3 rounded-lg transition-all duration-200 text-left cursor-pointer ${
                      currentCategory === 'healthcare'
                        ? 'bg-green-500 text-white' 
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    Healthcare
                    <InfoBubble title="Healthcare" content={categoryInfo.healthcare} />
                  </div>
                  <div
                    onClick={() => {
                      setCurrentCategory('energy');
                      setCurrentStockIndex(0);
                    }}
                    className={`w-full px-4 py-3 rounded-lg transition-all duration-200 text-left cursor-pointer ${
                      currentCategory === 'energy'
                        ? 'bg-green-500 text-white' 
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    Energy
                    <InfoBubble title="Energy" content={categoryInfo.energy} />
                  </div>
                  <div
                    onClick={() => {
                      setCurrentCategory('consumer');
                      setCurrentStockIndex(0);
                    }}
                    className={`w-full px-4 py-3 rounded-lg transition-all duration-200 text-left cursor-pointer ${
                      currentCategory === 'consumer'
                        ? 'bg-green-500 text-white' 
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    Consumer Goods
                    <InfoBubble title="Consumer Goods" content={categoryInfo.consumer} />
                  </div>
                </div>
              </div>
            )}

            {/* Main Content */}
            <div className="flex-1">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold text-white">
                  {showWatchlist ? 'Watchlist' : isCryptoMode ? 'Top Cryptocurrencies' : 'Top Stocks'}
                </h2>
                <div className="flex gap-4">
                  <button
                    onClick={() => setShowWatchlist(!showWatchlist)}
                    className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    {showWatchlist ? `Show Top ${isCryptoMode ? 'Cryptocurrencies' : 'Stocks'}` : 'Show Watchlist'}
                  </button>
                </div>
              </div>

              <div className="relative">
                <div className="flex items-center">
                  <button
                    onClick={() => setCurrentStockIndex(prev => Math.max(0, prev - 3))}
                    disabled={currentStockIndex === 0}
                    className={`absolute left-0 z-10 p-2 rounded-full bg-gray-800 text-white hover:bg-gray-700 transition-colors ${currentStockIndex === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    ←
                  </button>
                  <div className="grid grid-cols-3 gap-6 mb-8 w-full px-12">
                    {showWatchlist ? (
                      watchlistLoading ? (
                        <div className="col-span-full text-center py-8">
                          <p className="text-white">Loading watchlist...</p>
                        </div>
                      ) : watchlist.length === 0 ? (
                        <div className="col-span-full text-center py-8">
                          <p className="text-gray-400">Your watchlist is empty</p>
                        </div>
                      ) : (
                        watchlist.slice(currentStockIndex, currentStockIndex + 3).map((item) => (
                          <div key={item.symbol} className="bg-gray-900 rounded-lg shadow-lg overflow-hidden max-w-md mx-auto w-full">
                            <TradingViewMiniWidget symbol={item.symbol} />
                          </div>
                        ))
                      )
                    ) : (
                      (isCryptoMode ? defaultCryptoTickers : stockCategories[currentCategory])
                        .slice(currentStockIndex, currentStockIndex + 3)
                        .map((symbol) => (
                          <div key={symbol} className="bg-gray-900 rounded-lg shadow-lg overflow-hidden max-w-md mx-auto w-full">
                            <TradingViewMiniWidget symbol={symbol} />
                          </div>
                        ))
                    )}
                  </div>
                  <button
                    onClick={() => setCurrentStockIndex(prev => {
                      const maxIndex = showWatchlist 
                        ? Math.max(0, watchlist.length - 3) 
                        : Math.max(0, (isCryptoMode ? defaultCryptoTickers : stockCategories[currentCategory]).length - 3);
                      return Math.min(maxIndex, prev + 3);
                    })}
                    disabled={showWatchlist 
                      ? currentStockIndex >= watchlist.length - 3 
                      : currentStockIndex >= (isCryptoMode ? defaultCryptoTickers : stockCategories[currentCategory]).length - 3}
                    className={`absolute right-0 z-10 p-2 rounded-full bg-gray-800 text-white hover:bg-gray-700 transition-colors ${
                      (showWatchlist 
                        ? currentStockIndex >= watchlist.length - 3 
                        : currentStockIndex >= (isCryptoMode ? defaultCryptoTickers : stockCategories[currentCategory]).length - 3) 
                        ? 'opacity-50 cursor-not-allowed' 
                        : ''
                    }`}
                  >
                    →
                  </button>
                </div>
              </div>
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
                          <p className="text-sm text-gray-400">{result.name}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-xs text-gray-500">{result.region}</span>
                        <span className="text-xs text-gray-500 mt-1">{result.type}</span>
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
              <div className="flex items-center gap-4">
                {logos[selectedStock] && (
                  <img 
                    src={logos[selectedStock]} 
                    alt={`${selectedStock} logo`} 
                    className="w-10 h-10 rounded-full object-contain bg-white"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                )}
                <h3 className="font-bold text-xl text-white">
                  {selectedStock}
                </h3>
              </div>
              {stocks[selectedStock]?.price && (
                <div className="flex items-center gap-2">
                  <span className="text-3xl font-bold text-white">
                    ${stocks[selectedStock].price.toFixed(2)}
                  </span>
                  <span className={`text-lg font-semibold ${stocks[selectedStock].change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    ({stocks[selectedStock].change > 0 ? '+' : ''}{stocks[selectedStock].change.toFixed(2)}%)
                  </span>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => setShowBuyModal(true)}
                      className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <span className="text-xl">+</span>
                      <span>Buy</span>
                    </button>
                    <button
                      onClick={() => setShowSellModal(true)}
                      className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <span className="text-xl">-</span>
                      <span>Sell</span>
                    </button>
                    <button
                      onClick={isInWatchlist(selectedStock) ? () => handleRemoveFromWatchlist(selectedStock) : handleAddToWatchlist}
                      className={`px-4 py-2 ${isInWatchlist(selectedStock) ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-blue-500 hover:bg-blue-600'} text-white rounded-lg transition-colors flex items-center gap-2 cursor-pointer`}
                    >
                      <span className="text-xl">★</span>
                      <span>{isInWatchlist(selectedStock) ? 'Watching' : 'Watch'}</span>
                    </button>
                    {getSharesOwned(selectedStock) > 0 && (
                      <div className="px-4 py-2 bg-gray-700 text-white rounded-lg flex items-center gap-2">
                        <span className="text-sm">Current Position: {getSharesOwned(selectedStock)} {isCryptoMode ? 'Coins' : 'Shares'}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
          {stocks[selectedStock]?.history ? (
            <div className="grid grid-cols-12 gap-6">
              {/* Left Sidebar - Today's Trading */}
              <div className="col-span-2 space-y-4">
                <div className="p-6 bg-gray-800/80 backdrop-blur-sm rounded-lg border border-gray-700/50">
                  <h4 className="text-lg font-bold text-white mb-4 border-b border-gray-700/50 pb-2">
                    Today's Trading
                    <InfoBubble title="Today's Trading" content={sectionInfo.trading} />
                  </h4>
                  {stocks[selectedStock]?.dailyData ? (
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-gray-400 mb-1">Previous Close</p>
                        <p className="text-base font-semibold text-white">
                          ${stocks[selectedStock].dailyData.previousClose.toFixed(2)}
                        </p>
                      </div>
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
                        <p className="text-sm text-gray-400 mb-1">API Call Date</p>
                        <p className="text-base font-semibold text-white">
                          {new Date(stocks[selectedStock].dailyData.date).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                  </div>
                ) : (
                    <div className="text-center py-4">
                      <p className="text-gray-400">Loading trading data...</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Main Chart */}
              <div className="col-span-8">
                <div className="h-[500px] w-full bg-gray-800 rounded-lg overflow-hidden">
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

              {/* Right Sidebar - Performance Metrics */}
              <div className="col-span-2 space-y-4">
                <div className="p-6 bg-gray-800/80 backdrop-blur-sm rounded-lg border border-gray-700/50">
                  <h4 className="text-lg font-bold text-white mb-4 border-b border-gray-700/50 pb-2">
                    Performance
                    <InfoBubble title="Performance" content={sectionInfo.performance} />
                  </h4>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-400 mb-1">52-Week High</p>
                      <p className="text-base font-semibold text-white">${Math.max(...stocks[selectedStock].history.map(h => h.price)).toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400 mb-1">52-Week Low</p>
                      <p className="text-base font-semibold text-white">${Math.min(...stocks[selectedStock].history.map(h => h.price)).toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400 mb-1">YTD Change</p>
                      <p className={`text-base font-semibold ${stocks[selectedStock].change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {stocks[selectedStock].change > 0 ? '+' : ''}{stocks[selectedStock].change.toFixed(2)}%
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-6 bg-gray-800/80 backdrop-blur-sm rounded-lg border border-gray-700/50">
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
              </div>
            </div>
          ) : (
            <p className="text-white">Loading graph…</p>
          )}
        </div>

        {/* Company Overview Section - Move it here */}
        {companyOverview && !isCryptoMode && (
          <div className={`w-full max-w-7xl p-6 ${isCryptoMode ? 'bg-black' : 'bg-gray-900'} rounded-lg shadow-lg mt-6 ${isCryptoMode ? 'crypto-glow' : ''}`}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Company Description */}
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-white">About {companyOverview.Name}</h3>
                <p className="text-gray-300">{companyOverview.Description}</p>
                
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <p className="text-sm text-gray-400">Sector</p>
                    <p className="text-white">{companyOverview.Sector}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Industry</p>
                    <p className="text-white">{companyOverview.Industry}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Country</p>
                    <p className="text-white">{companyOverview.Country}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Exchange</p>
                    <p className="text-white">{companyOverview.Exchange}</p>
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
                    <p className="text-white">${Number(companyOverview.MarketCapitalization).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">P/E Ratio</p>
                    <p className="text-white">{companyOverview.PERatio}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">EPS</p>
                    <p className="text-white">${companyOverview.EPS}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Dividend Yield</p>
                    <p className="text-white">{companyOverview.DividendYield}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">52 Week High</p>
                    <p className="text-white">${companyOverview['52WeekHigh']}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">52 Week Low</p>
                    <p className="text-white">${companyOverview['52WeekLow']}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Beta</p>
                    <p className="text-white">{companyOverview.Beta}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Analyst Target Price</p>
                    <p className="text-white">${companyOverview.AnalystTargetPrice}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Crypto Overview Section */}
        {isCryptoMode && selectedStock === 'BTC' && (
          <div className="w-full max-w-7xl p-6 bg-black rounded-lg shadow-lg mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Bitcoin Description */}
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-white">About Bitcoin (BTC)</h3>
                <p className="text-gray-300">
                  Bitcoin is the first and most well-known cryptocurrency, created in 2009 by an anonymous person or group using the pseudonym Satoshi Nakamoto. It operates on a decentralized peer-to-peer network, using blockchain technology to enable secure, transparent transactions without the need for intermediaries like banks.
                </p>
                
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <p className="text-sm text-gray-400">Category</p>
                    <p className="text-white">Cryptocurrency</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Network</p>
                    <p className="text-white">Bitcoin Blockchain</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Consensus</p>
                    <p className="text-white">Proof of Work</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Launch Date</p>
                    <p className="text-white">January 2009</p>
                  </div>
                </div>
              </div>

              {/* Key Statistics */}
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-white">Key Statistics</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-400">Market Cap</p>
                    <p className="text-white">$850B+</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Circulating Supply</p>
                    <p className="text-white">19.5M BTC</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Max Supply</p>
                    <p className="text-white">21M BTC</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Block Time</p>
                    <p className="text-white">~10 minutes</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">All-Time High</p>
                    <p className="text-white">$69,000</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">All-Time Low</p>
                    <p className="text-white">$0.06</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">24h Volume</p>
                    <p className="text-white">$25B+</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Dominance</p>
                    <p className="text-white">~50%</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* News Section */}
        <div className="w-full max-w-7xl">
          <div className="flex justify-between items-center mb-4">
            <h2 className={`text-2xl font-semibold ${isCryptoMode ? 'crypto-text' : 'text-white'}`}>
              {isCryptoMode ? 'Crypto News' : `Market News: ${selectedStock}`}
            </h2>
            <div className="flex gap-4">
              <button
                onClick={() => setShowNews(!showNews)}
                className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                {showNews ? 'Hide News' : 'Show News'}
              </button>
            </div>
          </div>
          {showNews && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {news.map((item, index) => (
                <div key={index} className="bg-gray-900 rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
                  {item.image && (
                    <div className="relative h-48 w-full">
                      <img
                        src={item.image}
                        alt={item.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`px-2 py-1 rounded-full text-xs border ${sentimentColors[item.sentiment]}`}>
                        {sentimentLabels[item.sentiment]}
                      </span>
                    </div>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <h3 className="text-lg font-semibold text-white mb-2 line-clamp-2 hover:text-green-400 transition-colors">{item.title}</h3>
                      <p className="text-gray-400 mb-4 line-clamp-3">{item.summary}</p>
                    </a>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {item.tickers?.map((ticker, i) => (
                        <span key={i} className="px-2 py-1 bg-gray-800 text-gray-300 rounded-full text-xs">
                          {ticker}
                        </span>
                      ))}
                    </div>
                    <div className="flex justify-between items-center text-sm text-gray-500">
                      <span>{new Date(item.time).toLocaleDateString()}</span>
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 hover:text-green-400 transition-colors"
                      >
                        Read More
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
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

      {/* Footer Section */}
      <footer className="w-full bg-gray-900 border-t border-gray-800 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* About Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">About SimuTrader</h3>
              <p className="text-gray-400 text-sm">
                SimuTrader provides comprehensive market analysis and trading simulation. Track stocks, analyze trends, and practice trading with real-time market data.
              </p>
            </div>

            {/* Resources */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Resources</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">Market News</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">Stock Analysis</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">Trading Guide</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">API Documentation</a></li>
              </ul>
            </div>

            {/* Support */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Support</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">Help Center</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">FAQ</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">Contact Us</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">Bug Report</a></li>
              </ul>
            </div>

            {/* Legal */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Legal</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">Terms of Service</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">Disclaimer</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">Cookie Policy</a></li>
              </ul>
            </div>
          </div>

          {/* Newsletter Section */}
          <div className="mt-12 pt-8 border-t border-gray-800">
            <div className="max-w-xl mx-auto text-center">
              <h3 className="text-lg font-semibold text-white mb-4">Stay Updated with Market Insights</h3>
              <p className="text-gray-400 text-sm mb-6">
                Get the latest market news, updates, and trading insights delivered to your inbox.
              </p>
              <div className="flex gap-4 justify-center">
                <input
                  type="email"
                  placeholder="Enter your email address"
                  className="px-4 py-2 bg-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 w-64"
                />
                <button className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors">
                  Subscribe
                </button>
              </div>
            </div>
          </div>

          {/* Disclaimer */}
          <div className="mt-12 pt-8 border-t border-gray-800">
            <p className="text-gray-500 text-xs text-center max-w-3xl mx-auto">
              IMPORTANT DISCLAIMER: All content provided herein our website, hyperlinked sites, associated applications, forums, blogs, social media accounts and other platforms ("Site") is for your general information only, procured from third party sources. We make no warranties of any kind in relation to our content, including but not limited to accuracy and updatedness. No part of the content that we provide constitutes financial advice, legal advice or any other form of advice meant for your specific reliance for any purpose. Any use or reliance on our content is solely at your own risk and discretion. You should conduct your own research, review, analyse and verify our content before relying on them. Trading is a highly risky activity that can lead to major losses, please therefore consult your financial advisor before making any decision. No content on our Site is meant to be a solicitation or offer.
            </p>
          </div>

          {/* Copyright */}
          <div className="mt-8 text-center">
            <p className="text-gray-500 text-sm">
              © {new Date().getFullYear()} SimuTrader. All Rights Reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}