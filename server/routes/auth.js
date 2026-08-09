import { Router } from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { requireAuth, signToken, findUserById } from '../middleware/auth.js';

const router = Router();

router.post('/login', async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = signToken(user);
    return res.json({
      token,
      user: { id: user._id, email: user.email },
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Login failed.' });
  }
});

router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await findUserById(req.user.id);
    if (!user) {
      return res.status(401).json({ error: 'User not found.' });
    }
    return res.json({ user: { id: user._id, email: user.email } });
  } catch (err) {
    console.error('Auth me error:', err);
    return res.status(500).json({ error: 'Could not load user.' });
  }
});

export default router;
