'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';

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
}

const DashboardPage = () => {
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [portfolioValue, setPortfolioValue] = useState<number>(0);
  const [dailyChange, setDailyChange] = useState<number>(0);
  const [marketStatus, setMarketStatus] = useState<{ isOpen: boolean; timeRemaining: string }>({ isOpen: false, timeRemaining: '' });
  const [loading, setLoading] = useState(true);

  // Fetch portfolio data
  const fetchPortfolio = async () => {
    try {
      const response = await fetch('/api/portfolio');
      const data = await response.json();
      setPortfolio(data);
      
      // Calculate total portfolio value
      const totalValue = data.reduce((acc: number, item: PortfolioItem) => 
        acc + (item.total_value || 0), 0);
      setPortfolioValue(totalValue);

      // Calculate daily change
      const dailyChangeValue = data.reduce((acc: number, item: PortfolioItem) => 
        acc + (item.gain_loss || 0), 0);
      setDailyChange(dailyChangeValue);
    } catch (error) {
      console.error('Error fetching portfolio:', error);
    }
  };

  // Calculate market status
  const calculateMarketStatus = () => {
    const now = new Date();
    const marketOpen = new Date(now);
    marketOpen.setHours(9, 30, 0, 0);
    const marketClose = new Date(now);
    marketClose.setHours(16, 0, 0, 0);

    const isOpen = now >= marketOpen && now <= marketClose;
    let timeRemaining = '';

    if (isOpen) {
      const remaining = marketClose.getTime() - now.getTime();
      const hours = Math.floor(remaining / (1000 * 60 * 60));
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
      timeRemaining = `${hours}h ${minutes}m`;
    } else {
      timeRemaining = 'Market Closed';
    }

    setMarketStatus({ isOpen, timeRemaining });
  };

  useEffect(() => {
    fetchPortfolio();
    calculateMarketStatus();
    const interval = setInterval(calculateMarketStatus, 60000);
    return () => clearInterval(interval);
  }, []);

  // Dashboard cards data
  const cards = [
    { label: 'Total Stocks', value: portfolio.length.toString() },
    { label: 'Portfolio Value', value: `$${portfolioValue.toLocaleString()}` },
    { label: 'Daily Change', value: `${dailyChange >= 0 ? '+' : ''}${dailyChange.toFixed(2)}%` },
  ];

  return (
    <div className="flex h-screen bg-black text-white">
      {/* Sidebar */}
      <div className="w-64 bg-gray-900 p-4">
        <div className="mb-8 flex items-center">
          <Image src="/logo.png" alt="SimuTrader Logo" width={40} height={40} className="mr-2" />
          <h1 className="text-2xl font-bold">SimuTrader</h1>
        </div>
        <div className="mb-4">
          <input type="text" placeholder="Search stocks..." className="w-full p-2 bg-gray-800 rounded border border-gray-700" />
        </div>
        <nav>
          <ul>
            <li className="mb-2 flex items-center hover:bg-gray-800 p-2 rounded cursor-pointer">
              Dashboard
            </li>
            <li className="mb-2 flex items-center hover:bg-gray-800 p-2 rounded cursor-pointer">
              Portfolio
            </li>
            <li className="mb-2 flex items-center hover:bg-gray-800 p-2 rounded cursor-pointer">
              Market
            </li>
            <li className="mb-2 flex items-center hover:bg-gray-800 p-2 rounded cursor-pointer">
              Reports
            </li>
          </ul>
        </nav>
        <div className="mt-8">
          <h2 className="text-lg font-semibold">Market Status</h2>
          <div className="mt-2 p-2 bg-gray-800 rounded border border-gray-700">
            <p className={marketStatus.isOpen ? 'text-green-400' : 'text-red-400'}>
              {marketStatus.isOpen ? 'Market Open' : 'Market Closed'}
            </p>
            <p className="text-sm text-gray-400">{marketStatus.timeRemaining}</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6">
        {/* Top Bar */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <p>Last updated: {new Date().toLocaleString()}</p>
          </div>
          <div className="flex items-center">
            <button className="mr-2 p-2 bg-gray-800 rounded border border-gray-700">Export</button>
            <button className="mr-2 p-2 bg-gray-800 rounded border border-gray-700">Edit</button>
            <div className="w-10 h-10 bg-gray-800 rounded-full border border-gray-700"></div>
          </div>
        </div>

        {/* Dashboard Cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {cards.map((card, index) => (
            <div key={index} className="p-4 bg-gray-900 rounded border border-gray-800 shadow-lg">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">{card.label}</h3>
              </div>
              <p className="text-3xl font-bold">{card.value}</p>
            </div>
          ))}
        </div>

        {/* Portfolio Value Chart */}
        <div className="mb-6 p-4 bg-gray-900 rounded border border-gray-800 shadow-lg">
          <h2 className="text-lg font-semibold mb-4">Portfolio Value Over Time</h2>
          <div className="h-64 flex items-end">
            {portfolio.map((item, index) => (
              <div key={index} className="flex-1 flex flex-col items-center">
                <div className="w-full flex justify-center">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                </div>
                <div className="w-full h-32 flex items-end">
                  <div 
                    className="w-full bg-blue-500 rounded-t"
                    style={{ 
                      height: `${((item.total_value || 0) / portfolioValue) * 100}%` 
                    }}
                  ></div>
                </div>
                <span className="text-sm">{item.symbol}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Portfolio Boxes */}
        <div className="p-4 bg-gray-900 rounded border border-gray-800 shadow-lg">
          <h2 className="text-lg font-semibold mb-4">Portfolio</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {portfolio.map((item) => (
              <div key={item.symbol} className="p-4 bg-gray-800 rounded border border-gray-700">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="text-xl font-bold">{item.symbol}</h3>
                    <p className="text-gray-400">{item.shares} shares</p>
                  </div>
                  <span className={`px-2 py-1 rounded ${
                    (item.gain_loss_percentage || 0) >= 0 ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'
                  }`}>
                    {(item.gain_loss_percentage || 0).toFixed(2)}%
                  </span>
                </div>
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Avg Price</span>
                    <span>${item.average_price.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Current Price</span>
                    <span>${(item.current_price || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total Value</span>
                    <span>${(item.total_value || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
