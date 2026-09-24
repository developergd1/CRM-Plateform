import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { GoogleAnalytics } from '@/components/analytics/GoogleAnalytics';

export const metadata: Metadata = {
  metadataBase: new URL('https://growthindia.co'),
  title: {
    default: 'Growth India — Enterprise CRM & Employee Management Platform',
    template: '%s | Growth India Platform',
  },
  description:
    'Growth India offers all-in-one Enterprise CRM, HRMS, KYC Document Vault, Live Attendance Tracking, and Operational Governance Platform tailored for modern businesses across India.',
  keywords: [
    'Growth India',
    'Growth India CRM',
    'Employee Management System',
    'HRMS India',
    'Attendance Management Software',
    'Enterprise Sales CRM',
    'KYC Document Vault',
    'B2B CRM Software',
  ],
  authors: [{ name: 'Growth India Technologies' }],
  creator: 'Growth India',
  publisher: 'Growth India',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: 'https://growthindia.co',
    siteName: 'Growth India Platform',
    title: 'Growth India — Enterprise CRM & Employee Management Platform',
    description:
      'Manage sales pipelines, customer relations, employee attendance, leaves, KYC compliance, and business analytics seamlessly with Growth India.',
    images: [
      {
        url: '/growth-india-logo.png',
        width: 1200,
        height: 630,
        alt: 'Growth India CRM & Employee Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Growth India — Enterprise CRM & Employee Management Platform',
    description:
      'Manage sales pipelines, customer relations, employee attendance, leaves, KYC compliance, and business analytics with Growth India.',
    images: ['/growth-india-logo.png'],
  },
  icons: {
    icon: [
      { url: '/favicon.ico?v=3', sizes: 'any' },
      { url: '/icon.png?v=3', type: 'image/png', sizes: '256x256' },
    ],
    shortcut: '/favicon.ico?v=3',
    apple: '/apple-icon.png?v=3',
  },
  alternates: {
    canonical: 'https://growthindia.co',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || 'G-GROWTHINDIA';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Growth India CRM & Employee Management Platform',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web, Android, iOS, Windows, macOS',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'INR',
    },
    description:
      'Enterprise B2B CRM, Attendance Workforce Management, KYC Compliance Vault, and Sales Pipeline solution.',
    url: 'https://growthindia.co',
    publisher: {
      '@type': 'Organization',
      name: 'Growth India',
      url: 'https://growthindia.co',
      logo: 'https://growthindia.co/growth-india-logo.png',
    },
  };

  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="antialiased bg-slate-100 text-slate-900 selection:bg-growth-teal selection:text-white">
        <GoogleAnalytics measurementId={gaId} />
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
