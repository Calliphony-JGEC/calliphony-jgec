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

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/calliphony';

async function connectMongo() {
  if (mongoose.connection.readyState >= 1) {
    return;
  }

  const useMemory = process.env.MEMORY_MONGO === '1' || process.env.MEMORY_MONGO === 'true';

  if (useMemory && process.env.NODE_ENV !== 'production') {
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
    console.error(`MongoDB connection failed (${err.message}).`);
    
    // only fallback to memory server in dev mode
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Falling back to in-memory MongoDB for local development.');
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      const memory = await MongoMemoryServer.create();
      const uri = memory.getUri('calliphony');
      await mongoose.connect(uri);
      console.log('Connected to in-memory MongoDB (fallback)');
    } else {
      // in production we throw because vercel cannot run the memory server
      throw new Error('Database connection failed in production.');
    }
  }
}

let seedPromise = null;
async function seedAdmin() {
  if (seedPromise) return seedPromise;

  seedPromise = (async () => {
    const email = (process.env.ADMIN_EMAIL || 'admin@calliphony.local').trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD || 'admin123';
    const passwordHash = await bcrypt.hash(password, 12);

    const users = await User.find().sort({ createdAt: 1 });
    if (users.length === 0) {
      await User.create({ email, passwordHash });
      console.log(`Seeded admin user: ${email}`);
      return;
    }

    // single-admin app: keep the first user in sync with .env (email + password)
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
  })();

  return seedPromise;
}

if (!process.env.JWT_SECRET) {
  console.warn('JWT_SECRET missing — using insecure development default.');
  process.env.JWT_SECRET = 'dev-calliphony-jwt-secret-change-me';
}

const app = express();

const corsOrigin = process.env.NODE_ENV === 'production' 
  ? ['https://calliphony.vercel.app', 'https://calliphony-jgec.vercel.app', 'https://calliphony.com'] // Adjust based on actual prod domains
  : true;

app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json({ limit: '2mb' }));

// serverless initialization
let isInitialized = false;
app.use(async (req, res, next) => {
  if (!isInitialized) {
    try {
      await connectMongo();
      await seedAdmin();
      isInitialized = true;
    } catch (err) {
      console.error('Serverless initialization failed:', err);
      return res.status(500).json({ error: 'Database initialization failed.' });
    }
  }
  next();
});

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

export default app;
