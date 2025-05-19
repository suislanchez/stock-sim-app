# Stock Sim Social

A simulated stock‑trading social platform where everyone starts with \$100 in virtual cash, trades real market data, and competes on a global leaderboard.

## 🚀 MVP Feature List

1. **User Authentication**  
   - Sign up / log in via Supabase Auth  
   - New users receive a \$100 starting balance  

2. **Stock Search & Quote**  
   - Search by ticker symbol (e.g. AAPL, TSLA)  
   - Display current price & % change via Databento API  

3. **Trade Engine**  
   - Buy or sell shares against your virtual balance  
   - Records each trade in a `trades` table  

4. **Portfolio Dashboard**  
   - Shows all owned positions (quantity, avg. buy price)  
   - Calculates real‑time unrealized P/L  

5. **Trade History**  
   - List of past buy/sell actions with timestamps  

6. **Leaderboard**  
   - Ranks users by return (%) since signup  
   - Updates in real time  

7. **Basic Social Feed**  
   - Users can post a summary of each trade  
   - (Likes & comments: optional for later)

## 💻 Tech Stack

- **Frontend:** Next.js (App Router) + TypeScript + Tailwind CSS  
- **Backend & Auth:** Supabase (Postgres, Auth, Realtime)  
- **Stock Data:** Databento API  
- **Deployment:** Vercel (frontend) + Supabase (backend)

## 📂 Project Structure