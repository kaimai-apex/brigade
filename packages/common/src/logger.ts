import pino from 'pino';

export function createLogger(name: string) {
  const isDev = process.env.NODE_ENV !== 'production';
  return pino({
    name,
    level: process.env.LOG_LEVEL ?? 'info',
    ...(isDev && {
      transport: { target: 'pino-pretty', options: { colorize: true } },
    }),
  });
}

export type Logger = ReturnType<typeof createLogger>;
