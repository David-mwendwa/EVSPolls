# EVSPolls

A secure, transparent electronic voting platform for institutional elections — student councils, faculty senates and alumni boards. Built with React, Node.js, Express and MongoDB.

## Project Links

- **GitHub Repository**: https://github.com/David-mwendwa/EVSPolls
- **Frontend (Netlify)**: https://evspolls.netlify.app
- **Backend API (Render)**: https://electronic-voting-system-nxqt.onrender.com/api/v1

## Features

- Email/password authentication with JWT, and role-based access control (`user`, `admin`, `sysadmin`)
- Election lifecycle driven by dates: draft → upcoming → active → completed, with manual cancellation
- One ballot per voter per election, enforced atomically at the database
- Secret ballot: the API publishes turnout, never the roll of who voted
- Results withheld until an election is active or completed
- Admin dashboard for elections, candidates and voters, with PDF/CSV export
- System-wide settings: maintenance mode and registration toggle

## Tech Stack

- **Frontend**: React 18, Vite 4, React Router 6, TailwindCSS 3, React Context
- **Backend**: Node.js, Express 4, Mongoose 7
- **Database**: MongoDB (Atlas in production, Docker locally)
- **Auth**: JWT (Bearer token, with an HTTP-only cookie alongside)
- **Tests**: Jest + Supertest (backend), Vitest + Testing Library (frontend)

## Project Structure

```
EVSPolls/
├── frontend/                 # React SPA (Vite)
│   ├── public/               # Static assets and logo
│   └── src/
│       ├── api/              # Axios client and base URL resolution
│       ├── components/       # Reusable UI
│       ├── context/          # Auth, Election, Voter, Settings providers
│       ├── pages/            # Route components
│       └── tests/            # Vitest suites
│
├── backend/                  # Express API
│   ├── controllers/          # Route handlers
│   ├── errors/               # Custom error classes
│   ├── middleware/           # Auth, error handling, 404
│   ├── models/               # Mongoose schemas
│   ├── routes/               # Route definitions (*Routes.js)
│   ├── scripts/              # Seed, export, restore, copy helpers
│   ├── tests/                # Jest suites
│   ├── utils/                # Shared helpers
│   ├── app.js                # Express app (no DB, no listener — importable)
│   └── server.js             # Process entry point: connect, listen, shut down
│
├── data/exports/             # Database snapshots used by `db:restore`
├── netlify.toml              # Frontend deploy config
├── render.yaml               # Backend deploy config
└── package.json              # Root scripts (runs both halves)
```

`app.js` and `server.js` are deliberately separate: tests import `app.js` and get an Express app without opening a Mongo connection or binding a port.

## Getting Started

### Prerequisites

- Node.js 18+ and npm 8+
- MongoDB — either an Atlas connection string or the workspace Docker instance

### Installation

```bash
git clone https://github.com/David-mwendwa/EVSPolls.git
cd EVSPolls
npm run install:all
```

### Environment setup

Copy the example files and fill in real values:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env   # optional; sensible defaults apply
```

### Run it

```bash
npm run dev
```

- Frontend: http://localhost:3000
- API: http://localhost:5002 (endpoints under `/api/v1`)

> Port 5002, not 5000: on macOS the AirPlay Receiver holds 5000. The frontend dev server must stay on 3000, which is what the backend's CORS allowlist expects.

## Scripts

### Root

| Command               | Description                                    |
| --------------------- | ---------------------------------------------- |
| `npm run dev`         | Start frontend and backend together            |
| `npm run server`      | Start the backend only                         |
| `npm run build`       | Build the frontend for production              |
| `npm test`            | Run both test suites                           |
| `npm run format`      | Prettier across both halves                    |
| `npm run install:all` | Install root, frontend and backend deps        |

### Backend

| Command                    | Description                                              |
| -------------------------- | -------------------------------------------------------- |
| `npm run dev`              | Start with nodemon                                        |
| `npm start`                | Start in production mode                                  |
| `npm test`                 | Jest suite (no database required)                         |
| `npm run db:restore`       | Rebuild a database from the newest snapshot in `data/exports` |
| `npm run db:copy`          | Copy a whole database between clusters                    |
| `npm run seed:users`       | Seed users                                                |
| `npm run seed:elections`   | Seed elections                                            |
| `npm run export:users`     | Write a users snapshot to `data/exports`                  |
| `npm run export:elections` | Write an elections snapshot to `data/exports`             |

`db:restore` and `db:copy` act on whatever `MONGO_URL` points at, so set it explicitly when you mean the local database:

```bash
MONGO_URL=mongodb://localhost:27017/e-vote npm run db:restore
```

### Demo accounts

These are the three accounts the sign-in page offers as click-to-fill. `npm run seed:demo` creates or repairs them and is safe to re-run.

| Role     | Email                | Password      |
| -------- | -------------------- | ------------- |
| sysadmin | `sysadmin@evs.ke`    | `sysadmin123` |
| admin    | `admin@evs.ke`       | `admin123`    |
| voter    | `voter.user@evs.ke`  | `voter123`    |

Every seeded account follows the same rule: the part of the email before the first separator, plus `123` — so `paul.kariuki@evs.ke` is `paul123`.

> The demo voter is `voter.user@evs.ke`, not `voter@evs.ke`. The `User` schema derives a unique `id` from the email prefix and `voter` is already taken, so the shorter address cannot be created.

## Environment Variables

### Backend (`backend/.env`)

| Variable          | Required | Description                                                       |
| ----------------- | -------- | ----------------------------------------------------------------- |
| `MONGO_URL`       | yes      | Connection string; `<PASSWORD>` is substituted from `MONGO_PASSWORD` |
| `MONGO_PASSWORD`  | no       | Password injected into `MONGO_URL`                                |
| `JWT_SECRET`      | yes      | Secret used to sign JWTs                                          |
| `JWT_LIFETIME`    | no       | Token lifetime, e.g. `7d`                                         |
| `COOKIE_LIFETIME` | no       | Cookie lifetime in days (default `7`)                             |
| `PORT`            | no       | Default `5002`                                                    |
| `NODE_ENV`        | no       | `development` / `production` / `test`                             |
| `CORS_ORIGINS`    | no       | Comma-separated allowed origins; overrides the built-in defaults   |
| `RATE_LIMIT_MAX`  | no       | Requests per IP per 15 minutes (default `300`)                    |

### Frontend (`frontend/.env`)

| Variable            | Required | Description                                                        |
| ------------------- | -------- | ------------------------------------------------------------------ |
| `VITE_API_BASE_URL` | no       | Full API base including `/api/v1`. Defaults to localhost in dev and the Render API in production builds |

## API

All routes are prefixed with `/api/v1`. Health lives at `/api/health` and is exempt from rate limiting.

| Method | Route                                    | Access          |
| ------ | ---------------------------------------- | --------------- |
| POST   | `/auth/register`                         | public          |
| POST   | `/auth/login`                            | public          |
| GET    | `/elections`                             | public          |
| GET    | `/elections/status/:status`              | public          |
| GET    | `/elections/:id`                         | public          |
| POST   | `/elections`                             | admin           |
| PATCH  | `/elections/:id`                         | admin           |
| DELETE | `/elections/:id`                         | admin           |
| PATCH  | `/elections/:id/status`                  | admin           |
| DELETE | `/elections/purge/all`                   | sysadmin        |
| POST   | `/elections/:id/vote`                    | authenticated   |
| POST   | `/voters/election/:electionId`           | authenticated   |
| GET    | `/voters/election/:electionId/results`   | public          |
| GET    | `/candidates/election/:electionId`       | public          |
| POST   | `/candidates/election/:electionId`       | admin           |
| GET    | `/users`                                 | admin           |
| PATCH  | `/users/me`                              | authenticated   |
| DELETE | `/users/:id`                             | sysadmin        |
| GET    | `/settings`                              | public          |
| PATCH  | `/settings`                              | sysadmin        |

The public election routes use optional authentication: a signed-in viewer additionally gets `hasVotedForCurrentUser`, and admins see tallies that are still withheld from everyone else.

### Ballot secrecy

`GET /elections` and `GET /elections/:id` never return the `voters` array. They return `votersCount` (turnout) and `hasVotedForCurrentUser` instead. Per-candidate `results` are omitted until the election is `active` or `completed`, except for admins.

### Concurrency

A ballot is recorded with a single conditional `findOneAndUpdate`: the filter carries every precondition (election open by date, voter not already on the roll), and the update pushes the voter, increments turnout and increments that candidate's counter together. Simultaneous ballots therefore cannot read a stale document and overwrite one another.

## Deployment

### Backend (Render)

API-only service — it does not serve the React app.

- Root directory: `backend`
- Build: `npm install`
- Start: `npm start`
- Health check: `/api/health`

`render.yaml` at the repo root declares this, including which environment variables must be set in the dashboard. Set `CORS_ORIGINS` to the deployed frontend origin.

### Frontend (Netlify)

Built from the repo root via `netlify.toml`:

- Build: `cd frontend && npm install && npm run build`
- Publish: `frontend/dist`
- A catch-all redirect to `/index.html` keeps client-side routes working on reload

Set `VITE_API_BASE_URL` in Netlify to point at a different API host without a code change.

## Troubleshooting

**CORS errors.** Add the frontend origin to `CORS_ORIGINS` on the API. If a preflight names a method (e.g. `PATCH`), confirm it is in the `methods` list in `app.js`.

**"Invalid or expired token" right after signing in.** Check `JWT_SECRET` matches what issued the token, and that `JWT_LIFETIME` is a valid duration string. Tokens are also rejected on purpose after a password change or once the account is deactivated — clear `localStorage`/`sessionStorage` and sign in again.

**Election shows the wrong status.** Statuses are stored, and a background sweep in `server.js` reconciles them against the calendar every minute. If the API has been down, the first sweep after boot catches everything up.

**404 on reload in production.** Confirm the `[[redirects]]` block in `netlify.toml` is present.

## License

MIT — see [LICENSE](LICENSE).

## Contact

David Mwendwa — [@DavidMwens](https://x.com/davidmwens) — davidmw022@gmail.com
