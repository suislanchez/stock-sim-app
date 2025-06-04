import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface PortfolioItem {
  symbol: string;
  shares: number;
  average_price: number;
  total_value: number;
  gain_loss_percentage?: number;
}

interface WatchlistItem {
  symbol: string;
}

interface PortfolioMetrics {
  totalValue: number;
  totalReturn: number;
  dailyReturn: number;
}

interface MarketStatus {
  isOpen: boolean;
}

interface ChatContext {
  portfolio?: PortfolioItem[];
  watchlist?: WatchlistItem[];
  selectedStock?: string;
  portfolioMetrics?: PortfolioMetrics;
  marketStatus?: MarketStatus;
  isCryptoMode?: boolean;
}

// Simple function to parse buy requests
function parseBuyRequest(message: string) {
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
}

// Add function to parse sell requests
function parseSellRequest(message: string) {
  const sellPatterns = [
    /sell\s+(\d+)\s+(?:shares?\s+of\s+|stocks?\s+of\s+)?([a-zA-Z]+)/i,
    /sell\s+([a-zA-Z]+)\s+(?:shares?\s+of\s+)?(\d+)/i
  ];

  for (const pattern of sellPatterns) {
    const match = message.match(pattern);
    if (match) {
      // Handle both patterns: "sell 10 AAPL" and "sell AAPL 10"
      const shares = parseInt(match[1]);
      const symbol = match[2].toUpperCase();
      if (!isNaN(shares)) {
        return { shares, symbol };
      } else {
        return { shares: parseInt(match[2]), symbol: match[1].toUpperCase() };
      }
    }
  }
  return null;
}

export async function POST(req: Request) {
  try {
    const { message, context }: { message: string; context: ChatContext } = await req.json();

    // Check for buy requests
    const buyRequest = parseBuyRequest(message);
    if (buyRequest) {
      return NextResponse.json({
        message: `You asked me to buy ${buyRequest.shares} shares of ${buyRequest.symbol}. Would you like to confirm this purchase?`,
        requiresConfirmation: true,
        pendingAction: {
          type: 'buy_stock',
          symbol: buyRequest.symbol,
          shares: buyRequest.shares
        }
      });
    }

    // Check for sell requests
    const sellRequest = parseSellRequest(message);
    if (sellRequest) {
      // Check if user owns the stock
      const portfolioItem = context.portfolio?.find((item: PortfolioItem) => item.symbol === sellRequest.symbol);
      if (!portfolioItem) {
        return NextResponse.json({
          message: `You don't own any shares of ${sellRequest.symbol}.`,
          requiresConfirmation: false
        });
      }
      if (portfolioItem.shares < sellRequest.shares) {
        return NextResponse.json({
          message: `You only own ${portfolioItem.shares} shares of ${sellRequest.symbol}. You can't sell ${sellRequest.shares} shares.`,
          requiresConfirmation: false
        });
      }
      return NextResponse.json({
        message: `You asked me to sell ${sellRequest.shares} shares of ${sellRequest.symbol}. Would you like to confirm this sale?`,
        requiresConfirmation: true,
        pendingAction: {
          type: 'sell_stock',
          symbol: sellRequest.symbol,
          shares: sellRequest.shares
        }
      });
    }

    // Format portfolio data for better context
    const portfolioInfo = context.portfolio && context.portfolio.length > 0 
      ? context.portfolio.map((item: PortfolioItem) => 
          `${item.symbol}: ${item.shares} shares, avg price $${item.average_price}, current value $${item.total_value}, return ${item.gain_loss_percentage?.toFixed(2)}%`
        ).join('\n      - ')
      : 'No stocks in portfolio';

    // Format watchlist data
    const watchlistInfo = context.watchlist && context.watchlist.length > 0
      ? context.watchlist.map((item: WatchlistItem) => item.symbol).join(', ')
      : 'Empty watchlist';

    // For regular chat, use OpenAI directly
    const systemMessage = {
      role: 'system' as const,
      content: `You are SimuTrader CoPilot, an AI assistant for a stock trading simulation platform.
      
      CURRENT USER CONTEXT:
      - Selected Stock: ${context.selectedStock || 'None'}
      - Portfolio Total Value: $${typeof context.portfolioMetrics?.totalValue === 'number' ? context.portfolioMetrics.totalValue.toFixed(2) : '0.00'}
      - Total Return: ${typeof context.portfolioMetrics?.totalReturn === 'number' ? context.portfolioMetrics.totalReturn.toFixed(2) : '0.00'}%
      - Daily Return: ${typeof context.portfolioMetrics?.dailyReturn === 'number' ? context.portfolioMetrics.dailyReturn.toFixed(2) : '0.00'}%
      - Market Status: ${context.marketStatus?.isOpen ? 'Open' : 'Closed'}
      - Mode: ${context.isCryptoMode ? 'Crypto' : 'Stocks'}
      
      USER PORTFOLIO:
      - ${portfolioInfo}
      
      USER WATCHLIST:
      - ${watchlistInfo}
      
      You can help users with trading advice and analysis. When they want to buy stocks, tell them you'll help them with the purchase.
      Always maintain a professional, friendly and educational tone.`
    };

    const stream = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        systemMessage,
        { role: 'user', content: message }
      ],
      temperature: 0.1,
      stream: true,
    });

    // Create a new ReadableStream for streaming response
    const encoder = new TextEncoder();
    const customReadable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(customReadable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Error in chat API:', error);
    return NextResponse.json(
      { error: 'Failed to process chat request' },
      { status: 500 }
    );
  }
}
