import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

const desktopBuild = process.env.LITTLEMISS_DESKTOP === 'true'
const projectDir = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig(async () => {
  const plugins = [react()];
  if (desktopBuild) {
    plugins.push({
      name: 'desktop-offline-html',
      transformIndexHtml(html) {
        return html.replace(/\s*<link[^>]+(?:https?:\/\/|manifest\.json)[^>]*>/g, '');
      },
    });
  }
  if (!desktopBuild) {
    const { default: base44 } = await import('@base44/vite-plugin');
    plugins.unshift(base44({
      legacySDKImports: process.env.BASE44_LEGACY_SDK_IMPORTS === 'true',
      hmrNotifier: true,
      navigationNotifier: true,
      analyticsTracker: true,
      visualEditAgent: true,
    }));
  }

  return {
    base: desktopBuild ? './' : '/',
    resolve: {
      alias: {
        '@': path.resolve(projectDir, 'src'),
        ...(desktopBuild ? { '@base44/sdk': path.resolve(projectDir, 'src/lib/desktopBase44Sdk.js') } : {}),
      },
    },
    plugins,
  };
});
