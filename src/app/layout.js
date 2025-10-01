import { Inter } from 'next/font/google';
import './globals.css';
import { ServiceWorkerRegistrar } from './components/service-worker-registrar';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'CFC Digital - Sistema de Agendamento',
  description: 'Sistema de agendamento de aulas para CFC',
  applicationName: 'CFC Digital',
  manifest: '/manifest.webmanifest',
  themeColor: '#0C4A6E',
  icons: {
    icon: [
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  appleWebApp: {
    capable: true,
    title: 'CFC Digital',
    statusBarStyle: 'black-translucent',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <ServiceWorkerRegistrar />
        {children}
      </body>
    </html>
  );
}
