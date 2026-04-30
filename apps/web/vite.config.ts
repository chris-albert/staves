import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig(({ mode }) => {
  // In dev, default VITE_SIGNALING_SERVER to the local signaling server
  // using SIGNAL_PORT so the two stay in sync automatically.
  const signalPort = process.env.SIGNAL_PORT || '8787';
  const env = mode === 'development'
    ? { VITE_SIGNALING_SERVER: `ws://localhost:${signalPort}` }
    : {};

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: process.env.WEB_PORT ? Number(process.env.WEB_PORT) : undefined,
    },
    define: {
      // Only set as fallback — an explicit VITE_SIGNALING_SERVER in .env takes precedence
      ...Object.fromEntries(
        Object.entries(env)
          .filter(([k]) => !process.env[k])
          .map(([k, v]) => [`import.meta.env.${k}`, JSON.stringify(v)]),
      ),
    },
  };
});
