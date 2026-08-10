import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from './models/User.js';
import authRoutes from './routes/auth.js';
import eventRoutes from './routes/events.js';
import secretaryRoutes from './routes/secretaries.js';
import intakeRoutes from './routes/intake.js';
import { isCloudinaryAdminConfigured } from './utils/cloudinary.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const PORT = Number(process.env.PORT || 5000);
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/calliphony';

async function connectMongo() {
  const useMemory =
    process.env.MEMORY_MONGO === '1' ||
    process.env.MEMORY_MONGO === 'true';

  if (useMemory) {
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    const memory = await MongoMemoryServer.create();
    const uri = memory.getUri('calliphony');
    await mongoose.connect(uri);
    console.log('Connected to in-memory MongoDB (MEMORY_MONGO)');
    return;
  }

  try {
    await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 3000 });
    console.log('Connected to MongoDB');
  } catch (err) {
    console.warn(`MongoDB connection failed (${err.message}). Falling back to in-memory MongoDB.`);
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    const memory = await MongoMemoryServer.create();
    const uri = memory.getUri('calliphony');
    await mongoose.connect(uri);
    console.log('Connected to in-memory MongoDB (fallback)');
  }
}

async function seedAdmin() {
  const email = (process.env.ADMIN_EMAIL || 'admin@calliphony.local').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || 'admin123';
  const passwordHash = await bcrypt.hash(password, 12);

  const users = await User.find().sort({ createdAt: 1 });
  if (users.length === 0) {
    await User.create({ email, passwordHash });
    console.log(`Seeded admin user: ${email}`);
    return;
  }

  // Single-admin app: keep the first user in sync with .env (email + password)
  const admin = users[0];
  const emailChanged = admin.email !== email;
  const passwordMatches = await bcrypt.compare(password, admin.passwordHash);

  if (emailChanged || !passwordMatches) {
    admin.email = email;
    admin.passwordHash = passwordHash;
    await admin.save();
    console.log(`Updated admin credentials: ${email}`);
  }

  if (users.length > 1) {
    await User.deleteMany({ _id: { $ne: admin._id } });
    console.log(`Removed ${users.length - 1} extra admin user(s).`);
  }
}

async function start() {
  if (!process.env.JWT_SECRET) {
    console.warn('JWT_SECRET missing — using insecure development default.');
    process.env.JWT_SECRET = 'dev-calliphony-jwt-secret-change-me';
  }

  await connectMongo();
  await seedAdmin();

  const app = express();
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: '2mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, cloudinaryDelete: isCloudinaryAdminConfigured(), build: 'cloudinary-prefix-v2' });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/events', eventRoutes);
  app.use('/api/secretaries', secretaryRoutes);
  app.use('/api/intake', intakeRoutes);

  app.use((err, _req, res, _next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  });

  app.listen(PORT, () => {
    console.log(`API listening on http://localhost:${PORT}`);
    if (isCloudinaryAdminConfigured()) {
      console.log('Cloudinary admin delete: enabled');
    } else {
      console.warn(
        'Cloudinary admin delete: DISABLED — set VITE_CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET'
      );
    }
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
