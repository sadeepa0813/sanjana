import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: 'index.html',
        admin: 'admin.html',
        login: 'login.html',
        dashboard: 'user-dashboard.html',
        feedback: 'feedback.html'
      }
    }
  },
  server: {
    port: 3000
  }
});
