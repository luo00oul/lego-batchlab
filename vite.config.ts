import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Relative asset URLs work both at / and at /<repository>/ on GitHub Pages.
export default defineConfig({ plugins: [react()], base: './' });
