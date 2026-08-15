# Electronic Voting System (EVS)

A secure and transparent electronic voting platform built with React, Node.js, and Express.

## � Project Links

- **GitHub Repository**: https://github.com/David-mwendwa/EVSPolls
- **Frontend (Netlify)**: https://evspolls.netlify.app
- **Backend API (Render)**: https://electronic-voting-system-nxqt.onrender.com/api/v1

## �🚀 Features

- User authentication and authorization
- Secure voting system
- Real-time results and analytics
- Admin dashboard with settings management
- Voter and candidate management
- Election creation and management
- System-wide settings control (maintenance mode, registration toggle)
- Role-based access control

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite, TailwindCSS
- **Backend**: Node.js, Express
- **Database**: MongoDB (via Mongoose)
- **Authentication**: JWT
- **State Management**: React Context API
- **Routing**: React Router v6
- **UI Components**: Custom components with TailwindCSS

## 📁 Project Structure

```
EVSPolls/
├── frontend/              # Frontend React application
│   ├── public/            # Static files
│   └── src/               # Source files
│       ├── components/    # Reusable UI components
│       ├── context/       # React context providers
│       ├── pages/         # Page components
│       ├── styles/        # Global styles
│       └── utils/         # Utility functions
│
├── backend/               # Backend Node.js server
│   ├── config/           # Configuration files
│   ├── controllers/      # Route controllers
│   ├── middleware/       # Custom middleware
│   ├── models/           # Database models
│   ├── routes/           # API routes
│   ├── utils/            # Utility functions
│   └── server.js         # Main server file
│
├── .gitignore           # Git ignore file
└── package.json         # Root package.json with project scripts
```

## 🛠️ Development Scripts

From the root directory, you can run:

| Command               | Description                                        |
| --------------------- | -------------------------------------------------- |
| `npm run dev`         | Start both frontend and backend in development     |
| `npm run server`      | Start only the backend server                      |
| `npm run build`       | Build the frontend for production                  |
| `npm start`           | Start the production server                        |
| `npm test`            | Run tests for both frontend and backend            |
| `npm run install:all` | Install all dependencies (root, frontend, backend) |

## 🚀 Getting Started

### Prerequisites

- Node.js (v16+)
- npm (v8+)
- MongoDB (local or Atlas)

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/David-mwendwa/EVSPolls.git
   cd EVSPolls
   ```

2. **Install all dependencies**

   ```bash
   # Install all dependencies (root, frontend, and backend)
   # This will also install concurrently globally if needed
   npm run install:all
   ```

   This will:

   - Install root dependencies (primarily for development tooling)
   - Install frontend dependencies in the `frontend` directory
   - Install backend dependencies in the `backend` directory

3. **Environment Setup**
   - Create `.env` files in both `frontend` and `backend` directories
   - See `.env.example` files for required environment variables

### Running the Application

1. **Development Mode**

   ```bash
   # Start both frontend and backend development servers
   npm run dev
   ```

   - Frontend will be available at `http://localhost:3000`
   - Backend API will be available at `http://localhost:5000`

2. **Running Servers Individually**

   ```bash
   # Start only the frontend
   npm run dev --prefix frontend

   # Start only the backend
   npm run server
   ```

3. **Production Build**

   ```bash
   # Build frontend for production
   npm run build

   # Start production server
   npm start
   ```

   This will serve the optimized frontend build and start the production backend server.

## 🌐 Environment Variables

### Frontend (`.env`)

```env
VITE_API_BASE_URL=http://localhost:5000/api
# Add other frontend environment variables here
```

### Backend (`.env`)

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
NODE_ENV=development
# Add other backend environment variables here
```

## ☁️ Deployment

### Backend (Render)

The backend is deployed as an **API-only** service on Render.

**Key environment variables on Render:**

- `MONGO_URL` – MongoDB connection string template (e.g. `mongodb+srv://<USER>:<PASSWORD>@cluster/db-name`)
- `MONGO_PASSWORD` – Password used to replace `<PASSWORD>` in `MONGO_URL`
- `JWT_SECRET` – Long random secret string used to sign JWTs
- `JWT_LIFETIME` – JWT lifetime (e.g. `7d`)
- `COOKIE_LIFETIME` – Cookie lifetime in **days** (e.g. `7`)
- `NODE_ENV` – `production`
- `PORT` – Optional; Render usually sets this automatically

**Typical Render setup:**

- Service type: **Web Service**
- Environment: **Node**
- Build command (from `backend/`): `npm install`
- Start command (from `backend/`): `npm start`
- Root directory for the service: `backend`

The backend exposes its API at:

- `https://electronic-voting-system-nxqt.onrender.com/api/v1`

The backend **does not** serve the React app; it only serves JSON APIs.

### Frontend (Netlify)

The frontend is a Vite React app deployed on Netlify from the repo root using `netlify.toml`.

`netlify.toml`:

```toml
[build]
  base = ""
  command = "cd frontend && npm install && npm run build"
  publish = "frontend/dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

- **Build command**: `cd frontend && npm install && npm run build`
- **Publish directory**: `frontend/dist`
- **SPA routing**: the redirect rule ensures all routes (e.g. `/admin`, `/dashboard`) serve `index.html`, fixing 404s on reload.

### Frontend → Backend connection

The frontend uses `frontend/src/api/apiClient.js` to determine the API base URL:

```js
const API_BASE_URL = (() => {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }

  if (import.meta.env.MODE === 'development') {
    return 'http://localhost:5000/api/v1';
  }

  return 'https://electronic-voting-system-nxqt.onrender.com/api/v1';
})();
```

For Netlify production, you can either:

- Rely on the default Render URL above, **or**
- Set `VITE_API_BASE_URL` in Netlify to override it (e.g. if the Render URL changes).

The Axios client automatically attaches the JWT as a Bearer token on every request:

```js
apiClient.interceptors.request.use((config) => {
  const token =
    localStorage.getItem('token') || sessionStorage.getItem('token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});
```

## 🧪 Local Development

### Backend

From the `backend/` directory:

```bash
npm install
npm run dev   # or npm start for production-like run
```

Backend will listen on `http://localhost:5000` (and expose APIs under `/api/v1`).

### Frontend

From the `frontend/` directory:

```bash
npm install
npm run dev
```

Vite will start the frontend dev server (commonly on `http://localhost:5173`). The API client will automatically use `http://localhost:5000/api/v1` in development if `VITE_API_BASE_URL` is not set.

## 🐛 Common Issues & Troubleshooting

### 1. CORS errors (blocked by CORS policy)

Ensure the backend CORS config (`backend/server.js`) allows the frontend origin and required methods:

```js
app.use(
  cors({
    origin: ['https://evspolls.netlify.app', 'http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
```

If you see a preflight error mentioning a specific method (e.g. `PATCH`), make sure it is listed in `methods`.

### 2. "Invalid or expired token" after login

Check that:

- `JWT_SECRET` is set on Render and matches what the backend expects.
- `JWT_LIFETIME` is a valid duration string (e.g. `7d`).
- `COOKIE_LIFETIME` is a number of days (e.g. `7`).
- You have cleared old tokens from `localStorage` / `sessionStorage` when changing secrets.

The decoded JWT should have an `exp` value that is later than `iat` by the configured lifetime.

### 3. 404 "Page not found" on reload (Netlify)

If reloading a route like `/admin` or `/dashboard` shows the Netlify 404 page, ensure the `[[redirects]]` block in `netlify.toml` is present as above so that all unknown routes serve `index.html` for React Router to handle.

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📧 Contact

David Mwendwa - [@DavidMwens](https://x.com/davidmwens?s=21&t=0K4V3sUOE2yo73T-9eBFuQ) - davidmw022@gmail.com

Project Link: [https://github.com/David-mwendwa/EVSPolls](https://github.com/David-mwendwa/EVSPolls)
