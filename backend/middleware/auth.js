import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import {
  UnauthenticatedError,
  ForbiddenError,
} from '../errors/customErrors.js';

/**
 * Shape of the decoded JWT payload attached to `req.user` after authentication.
 *
 * @typedef {Object} AuthenticatedUser
 * @property {string} id - User identifier taken from the JWT payload.
 * @property {string} role - User role (e.g. `user`, `admin`, `sysadmin`).
 * @property {number} iat - Issued-at timestamp (seconds since epoch).
 * @property {number} exp - Expiry timestamp (seconds since epoch).
 */

/**
 * Authenticate incoming requests by validating a JWT token from common sources.
 *
 * The middleware looks for a token in the following order:
 * 1. `req.cookies.token`
 * 2. `req.signedCookies.token`
 * 3. `Authorization` header with a `Bearer` token
 * 4. Raw `cookie` header (fallback)
 *
 * A valid signature is necessary but not sufficient: the account behind the
 * token must still exist, and the token must not predate the account's last
 * password change. Otherwise a token stolen before a password reset would keep
 * working until it expired on its own.
 *
 * When all checks pass, the decoded payload is attached to `req.user` and the
 * request is allowed to proceed. Otherwise an `UnauthenticatedError` is thrown.
 *
 * @async
 * @function authenticate
 * @param {import('express').Request & { user?: AuthenticatedUser }} req -
 *   Express request object; `req.user` is populated on success.
 * @param {import('express').Response} res - Express response object.
 * @param {import('express').NextFunction} next - Next middleware function.
 * @throws {UnauthenticatedError} If no valid JWT is found or verification fails.
 * @returns {Promise<void>}
 *
 * @example
 * Example: protect a single route with authentication
 * router.get('/protected-route', authenticate, (req, res) => {
 *   const { id, role } = req.user; // decoded JWT payload
 *   res.json({ userId: id, role });
 * });
 */
/**
 * Extract a JWT from the request, looking at the `Authorization` header first
 * and then at plain and signed cookies.
 *
 * @param {import('express').Request} req - Express request object.
 * @returns {string|null} The raw token, or `null` if the request carries none.
 */
const extractToken = (req) => {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }

  return req.cookies?.token || req.signedCookies?.token || null;
};

/**
 * Verify a token and resolve it to the current state of the account.
 *
 * @param {string} token - Raw JWT taken from the request.
 * @returns {Promise<AuthenticatedUser>} Decoded payload with the role refreshed
 *   from the database.
 * @throws {UnauthenticatedError} If the token is invalid or expired, the
 *   account no longer exists, or the password changed after the token was
 *   issued.
 */
const resolveUserFromToken = async (token) => {
  let decoded;

  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    throw new UnauthenticatedError(
      'Invalid or expired token. Please log in again'
    );
  }

  // The signature is good, but the account behind it may have been deleted or
  // had its password changed since the token was issued.
  const account = await User.findById(decoded.id)
    .select('+active role passwordChangedAt')
    .setOptions({ bypassActiveFilter: true });

  if (!account || account.active === false) {
    throw new UnauthenticatedError(
      'This account is no longer available. Please log in again'
    );
  }

  if (account.passwordChangedAfter(decoded.iat)) {
    throw new UnauthenticatedError(
      'Password was changed recently. Please log in again'
    );
  }

  // Trust the stored role over the one baked into the token, so a role change
  // takes effect on the next request instead of at the next login.
  return { ...decoded, role: account.role };
};

export const authenticate = async (req, res, next) => {
  const token = extractToken(req);

  if (!token) {
    throw new UnauthenticatedError('Authentication invalid. Please log in');
  }

  req.user = await resolveUserFromToken(token);
  next();
};

/**
 * Populate `req.user` when the request carries a valid token, without
 * requiring one.
 *
 * Used on routes that are public but render differently for a signed-in
 * viewer — the elections list, for example, marks the ballots the current user
 * has already cast. An invalid token is treated as no token rather than as an
 * error, so a stale session degrades to the anonymous view instead of breaking
 * the page.
 *
 * @async
 * @function optionalAuthenticate
 * @param {import('express').Request & { user?: AuthenticatedUser }} req -
 *   Express request object; `req.user` is populated when a valid token exists.
 * @param {import('express').Response} res - Express response object.
 * @param {import('express').NextFunction} next - Next middleware function.
 * @returns {Promise<void>}
 */
export const optionalAuthenticate = async (req, res, next) => {
  const token = extractToken(req);

  if (!token) return next();

  try {
    req.user = await resolveUserFromToken(token);
  } catch (error) {
    req.user = undefined;
  }

  next();
};

/**
 * Factory for role-based authorization middleware.
 *
 * The returned middleware assumes that `authenticate` has already populated
 * `req.user`. It checks that `req.user.role` is included in the list of allowed
 * roles; otherwise a `ForbiddenError` is thrown.
 *
 * @function authorizeRoles
 * @param {...(string|string[])} roles - One or more roles or arrays of roles
 *   that are permitted to access the route.
 * @returns {import('express').RequestHandler} Express middleware that enforces
 *   role-based access control.
 * @throws {ForbiddenError} If the authenticated user's role is not allowed.
 *
 * @example
 * Example: only admins may access this route
 * router.get('/admin', authenticate, authorizeRoles('admin'), adminHandler);
 *
 * @example
 * Example: allow either admin or sysadmin roles
 * router.get(
 *   '/admin-or-sysadmin',
 *   authenticate,
 *   authorizeRoles('admin', 'sysadmin'),
 *   handler
 * );
 */
export const authorizeRoles = (...roles) => {
  // Flatten and normalize roles array to handle both formats
  const allowedRoles = roles.flat();

  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      throw new ForbiddenError(
        `${req.user.role} is not authorized to perform this action`
      );
    }
    next();
  };
};
