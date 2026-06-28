
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, (process as any).cwd(), '');
  return {
    plugins: [react()],
    base: './', // Use relative base path to support different hosting environments
    build: {
      outDir: 'dist',
      sourcemap: false
    },
    define: {
      // Ensure API_KEY is available in the built code, fallback to empty string
      'process.env.API_KEY': JSON.stringify(env.API_KEY || process.env.API_KEY || ''),
      // Mock process.env for libraries that expect it, avoiding crash
      'process.env': {}
    }
  };
});
