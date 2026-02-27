import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact Us',
  description: 'Contact the Proper Place team. Have questions about motorhome stays, hosting, or the app? We\'d love to hear from you.',
  openGraph: {
    title: 'Contact Us | Proper Place',
    description: 'Get in touch with the Proper Place team. Questions about motorhome stays or hosting? We\'re here to help.',
    url: 'https://proper-place.co.uk/contact',
  },
  alternates: {
    canonical: 'https://proper-place.co.uk/contact',
  },
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
