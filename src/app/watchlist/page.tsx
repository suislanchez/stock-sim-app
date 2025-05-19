"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useRouter } from "next/navigation";
import { fetchStock } from "../../lib/fetchStock";

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
}

export default function WatchlistPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingWatchlist, setIsLoadingWatchlist] = useState(true);

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
            const stockData = await fetchStock(item.symbol);
            return {
              ...item,
              current_price: stockData.price,
              change: stockData.change
            };
          })
        );

        setWatchlist(watchlistWithPrices);
      } catch (err: any) {
        console.error("Error fetching watchlist:", err);
        setError(err.message);
      } finally {
        setIsLoadingWatchlist(false);
      }
    };

    fetchWatchlist();
  }, [profile?.id]);

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
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <p className="text-white">Loading watchlist...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center min-h-screen bg-black">
      {/* Navigation Bar */}
      <nav className="w-full bg-gray-900 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <span className="text-xl font-bold text-white">StockSim</span>
            </div>
            <div className="flex items-center space-x-4">
              <a href="/dashboard" className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium">Dashboard</a>
              <a href="/trade" className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium">Trade</a>
              <a href="/portfolio" className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium">Portfolio</a>
              <a href="/watchlist" className="text-white px-3 py-2 rounded-md text-sm font-medium">Watchlist</a>
              <a href="/leaderboard" className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium">Leaderboard</a>
              <a href="/settings" className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium">Settings</a>
            </div>
          </div>
        </div>
      </nav>

      <div className="w-full max-w-6xl p-8">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <a
              href="/dashboard"
              className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
            >
              <span className="text-xl">←</span>
              <span>Back to Dashboard</span>
            </a>
            <h1 className="text-3xl font-bold text-white">Watchlist</h1>
          </div>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-red-900/50 border border-red-500 rounded-lg">
            <p className="text-red-500">{error}</p>
          </div>
        )}

        {isLoadingWatchlist ? (
          <div className="text-center py-12 bg-gray-800 rounded-lg">
            <div className="flex items-center justify-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-500"></div>
              <p className="text-gray-400">Loading your watchlist...</p>
            </div>
          </div>
        ) : watchlist.length === 0 ? (
          <div className="text-center py-12 bg-gray-800 rounded-lg">
            <p className="text-gray-400 text-lg mb-4">Your watchlist is empty</p>
            <p className="text-gray-500 text-sm mb-6">Add stocks to your watchlist to track their performance</p>
            <a
              href="/dashboard"
              className="inline-block px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              Browse Stocks
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {watchlist.map((item) => (
              <div key={item.symbol} className="p-4 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="text-lg font-semibold text-white">{item.symbol}</h4>
                    <p className="text-sm text-gray-400">
                      Added {new Date(item.added_at).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => handleRemoveFromWatchlist(item.symbol)}
                    className="text-red-500 hover:text-red-400"
                  >
                    Remove
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-400">Current Price</span>
                    <span className="text-sm text-white">${item.current_price?.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-400">24h Change</span>
                    <span className={`text-sm font-medium ${(item.change ?? 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {(item.change ?? 0) >= 0 ? '+' : ''}{item.change?.toFixed(2)}%
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-700">
                  <a
                    href={`/dashboard?symbol=${item.symbol}`}
                    className="text-green-500 hover:text-green-400 text-sm"
                  >
                    View Details →
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 