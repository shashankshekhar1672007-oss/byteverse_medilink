# MediLink Frontend

React + Vite client for the MediLink telemedicine app. The frontend talks to the Express API, keeps JWT session state in local storage, uses Socket.io for consultation chat and call notifications, and uses browser WebRTC APIs for peer-to-peer video calls.

## Local Setup

Start the backend first:

```bash
cd ../backend
npm install
npm run seed
npm run dev
```

Then start the frontend:

```bash
cd ../frontend
npm install
npm run dev
```

Default URLs:

| Service | URL |
| --- | --- |
| Frontend | `http://localhost:3000` |
| Backend API | `http://localhost:5001/api` |
| Swagger UI | `http://localhost:5001/api-docs` |

The Vite config proxies `/api` and `/socket.io` to `http://localhost:5001`, so local browser requests can use same-origin paths during development.

## Environment Variables

Optional `frontend/.env` values:

```env
VITE_API_URL=http://localhost:5001/api
VITE_SOCKET_URL=http://localhost:5001
```

If omitted, `src/services/api.js` defaults to `http://localhost:5001/api`, and `src/services/socket.js` uses the Vite dev origin in development.

## Demo Accounts

Seed the backend first with `npm run seed --prefix backend`.

| Role | Email | Password |
| --- | --- | --- |
| Patient | `patient1@medilink.com` | `pass123` |
| Patient | `patient2@medilink.com` | `pass123` |
| Doctor | `doctor1@medilink.com` | `pass123` |
| Doctor | `doctor2@medilink.com` | `pass123` |

Admin screens exist in the frontend, but the backend seeder does not create an admin account by default.

## Main Code Areas

```text
src/
|-- components/
|   |-- layout/             # App shell, sidebar, navbar, incoming call notice
|   |-- pages/              # Patient, doctor, admin, consultation, order views
|   `-- ui/                 # Shared UI primitives, toast, chatbot widget
|-- context/AppContext.jsx  # Auth, navigation, socket lifecycle, app state
|-- services/api.js         # Fetch wrapper and REST endpoint helpers
|-- services/socket.js      # Socket.io connection and event helpers
|-- services/sounds.js      # Notification sounds
|-- styles/globals.css
|-- App.jsx
`-- main.jsx
```

## Backend Contracts

The API source of truth is the backend Swagger document:

```text
http://localhost:5001/api-docs
http://localhost:5001/api-docs.json
```

Frontend service modules currently call these route groups:

- Auth: login, register, logout, current user, refresh token, change password
- Doctors: list, details, profile, status, dashboard, consultations
- Patients: profile, dashboard, prescriptions, consultations
- Consultations: start, accept, end, leave, cancel, messages
- Prescriptions: create, fetch, update status, cancel
- Orders: create, list, details, cancel
- Admin: dashboard, users, order status controls

## Real-time Features

Socket connections use the JWT from login:

```js
connectSocket(token);
joinConsultation(consultationId);
sendSocketMessage(consultationId, 'Hello doctor');
requestVideoCall(consultationId);
```

Important events handled by the client include `receiveMessage`, `typing`, `stopTyping`, `joinedConsultation`, `doctorOnline`, `doctorOffline`, `videoCall:incoming`, `videoCall:requested`, and `videoCall:declined`.

## Video Call Testing

1. Run backend and frontend.
2. Log in as a patient in one browser.
3. Log in as a doctor in another browser or incognito window.
4. Start or accept a consultation.
5. Open the consultation room on both sides.
6. Use the call button to request and answer a WebRTC call.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start Vite on port 3000 |
| `npm run build` | Build production assets |
| `npm run preview` | Preview the production build |
