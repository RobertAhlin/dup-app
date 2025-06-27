import express from 'express';
import pool from './db';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());

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
