"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useRouter } from "next/navigation";

interface LeaderboardEntry {
  id: string;
  email: string;
  total_value: number;
  daily_return: number;
  total_return: number;
  rank: number;
}

export default function LeaderboardPage() {
  const router = useRouter();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState("all");
  const [userRank, setUserRank] = useState<LeaderboardEntry | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setError(null);
        console.log("Starting leaderboard fetch...");

        // First get the current user's session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error("Session error:", sessionError);
          throw new Error(`Session error: ${sessionError.message}`);
        }

        if (!session?.user) {
          console.log("No session found, redirecting to login...");
          router.push("/login");
          return;
        }

        console.log("Session found, fetching profiles...");

        // Calculate the date range based on timeframe
        const now = new Date();
        let startDate = new Date();
        switch (timeframe) {
          case "daily":
            startDate.setDate(now.getDate() - 1);
            break;
          case "weekly":
            startDate.setDate(now.getDate() - 7);
            break;
          case "monthly":
            startDate.setMonth(now.getMonth() - 1);
            break;
          default: // "all"
            startDate = new Date(0);
        }

        // Fetch all users' portfolio data
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, email, balance")
          .order('email');

        if (profilesError) {
          console.error("Profiles error:", profilesError);
          throw new Error(`Failed to fetch profiles: ${profilesError.message}`);
        }

        if (!profiles || profiles.length === 0) {
          console.log("No profiles found");
          setLeaderboard([]);
          setUserRank(null);
          return;
        }

        console.log(`Found ${profiles.length} profiles`);

        // Fetch portfolio history for each user within the timeframe
        const { data: portfolioHistory, error: historyError } = await supabase
          .from("portfolio_history")
          .select("*")
          .gte('created_at', startDate.toISOString())
          .order("created_at", { ascending: false });

        if (historyError) {
          console.error("History error:", historyError);
          throw new Error(`Failed to fetch portfolio history: ${historyError.message}`);
        }

        console.log(`Found ${portfolioHistory?.length || 0} portfolio history entries`);

        // Group history by user and get latest entry
        const latestHistory = (portfolioHistory || []).reduce((acc, entry) => {
          if (!acc[entry.user_id] || new Date(entry.created_at) > new Date(acc[entry.user_id].created_at)) {
            acc[entry.user_id] = entry;
          }
          return acc;
        }, {} as Record<string, any>);

        // Calculate total value and returns for each user
        const userValues = profiles.map(profile => {
          const userHistory = latestHistory[profile.id];
          const totalValue = userHistory?.total_value || profile.balance || 0;
          const INITIAL_BALANCE = 10000; // Initial $10,000
          const totalReturn = ((totalValue - INITIAL_BALANCE) / INITIAL_BALANCE) * 100;
          
          return {
            id: profile.id,
            email: profile.email,
            total_value: totalValue,
            daily_return: userHistory?.daily_return || 0,
            total_return: totalReturn,
            rank: 0
          };
        });

        // Sort by total value and assign ranks
        const sortedUsers = userValues
          .sort((a, b) => b.total_value - a.total_value)
          .map((user, index) => ({
            ...user,
            rank: index + 1
          }));

        console.log("Setting leaderboard with", sortedUsers.length, "users");
        setLeaderboard(sortedUsers);

        // Find current user's rank if logged in
        if (session?.user) {
          const currentUserRank = sortedUsers.find(user => user.id === session.user.id);
          if (currentUserRank) {
            console.log("Found current user rank:", currentUserRank.rank);
            setUserRank(currentUserRank);
          } else {
            console.log("Current user not found in leaderboard");
            setUserRank(null);
          }
        } else {
          setUserRank(null);
        }

      } catch (error: any) {
        console.error("Detailed error in fetchLeaderboard:", error);
        setError(error.message || "An error occurred while fetching the leaderboard");
        setLeaderboard([]);
        setUserRank(null);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();

    // Set up real-time subscriptions for updates
    const portfolioSubscription = supabase
      .channel('portfolio_changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'portfolio' 
        }, 
        () => {
          console.log("Portfolio change detected, refreshing leaderboard...");
          fetchLeaderboard();
        }
      )
      .subscribe();

    const profileSubscription = supabase
      .channel('profile_changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'profiles' 
        }, 
        () => {
          console.log("Profile change detected, refreshing leaderboard...");
          fetchLeaderboard();
        }
      )
      .subscribe();

    const historySubscription = supabase
      .channel('portfolio_history_changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'portfolio_history' 
        }, 
        () => {
          console.log("Portfolio history change detected, refreshing leaderboard...");
          fetchLeaderboard();
        }
      )
      .subscribe();

    return () => {
      portfolioSubscription.unsubscribe();
      profileSubscription.unsubscribe();
      historySubscription.unsubscribe();
    };
  }, [router, timeframe]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <p className="text-white">Loading leaderboard…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="text-center">
          <p className="text-red-500 mb-4">Error: {error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center min-h-screen bg-black">
      {/* Professional Navigation Bar */}
      <nav className="w-full bg-gray-900 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <span className="text-xl font-bold text-white">StockSim</span>
            </div>
            <div className="flex items-center space-x-4">
              <a href="/dashboard" className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium">Dashboard</a>
              <a href="/about" className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium">About</a>
              <a href="/portfolio" className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium">Portfolio</a>
              <a href="/account" className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium">Account</a>
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
            <h1 className="text-3xl font-bold text-white">Leaderboard</h1>
          </div>
          <div className="flex gap-4">
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="px-4 py-2 bg-gray-800 text-white border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="all">All Time</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
        </div>

        {/* Current User's Rank */}
        {userRank && (
          <div className="mb-8 p-6 bg-gray-800 rounded-lg border border-green-500">
            <h2 className="text-xl font-semibold text-white mb-4">Your Rank</h2>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="text-4xl font-bold text-green-500">#{userRank.rank}</div>
                <div>
                  <p className="text-white font-medium">{userRank.email}</p>
                  <p className="text-gray-400 text-sm">Total Value: ${userRank.total_value.toLocaleString()}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-400">Past 24 hr Return</p>
                <p className={`text-lg font-semibold ${userRank.daily_return >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {userRank.daily_return >= 0 ? '+' : ''}{userRank.daily_return.toFixed(2)}%
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Leaderboard Tables */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Past 24hr Returns Leaderboard */}
          <div className="bg-gray-900 rounded-lg shadow-lg overflow-hidden">
            <h2 className="text-xl font-semibold text-white p-6 border-b border-gray-800">Past 24hr Returns Leaderboard</h2>
            {leaderboard.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-gray-400">No data available.</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-800">
                    <th className="px-4 py-4 text-left text-sm font-medium text-gray-400">Rank</th>
                    <th className="px-4 py-4 text-left text-sm font-medium text-gray-400">User</th>
                    <th className="px-4 py-4 text-right text-sm font-medium text-gray-400">Total Value</th>
                    <th className="px-4 py-4 text-right text-sm font-medium text-gray-400">Past 24 hr Return</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {[...leaderboard]
                    .sort((a, b) => b.daily_return - a.daily_return)
                    .map((entry, index) => (
                      <tr key={`daily-${entry.id}`} className="hover:bg-gray-800 transition-colors">
                        <td className="px-4 py-4 text-sm text-gray-300">
                          #{index + 1}
                        </td>
                        <td className="px-4 py-4 text-sm text-white">
                          <a 
                            href={`/portfolio/${entry.id}`}
                            className="hover:text-green-500 transition-colors"
                          >
                            {entry.email}
                          </a>
                        </td>
                        <td className="px-4 py-4 text-sm text-white text-right">
                          ${entry.total_value.toLocaleString()}
                        </td>
                        <td className="px-4 py-4 text-sm text-right">
                          <span className={entry.daily_return >= 0 ? 'text-green-500' : 'text-red-500'}>
                            {entry.daily_return >= 0 ? '+' : ''}{entry.daily_return.toFixed(2)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}
          </div>

          {/* All-Time Returns Leaderboard */}
          <div className="bg-gray-900 rounded-lg shadow-lg overflow-hidden">
            <h2 className="text-xl font-semibold text-white p-6 border-b border-gray-800">All-Time Returns Leaderboard</h2>
            {leaderboard.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-gray-400">No data available.</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-800">
                    <th className="px-4 py-4 text-left text-sm font-medium text-gray-400">Rank</th>
                    <th className="px-4 py-4 text-left text-sm font-medium text-gray-400">User</th>
                    <th className="px-4 py-4 text-right text-sm font-medium text-gray-400">Total Value</th>
                    <th className="px-4 py-4 text-right text-sm font-medium text-gray-400">Total Return</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {[...leaderboard]
                    .sort((a, b) => b.total_return - a.total_return)
                    .map((entry, index) => (
                      <tr key={`total-${entry.id}`} className="hover:bg-gray-800 transition-colors">
                        <td className="px-4 py-4 text-sm text-gray-300">
                          #{index + 1}
                        </td>
                        <td className="px-4 py-4 text-sm text-white">
                          <a 
                            href={`/portfolio/${entry.id}`}
                            className="hover:text-green-500 transition-colors"
                          >
                            {entry.email}
                          </a>
                        </td>
                        <td className="px-4 py-4 text-sm text-white text-right">
                          ${entry.total_value.toLocaleString()}
                        </td>
                        <td className="px-4 py-4 text-sm text-right">
                          <span className={entry.total_return >= 0 ? 'text-green-500' : 'text-red-500'}>
                            {entry.total_return >= 0 ? '+' : ''}{entry.total_return.toFixed(2)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 