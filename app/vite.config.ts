import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const doAbsolute = true;

export default defineConfig({
    plugins: [react(), tailwindcss()],

    resolve: {
        alias: {
            '@': '/src'
        }
    },

    build: {
        target: 'esnext',
        rollupOptions: {
            output: {
                chunkFileNames: doAbsolute ? 'a/[name].js' : 'a/[hash].[name].js',
                entryFileNames: doAbsolute ? 'a/[name].js' : 'a/[hash].[name].js',
                assetFileNames: doAbsolute ? 'a/[name][extname]' : 'a/[hash].[name][extname]'
            }
        },
        chunkSizeWarningLimit: 750
    }
});