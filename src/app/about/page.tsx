"use client";
import React from "react";

export default function AboutPage() {
  return (
    <div className="flex flex-col min-h-screen bg-black">
      {/* Navigation Bar */}
      <nav className="w-full bg-gray-900 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <span className="text-xl font-bold text-white">StockSim</span>
            </div>
            <div className="flex items-center space-x-4">
              <a href="/dashboard" className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium">Dashboard</a>
              <a href="/about" className="text-white bg-gray-800 px-3 py-2 rounded-md text-sm font-medium">About</a>
              <a href="/portfolio" className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium">Portfolio</a>
              <a href="/account" className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium">Account</a>
              <a href="/settings" className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium">Settings</a>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center py-16 px-4">
        <div className="w-full max-w-2xl bg-gray-900 rounded-lg shadow-lg p-8 border border-gray-800">
          <h1 className="text-3xl font-bold text-white mb-4">About StockSim</h1>
          <p className="text-gray-300 mb-6">
            <span className="font-semibold text-green-400">StockSim</span> is a social stock market simulator where you can practice trading stocks with virtual money, compete on leaderboards, and learn from others. Track your portfolio, follow your friends, and see how your strategies stack up in a risk-free environment. Perfect for beginners and experienced traders alike!
          </p>
          <h2 className="text-2xl font-semibold text-white mb-2 mt-8">About the Creator</h2>
          <div className="flex items-center gap-4 mb-2">
            <div className="w-14 h-14 rounded-full bg-gray-700 flex items-center justify-center text-2xl font-bold text-white">L</div>
            <div>
              <p className="text-white font-medium">Luis Sanchez</p>
              <p className="text-gray-400 text-sm">Dev.</p>
            </div>
          </div>
          <p className="text-gray-400 mb-4">
            Hi! I&apos;m Luis, the creator of StockSim. I built this platform to help people learn about investing and trading in a fun, social, and risk-free way. If you have feedback or want to connect, feel free to reach out!
          </p>
          <div className="flex gap-4">
            <a href="#" className="text-green-400 hover:underline">LinkedIn</a>
            <a href="#" className="text-green-400 hover:underline">GitHub</a>
            <a href="mailto:your@email.com" className="text-green-400 hover:underline">Email</a>
          </div>
        </div>
      </main>
    </div>
  );
}
