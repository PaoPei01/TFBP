import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import process from 'node:process';

import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  // HashRouter keeps app routes after "#", but Vite's base controls where built
  // JS/CSS assets are loaded from. The GitHub Pages project site now lives under
  // /DekENT56/, while Cloudflare Pages/root deployments still use /.
  // For GitHub Pages set VITE_DEPLOY_TARGET=github-pages or
  // VITE_APP_BASE_PATH=/DekENT56/. For root deployments, keep base /.
  const base =
    env.VITE_APP_BASE_PATH ||
    (env.VITE_DEPLOY_TARGET === 'github-pages' ? '/DekENT56/' : '/');

  return {
    base,
    plugins: [react(), cloudflare()],
  };
});