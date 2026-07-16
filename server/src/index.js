import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB } from './config/db.js';
import authRoutes from './routes/auth.js';
import visionRoutes from './routes/vision.js';
import issueRoutes from './routes/issues.js';
import leaderboardRoutes from './routes/leaderboard.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

app.use(cors());
app.use(express.json());

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', phase: 3 });
});

app.use('/api/auth', authRoutes);
app.use('/api/vision', visionRoutes);
app.use('/api/issues', issueRoutes);
app.use('/api/leaderboard', leaderboardRoutes);

const PORT = process.env.PORT || 3000;

connectDB()
  .then(() => {
    app.listen(PORT, () => console.log(`[server] listening on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error('[server] failed to start:', err.message);
    process.exit(1);
  });