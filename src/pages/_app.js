import '../styles/globals.css';
import { NhostProvider } from '@nhost/react';
import nhost from '../lib/nhost';
import Script from 'next/script';

function MyApp({ Component, pageProps }) {
  return (
    <NhostProvider nhost={nhost}>
      <Script
        src="https://telegram.org/js/telegram-web-app.js"
        strategy="beforeInteractive"
        onError={() => console.error('Failed to load Telegram WebApp SDK')}
      />
      <Component {...pageProps} />
    </NhostProvider>
  );
}

export default MyApp;