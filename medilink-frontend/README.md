# MediLink Frontend

React + Vite frontend — real-time chat via Socket.io, video calls via WebRTC.

## Quick Start

```bash
# 1. Start backend first (port 5000 required)
cd ../medilink-backend
npm install && npm run seed && npm run dev

# 2. Start frontend
npm install
npm run dev          # → http://localhost:3000
```

## Demo Accounts (seed backend first)

| Role    | Email                    | Password |
|---------|--------------------------|----------|
| Patient | patient1@medilink.com    | pass123  |
| Doctor  | doctor1@medilink.com     | pass123  |

## Real-time Features

### Chat (Socket.io)
- Instant delivery — no polling
- Typing indicators ("typing…")
- Message delivery ticks (○ pending → ✓ delivered)
- REST fallback if socket drops

### Video Call (WebRTC peer-to-peer)
- Click 📹 **Call** button to start
- Other party sees offer — click to accept
- Toggle camera 📷, mute mic 🎙️, share screen 🖥️
- Encrypted peer-to-peer — no video goes through server
- Works on same LAN or internet (uses Google STUN)

### How to test video
1. Log in as Patient in one browser tab/window
2. Log in as Doctor in another tab/window (or incognito)
3. Patient navigates to a doctor → Consult Now
4. Doctor navigates to Consultations
5. Either party clicks 📹 Call — other sees the offer and can answer

## Architecture

```
src/
├── services/
│   ├── api.js        # REST calls with JWT auto-refresh
│   └── socket.js     # Socket.io client + WebRTC signalling helpers
├── context/
│   └── AppContext.jsx # Auth, navigation, socket lifecycle
└── components/
    └── pages/
        └── Consultation.jsx  # Socket chat + WebRTC video
```
