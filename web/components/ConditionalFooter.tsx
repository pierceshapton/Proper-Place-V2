'use client';

import { usePathname } from 'next/navigation';
import Footer from './Footer';

export function ConditionalFooter() {
  const pathname = usePathname();
  
  // On browse page, remove top margin from footer
  if (pathname === '/browse') {
    return <Footer noMargin />;
  }
  
  return <Footer />;
}
