"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { fetchStock } from '@/lib/fetchStock';

// Custom CSS for animations (same as futures page)
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

  @keyframes bubbleAppear {
    0% {
      opacity: 0;
      transform: scale(0.8) translateY(10px);
    }
    100% {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }

  @keyframes bubbleDisappear {
    0% {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
    100% {
      opacity: 0;
      transform: scale(0.9) translateY(-5px);
    }
  }

  @keyframes iconSpin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(180deg);
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

  .animate-bubbleAppear {
    animation: bubbleAppear 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  }

  .animate-bubbleDisappear {
    animation: bubbleDisappear 0.2s ease-in forwards;
  }

  .animate-iconSpin {
    animation: iconSpin 0.3s ease-out;
  }

  .placeholder-shine::placeholder {
    background: linear-gradient(90deg, #6b7280 25%, #9ca3af 50%, #6b7280 75%);
    background-size: 1000px 100%;
    animation: shimmer 2s infinite;
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
  }
`;

interface Profile {
  id: string;
  email: string;
  balance: number;
}

interface TaxCalculation {
  shortTermGains: number;
  longTermGains: number;
  shortTermLosses: number;
  longTermLosses: number;
  totalTax: number;
  effectiveRate: number;
  washSaleViolations: WashSaleViolation[];
  lossCarryforward: number;
}

interface RealPortfolioItem {
  symbol: string;
  shares: number;
  average_price: number;
  created_at: string;
  updated_at: string;
  current_price?: number;
  unrealized_gain_loss?: number;
  holding_period_days?: number;
  is_long_term?: boolean;
}

interface WashSaleViolation {
  symbol: string;
  lossAmount: number;
  violationDate: string;
  repurchaseDate: string;
  adjustedBasis: number;
}

interface TaxLot {
  symbol: string;
  shares: number;
  purchase_price: number;
  purchase_date: string;
  sale_price?: number;
  sale_date?: string;
  gain_loss?: number;
  is_long_term?: boolean;
  is_wash_sale?: boolean;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  id: string;
}

// InfoBubble component for explanations
const InfoBubble = ({ title, content }: { title: string; content: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [position, setPosition] = useState<'top' | 'bottom' | 'left' | 'right'>('bottom');
  const buttonRef = useRef<HTMLButtonElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);

  const calculatePosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      
      // Calculate available space
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;
      const spaceRight = viewportWidth - rect.right;
      const spaceLeft = rect.left;
      
      // Special handling for elements on the right side of screen (like table columns)
      // If element is in the right 40% of the screen, prioritize top positioning
      const isRightSide = rect.left > viewportWidth * 0.6;
      
      // Check if element is in a table header or table cell (common source of positioning issues)
      const isInTable = buttonRef.current.closest('table, th, td') !== null;
      
      // For table elements or elements on the right side, aggressively prefer top positioning
      if (isInTable || spaceRight < 500 || isRightSide) {
        // Always try top first for table elements and right-side elements
        if (spaceAbove >= 120) { // Reduced minimum space needed for top
          setPosition('top');
        } else if (spaceLeft >= 340) { // If we can't go up, try left
          setPosition('left');
        } else if (spaceBelow >= 150) { // Last resort: below
          setPosition('bottom');
        } else {
          setPosition('top'); // Force top even with limited space
        }
      } else if (spaceBelow >= 200) {
        setPosition('bottom');
      } else if (spaceAbove >= 200) {
        setPosition('top');
      } else if (spaceRight >= 320) {
        setPosition('right');
      } else {
        setPosition('left');
      }
    }
  };

  const handleClick = () => {
    if (isAnimating) return;
    
    if (isOpen) {
      setIsAnimating(true);
      setTimeout(() => {
        setIsOpen(false);
        setIsAnimating(false);
      }, 200);
    } else {
      calculatePosition();
      setIsOpen(true);
      setIsAnimating(true);
      setTimeout(() => {
        setIsAnimating(false);
      }, 300);
    }
  };

  const getPositionClasses = () => {
    switch (position) {
      case 'top':
        return 'bottom-full mb-3 left-1/2 transform -translate-x-1/2';
      case 'bottom':
        return 'top-full mt-3 left-1/2 transform -translate-x-1/2';
      case 'left':
        return 'right-full mr-3 top-1/2 transform -translate-y-1/2';
      case 'right':
        return 'left-full ml-3 top-1/2 transform -translate-y-1/2';
      default:
        return 'bottom-full mb-3 left-1/2 transform -translate-x-1/2';
    }
  };

  const getArrowClasses = () => {
    switch (position) {
      case 'top':
        return 'top-full left-1/2 transform -translate-x-1/2 border-t-gray-800 border-l-transparent border-r-transparent border-b-transparent border-4';
      case 'bottom':
        return 'bottom-full left-1/2 transform -translate-x-1/2 border-b-gray-800 border-l-transparent border-r-transparent border-t-transparent border-4';
      case 'left':
        return 'left-full top-1/2 transform -translate-y-1/2 border-l-gray-800 border-t-transparent border-b-transparent border-r-transparent border-4';
      case 'right':
        return 'right-full top-1/2 transform -translate-y-1/2 border-r-gray-800 border-t-transparent border-b-transparent border-l-transparent border-4';
      default:
        return 'top-full left-1/2 transform -translate-x-1/2 border-t-gray-800 border-l-transparent border-r-transparent border-b-transparent border-4';
    }
  };

  // Function to ensure bubble stays within viewport bounds
  const getBubbleStyle = () => {
    if (!buttonRef.current || !isOpen) return {};
    
    const rect = buttonRef.current.getBoundingClientRect();
    const bubbleWidth = 320; // 80 * 4 (w-80 = 320px)
    const viewportWidth = window.innerWidth;
    
    // For left/right positioned bubbles, ensure they don't go off screen
    if (position === 'left' && rect.left < bubbleWidth + 20) {
      return {
        transform: 'translateY(-50%)',
        right: 'auto',
        left: '100%',
        marginLeft: '12px'
      };
    }
    
    // For top/bottom positioned bubbles, ensure they don't go off screen horizontally
    if ((position === 'top' || position === 'bottom') && rect.left > viewportWidth - bubbleWidth/2 - 20) {
      return {
        transform: 'translateX(-100%)',
        left: 'auto',
        right: '0'
      };
    }
    
    return {};
  };

  return (
    <div className="relative inline-block">
      <div className="flex items-center">
        <button
          ref={buttonRef}
          onClick={handleClick}
          className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 transform hover:scale-110 ${
            isOpen 
              ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25 animate-iconSpin' 
              : 'bg-gray-600 text-gray-300 hover:bg-gray-500 hover:text-white'
          }`}
          aria-label={`Learn more about ${title}`}
        >
          <span className="leading-none">?</span>
        </button>
      </div>
      {isOpen && (
        <>
          <div 
            ref={bubbleRef}
            className={`absolute z-[9999] w-80 p-4 bg-gray-800 rounded-lg shadow-2xl border border-gray-600 text-sm backdrop-blur-sm ${
              getPositionClasses()
            } ${isAnimating && !isOpen ? 'animate-bubbleDisappear' : 'animate-bubbleAppear'}`}
            style={{ 
              maxHeight: '300px',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
              ...getBubbleStyle()
            }}
          >
            {/* Arrow */}
            <div className={`absolute w-0 h-0 border-4 ${getArrowClasses()}`}></div>
            
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-semibold text-white pr-2">{title}</h4>
              <button
                onClick={handleClick}
                className="text-gray-400 hover:text-white transition-colors flex-shrink-0 hover:bg-gray-700 rounded p-1"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            <p className="text-gray-300 whitespace-pre-line leading-relaxed">{content}</p>
          </div>
          {/* Backdrop to close bubble */}
          <div 
            className="fixed inset-0 z-[9998]" 
            onClick={handleClick}
          ></div>
        </>
      )}
    </div>
  );
};

const TaxesPage: React.FC = () => {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [income, setIncome] = useState<number>(75000);
  const [filingStatus, setFilingStatus] = useState<'single' | 'married' | 'head'>('single');
  const [taxCalculation, setTaxCalculation] = useState<TaxCalculation>({
    shortTermGains: 0,
    longTermGains: 0,
    shortTermLosses: 0,
    longTermLosses: 0,
    totalTax: 0,
    effectiveRate: 0,
    washSaleViolations: [],
    lossCarryforward: 0
  });
  
  const [realPortfolio, setRealPortfolio] = useState<RealPortfolioItem[]>([]);
  const [portfolioLoading, setPortfolioLoading] = useState(true);
  const [taxLots, setTaxLots] = useState<TaxLot[]>([]);
  
  // Copilot state
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Inject custom styles
    const styleElement = document.createElement('style');
    styleElement.textContent = customStyles;
    document.head.appendChild(styleElement);
    
    return () => {
      if (document.head.contains(styleElement)) {
        document.head.removeChild(styleElement);
      }
    };
  }, []);

  // Load user session and profile
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();

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

  // Fetch real portfolio data
  useEffect(() => {
    if (!profile?.id) return;

    const fetchRealPortfolio = async () => {
      setPortfolioLoading(true);
      try {
        const { data: portfolioData, error } = await supabase
          .from('portfolio')
          .select('symbol, shares, average_price, created_at, updated_at')
          .eq('user_id', profile.id);

        if (error) throw error;

        // Fetch current prices and calculate metrics
        const portfolioWithPrices = await Promise.all(
          portfolioData.map(async (item) => {
            try {
              // Get current stock price
              const stockData = await fetchStock(item.symbol);
              const currentPrice = stockData.price || item.average_price;
              
              const holdingPeriodDays = Math.floor(
                (new Date().getTime() - new Date(item.created_at).getTime()) / (1000 * 60 * 60 * 24)
              );
              
              const unrealizedGainLoss = (currentPrice - item.average_price) * item.shares;
              const isLongTerm = holdingPeriodDays > 365;

              return {
                ...item,
                current_price: currentPrice,
                unrealized_gain_loss: unrealizedGainLoss,
                holding_period_days: holdingPeriodDays,
                is_long_term: isLongTerm
              };
            } catch (error) {
              console.error(`Error fetching data for ${item.symbol}:`, error);
              return {
                ...item,
                current_price: item.average_price,
                unrealized_gain_loss: 0,
                holding_period_days: 0,
                is_long_term: false
              };
            }
          })
        );

        setRealPortfolio(portfolioWithPrices);
        generateTaxLots(portfolioWithPrices);
      } catch (error) {
        console.error('Error fetching portfolio:', error);
      } finally {
        setPortfolioLoading(false);
      }
    };

    fetchRealPortfolio();
  }, [profile?.id]);

  // Generate tax lots for demonstration
  const generateTaxLots = (portfolio: RealPortfolioItem[]) => {
    const lots: TaxLot[] = [];
    
    portfolio.forEach(position => {
      // For demonstration, create some fictional sales to show tax implications
      const totalShares = position.shares;
      
      // Simulate selling 30% of each position for tax analysis
      const sharesToSell = Math.floor(totalShares * 0.3);
      if (sharesToSell > 0) {
        const salePrice = position.current_price || position.average_price;
        const gainLoss = (salePrice - position.average_price) * sharesToSell;
        
        lots.push({
          symbol: position.symbol,
          shares: sharesToSell,
          purchase_price: position.average_price,
          purchase_date: position.created_at,
          sale_price: salePrice,
          sale_date: new Date().toISOString(),
          gain_loss: gainLoss,
          is_long_term: position.is_long_term,
          is_wash_sale: false
        });
      }
      
      // Add remaining shares as unrealized position
      if (totalShares - sharesToSell > 0) {
        lots.push({
          symbol: position.symbol,
          shares: totalShares - sharesToSell,
          purchase_price: position.average_price,
          purchase_date: position.created_at,
          is_long_term: position.is_long_term,
          is_wash_sale: false
        });
      }
    });
    
    setTaxLots(lots);
  };

  // Calculate taxes based on real portfolio data
  useEffect(() => {
    if (taxLots.length > 0) {
      calculateRealTaxes();
    }
  }, [income, filingStatus, taxLots]);

  const calculateRealTaxes = () => {
    const realizedGains = taxLots.filter(lot => lot.sale_date && lot.gain_loss);
    
    let shortTermGains = 0;
    let longTermGains = 0;
    let shortTermLosses = 0;
    let longTermLosses = 0;
    const washSaleViolations: WashSaleViolation[] = [];

    realizedGains.forEach(lot => {
      const gain = lot.gain_loss || 0;
      
      if (lot.is_long_term) {
        if (gain > 0) {
          longTermGains += gain;
        } else {
          longTermLosses += Math.abs(gain);
          // Check for potential wash sale
          if (hasWashSaleViolation(lot)) {
            washSaleViolations.push({
              symbol: lot.symbol,
              lossAmount: Math.abs(gain),
              violationDate: lot.sale_date!,
              repurchaseDate: lot.purchase_date,
              adjustedBasis: lot.purchase_price + Math.abs(gain) / lot.shares
            });
          }
        }
      } else {
        if (gain > 0) {
          shortTermGains += gain;
        } else {
          shortTermLosses += Math.abs(gain);
          if (hasWashSaleViolation(lot)) {
            washSaleViolations.push({
              symbol: lot.symbol,
              lossAmount: Math.abs(gain),
              violationDate: lot.sale_date!,
              repurchaseDate: lot.purchase_date,
              adjustedBasis: lot.purchase_price + Math.abs(gain) / lot.shares
            });
          }
        }
      }
    });

    // Apply wash sale adjustments
    washSaleViolations.forEach(violation => {
      if (realizedGains.find(lot => lot.symbol === violation.symbol && !lot.is_long_term)) {
        shortTermLosses -= violation.lossAmount;
      } else {
        longTermLosses -= violation.lossAmount;
      }
    });

    // Calculate net gains/losses
    const netShortTerm = shortTermGains - shortTermLosses;
    const netLongTerm = longTermGains - longTermLosses;

    // Calculate taxes
    const getTaxRate = (income: number, type: 'short' | 'long') => {
      if (type === 'short') {
        // 2024 tax brackets for ordinary income
        if (filingStatus === 'single') {
          if (income <= 11000) return 0.10;
          if (income <= 44725) return 0.12;
          if (income <= 95375) return 0.22;
          if (income <= 182050) return 0.24;
          if (income <= 231250) return 0.32;
          if (income <= 578125) return 0.35;
          return 0.37;
        } else if (filingStatus === 'married') {
          if (income <= 22000) return 0.10;
          if (income <= 89450) return 0.12;
          if (income <= 190750) return 0.22;
          if (income <= 364200) return 0.24;
          if (income <= 462500) return 0.32;
          if (income <= 693750) return 0.35;
          return 0.37;
        }
      } else {
        // Long-term capital gains rates
        if (filingStatus === 'single') {
          if (income <= 47025) return 0.00;
          if (income <= 518900) return 0.15;
          return 0.20;
        } else if (filingStatus === 'married') {
          if (income <= 94050) return 0.00;
          if (income <= 583750) return 0.15;
          return 0.20;
        }
      }
      return 0.22; // default
    };

    const shortTermTax = Math.max(0, netShortTerm) * getTaxRate(income, 'short');
    const longTermTax = Math.max(0, netLongTerm) * getTaxRate(income, 'long');
    const totalTax = shortTermTax + longTermTax;
    
    // Calculate loss carryforward
    const totalLoss = Math.min(0, netShortTerm) + Math.min(0, netLongTerm);
    const lossCarryforward = Math.max(0, Math.abs(totalLoss) - 3000); // $3,000 annual limit

    const totalGains = Math.max(0, netShortTerm) + Math.max(0, netLongTerm);
    const effectiveRate = totalGains > 0 ? (totalTax / totalGains) * 100 : 0;

    setTaxCalculation({
      shortTermGains: Math.max(0, netShortTerm),
      longTermGains: Math.max(0, netLongTerm),
      shortTermLosses: Math.abs(Math.min(0, netShortTerm)),
      longTermLosses: Math.abs(Math.min(0, netLongTerm)),
      totalTax,
      effectiveRate,
      washSaleViolations,
      lossCarryforward
    });
  };

  const hasWashSaleViolation = (lot: TaxLot): boolean => {
    if (!lot.sale_date || !lot.gain_loss || lot.gain_loss >= 0) return false;
    
    // Check if there's a repurchase within 30 days before or after sale
    const saleDate = new Date(lot.sale_date);
    const hasRepurchase = realPortfolio.some(position => {
      if (position.symbol !== lot.symbol) return false;
      
      const positionDate = new Date(position.created_at);
      const daysDiff = Math.abs((saleDate.getTime() - positionDate.getTime()) / (1000 * 60 * 60 * 24));
      
      return daysDiff <= 30;
    });
    
    return hasRepurchase;
  };

  // Calculate expected tax for a position if sold today
  const calculateExpectedTax = (position: RealPortfolioItem): number => {
    if (!position.unrealized_gain_loss || position.unrealized_gain_loss <= 0) return 0;
    
    const getTaxRate = (income: number, isLongTerm: boolean) => {
      if (isLongTerm) {
        // Long-term capital gains rates
        if (filingStatus === 'single') {
          if (income <= 47025) return 0.00;
          if (income <= 518900) return 0.15;
          return 0.20;
        } else if (filingStatus === 'married') {
          if (income <= 94050) return 0.00;
          if (income <= 583750) return 0.15;
          return 0.20;
        }
      } else {
        // Short-term (ordinary income) rates
        if (filingStatus === 'single') {
          if (income <= 11000) return 0.10;
          if (income <= 44725) return 0.12;
          if (income <= 95375) return 0.22;
          if (income <= 182050) return 0.24;
          if (income <= 231250) return 0.32;
          if (income <= 578125) return 0.35;
          return 0.37;
        } else if (filingStatus === 'married') {
          if (income <= 22000) return 0.10;
          if (income <= 89450) return 0.12;
          if (income <= 190750) return 0.22;
          if (income <= 364200) return 0.24;
          if (income <= 462500) return 0.32;
          if (income <= 693750) return 0.35;
          return 0.37;
        }
      }
      return 0.22; // default
    };

    const taxRate = getTaxRate(income, position.is_long_term || false);
    return position.unrealized_gain_loss * taxRate;
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

    setTimeout(() => {
      let response = '';
      
      if (input.toLowerCase().includes('wash sale')) {
        const violations = taxCalculation.washSaleViolations;
        if (violations.length > 0) {
          response = `**Wash Sale Analysis for Your Portfolio:**\n\n`;
          response += `Found ${violations.length} potential wash sale violation(s):\n\n`;
          violations.forEach((violation, i) => {
            response += `${i + 1}. **${violation.symbol}**\n`;
            response += `   • Loss Amount: $${violation.lossAmount.toFixed(2)}\n`;
            response += `   • Adjusted Basis: $${violation.adjustedBasis.toFixed(2)}\n\n`;
          });
          response += `**What this means:**\n`;
          response += `• These losses cannot be deducted currently\n`;
          response += `• The loss is added to your cost basis in the repurchased shares\n`;
          response += `• You'll get the tax benefit when you finally sell\n`;
          response += `• Wait 31+ days before repurchasing to avoid wash sales`;
        } else {
          response = `**Good news!** Based on your current portfolio, I don't see any wash sale violations.\n\n`;
          response += `**Wash Sale Rules:**\n`;
          response += `• Cannot claim a loss if you repurchase the same stock within 30 days\n`;
          response += `• Applies 30 days before AND after the sale\n`;
          response += `• Loss gets added to the cost basis of new shares\n`;
          response += `• Use different ETFs or wait 31+ days to avoid violations`;
        }
      } else if (input.toLowerCase().includes('portfolio') || input.toLowerCase().includes('holdings')) {
        if (realPortfolio.length > 0) {
          response = `**Your Current Tax Situation:**\n\n`;
          response += `**Holdings Analysis:**\n`;
          const longTermPositions = realPortfolio.filter(p => p.is_long_term).length;
          const shortTermPositions = realPortfolio.length - longTermPositions;
          
          response += `• ${longTermPositions} long-term positions (>1 year)\n`;
          response += `• ${shortTermPositions} short-term positions (≤1 year)\n\n`;
          
          response += `**Unrealized Gains/Losses:**\n`;
          const totalUnrealized = realPortfolio.reduce((sum, p) => sum + (p.unrealized_gain_loss || 0), 0);
          response += `• Total unrealized: $${totalUnrealized.toFixed(2)}\n`;
          
          response += `\n**Tax Planning Tips:**\n`;
          response += `• Consider holding short-term positions >1 year for better rates\n`;
          response += `• Harvest losses before year-end\n`;
          response += `• Time your sales strategically`;
        } else {
          response = `You don't have any current holdings. Start building a portfolio to see tax implications!`;
        }
      } else if (input.toLowerCase().includes('capital gains')) {
        response = `**2024 Capital Gains Tax Rates:**\n\n`;
        response += `**Short-term (≤1 year) - Taxed as ordinary income:**\n`;
        if (filingStatus === 'single') {
          response += `• 10%: $0 - $11,000\n• 12%: $11,001 - $44,725\n• 22%: $44,726 - $95,375\n• 24%: $95,376 - $182,050\n• 32%: $182,051 - $231,250\n• 35%: $231,251 - $578,125\n• 37%: $578,126+\n\n`;
        } else {
          response += `• 10%: $0 - $22,000\n• 12%: $22,001 - $89,450\n• 22%: $89,451 - $190,750\n• 24%: $190,751 - $364,200\n• 32%: $364,201 - $462,500\n• 35%: $462,501 - $693,750\n• 37%: $693,751+\n\n`;
        }
        
        response += `**Long-term (>1 year):**\n`;
        if (filingStatus === 'single') {
          response += `• 0%: Income up to $47,025\n• 15%: $47,026 - $518,900\n• 20%: $518,901+\n\n`;
        } else {
          response += `• 0%: Income up to $94,050\n• 15%: $94,051 - $583,750\n• 20%: $583,751+\n\n`;
        }
        
        response += `**Your estimated rate:** ${taxCalculation.effectiveRate.toFixed(1)}%`;
      } else if (input.toLowerCase().includes('loss') && input.toLowerCase().includes('harvest')) {
        response = `**Tax Loss Harvesting Strategy:**\n\n`;
        const losers = realPortfolio.filter(p => (p.unrealized_gain_loss || 0) < 0);
        
        if (losers.length > 0) {
          response += `**Positions with unrealized losses:**\n`;
          losers.forEach(position => {
            response += `• ${position.symbol}: $${(position.unrealized_gain_loss || 0).toFixed(2)} `;
            response += `(${position.is_long_term ? 'Long-term' : 'Short-term'})\n`;
          });
          
          response += `\n**Strategy:**\n`;
          response += `• Sell losing positions to offset gains\n`;
          response += `• Match short-term losses with short-term gains first\n`;
          response += `• $3,000 annual deduction limit for excess losses\n`;
          response += `• Carry forward remaining losses\n`;
          response += `• Avoid wash sale rules (wait 31+ days to repurchase)`;
        } else {
          response += `Currently, you don't have positions with unrealized losses to harvest.\n\n`;
          response += `**General Strategy:**\n`;
          response += `• Monitor portfolio for harvesting opportunities\n`;
          response += `• Best done near year-end\n`;
          response += `• Can offset up to $3,000 of ordinary income annually`;
        } 
      } else {
        response = `**Tax Planning for Your Portfolio:**\n\n`;
        response += `• Current estimated tax: $${taxCalculation.totalTax.toFixed(2)}\n`;
        response += `• Effective rate: ${taxCalculation.effectiveRate.toFixed(1)}%\n`;
        response += `• Wash sale violations: ${taxCalculation.washSaleViolations.length}\n`;
        response += `• Loss carryforward: $${taxCalculation.lossCarryforward.toFixed(2)}\n\n`;
        response += `Ask me about specific topics like "wash sales", "capital gains rates", or "loss harvesting" for detailed guidance.`;
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

  // Add function to calculate tax bracket
  const getTaxBracket = (income: number, filingStatus: 'single' | 'married' | 'head') => {
    if (filingStatus === 'single') {
      if (income <= 11000) return { rate: 10, range: '$0 - $11,000' };
      if (income <= 44725) return { rate: 12, range: '$11,001 - $44,725' };
      if (income <= 95375) return { rate: 22, range: '$44,726 - $95,375' };
      if (income <= 182050) return { rate: 24, range: '$95,376 - $182,050' };
      if (income <= 231250) return { rate: 32, range: '$182,051 - $231,250' };
      if (income <= 578125) return { rate: 35, range: '$231,251 - $578,125' };
      return { rate: 37, range: '$578,126+' };
    } else if (filingStatus === 'married') {
      if (income <= 22000) return { rate: 10, range: '$0 - $22,000' };
      if (income <= 89450) return { rate: 12, range: '$22,001 - $89,450' };
      if (income <= 190750) return { rate: 22, range: '$89,451 - $190,750' };
      if (income <= 364200) return { rate: 24, range: '$190,751 - $364,200' };
      if (income <= 462500) return { rate: 32, range: '$364,201 - $462,500' };
      if (income <= 693750) return { rate: 35, range: '$462,501 - $693,750' };
      return { rate: 37, range: '$693,751+' };
    } else { // head of household
      if (income <= 15700) return { rate: 10, range: '$0 - $15,700' };
      if (income <= 59850) return { rate: 12, range: '$15,701 - $59,850' };
      if (income <= 95350) return { rate: 22, range: '$59,851 - $95,350' };
      if (income <= 182050) return { rate: 24, range: '$95,351 - $182,050' };
      if (income <= 231250) return { rate: 32, range: '$182,051 - $231,250' };
      if (income <= 578100) return { rate: 35, range: '$231,251 - $578,100' };
      return { rate: 37, range: '$578,101+' };
    }
  };

  const getLongTermCapitalGainsBracket = (income: number, filingStatus: 'single' | 'married' | 'head') => {
    if (filingStatus === 'single') {
      if (income <= 47025) return { rate: 0, range: '$0 - $47,025' };
      if (income <= 518900) return { rate: 15, range: '$47,026 - $518,900' };
      return { rate: 20, range: '$518,901+' };
    } else if (filingStatus === 'married') {
      if (income <= 94050) return { rate: 0, range: '$0 - $94,050' };
      if (income <= 583750) return { rate: 15, range: '$94,051 - $583,750' };
      return { rate: 20, range: '$583,751+' };
    } else { // head of household
      if (income <= 63000) return { rate: 0, range: '$0 - $63,000' };
      if (income <= 551350) return { rate: 15, range: '$63,001 - $551,350' };
      return { rate: 20, range: '$551,351+' };
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
      {/* Side Navigation - Same as other pages */}
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
            <a href="/taxes" className="text-white px-4 py-2 rounded-lg text-sm font-medium bg-gray-800/80 transition-all duration-200 flex items-center gap-2">
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
        <div className="flex flex-col p-8 space-y-8 w-full pr-[520px]">
          
          {/* Header */}
          <div className="mb-8">
            <div className="flex justify-between items-start">
              <div className="space-y-4">
                <div className="space-y-2">
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-green-100 to-green-200 bg-clip-text text-transparent">
                    Tax Center
                  </h1>
                  <div className="h-1 w-24 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full animate-pulse"></div>
                </div>
                <p className="text-gray-400 text-lg font-medium">
                  Real tax analysis based on your portfolio holdings
                </p>
              </div>
              
              <div className="flex items-center gap-4">
                {profile && (
                  <div className="group bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-xl rounded-2xl border border-gray-700/50 px-6 py-4 hover:border-green-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-green-500/10">
                    <div className="text-sm text-gray-400 font-medium">Portfolio Value</div>
                    <div className="text-2xl font-bold text-transparent bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text">
                      ${realPortfolio.reduce((sum, p) => sum + ((p.current_price || 0) * p.shares), 0).toFixed(2)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Tax Bracket Information */}
          <div className="bg-gradient-to-br from-blue-800/40 to-indigo-900/40 backdrop-blur-xl rounded-3xl border border-blue-700/50 p-8 shadow-2xl hover:border-blue-600/50 transition-all duration-500 animate-slideUp">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-3 h-3 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-full animate-pulse"></div>
              <h2 className="text-2xl font-bold text-white">Your Tax Brackets for 2024</h2>
              <InfoBubble 
                title="Tax Brackets Explained" 
                content="Tax brackets are progressive - you only pay the higher rate on income above each threshold. For example, if you're in the 22% bracket, you still pay 10% on the first portion of income, 12% on the next portion, etc. This shows your marginal tax rate (highest bracket) and capital gains rates."
              />
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Ordinary Income Tax Bracket */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-blue-300">Ordinary Income Tax</h3>
                </div>
                <div className="bg-gradient-to-r from-blue-500/20 to-blue-600/20 rounded-2xl p-6 border border-blue-500/30">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-blue-200 font-medium">Your Marginal Rate</span>
                    <span className="text-2xl font-bold text-blue-300">{getTaxBracket(income, filingStatus).rate}%</span>
                  </div>
                  <div className="text-sm text-blue-200">
                    Income Range: {getTaxBracket(income, filingStatus).range}
                  </div>
                  <div className="text-xs text-blue-300 mt-2">
                    Filing Status: {filingStatus === 'single' ? 'Single' : filingStatus === 'married' ? 'Married Filing Jointly' : 'Head of Household'}
                  </div>
                </div>
              </div>

              {/* Long-term Capital Gains Bracket */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-green-300">Long-term Capital Gains Tax</h3>
                </div>
                <div className="bg-gradient-to-r from-green-500/20 to-green-600/20 rounded-2xl p-6 border border-green-500/30">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-green-200 font-medium">Your Capital Gains Rate</span>
                    <span className="text-2xl font-bold text-green-300">{getLongTermCapitalGainsBracket(income, filingStatus).rate}%</span>
                  </div>
                  <div className="text-sm text-green-200">
                    Income Range: {getLongTermCapitalGainsBracket(income, filingStatus).range}
                  </div>
                  <div className="text-xs text-green-300 mt-2">
                    For investments held &gt;365 days
                  </div>
                </div>
              </div>
            </div>

            {/* Tax Savings Comparison */}
            <div className="mt-6 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-2xl p-6 border border-purple-500/30">
              <div className="flex items-center gap-2 mb-3">
                <h4 className="text-lg font-semibold text-purple-200">Potential Tax Savings</h4>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-300">
                  {(getTaxBracket(income, filingStatus).rate - getLongTermCapitalGainsBracket(income, filingStatus).rate).toFixed(0)}% 
                </div>
                <div className="text-sm text-purple-200">
                  Tax rate difference between short-term and long-term gains
                </div>
                <div className="text-xs text-purple-300 mt-1">
                  On $10,000 gain: ${((getTaxBracket(income, filingStatus).rate - getLongTermCapitalGainsBracket(income, filingStatus).rate) * 100).toFixed(0)} savings by holding &gt;1 year
                </div>
              </div>
            </div>
          </div>

          {/* Real Portfolio Tax Analysis */}
          <div className="bg-gradient-to-br from-gray-800/60 to-gray-900/60 backdrop-blur-xl rounded-3xl border border-gray-700/50 p-8 shadow-2xl hover:border-gray-600/50 transition-all duration-500 animate-slideUp">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-3 h-3 bg-gradient-to-r from-green-400 to-blue-400 rounded-full animate-pulse"></div>
              <h2 className="text-2xl font-bold text-white">Your Portfolio Tax Analysis</h2>
              <div className="px-3 py-1 bg-green-500/20 text-green-300 rounded-full text-sm font-medium">
                Real Data
              </div>
              <InfoBubble 
                title="Portfolio Tax Analysis" 
                content="This analysis shows the tax implications of your current holdings based on real market prices and your actual purchase dates. The calculations consider holding periods, current tax brackets, and potential tax owed if you sold today."
              />
            </div>
            
            {portfolioLoading ? (
              <div className="text-center py-8">
                <div className="text-gray-400">Loading your portfolio data...</div>
              </div>
            ) : realPortfolio.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-400">No portfolio holdings found. Start trading to see tax analysis!</div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Holdings Summary */}
                <div className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-gray-300">Holdings Summary</h3>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center py-2 border-b border-gray-600/30">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400 font-medium">Long-term (&gt;1 year)</span>
                        </div>
                        <span className="text-green-400 font-bold">{realPortfolio.filter(p => p.is_long_term).length}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-600/30">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400 font-medium">Short-term (≤1 year)</span>
                        </div>
                        <span className="text-yellow-400 font-bold">{realPortfolio.filter(p => !p.is_long_term).length}</span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400 font-medium">Unrealized Gain/Loss</span>
                        </div>
                        <span className={`font-bold ${realPortfolio.reduce((sum, p) => sum + (p.unrealized_gain_loss || 0), 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          ${realPortfolio.reduce((sum, p) => sum + (p.unrealized_gain_loss || 0), 0).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tax Calculation Controls */}
                <div className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <label className="block text-sm font-semibold text-gray-300">Annual Income</label>
                    </div>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">$</div>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={income.toLocaleString()}
                        onChange={(e) => {
                          const value = e.target.value.replace(/[^0-9]/g, '');
                          setIncome(parseInt(value) || 0);
                        }}
                        className="w-full bg-gradient-to-r from-gray-700/50 to-gray-800/50 text-white border border-gray-600/50 rounded-xl pl-12 pr-6 py-4 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <label className="block text-sm font-semibold text-gray-300">Filing Status</label>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { key: 'single', label: 'Single' },
                        { key: 'married', label: 'Married' },
                        { key: 'head', label: 'Head of HH' }
                      ].map(status => (
                        <button
                          key={status.key}
                          onClick={() => setFilingStatus(status.key as any)}
                          className={`px-4 py-3 rounded-xl font-semibold transition-all duration-300 ${
                            filingStatus === status.key
                              ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg shadow-green-500/25'
                              : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
                          }`}
                        >
                          {status.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Current Holdings Detailed View */}
          {realPortfolio.length > 0 && (
            <div className="bg-gradient-to-br from-gray-800/60 to-gray-900/60 backdrop-blur-xl rounded-3xl border border-gray-700/50 p-8 shadow-2xl hover:border-gray-600/50 transition-all duration-500">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-3 h-3 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full animate-pulse"></div>
                <h2 className="text-2xl font-bold text-white">Current Holdings Tax Analysis</h2>
                <InfoBubble 
                  title="Holdings Tax Analysis" 
                  content="Detailed breakdown of each position showing current values, holding periods, tax implications, and expected tax if sold today. Use this to make informed decisions about when to sell."
                />
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-gray-400 text-sm border-b border-gray-600/30">
                      <th className="pb-4">Symbol</th>
                      <th className="pb-4">Shares</th>
                      <th className="pb-4">Avg Price</th>
                      <th className="pb-4">Current Price</th>
                      <th className="pb-4">Market Value</th>
                      <th className="pb-4">Holding Period</th>
                      <th className="pb-4">Tax Status</th>
                      <th className="pb-4">Unrealized G/L</th>
                      <th className="pb-4">Tax Rate</th>
                      <th className="pb-4">Expected Tax</th>
                    </tr>
                  </thead>
                  <tbody className="text-white">
                    {realPortfolio.map((position) => {
                      const marketValue = (position.current_price || 0) * position.shares;
                      const unrealizedGL = position.unrealized_gain_loss || 0;
                      const expectedTax = calculateExpectedTax(position);
                      const taxRate = position.is_long_term 
                        ? (income <= (filingStatus === 'single' ? 47025 : 94050) ? 0 : income <= (filingStatus === 'single' ? 518900 : 583750) ? 15 : 20)
                        : (income <= (filingStatus === 'single' ? 11000 : 22000) ? 10 : income <= (filingStatus === 'single' ? 44725 : 89450) ? 12 : income <= (filingStatus === 'single' ? 95375 : 190750) ? 22 : 24);
                      
                      return (
                        <tr key={position.symbol} className="border-b border-gray-800/50">
                          <td className="py-4">
                            <div className="font-bold text-white">{position.symbol}</div>
                          </td>
                          <td className="py-4">{position.shares.toLocaleString()}</td>
                          <td className="py-4">${position.average_price.toFixed(2)}</td>
                          <td className="py-4">${(position.current_price || 0).toFixed(2)}</td>
                          <td className="py-4 font-medium">${marketValue.toFixed(2)}</td>
                          <td className="py-4">
                            <div className="text-sm">
                              <div>{position.holding_period_days || 0} days</div>
                              <div className="text-xs text-gray-400">
                                ({Math.floor((position.holding_period_days || 0) / 365)} years {Math.floor(((position.holding_period_days || 0) % 365) / 30)} months)
                              </div>
                            </div>
                          </td>
                          <td className="py-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              position.is_long_term
                                ? 'bg-green-500/20 text-green-300'
                                : 'bg-yellow-500/20 text-yellow-300'
                            }`}>
                              {position.is_long_term ? 'Long-term' : 'Short-term'}
                            </span>
                          </td>
                          <td className="py-4">
                            <div className={`font-bold ${unrealizedGL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              <div>${unrealizedGL.toFixed(2)}</div>
                              <div className="text-xs font-normal">
                                {unrealizedGL !== 0 ? `${((unrealizedGL / (position.average_price * position.shares)) * 100).toFixed(1)}%` : '0%'}
                              </div>
                            </div>
                          </td>
                          <td className="py-4 text-sm text-gray-300">
                            <div className="font-medium">{taxRate}%</div>
                            <div className="text-xs text-gray-400">
                              {position.is_long_term ? 'Capital Gains' : 'Ordinary Income'}
                            </div>
                          </td>
                          <td className="py-4">
                            <div className={`font-bold ${expectedTax > 0 ? 'text-red-400' : 'text-gray-500'}`}>
                              {expectedTax > 0 ? `$${expectedTax.toFixed(2)}` : '$0.00'}
                            </div>
                            <div className="text-xs text-gray-400">
                              {expectedTax > 0 ? 'if sold today' : 'no tax owed'}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                
                {/* Summary Row */}
                <div className="mt-6 pt-4 border-t border-gray-600/30">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gray-700/30 rounded-lg p-4">
                      <div className="text-sm text-gray-400">Total Market Value</div>
                      <div className="text-xl font-bold text-white">
                        ${realPortfolio.reduce((sum, p) => sum + ((p.current_price || 0) * p.shares), 0).toFixed(2)}
                      </div>
                    </div>
                    <div className="bg-gray-700/30 rounded-lg p-4">
                      <div className="text-sm text-gray-400">Total Unrealized G/L</div>
                      <div className={`text-xl font-bold ${realPortfolio.reduce((sum, p) => sum + (p.unrealized_gain_loss || 0), 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        ${realPortfolio.reduce((sum, p) => sum + (p.unrealized_gain_loss || 0), 0).toFixed(2)}
                      </div>
                    </div>
                    <div className="bg-gray-700/30 rounded-lg p-4">
                      <div className="text-sm text-gray-400">Total Expected Tax</div>
                      <div className="text-xl font-bold text-red-400">
                        ${realPortfolio.reduce((sum, p) => sum + calculateExpectedTax(p), 0).toFixed(2)}
                      </div>
                    </div>
                    <div className="bg-gray-700/30 rounded-lg p-4">
                      <div className="text-sm text-gray-400">Net After Tax</div>
                      <div className="text-xl font-bold text-blue-400">
                        ${(realPortfolio.reduce((sum, p) => sum + (p.unrealized_gain_loss || 0), 0) - realPortfolio.reduce((sum, p) => sum + calculateExpectedTax(p), 0)).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Wash Sale Analysis */}
          {taxCalculation.washSaleViolations.length > 0 && (
            <div className="bg-gradient-to-br from-red-800/20 to-red-900/20 backdrop-blur-xl rounded-3xl border border-red-700/50 p-8 shadow-2xl">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-3 h-3 bg-gradient-to-r from-red-400 to-orange-400 rounded-full animate-pulse"></div>
                <h2 className="text-2xl font-bold text-white">Wash Sale Violations Detected</h2>
                <div className="px-3 py-1 bg-red-500/20 text-red-300 rounded-full text-sm font-medium">
                  {taxCalculation.washSaleViolations.length} Found
                </div>
              </div>
              
              <div className="space-y-4">
                {taxCalculation.washSaleViolations.map((violation, index) => (
                  <div key={index} className="bg-gradient-to-r from-red-500/10 to-red-600/10 rounded-2xl p-6 border border-red-500/20">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-red-400 font-bold text-lg">{violation.symbol}</div>
                        <div className="text-gray-300 text-sm mt-1">
                          Loss of ${violation.lossAmount.toFixed(2)} cannot be deducted
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-orange-400 font-bold">${violation.adjustedBasis.toFixed(2)}</div>
                        <div className="text-gray-400 text-sm">New cost basis</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Enhanced Copilot with Portfolio Context */}
      <div className="fixed right-0 top-0 w-[500px] h-screen bg-gradient-to-br from-[#181c2a] via-[#23294a] to-[#1a1d2b] shadow-xl flex flex-col border-l border-gray-700 overflow-y-auto">
        <div className="flex-1 flex flex-col justify-start items-center pt-50">
          <div className="w-full flex flex-col items-center">
            <h1 className="text-6xl font-extrabold bg-gradient-to-r from-green-400 via-blue-400 to-purple-400 bg-clip-text text-transparent mb-6 text-center">CoPilot</h1>
            <p className="text-lg text-gray-200 mb-10 text-center font-medium">Tax guidance for your portfolio</p>
            
            {messages.length === 0 ? (
              <div className="w-full max-w-md px-4 space-y-6 mb-8">
                <form onSubmit={handleSubmit} className="w-full mb-6">
                  <div className="relative">
                    <textarea
                      ref={textareaRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Ask about your portfolio's tax implications..."
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

                <div className="w-full grid grid-cols-2 gap-4 mt-6 mb-6">
                  <button
                    onClick={() => setInput("Analyze my portfolio for wash sales")}
                    className="min-h-[80px] p-4 bg-gray-800 hover:bg-gray-700 rounded-xl text-white text-sm transition-all duration-200 border-2 border-red-500 hover:border-red-400 text-left shadow-lg"
                  >
                    <div className="font-semibold text-red-400 mb-2">Wash Sales</div>
                    <div className="text-xs text-gray-300">Check my holdings</div>
                  </button>
                  <button
                    onClick={() => setInput("Show my portfolio tax implications")}
                    className="min-h-[80px] p-4 bg-gray-800 hover:bg-gray-700 rounded-xl text-white text-sm transition-all duration-200 border-2 border-green-500 hover:border-green-400 text-left shadow-lg"
                  >
                    <div className="font-semibold text-green-400 mb-2">My Portfolio</div>
                    <div className="text-xs text-gray-300">Tax analysis</div>
                  </button>
                  <button
                    onClick={() => setInput("Help me with loss harvesting")}
                    className="min-h-[80px] p-4 bg-gray-800 hover:bg-gray-700 rounded-xl text-white text-sm transition-all duration-200 border-2 border-purple-500 hover:border-purple-400 text-left shadow-lg"
                  >
                    <div className="font-semibold text-purple-400 mb-2">Loss Harvesting</div>
                    <div className="text-xs text-gray-300">Strategy for my holdings</div>
                  </button>
                  <button
                    onClick={() => setInput("What are capital gains rates for my income?")}
                    className="min-h-[80px] p-4 bg-gray-800 hover:bg-gray-700 rounded-xl text-white text-sm transition-all duration-200 border-2 border-yellow-500 hover:border-yellow-400 text-left shadow-lg"
                  >
                    <div className="font-semibold text-yellow-400 mb-2">Tax Rates</div>
                    <div className="text-xs text-gray-300">For my income level</div>
                  </button>
                </div>
              </div>
            ) : (
              <>
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
                        <div className="prose prose-invert max-w-none break-words whitespace-pre-wrap text-sm">
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

                <form onSubmit={handleSubmit} className="w-full max-w-md px-4 mb-4">
                  <div className="relative">
                    <textarea
                      ref={textareaRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Ask about taxes..."
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

export default TaxesPage;