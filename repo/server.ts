import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { apiRouter } from './src/server/api.ts';
import { initDatabase } from './src/server/database.ts';
import { logEvent } from './src/server/logger.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || '3000', 10);

  // Initialize SQLite persistence
  initDatabase();

  // Basic middleware
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Mount API endpoints
  app.use('/api', apiRouter);

  // Development vs Production
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    // Vite middleware in development
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Static file serving in production
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[JARVIS SERVER] Running on http://0.0.0.0:${PORT}`);
    logEvent({
      level: 'INFO',
      category: 'SYSTEM',
      component: 'ApplicationBootstrap',
      message: `JARVIS Executive System Online. Port: ${PORT}, Mode: ${isProd ? 'Production' : 'Development'}`,
      metadata: { port: PORT, nodeVersion: process.version, isProd },
    });
  });
}

startServer().catch((err) => {
  console.error('Fatal JARVIS server bootstrap failure:', err);
  process.exit(1);
});
