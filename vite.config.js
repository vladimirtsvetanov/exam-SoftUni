import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        login: resolve(__dirname, 'login.html'),
        register: resolve(__dirname, 'register.html'),
        createPoll: resolve(__dirname, 'create-poll.html'),
        pollDetails: resolve(__dirname, 'poll-details.html'),
        editPoll: resolve(__dirname, 'edit-poll.html'),
        admin: resolve(__dirname, 'admin.html')
      }
    }
  }
});
