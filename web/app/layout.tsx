import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { ConditionalFooter } from "@/components/ConditionalFooter";
import ScrollToTop from "@/components/ScrollToTop";
import CookieConsent from "@/components/CookieConsent";
import { AuthProvider } from "@/lib/auth";

export const metadata: Metadata = {
  metadataBase: new URL('https://proper-place.co.uk'),
  title: {
    default: "Proper Place - Affordable Motorhome Stays Across the UK",
    template: "%s | Proper Place"
  },
  description: "Find affordable overnight motorhome stays across the UK. Proper Place connects motorhome owners with landowners offering unique farm stays, coastal spots & countryside retreats from £10/night.",
  keywords: [
    "motorhome stays UK",
    "campervan overnight parking",
    "motorhome stopovers",
    "cheap motorhome camping",
    "farm stays motorhome",
    "UK motorhome sites",
    "campervan parking UK",
    "motorhome overnight spots",
    "affordable camping UK",
    "rural motorhome stays",
    "Proper Place app",
    "motorhome community UK"
  ],
  authors: [{ name: "Proper Place" }],
  creator: "Proper Place",
  publisher: "Proper Place",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "en_GB",
    url: "https://proper-place.co.uk",
    siteName: "Proper Place",
    title: "Proper Place - Affordable Motorhome Stays Across the UK",
    description: "Find affordable overnight motorhome stays across the UK. Connect with landowners offering unique farm stays, coastal spots & countryside retreats from £10/night.",
    images: [
      {
        url: "/images/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Proper Place - Motorhome Stays UK",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Proper Place - Affordable Motorhome Stays UK",
    description: "Find affordable overnight motorhome stays across the UK. Farm stays, coastal spots & countryside retreats from £10/night.",
    images: ["/images/og-image.jpg"],
  },
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
  alternates: {
    canonical: "https://proper-place.co.uk",
  },
  verification: {
    // Add Google Search Console verification when available
    // google: 'your-verification-code',
  },
};

// JSON-LD Structured Data for SEO and Google Sitelinks
const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': 'https://proper-place.co.uk/#organization',
      name: 'Proper Place',
      url: 'https://proper-place.co.uk',
      logo: {
        '@type': 'ImageObject',
        url: 'https://proper-place.co.uk/images/logo.png',
        width: 512,
        height: 512,
      },
      sameAs: [],
      description: 'Proper Place connects motorhome owners with landowners offering affordable overnight stays across the UK.',
    },
    {
      '@type': 'WebSite',
      '@id': 'https://proper-place.co.uk/#website',
      url: 'https://proper-place.co.uk',
      name: 'Proper Place',
      publisher: {
        '@id': 'https://proper-place.co.uk/#organization',
      },
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: 'https://proper-place.co.uk/browse?search={search_term_string}',
        },
        'query-input': 'required name=search_term_string',
      },
    },
    {
      '@type': 'MobileApplication',
      '@id': 'https://proper-place.co.uk/#app',
      name: 'Proper Place',
      operatingSystem: 'iOS, Android',
      applicationCategory: 'TravelApplication',
      description: 'Find affordable motorhome overnight stays across the UK',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'GBP',
      },
    },
    {
      '@type': 'SiteNavigationElement',
      '@id': 'https://proper-place.co.uk/#navigation',
      name: 'Main Navigation',
      hasPart: [
        {
          '@type': 'SiteNavigationElement',
          name: 'Download App',
          url: 'https://proper-place.co.uk/download',
        },
        {
          '@type': 'SiteNavigationElement',
          name: 'Browse Stays',
          url: 'https://proper-place.co.uk/browse',
        },
        {
          '@type': 'SiteNavigationElement',
          name: 'Become a Host',
          url: 'https://proper-place.co.uk/become-host',
        },
        {
          '@type': 'SiteNavigationElement',
          name: 'How It Works',
          url: 'https://proper-place.co.uk/how-it-works',
        },
        {
          '@type': 'SiteNavigationElement',
          name: 'About Us',
          url: 'https://proper-place.co.uk/about',
        },
        {
          '@type': 'SiteNavigationElement',
          name: 'Contact',
          url: 'https://proper-place.co.uk/contact',
        },
      ],
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="google-site-verification" content="h7YeFsknqHj_m41ISdADyh-RP4HCg9pRmrDAstHUP-k" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="bg-white text-gray-900">
        <AuthProvider>
          <ScrollToTop />
          <Navbar />
          <div className="pt-24">
            {children}
          </div>
          <ConditionalFooter />
          <CookieConsent />
        </AuthProvider>
      </body>
    </html>
  );
}
