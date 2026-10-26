import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import pkg from './package.json';

// base: './' にしておくと、build 後の dist をどの静的ホスティングに置いても動く
export default defineConfig({
  plugins: [react()],
  base: './',
  // トップ画面に出すバージョン表記。更新したら package.json の version を上げる
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_DATE__: JSON.stringify(new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' })),
  },
  server: { port: 5173 },
});
