import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    proxy: {
      '/api/builderbot-webhook': {
        target: 'https://dtjmckbrofevgfqbkzli.supabase.co/functions/v1/builderbot-webhook',
        changeOrigin: true,
        rewrite: () => ''
      }
    }
  }
});

