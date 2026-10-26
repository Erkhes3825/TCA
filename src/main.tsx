import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';
import { initTextSize } from './lib/textSize';

initTextSize();

// Web アプリ版（npm run build:web）だけ、オフラインで開けるよう Service Worker を登録する。
// file:// で直接開いたときや http の LAN では登録できないので何もしない
if (import.meta.env.VITE_WEB === '1' && 'serviceWorker' in navigator && window.isSecureContext && location.protocol !== 'file:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => { /* 登録できなくても画面は動く */ });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
