import 'dotenv/config.js';
import mongoose from 'mongoose';
import app from './app.js';
import Election from './models/Election.js';

// The Express app itself lives in app.js so that tests can import it without
// opening a database connection or binding a port. This file is only the
// process entry point: connect, listen, and shut down cleanly.

// =====================
// 1. DATABASE CONNECTION
// =====================
if (!process.env.MONGO_URL) {
  console.error('MONGO_URL is not defined in environment variables');
  process.exit(1);
}

const DB = process.env.MONGO_URL.replace(
  '<PASSWORD>',
  process.env.MONGO_PASSWORD || ''
);

const mongooseOptions = {
  serverSelectionTimeoutMS: 10000, // Wait up to 10s for server selection
  socketTimeoutMS: 30000, // Close idle connections after 30s
  maxPoolSize: 10, // Reasonable default for most apps
  w: 'majority', // Ensure write acknowledgement
};

// =====================
// 2. ELECTION STATUS SWEEP
// =====================

// An election's status is a stored field, so it only changes when something
// writes to it. Without this sweep a poll stays `upcoming` past its own start
// time and stays `active` long after it closes — the listings lie, and the
// only thing that ever corrected them was an admin happening to save the
// election. Run it at boot and on an interval so the calendar drives state.
const STATUS_SWEEP_INTERVAL_MS = 60 * 1000;

const sweepElectionStatuses = async () => {
  try {
    await Election.updateElectionStatuses();
  } catch (err) {
    // A failed sweep is not fatal: the next tick retries, and the vote path
    // checks dates directly rather than trusting the stored status.
    console.error('Election status sweep failed:', err.message);
  }
};

mongoose
  .connect(DB, mongooseOptions)
  .then(() => {
    console.log('✅ MongoDB connection successful');
    sweepElectionStatuses();
    setInterval(sweepElectionStatuses, STATUS_SWEEP_INTERVAL_MS).unref();
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });

// =====================
// 2. SERVER SETUP
// =====================
// 5002 rather than 5000: the macOS AirPlay Receiver holds 5000 locally.
const PORT = process.env.PORT || 5002;
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(
    `🚀 Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`
  );
  console.log(`📡 Connect: http://localhost:${PORT}`);
});

// =====================
// 3. PROCESS-LEVEL ERROR HANDLERS
// =====================

/**
 * Log a fatal error, then close the HTTP server and exit non-zero.
 *
 * A timer guards the shutdown so a hung connection cannot keep a broken
 * process alive indefinitely — the platform can then restart it.
 *
 * @param {string} label - Human-readable reason, used as the log heading.
 * @param {Error} err - The error that triggered the shutdown.
 * @returns {void}
 */
const shutdownOnFatalError = (label, err) => {
  console.error(`${label} 💥 Shutting down...`);
  console.error('Error:', err.name, err.message);
  console.error(err.stack);

  server.close(() => process.exit(1));

  setTimeout(() => process.exit(1), 10000).unref();
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) =>
  shutdownOnFatalError('UNHANDLED REJECTION!', err)
);

// Handle uncaught exceptions (synchronous errors)
process.on('uncaughtException', (err) =>
  shutdownOnFatalError('UNCAUGHT EXCEPTION!', err)
);

// Handle SIGTERM (Render sends this on deploy/restart)
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM RECEIVED. Shutting down gracefully');
  server.close(() => {
    console.log('💥 Process terminated!');
  });
});

// Handle process termination (Ctrl+C)
process.on('SIGINT', () => {
  console.log('👋 SIGINT RECEIVED. Shutting down gracefully');
  server.close(() => {
    console.log('💥 Process terminated!');
    process.exit(0);
  });
});

export default server;
