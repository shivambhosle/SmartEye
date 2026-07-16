import jwt from 'jsonwebtoken';

/**
 * How this works, for learning purposes:
 * 1. On login, the server signs a JWT containing { id, role } and sends it to the client.
 * 2. The client stores it (we'll use an httpOnly-friendly approach later; for now, a
 *    simple Authorization header) and sends it back on every request.
 * 3. This middleware verifies the signature and expiry, then attaches the decoded
 *    payload to req.user so route handlers know who's calling and what role they have.
 *
 * This is what was MISSING in v1 — login just redirected the page, so anyone could
 * open dashboard.html directly without ever proving who they were.
 */
export function requireAuth(req, res, next) {
  const header = req.headers.authorization; // expected: "Bearer <token>"
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Missing or malformed Authorization header.' });
  }

  const token = header.slice('Bearer '.length);

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { id, role, iat, exp }
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
}

/** Use after requireAuth to restrict a route to specific roles. */
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'You do not have permission to do this.' });
    }
    next();
  };
}