# MediLink

MediLink is a full-stack telemedicine app for patients, doctors, and admins. It includes doctor discovery, real-time consultations, WebRTC video signaling, chat, e-prescriptions, medicine orders, patient health records, profile uploads, and admin user/order management.

The repository is split into an Express/MongoDB backend and a React/Vite frontend.

## What is Included

- JWT authentication with patient, doctor, and admin roles
- Doctor search, specialty filters, online status, dashboards, and reviews
- Patient dashboard, profile, prescriptions, consultations, and health data
- Consultation lifecycle with pending, active, completed, cancelled states
- Socket.io chat, typing indicators, presence, and WebRTC signaling events
- E-prescription creation, status updates, and cancellation
- Medicine order creation, cancellation, and admin fulfillment controls
- Cloudinary-backed avatar and document uploads
- Swagger UI and OpenAPI JSON for the REST API
- Jest/Supertest backend tests
- Dockerfile and docker-compose setup for the backend and MongoDB

## Tech Stack

| Area | Tools |
| --- | --- |
| Frontend | React 18, Vite, CSS Modules, Socket.io client |
| Backend | Node.js, Express, Socket.io, Helmet, CORS, rate limiting |
| Database | MongoDB, Mongoose |
| Auth | JWT, bcryptjs, role guards |
| Uploads | Multer, Cloudinary |
| Email | Nodemailer |
| API docs | Swagger UI, OpenAPI 3 |
| Tests | Jest, Supertest |
| Deployment | Docker, Railway config, serverless-http adapter |

## Project Structure

Generated/dependency folders such as `node_modules/`, `frontend/dist/`, coverage output, and local `.env` files are intentionally omitted.

```text
byteverse_medilink/
|-- backend/
|   |-- api/
|   |   `-- [...all].js                         # Serverless entry that wraps the Express app
|   |-- config/
|   |   `-- swagger.js                          # OpenAPI 3 spec and Swagger UI options
|   |-- controllers/
|   |   |-- adminController.js                  # Admin dashboard, user management, profile sync
|   |   |-- authController.js                   # Register, login, logout, refresh, password flows
|   |   |-- consultationController.js           # Consultation lifecycle and message REST handlers
|   |   |-- doctorController.js                 # Doctor listing, profile, status, dashboard, reviews
|   |   |-- orderController.js                  # Medicine order creation, listing, status, cancellation
|   |   |-- patientController.js                # Patient profile, dashboard, prescriptions, search
|   |   `-- prescriptionController.js           # E-prescription creation, lookup, status, cancellation
|   |-- middleware/
|   |   |-- auth.js                             # JWT protection, role authorization, optional auth
|   |   |-- errorHandler.js                     # Global Express error response middleware
|   |   |-- upload.js                           # Multer + Cloudinary avatar/document upload handlers
|   |   `-- validate.js                         # express-validator result formatter
|   |-- models/
|   |   |-- Consultation.js                     # Consultation schema, room IDs, lifecycle helpers
|   |   |-- Doctor.js                           # Doctor profile schema, availability, ratings
|   |   |-- Message.js                          # Consultation chat message schema
|   |   |-- Order.js                            # Medicine order schema, totals, status history
|   |   |-- Patient.js                          # Patient profile, health data, medical history
|   |   |-- Prescription.js                     # Prescription schema, medicines, RX IDs, expiry
|   |   `-- User.js                             # Auth user schema, password hashing, JWT helpers
|   |-- routes/
|   |   |-- admin.js                            # /api/admin routes
|   |   |-- auth.js                             # /api/auth routes
|   |   |-- consultations.js                    # /api/consultations routes
|   |   |-- doctors.js                          # /api/doctors routes
|   |   |-- orders.js                           # /api/orders routes
|   |   |-- patients.js                         # /api/patients routes
|   |   `-- prescriptions.js                    # /api/prescriptions routes
|   |-- socket/
|   |   |-- handlers.js                         # Socket.io auth, rooms, chat, WebRTC signaling
|   |   `-- ioInstance.js                       # Shared Socket.io instance setter/getter
|   |-- tests/
|   |   |-- admin.test.js                       # Admin API integration tests
|   |   |-- auth.test.js                        # Authentication integration tests
|   |   |-- consultations.test.js               # Consultation API integration tests
|   |   |-- doctors.test.js                     # Doctor API integration tests
|   |   |-- orders.test.js                      # Order API integration tests
|   |   `-- prescriptions.test.js              # Prescription API integration tests
|   |-- utils/
|   |   |-- apiResponse.js                      # Standard success, error, and pagination helpers
|   |   |-- constants.js                        # Roles, statuses, enums, pagination constants
|   |   |-- email.js                            # Nodemailer transport and email templates
|   |   `-- seed.js                            # Demo users, patients, and doctors fixture data
|   |-- Dockerfile                            # Production backend container image
|   |-- docker-compose.yml                    # Backend, MongoDB, optional Mongo Express stack
|   |-- package-lock.json                     # Backend npm lockfile
|   |-- package.json                          # Backend dependencies, scripts, Jest config
|   |-- seeder.js                             # Database clean/seed CLI
|   `-- server.js                             # Express app, middleware, routes, Swagger, Socket.io
|-- frontend/
|   |-- public/
|   |   |-- notification.wav                   # General notification sound asset
|   |   |-- ringtone.mp3                       # Incoming call ringtone asset
|   |   `-- tone.mp3                           # Notification tone asset
|   |-- src/
|   |   |-- assets/
|   |   |   |-- logo.png                       # MediLink logo asset
|   |   |   `-- logo_2.png                     # Alternate MediLink logo asset
|   |   |-- components/
|   |   |   |-- layout/
|   |   |   |   |-- AppShell.jsx                 # Main authenticated patient/admin layout shell
|   |   |   |   |-- AppShell.module.css          # App shell styles
|   |   |   |   |-- DoctorShell.jsx              # Doctor-facing layout shell
|   |   |   |   |-- IncomingCallNotice.jsx       # Global incoming video call notice
|   |   |   |   |-- IncomingCallNotice.module.css # Incoming call notice styles
|   |   |   |   |-- Sidebar.jsx                  # Navigation sidebar
|   |   |   |   |-- Sidebar.module.css           # Sidebar styles
|   |   |   |   |-- TopNavbar.jsx                # Top navigation bar
|   |   |   |   `-- TopNavbar.module.css        # Top navbar styles
|   |   |   |-- pages/
|   |   |   |   |-- CSS/
|   |   |   |   |   |-- AdminDashboard.module.css        # Admin dashboard styles
|   |   |   |   |   |-- Consultation.module.css          # Consultation room styles
|   |   |   |   |   |-- ConsultationList.module.css      # Consultation list styles
|   |   |   |   |   |-- CreatePrescription.module.css    # Prescription creation styles
|   |   |   |   |   |-- Dashboard.module.css             # Patient dashboard styles
|   |   |   |   |   |-- DoctorDashboard.module.css       # Doctor dashboard styles
|   |   |   |   |   |-- DoctorList.module.css            # Doctor discovery styles
|   |   |   |   |   |-- DoctorPrescriptions.module.css   # Doctor prescriptions styles
|   |   |   |   |   |-- HealthRecords.module.css         # Health records styles
|   |   |   |   |   |-- Login.module.css                 # Login/register styles
|   |   |   |   |   |-- Orders.module.css                # Orders page styles
|   |   |   |   |   |-- Prescription.module.css          # Prescription detail styles
|   |   |   |   |   |-- PrescriptionList.module.css      # Prescription list styles
|   |   |   |   |   |-- Profile.module.css               # Profile page styles
|   |   |   |   |   `-- SOSPage.module.css             # SOS page styles
|   |   |   |   |-- consultation/
|   |   |   |   |   |-- ChatPanel.jsx                    # Consultation chat panel
|   |   |   |   |   |-- ConsultationHeader.jsx           # Consultation room header
|   |   |   |   |   |-- consultationUtils.js             # Consultation helper functions
|   |   |   |   |   |-- CurrentConsultationsList.jsx     # Active/pending consultation list
|   |   |   |   |   |-- IncomingCallBanner.jsx           # In-room incoming call banner
|   |   |   |   |   |-- useConsultationSession.js        # Consultation data/socket/WebRTC hook
|   |   |   |   |   `-- VideoPanel.jsx                  # Local/remote video panel
|   |   |   |   |-- orders/
|   |   |   |   |   |-- FulfillmentSelector.jsx          # Delivery/payment selection UI
|   |   |   |   |   |-- orderUtils.js                    # Order helper functions
|   |   |   |   |   |-- OrdersHero.jsx                   # Orders page hero/header
|   |   |   |   |   |-- OrderSummaryCard.jsx             # Order totals and summary card
|   |   |   |   |   |-- OrderTracker.jsx                 # Order status timeline/tracker
|   |   |   |   |   |-- PrescriptionItems.jsx            # Prescription medicine item selector
|   |   |   |   |   |-- PromiseGrid.jsx                  # Orders promise/value grid
|   |   |   |   |   `-- useMedicineOrder.js            # Medicine order form state hook
|   |   |   |   |-- sos/
|   |   |   |   |   |-- SOSHero.jsx                      # SOS page top section
|   |   |   |   |   |-- SOSInfoPanel.jsx                 # SOS support information panel
|   |   |   |   |   |-- sosUtils.js                      # Emergency helper functions
|   |   |   |   |   `-- useEmergencySOS.js             # SOS workflow hook
|   |   |   |   |-- AdminDashboard.jsx               # Admin dashboard and controls
|   |   |   |   |-- Consultation.jsx                 # Consultation room page
|   |   |   |   |-- ConsultationList.jsx             # Consultation history/list page
|   |   |   |   |-- CreatePrescription.jsx           # Doctor prescription creation page
|   |   |   |   |-- Dashboard.jsx                    # Patient dashboard page
|   |   |   |   |-- DoctorDashboard.jsx              # Doctor dashboard page
|   |   |   |   |-- DoctorList.jsx                   # Doctor search/discovery page
|   |   |   |   |-- DoctorPrescriptions.jsx          # Doctor-issued prescription list
|   |   |   |   |-- HealthRecords.jsx                # Patient health records page
|   |   |   |   |-- Login.jsx                        # Login/register page
|   |   |   |   |-- Orders.jsx                       # Medicine order page
|   |   |   |   |-- Prescription.jsx                 # Prescription detail/download page
|   |   |   |   |-- PrescriptionList.jsx             # Patient prescription list
|   |   |   |   |-- Profile.jsx                      # User profile page
|   |   |   |   `-- SOSPage.jsx                      # Emergency SOS page
|   |   |   `-- ui/
|   |   |       |-- ChatbotWidget.jsx                # Floating chatbot widget
|   |   |       |-- ChatbotWidget.module.css         # Chatbot widget styles
|   |   |       |-- Toast.jsx                        # Toast notification component
|   |   |       |-- UI.jsx                           # Shared UI primitives
|   |   |       `-- UI.module.css                    # Shared UI primitive styles
|   |   |-- context/
|   |   |   `-- AppContext.jsx                     # Auth, navigation, app state, socket lifecycle
|   |   |-- services/
|   |   |   |-- api.js                             # Fetch wrapper and REST API helper methods
|   |   |   |-- socket.js                          # Socket.io connection and event helpers
|   |   |   `-- sounds.js                          # Notification sound playback helpers
|   |   |-- styles/
|   |   |   `-- globals.css                        # Global design tokens and base styles
|   |   |-- App.css                               # App-level styles
|   |   |-- App.jsx                               # Root React component and app routing/state wiring
|   |   |-- index.css                             # Base CSS reset/global imports
|   |   `-- main.jsx                              # Vite React entry point
|   |-- eslint.config.js                          # Frontend ESLint configuration
|   |-- index.html                                # Vite HTML entry
|   |-- package-lock.json                         # Frontend npm lockfile
|   |-- package.json                              # Frontend dependencies and scripts
|   |-- README.md                                 # Frontend-specific setup notes
|   `-- vite.config.js                            # Vite dev server and proxy config
|-- .gitignore                                    # Git ignore rules for env, build, logs, dependencies
|-- package-lock.json                             # Root npm lockfile
|-- package.json                                  # Root workspace convenience scripts
|-- railway.json                                  # Railway deployment config
`-- README.md                                     # Main project documentation
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- MongoDB running locally or a MongoDB Atlas URI
- Optional: Docker and Docker Compose
- Optional: Cloudinary credentials for uploads
- Optional: SMTP credentials for email verification and password reset

### 1. Install dependencies

From the repository root:

```bash
npm run install-all
```

This installs the root, backend, and frontend dependencies.

### 2. Configure backend environment

Create `backend/.env` and set the values you need:

```env
PORT=5001
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/medilink
JWT_SECRET=replace-with-a-long-random-secret
JWT_EXPIRE=7d
JWT_REFRESH_EXPIRE=30d
ALLOWED_ORIGINS=http://localhost:3000
CLIENT_URL=http://localhost:3000

EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=
EMAIL_PASS=
EMAIL_FROM=

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

API_BASE_URL=http://localhost:5001
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=100
```

Minimum local setup needs `MONGODB_URI` and `JWT_SECRET`. Without Cloudinary values, upload endpoints will warn and file uploads will fail.

### 3. Seed demo data

```bash
npm run seed --prefix backend
```

Demo accounts after seeding:

| Role | Email | Password |
| --- | --- | --- |
| Patient | `patient1@medilink.com` | `pass123` |
| Patient | `patient2@medilink.com` | `pass123` |
| Doctor | `doctor1@medilink.com` | `pass123` |
| Doctor | `doctor2@medilink.com` | `pass123` |

The seed file creates patient and doctor users. Admin APIs exist, but an admin account is not seeded by default.

### 4. Run the app

Run both apps from the root:

```bash
npm run dev
```

Or run them separately:

```bash
npm run dev --prefix backend
npm run dev --prefix frontend
```

Default local URLs:

| Service | URL |
| --- | --- |
| Frontend | `http://localhost:3000` |
| Backend API | `http://localhost:5001/api` |
| Health check | `http://localhost:5001/api/health` |
| Swagger UI | `http://localhost:5001/api-docs` |
| OpenAPI JSON | `http://localhost:5001/api-docs.json` |

The Vite dev server proxies `/api` and `/socket.io` to `http://localhost:5001`.

## API Documentation

Swagger is mounted by the backend:

```text
GET /api-docs       # Interactive Swagger UI
GET /api-docs.json  # Raw OpenAPI 3 document
```

Use `POST /api/auth/login` in Swagger, copy `data.token`, click `Authorize`, and paste the token as the bearer value.

Main REST route groups:

| Group | Endpoints |
| --- | --- |
| Health | `GET /api/health` |
| Auth | `/api/auth/register`, `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`, `/api/auth/refresh`, `/api/auth/verify-email/:token`, `/api/auth/forgot-password`, `/api/auth/reset-password/:token`, `/api/auth/change-password` |
| Doctors | `/api/doctors`, `/api/doctors/specialty/:specialty`, `/api/doctors/profile`, `/api/doctors/status`, `/api/doctors/consultations`, `/api/doctors/dashboard`, `/api/doctors/:id`, `/api/doctors/:id/review` |
| Patients | `/api/patients/search`, `/api/patients/dashboard`, `/api/patients/profile`, `/api/patients/prescriptions`, `/api/patients/prescriptions/active`, `/api/patients/prescriptions/:id`, `/api/patients/consultations` |
| Consultations | `/api/consultations`, `/api/consultations/pending`, `/api/consultations/:id`, `/api/consultations/:id/accept`, `/api/consultations/:id/end`, `/api/consultations/:id/leave`, `/api/consultations/:id/cancel`, `/api/consultations/:id/messages` |
| Prescriptions | `/api/prescriptions`, `/api/prescriptions/:id`, `/api/prescriptions/:id/status` |
| Orders | `/api/orders`, `/api/orders/:id`, `/api/orders/:id/status`, `/api/orders/:id/cancel` |
| Admin | `/api/admin/dashboard`, `/api/admin/users`, `/api/admin/users/:id`, `/api/admin/users/:id/restore`, `/api/admin/orders`, `/api/admin/orders/:id`, `/api/admin/orders/:id/status`, `/api/admin/orders/:id/cancel` |

## Socket.io Events

Socket connections require a JWT:

```js
import { io } from 'socket.io-client';

const socket = io('http://localhost:5001', {
  path: '/socket.io',
  auth: { token },
});
```

Client emits:

| Event | Payload |
| --- | --- |
| `joinConsultation` | `{ consultationId }` |
| `sendMessage` | `{ consultationId, text, attachmentUrl, attachmentType, roomId }` |
| `typing` | `{ consultationId, roomId }` |
| `stopTyping` | `{ roomId }` |
| `videoCall:request` | `{ consultationId }` |
| `videoCall:decline` | `{ consultationId }` |
| `webrtc:offer` | `{ roomId, offer }` |
| `webrtc:answer` | `{ roomId, answer }` |
| `webrtc:ice` or `webrtc:ice-candidate` | `{ roomId, candidate }` |
| `webrtc:call-ended` or `webrtc:ended` | `{ roomId, consultationId }` |
| `webrtc:media-toggle` | `{ roomId, video, audio }` |

Server emits include `joinedConsultation`, `peerJoined`, `readyForCall`, `receiveMessage`, `typing`, `stopTyping`, `doctorOnline`, `doctorOffline`, `videoCall:incoming`, `videoCall:requested`, `videoCall:declined`, `webrtc:offer`, `webrtc:answer`, `webrtc:ice-candidate`, `webrtc:call-ended`, `webrtc:media-toggle`, and `peerLeft`.

## Scripts

Root scripts:

| Command | Description |
| --- | --- |
| `npm run install-all` | Install root, backend, and frontend dependencies |
| `npm run dev` | Run backend and frontend together |
| `npm run backend` | Run backend dev server |
| `npm run frontend` | Run frontend dev server |
| `npm start` | Start backend in production mode |
| `npm run build` | Run backend build placeholder |

Backend scripts:

| Command | Description |
| --- | --- |
| `npm run dev --prefix backend` | Start Express with nodemon |
| `npm start --prefix backend` | Start Express with Node |
| `npm run seed --prefix backend` | Clear and seed demo data |
| `npm run seed:clean --prefix backend` | Clear seeded collections |
| `npm test --prefix backend` | Run Jest/Supertest tests |
| `npm run test:coverage --prefix backend` | Run tests with coverage |

Frontend scripts:

| Command | Description |
| --- | --- |
| `npm run dev --prefix frontend` | Start Vite on port 3000 |
| `npm run build --prefix frontend` | Build production frontend |
| `npm run preview --prefix frontend` | Preview the production build |

## Docker

The Docker setup lives in `backend/`:

```bash
cd backend
docker compose up -d
```

Services:

| Service | URL |
| --- | --- |
| API | `http://localhost:5000` inside the compose default |
| MongoDB | `mongodb://localhost:27017/medilink` |
| Mongo Express profile | `http://localhost:8081` with `docker compose --profile dev up -d` |

Seed inside the running API container:

```bash
docker compose exec medilink npm run seed
```

## Testing

Start MongoDB, then run:

```bash
npm test --prefix backend
```

The tests use `MONGODB_URI_TEST` when provided, otherwise `mongodb://localhost:27017/medilink_test`.

## Notes

- Backend defaults to port `5001`; Docker defaults the container to `5000`.
- Frontend defaults to port `3000` and proxies API/socket traffic to the backend.
- Swagger is generated from `backend/config/swagger.js` and mounted in `backend/server.js`.
- The raw OpenAPI document can be imported into Postman, Insomnia, or other API clients.
