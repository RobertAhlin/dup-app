import express from 'express';
import pool from './db';
import authRoutes from './routes/auth';
import testRoutes from './routes/test';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: process.env.FRONTEND_URL, // allow requests from your frontend URL
  credentials: true, // allow cookies if you use them later
}));

app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/test', testRoutes);

app.get('/', async (_req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.send(`✅ Connected to DB! Time: ${result.rows[0].now}`);
  } catch (err) {
    console.error('❌ DB connection failed:', (err as Error).message);
    res.status(500).send('Database connection error');
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`);
});
