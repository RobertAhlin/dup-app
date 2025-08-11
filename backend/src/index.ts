//backend/src/index.ts

import express from 'express';
import pool from './db';
import authRoutes from './routes/auth';
import testRoutes from './routes/test';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
console.log('🔍 före ping');
app.get('/ping', (_req, res) => {
  console.log('🔍 /ping route HIT!');
  res.send('Pong');
});
console.log('🔍 efter ping');

// CORS: Viktigt att 'credentials: true' kommer ihop med origin
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
}));

// Middleware
app.use(cookieParser());
app.use(express.json());


// 🔍 Test-rout för att se om cookies fungerar
app.get('/test-cookie', (_req, res) => {
  console.log('🍪 /test-cookie route HIT!');
  res
    .cookie('token', 'dummyvalue', {
      httpOnly: true,
      secure: false,       // Sätt till true i produktion (med HTTPS)
      sameSite: 'lax'      // Eller 'strict' om du vill vara striktare
    })
    .send('🍪 Test-cookie set!');
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/test', testRoutes);



// Statuskontroll
app.get('/', async (_req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.send(`✅ Connected to DB! Time: ${result.rows[0].now}`);
  } catch (err) {
    console.error('❌ DB connection failed:', (err as Error).message);
    res.status(500).send('Database connection error');
  }
});
console.log('✅ All routes registered');


// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`);
});
