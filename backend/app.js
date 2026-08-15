import 'express-async-errors';
import 'dotenv/config.js';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import express from 'express';
import cors from 'cors';

// Security middleware
import helmet from 'helmet';
import xss from 'xss-clean';
import mongoSanitize from 'express-mongo-sanitize';
import rateLimit from 'express-rate-limit';
import hpp from 'hpp';

// =====================
// 1. APP SETUP
// =====================

// Initialize Express app
const app = express();

app.set('trust proxy', 1); // trust first proxy (Render)

// =====================
// 2. GLOBAL MIDDLEWARE
// =====================

// Browser origins allowed to call this API. Override per environment with
// CORS_ORIGINS (comma-separated) so a new frontend host needs no code change.
const DEFAULT_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://evspolls.netlify.app',
];

const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean)
  : DEFAULT_ORIGINS;

// Enable CORS
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// =====================
// 3. SECURITY MIDDLEWARE
// =====================

// Set security HTTP headers.
//
// This service only ever returns JSON, so the CSP is locked all the way down
// rather than allow-listing script/style hosts it will never serve. The
// resource policy must stay `cross-origin`: the frontend is deployed on a
// different site (Netlify) from the API (Render), and `same-site` would have
// the browser reject the responses.
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: { policy: 'same-origin' },
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    hsts: { maxAge: 15552000, includeSubDomains: true },
  })
);

// Data sanitization against NoSQL injection
app.use(mongoSanitize());

// Parse JSON and URL-encoded request bodies
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Clean any user input from XSS attacks
app.use(xss());

// Parse cookies
app.use(cookieParser());

// Prevent parameter pollution
app.use(
  hpp({
    whitelist: ['page', 'limit', 'sort', 'fields', 'search', 'status'],
  })
);

// =====================
// 4. LOGGING (Development only)
// =====================
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// =====================
// 5. HEALTH CHECK
// =====================

/**
 * Simple health check endpoint for uptime and environment monitoring.
 *
 * Registered ahead of the rate limiters so that Render's health probe and any
 * uptime monitor can poll it without consuming a request budget.
 *
 * @route GET /api/health
 */
app.get('/api/health', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.status(200).json({
    status: 'success',
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
  });
});

// =====================
// 6. RATE LIMITING
// =====================

// Only failed auth attempts count towards the limit, so a voter who signs in
// successfully is never locked out by someone else sharing their NAT address.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Failed login/register attempts per IP per window
  message: 'Too many login attempts. Please try again later.',
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
});

// The admin dashboard fans out to several endpoints per page view, so the
// general budget is set well above a single page load. Override with
// RATE_LIMIT_MAX if a deployment needs more headroom.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: Number(process.env.RATE_LIMIT_MAX) || 300,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api', apiLimiter);
app.use('/api/v1/auth', authLimiter);

// =====================
// 7. ROUTES
// =====================

// Import and use routes
import authRouter from './routes/authRoutes.js';
import userRouter from './routes/userRoutes.js';
import electionRouter from './routes/electionRoutes.js';
import candidateRouter from './routes/candidateRoutes.js';
import voterRouter from './routes/voterRoutes.js';
import settingsRouter from './routes/settingsRoutes.js';

app.use('/api/v1/auth', authRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/elections', electionRouter);
app.use('/api/v1/candidates', candidateRouter);
app.use('/api/v1/voters', voterRouter);
app.use('/api/v1/settings', settingsRouter);

// =====================
// 8. ROOT
// =====================

// This service is API-only; the React app is deployed separately on Netlify.
// The root route exists so that hitting the bare host returns something
// meaningful instead of a 404.
app.get('/', (req, res) => {
  res.status(200).json({ message: 'EVSPolls API is running' });
});

// =====================
// 9. ERROR HANDLING
// =====================
import notFoundMiddleware from './middleware/notFound.js';
import errorHandlerMiddleware from './middleware/errorHandler.js';

// 404 handler
app.use(notFoundMiddleware);

// Global error handler
app.use(errorHandlerMiddleware);

export default app;
