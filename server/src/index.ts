import 'dotenv/config';
import http from 'http';
import { createApp } from './app.js';
import { setupSocket } from './socket/index.js';
import { prisma } from './lib/prisma.js';

const PORT = parseInt(process.env.PORT || '3001', 10);

async function main() {
  const app = createApp();
  const server = http.createServer(app);

  setupSocket(server);

  server.listen(PORT, () => {
    console.log(`[AnyTable] Server running on http://localhost:${PORT}`);
    console.log(`[AnyTable] Environment: ${process.env.NODE_ENV}`);
  });

  const shutdown = async () => {
    console.log('\n[AnyTable] Shutting down...');
    await prisma.$disconnect();
    server.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('[AnyTable] Failed to start:', err);
  process.exit(1);
});
