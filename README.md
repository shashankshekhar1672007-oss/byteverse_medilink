# 🏥 MediLink

> **A full-stack digital healthcare platform** connecting patients and doctors through real-time consultations, e-prescriptions, health records, medicine ordering, and emergency support — all in one seamless experience.

[![JavaScript](https://img.shields.io/badge/JavaScript-78.6%25-F7DF1E?style=flat-square&logo=javascript&logoColor=black)](https://github.com/shashankshekhar1672007-oss/byteverse_medilink)
[![CSS](https://img.shields.io/badge/CSS-20.9%25-1572B6?style=flat-square&logo=css3)](https://github.com/shashankshekhar1672007-oss/byteverse_medilink)
[![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=flat-square&logo=node.js)](https://nodejs.org)
[![MongoDB](https://img.shields.io/badge/Database-MongoDB-47A248?style=flat-square&logo=mongodb)](https://mongodb.com)
[![Socket.io](https://img.shields.io/badge/Realtime-Socket.io-010101?style=flat-square&logo=socket.io)](https://socket.io)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Demo Credentials](#demo-credentials)
- [API Reference](#api-reference)
- [WebSocket Events](#websocket-events)
- [Docker Setup](#docker-setup)
- [Environment Variables](#environment-variables)
- [Scripts](#scripts)

---

## Overview

MediLink is built for the **ByteVerse Hackathon** — a production-ready telemedicine platform that bridges the gap between patients and healthcare professionals. Patients can instantly connect with available doctors, conduct video or chat consultations, receive digital prescriptions, and manage their health records, all from one platform.

---

## ✨ Features

- 🔐 **JWT Authentication** — Secure login, registration, refresh tokens, and password reset via email
- 👨‍⚕️ **Doctor Portal** — Manage profile, toggle availability, view dashboards and consultation history
- 🧑‍💼 **Patient Portal** — Book consultations, view prescriptions, manage health records
- 💬 **Real-time Chat** — Socket.io powered in-consultation messaging with typing indicators
- 📹 **Video Calls** — WebRTC peer-to-peer video consultations with full signaling support
- 📝 **E-Prescriptions** — Doctors can issue, update, and manage digital prescriptions
- 🌐 **Doctor Discovery** — Filter doctors by specialty, availability, and price
- 🐳 **Docker Ready** — Full containerized setup with MongoDB and optional Mongo Express UI
- 📖 **Swagger Docs** — Interactive API documentation at `/api-docs`
- ✅ **Jest Test Suite** — Unit and integration tests with coverage reports

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React, Vite, CSS |
| **Backend** | Node.js, Express |
| **Database** | MongoDB |
| **Realtime** | Socket.io |
| **Video** | WebRTC |
| **Auth** | JWT (Access + Refresh tokens) |
| **File Storage** | Cloudinary (falls back to memory) |
| **Email** | Nodemailer (optional) |
| **API Docs** | Swagger UI |
| **Testing** | Jest |
| **Containerization** | Docker, Docker Compose |

---

## 📁 Project Structure

```
byteverse_medilink/
├── medilink-backend/       # Node.js + Express REST API
│   ├── routes/             # Auth, doctors, patients, consultations, prescriptions
│   ├── models/             # Mongoose schemas
│   ├── middleware/         # JWT auth, role guards
│   ├── socket/             # Socket.io event handlers
│   ├── seeds/              # Demo data seeder
│   └── .env.example        # Environment config template
├── medilink-frontend/      # React + Vite client
│   └── src/
│       ├── pages/          # Patient & Doctor views
│       ├── components/     # Shared UI components
│       └── services/       # API + socket clients
├── .gitignore
├── package.json
└── package-lock.json
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js v18+
- MongoDB (local or Atlas)
- npm or yarn

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/shashankshekhar1672007-oss/byteverse_medilink.git
cd byteverse_medilink
```

#### Backend

```bash
cd medilink-backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env — set MONGODB_URI and JWT_SECRET at minimum

# Seed demo data
npm run seed

# Start dev server
npm run dev
# → http://localhost:5000
```

#### Frontend

```bash
cd medilink-frontend

# Install dependencies
npm install

# Start dev server
npm run dev
# → http://localhost:5173
```

---

## 🔑 Demo Credentials

| Role | Email | Password |
|---|---|---|
| Patient | patient1@medilink.com | pass123 |
| Doctor | doctor1@medilink.com | pass123 |

---

## 📡 API Reference

- **Swagger UI:** `http://localhost:5000/api-docs`
- **Health Check:** `http://localhost:5000/api/health`

### Endpoints Summary

#### Auth
```
POST   /api/auth/register                  Public
POST   /api/auth/login                     Public
GET    /api/auth/me                        Protected
POST   /api/auth/refresh                   Public
POST   /api/auth/logout                    Protected
POST   /api/auth/forgot-password           Public
PUT    /api/auth/reset-password/:token     Public
PUT    /api/auth/change-password           Protected
```

#### Doctors
```
GET    /api/doctors                        Public (filter by specialty, online, price)
GET    /api/doctors/:id                    Public
GET    /api/doctors/profile                Doctor only
PUT    /api/doctors/profile                Doctor only
PUT    /api/doctors/status                 Doctor only (toggle online)
GET    /api/doctors/dashboard              Doctor only
GET    /api/doctors/consultations          Doctor only
```

#### Patients
```
GET    /api/patients/profile               Patient only
PUT    /api/patients/profile               Patient only
GET    /api/patients/dashboard             Patient only
GET    /api/patients/prescriptions         Patient only
GET    /api/patients/prescriptions/active  Patient only
GET    /api/patients/consultations         Patient only
```

#### Prescriptions
```
POST   /api/prescriptions                  Doctor only
GET    /api/prescriptions                  Doctor only (own)
GET    /api/prescriptions/:id              Doctor or Patient (own)
PUT    /api/prescriptions/:id/status       Doctor only
DELETE /api/prescriptions/:id              Doctor only (cancel)
```

#### Consultations
```
POST   /api/consultations                  Patient only (auto-activates)
GET    /api/consultations/:id              Both
PUT    /api/consultations/:id/end          Both
PUT    /api/consultations/:id/cancel       Both
POST   /api/consultations/:id/messages     Both
GET    /api/consultations/:id/messages     Both
```

---

## 🔌 WebSocket Events (Socket.io)

Connect with JWT:
```js
socket.connect({ auth: { token: '<your_jwt>' } })
```

### Emit (Client → Server)

| Event | Payload | Description |
|---|---|---|
| `joinConsultation` | `{ consultationId }` | Join a consultation room |
| `sendMessage` | `{ consultationId, text }` | Send a chat message |
| `typing` | `{ consultationId }` | Broadcast typing start |
| `stopTyping` | `{ consultationId }` | Broadcast typing stop |
| `webrtc:offer` | `{ offer, consultationId }` | WebRTC offer (caller) |
| `webrtc:answer` | `{ answer, consultationId }` | WebRTC answer (callee) |
| `webrtc:ice` | `{ candidate, consultationId }` | ICE candidate exchange |
| `webrtc:ended` | `{ consultationId }` | End video call |

### Listen (Server → Client)

| Event | Payload | Description |
|---|---|---|
| `receiveMessage` | Message object | Incoming chat message |
| `typing` | `{ userId }` | Peer is typing |
| `stopTyping` | `{ userId }` | Peer stopped typing |
| `webrtc:offer` | `{ offer, from }` | Incoming call offer |
| `webrtc:answer` | `{ answer, from }` | Call accepted |
| `webrtc:ice` | `{ candidate, from }` | ICE candidate |
| `webrtc:ended` | `{ by }` | Call ended by peer |
| `doctorOnline` | `{ doctorUserId }` | Doctor came online |
| `doctorOffline` | `{ doctorUserId }` | Doctor went offline |

---

## 🐳 Docker Setup

```bash
# Start all services (API + MongoDB)
docker-compose up -d

# Seed demo data in container
docker-compose exec medilink npm run seed

# With Mongo Express UI (dev only)
docker-compose --profile dev up -d
# Mongo Express → http://localhost:8081  (admin / admin123)
```

---

## ⚙️ Environment Variables

Copy `.env.example` to `.env` in the `medilink-backend` directory and configure:

```env
# Required
MONGODB_URI=mongodb://localhost:27017/medilink
JWT_SECRET=<64-char-random-string>

# Optional — email verification & notifications
EMAIL_HOST=
EMAIL_PORT=
EMAIL_USER=
EMAIL_PASS=

# Optional — avatar & document uploads (falls back to memory storage)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

---

## 🧪 Scripts

Run these from the `medilink-backend` directory:

| Command | Description |
|---|---|
| `npm run dev` | Start with nodemon (auto-restart) |
| `npm start` | Start production server |
| `npm run seed` | Wipe DB and insert demo data |
| `npm run seed:clean` | Wipe DB only |
| `npm run seed:status` | Show collection counts |
| `npm test` | Run Jest test suite |
| `npm run test:coverage` | Run tests with coverage report |

---

## 🤝 Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you'd like to change.

---

## 📄 License

This project was built for the **ByteVerse Hackathon**. See [LICENSE](LICENSE) for details.

---

<div align="center">
  Made with ❤️ for ByteVerse Hackathon
</div>
