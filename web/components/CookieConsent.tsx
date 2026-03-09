'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Check if user has already made a choice
    const consent = localStorage.getItem('cookie-consent');
    if (!consent) {
      // Small delay to prevent flash on page load
      const timer = setTimeout(() => setShowBanner(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const acceptAll = () => {
    localStorage.setItem('cookie-consent', JSON.stringify({
      essential: true,
      analytics: true,
      marketing: true,
      timestamp: new Date().toISOString(),
    }));
    setShowBanner(false);
  };

  const acceptEssentialOnly = () => {
    localStorage.setItem('cookie-consent', JSON.stringify({
      essential: true,
      analytics: false,
      marketing: false,
      timestamp: new Date().toISOString(),
    }));
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6 bg-white border-t border-gray-200 shadow-lg">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 mb-1">🍪 Cookie Preferences</h3>
            <p className="text-sm text-gray-600">
              We use cookies to enhance your experience, analyse site traffic, and for marketing purposes. 
              By clicking &quot;Accept All&quot;, you consent to our use of cookies. 
              Read our <Link href="/privacy" className="text-light-blue hover:underline">Privacy Policy</Link> and{' '}
              <Link href="/cookies" className="text-light-blue hover:underline">Cookie Policy</Link> to learn more.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
            <button
              onClick={acceptEssentialOnly}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Essential Only
            </button>
            <button
              onClick={acceptAll}
              className="px-4 py-2 text-sm font-medium text-white bg-light-blue hover:bg-blue-600 rounded-lg transition-colors"
            >
              Accept All
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
