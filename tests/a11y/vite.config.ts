import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  envDir: 'tests/a11y',
  plugins: [react()],
  resolve: {
    alias: [
      { find: /^.*\/contexts\/(AuthContext|SettingsContext|PlanContext)$/, replacement: path.resolve('tests/a11y/data.ts') },
      { find: /^.*\/lib\/supabase$/, replacement: path.resolve('tests/a11y/supabase.ts') },
    ],
  },
  build: {
    outDir: '.a11y-dist',
    rollupOptions: { input: path.resolve('tests/a11y/index.html') },
  },
});
