# MediLink Backend API

Production-ready telemedicine platform backend — Node.js, Express, MongoDB, Socket.io.

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env — set MONGODB_URI and JWT_SECRET at minimum

# 3. Seed demo data
npm run seed

# 4. Start dev server
npm run dev
# → http://localhost:5000
```

## Demo Credentials

| Role    | Email                    | Password |
|---------|--------------------------|----------|
| Patient | patient1@medilink.com    | pass123  |
| Doctor  | doctor1@medilink.com     | pass123  |

## Scripts

| Command              | Description                        |
|----------------------|------------------------------------|
| `npm run dev`        | Start with nodemon (auto-restart)  |
| `npm start`          | Start production server            |
| `npm run seed`       | Wipe DB and insert demo data       |
| `npm run seed:clean` | Wipe DB only                       |
| `npm run seed:status`| Show collection counts             |
| `npm test`           | Run Jest test suite                |
| `npm run test:coverage` | Run tests with coverage report  |

## API Reference

- **Swagger UI:** `http://localhost:5000/api-docs`
- **Health check:** `http://localhost:5000/api/health`

### Endpoints Summary

```
POST   /api/auth/register          Public
POST   /api/auth/login             Public
GET    /api/auth/me                Protected
POST   /api/auth/refresh           Public
POST   /api/auth/logout            Protected
POST   /api/auth/forgot-password   Public
PUT    /api/auth/reset-password/:token  Public
PUT    /api/auth/change-password   Protected

GET    /api/doctors                Public (filter by specialty, online, price)
GET    /api/doctors/:id            Public
GET    /api/doctors/profile        Doctor only
PUT    /api/doctors/profile        Doctor only
PUT    /api/doctors/status         Doctor only (toggle online)
GET    /api/doctors/dashboard      Doctor only
GET    /api/doctors/consultations  Doctor only

GET    /api/patients/profile       Patient only
PUT    /api/patients/profile       Patient only
GET    /api/patients/dashboard     Patient only
GET    /api/patients/prescriptions Patient only
GET    /api/patients/prescriptions/active  Patient only
GET    /api/patients/consultations Patient only

POST   /api/prescriptions          Doctor only
GET    /api/prescriptions          Doctor only (own)
GET    /api/prescriptions/:id      Doctor or Patient (own)
PUT    /api/prescriptions/:id/status  Doctor only
DELETE /api/prescriptions/:id      Doctor only (cancel)

POST   /api/consultations          Patient only (auto-activates)
GET    /api/consultations/:id      Both
PUT    /api/consultations/:id/end  Both
PUT    /api/consultations/:id/cancel  Both
POST   /api/consultations/:id/messages  Both
GET    /api/consultations/:id/messages  Both
```

## WebSocket Events (Socket.io)

Connect with JWT: `{ auth: { token: '<jwt>' } }`

| Event (emit)          | Payload                            | Description              |
|-----------------------|------------------------------------|--------------------------|
| `joinConsultation`    | `{ consultationId }`               | Join consultation room   |
| `sendMessage`         | `{ consultationId, text }`         | Send chat message        |
| `typing`              | `{ consultationId }`               | Broadcast typing start   |
| `stopTyping`          | `{ consultationId }`               | Broadcast typing stop    |
| `webrtc:offer`        | `{ offer, consultationId }`        | WebRTC offer (caller)    |
| `webrtc:answer`       | `{ answer, consultationId }`       | WebRTC answer (callee)   |
| `webrtc:ice`          | `{ candidate, consultationId }`    | ICE candidate exchange   |
| `webrtc:ended`        | `{ consultationId }`               | End video call           |

| Event (listen)        | Payload                            | Description              |
|-----------------------|------------------------------------|--------------------------|
| `receiveMessage`      | Message object                     | Incoming chat message    |
| `typing`              | `{ userId }`                       | Peer is typing           |
| `stopTyping`          | `{ userId }`                       | Peer stopped typing      |
| `webrtc:offer`        | `{ offer, from }`                  | Incoming call offer      |
| `webrtc:answer`       | `{ answer, from }`                 | Call accepted            |
| `webrtc:ice`          | `{ candidate, from }`              | ICE candidate            |
| `webrtc:ended`        | `{ by }`                           | Call ended by peer       |
| `doctorOnline`        | `{ doctorUserId }`                 | Doctor came online       |
| `doctorOffline`       | `{ doctorUserId }`                 | Doctor went offline      |

## Docker

```bash
# Start all services (API + MongoDB + optional Mongo Express)
docker-compose up -d

# Seed demo data in container
docker-compose exec medilink npm run seed

# With Mongo Express UI (dev only)
docker-compose --profile dev up -d
# UI at http://localhost:8081  (admin / admin123)
```

## Environment Variables

See `.env.example` for full documentation. Minimum required:

```env
MONGODB_URI=mongodb://localhost:27017/medilink
JWT_SECRET=<64-char-random-string>
```

Optional (app works without them in development):
- `EMAIL_*` — email verification and notifications
- `CLOUDINARY_*` — avatar and document uploads (falls back to memory storage)
