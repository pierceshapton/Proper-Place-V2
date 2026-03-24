import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Become a Host - Earn Money from Your Land',
  description: 'Turn your unused land into extra income with Proper Place. List your farm, garden, or land for motorhome owners. Free to list, set your own prices, and meet interesting people.',
  keywords: [
    'host motorhomes on farm',
    'earn money from land',
    'motorhome hosting UK',
    'list land for campervan',
    'passive income from land',
    'rent space to motorhomes'
  ],
  openGraph: {
    title: 'Become a Host - Earn Money from Your Land | Proper Place',
    description: 'Turn your unused land into extra income. Host motorhome guests on your farm, garden, or land.',
    url: 'https://proper-place.co.uk/become-host',
  },
  alternates: {
    canonical: 'https://proper-place.co.uk/become-host',
  },
};

export default function BecomeHostLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
