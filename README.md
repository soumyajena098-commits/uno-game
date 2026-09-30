# 🃏 UNO Royale — Real-Time 6-Player Multiplayer UNO Web App

A full-fledged, real-time multiplayer **UNO** web application supporting up to **6 players per room** (humans + smart AI bots), strict adherence to the official 108-card UNO rulebook, a server-authoritative **60-second turn timer**, Framer Motion card animations, synthesized Web Audio API sound effects, and a persistent global leaderboard.

---

## 🛠️ Tech Stack

- **Frontend (`client/`):** React 18 (Vite) + Tailwind CSS + Framer Motion + Zustand + React Router v6 + Socket.IO Client + Web Audio API Synthesizer
- **Backend (`server/`):** Node.js + Express + Socket.IO + MongoDB (Mongoose, with automatic local JSON persistence fallback in `server/data/leaderboard.json`)

---

## 🚀 Quick Start (Local Development)

### 1. Install Dependencies
From the root folder (`e:\uno`):
```bash
npm run install-all
```
*(Or run `npm install` inside `server/` and `client/` individually.)*

### 2. Environment Variables
Copy the `.env.example` files if you want to customize ports or connect MongoDB:
- **`server/.env`** (see [server/.env.example](file:///e:/uno/server/.env.example)):
  ```env
  PORT=3001
  CLIENT_URL=http://localhost:5173
  MONGODB_URI=
  ```
- **`client/.env`** (see [client/.env.example](file:///e:/uno/client/.env.example)):
  ```env
  VITE_SERVER_URL=http://localhost:3001
  ```

### 3. Run Backend & Frontend
Open two terminals (or run concurrently):

**Terminal 1 — Start Backend Server (`http://localhost:3001`):**
```bash
npm run dev:server
```

**Terminal 2 — Start Frontend Vite Dev Server (`http://localhost:5173`):**
```bash
npm run dev:client
```

### 4. Run Automated UNO Engine Tests
```bash
npm test
```

---

## 🧩 Core Features & Official UNO Rules Implemented

1. **Room & Invite System (`6-Digit Code` + Shareable Link):**
   - Creating a room generates a unique 6-digit code (e.g. `482913`) and an instant invite link (`/join/482913`).
   - Supports up to **6 players** (any mix of humans and AI bots).
   - Automatic reconnection: if a player refreshes or momentarily loses connection, their `playerId` restores their exact seat and hand.
2. **Official 108-Card UNO Deck:**
   - 4 Colors (`red`, `yellow`, `green`, `blue`).
   - Per color: one `0`, two each of `1–9`, two `Skip`, two `Reverse`, two `Draw Two (+2)` ($25 \times 4 = 100$ cards).
   - Wild cards: four `Wild` and four `Wild Draw Four (+4)` ($8$ cards) = **108 total cards**.
3. **Strict Server-Side Move Validation:**
   - **`Wild +4` Enforcement:** Server verifies the player holds **no cards matching the active color** before allowing a `Wild +4`.
   - **2-Player `Reverse` Rule:** In a 2-player match, playing `Reverse` acts immediately as a `Skip`.
   - **UNO Call & Penalty Catch:** Players with 1–2 cards can press the glowing **YELL UNO!** button. If a player reaches 1 card without calling UNO, opponents see a **CATCH (+2 PENALTY!)** button to force them to draw 2 penalty cards.
   - **Automatic Deck Reshuffling:** When the draw pile empties, the discard pile (except the top card) is reshuffled into a new draw pile.
4. **Hard 60-Second Turn Timer:**
   - Every turn has a server-enforced **60-second timer** with an SVG countdown ring and a 10-second audio/visual alert.
   - When 60 seconds expire (`turn_timeout`): the server **auto-draws 1 card** for the player; if the drawn card is legally playable, it is **auto-played** (selecting the optimal color if Wild); otherwise, the turn automatically passes to the next player.
5. **Leaderboard & Scoring:**
   - End of each round awards the winner the sum of all opponents' remaining cards (`0–9` = face value, `Skip`/`Reverse`/`+2` = 20 pts, `Wild`/`Wild +4` = 50 pts).
   - Supports playing to **500 points** (official tournament rule) or a **fixed number of rounds** (host configurable in lobby).
   - Displays a **Top 3 Podium (`🥇 🥈 🥉`)**, full stats table, and **Play Again** button.

---

## ☁️ Deployment Guide (Vercel + Render / Railway)

### Part A: Deploy Backend (`server/`) to Render or Railway
1. Push this repository to GitHub.
2. On **Render** (or **Railway**):
   - Create a new **Web Service** pointing to the `server` root directory (or use the included [render.yaml](file:///e:/uno/render.yaml) Blueprint).
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Environment Variables:**
     - `PORT` = `3001`
     - `CLIENT_URL` = `https://your-uno-frontend.vercel.app`
     - `MONGODB_URI` = *(Optional MongoDB Atlas connection string)*
3. Copy your deployed backend URL (e.g. `https://uno-multiplayer-server.onrender.com`).

### Part B: Deploy Frontend (`client/`) to Vercel
1. On **Vercel**, import the GitHub repository.
2. Set **Root Directory** to `client`.
3. Set **Framework Preset** to `Vite`.
4. Add **Environment Variable**:
   - `VITE_SERVER_URL` = `https://uno-multiplayer-server.onrender.com`
5. Click **Deploy**. The included [vercel.json](file:///e:/uno/client/vercel.json) automatically handles SPA routing for `/lobby/:roomId`, `/game/:roomId`, and `/join/:roomId`.
