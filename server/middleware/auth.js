import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.sub, email: payload.email };
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

export function signToken(user) {
  return jwt.sign(
    { email: user.email },
    process.env.JWT_SECRET,
    { subject: String(user._id), expiresIn: '7d' }
  );
}

export async function findUserById(id) {
  return User.findById(id).select('-passwordHash');
}
