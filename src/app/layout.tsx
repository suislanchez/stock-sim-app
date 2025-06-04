import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next" 
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SimuTrader AI - Free AI-Powered Stock Market Simulator",
  description: "Learn trading with our free, open-source AI-powered simulator. 30,000+ assets, natural language trade execution, futures simulation, crypto tracking, and built-in learning aids. No ads, no paywalls, no BS. Perfect for beginners and students.",
  keywords: [
    "stock market simulator",
    "trading simulator", 
    "AI trading",
    "learn trading",
    "investment simulator",
    "crypto simulator",
    "free trading simulator",
    "stock market education",
    "trading practice",
    "portfolio simulation",
    "UC Berkeley",
    "open source trading"
  ],
  authors: [{ name: "Luis", url: "https://github.com" }],
  creator: "Luis - UC Berkeley CS Student",
  publisher: "SimuTrader AI",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://simutrader.vercel.app",
    title: "SimuTrader AI - Free AI-Powered Trading Simulator",
    description: "Learn trading with our free, open-source AI-powered simulator. 30,000+ assets, GPT-4o integration, and built-in learning aids. Perfect for beginners.",
    siteName: "SimuTrader AI",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "SimuTrader AI - Free Trading Simulator",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "SimuTrader AI - Free AI-Powered Trading Simulator",
    description: "Learn trading with our free, open-source AI-powered simulator. 30,000+ assets, GPT-4o integration, and built-in learning aids.",
    images: ["/og-image.png"],
    creator: "@SimuTraderAI",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
  },
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="application-name" content="SimuTrader AI" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="SimuTrader AI" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#000000" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <Analytics />
      </body>
    </html>
  );
}
