import { serve } from 'bun';
import { buildApp } from './app';
import { getEnv } from './env';

const env = getEnv();
const port = env.API_PORT;

const app = await buildApp();

console.log(`[api] starting on http://${env.HOSTNAME}:${port}`);
console.log(
  `[api] env=${env.NODE_ENV} payment=${env.PAYMENT_PROVIDER} email=${env.EMAIL_PROVIDER}`,
);

const server = serve({
  port,
  hostname: env.HOSTNAME,
  fetch: app.fetch,
});

const shutdown = (sig: string) => {
  console.log(`[api] received ${sig}, shutting down`);
  server.stop();
  process.exit(0);
};
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
