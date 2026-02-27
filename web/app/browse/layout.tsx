import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Browse Motorhome Stays - Find Overnight Stops UK',
  description: 'Browse affordable motorhome overnight stays across the UK on our interactive map. Filter by price, amenities, and location. Farm stays, coastal spots & more from £10/night.',
  keywords: [
    'motorhome stays map',
    'find campervan parking',
    'UK motorhome sites map',
    'overnight motorhome stops',
    'cheap motorhome camping near me'
  ],
  openGraph: {
    title: 'Browse Motorhome Stays - Interactive Map',
    description: 'Find affordable overnight motorhome stays across the UK. Farm stays, coastal spots & countryside retreats.',
    url: 'https://proper-place.co.uk/browse',
  },
  alternates: {
    canonical: 'https://proper-place.co.uk/browse',
  },
};

export default function BrowseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
