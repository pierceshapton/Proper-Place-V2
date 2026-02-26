'use client';

import { usePathname } from 'next/navigation';
import Footer from './Footer';

export function ConditionalFooter() {
  const pathname = usePathname();
  
  // Don't show footer on the map page
  if (pathname === '/browse') {
    return null;
  }
  
  return <Footer />;
}
