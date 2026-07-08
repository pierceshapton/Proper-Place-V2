import Image from 'next/image';
import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Download Proper Place - Book This Stay',
  description: 'Download the Proper Place app to book motorhome stays at this location and discover hundreds more across the UK.',
  openGraph: {
    title: 'Download Proper Place - Book Your Stay',
    description: 'Download the free Proper Place app to book motorhome stays across the UK.',
    url: 'https://proper-place.co.uk/scan',
  },
};

export default function ScanPage() {
  return (
    <main className="bg-cream min-h-screen">
      {/* Hero */}
      <section className="relative bg-dark-bg text-white py-16 md:py-24 overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1523987355523-c7b5b0dd90a7?w=1920&q=80"
            alt="Motorhome at scenic stay"
            fill
            className="object-cover opacity-30"
            priority
          />
        </div>
        <div className="relative container-md text-center">
          <div className="w-16 h-16 bg-light-blue rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h1 className="text-3xl md:text-5xl font-bold mb-4">
            Like This <span className="text-light-blue">Stay?</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-200 max-w-xl mx-auto mb-8">
            Download the Proper Place app to book this location and discover hundreds of unique motorhome stays across the UK.
          </p>

          {/* App Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
            <div className="relative overflow-hidden inline-flex items-center gap-3 bg-white text-gray-900 px-8 py-4 rounded-xl cursor-not-allowed opacity-90 hover:opacity-100 transition-opacity">
              <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
              </svg>
              <div className="text-left">
                <div className="text-xs text-gray-500">Download on the</div>
                <div className="text-lg font-semibold">App Store</div>
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="bg-red-600 text-white text-xs font-bold px-10 py-1 rounded-md transform -rotate-12 shadow-lg">COMING SOON!</span>
              </div>
            </div>
            <div className="relative overflow-hidden inline-flex items-center gap-3 bg-white text-gray-900 px-8 py-4 rounded-xl cursor-not-allowed opacity-90 hover:opacity-100 transition-opacity">
              <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>
              </svg>
              <div className="text-left">
                <div className="text-xs text-gray-500">Get it on</div>
                <div className="text-lg font-semibold">Google Play</div>
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="bg-red-600 text-white text-xs font-bold px-10 py-1 rounded-md transform -rotate-12 shadow-lg">COMING SOON!</span>
              </div>
            </div>
          </div>

          <p className="text-gray-400 text-sm">
            Free to download &bull; No hidden fees
          </p>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 bg-white">
        <div className="container-md">
          <h2 className="text-2xl md:text-3xl font-bold mb-10 text-center">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl mx-auto">
            {[
              { step: '1', title: 'Download the App', desc: 'Free on iOS and Android' },
              { step: '2', title: 'Create an Account', desc: 'Quick sign up - takes 30 seconds' },
              { step: '3', title: 'Book & Stay', desc: 'Find this location and book your stay' },
            ].map((item, i) => (
              <div key={i} className="text-center">
                <div className="w-14 h-14 bg-light-blue text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="text-lg font-bold mb-1">{item.title}</h3>
                <p className="text-gray-600 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 bg-cream">
        <div className="container-md">
          <h2 className="text-2xl md:text-3xl font-bold mb-10 text-center">Why Proper Place?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-4xl mx-auto">
            {[
              { icon: '🗺️', title: 'Interactive Map', desc: 'Browse stays near you' },
              { icon: '💬', title: 'Direct Messaging', desc: 'Chat with hosts' },
              { icon: '🔒', title: 'Secure Payments', desc: 'Pay safely in-app' },
              { icon: '⭐', title: 'Reviews & Ratings', desc: 'Trusted community' },
            ].map((item, i) => (
              <div key={i} className="bg-white rounded-xl p-6 text-center shadow-md">
                <div className="text-3xl mb-3">{item.icon}</div>
                <h3 className="font-semibold mb-1">{item.title}</h3>
                <p className="text-gray-500 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-dark-bg text-white py-16">
        <div className="container-md text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">Ready to book your stay?</h2>
          <p className="text-gray-300 mb-8 max-w-lg mx-auto">
            Join thousands of campers finding unique stays across the UK.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link href="/download" className="bg-light-blue hover:bg-accent-blue text-white px-8 py-3 rounded-xl font-semibold transition-colors">
              Download the App
            </Link>
            <Link href="/browse" className="border-2 border-white text-white hover:bg-white hover:text-dark-bg px-8 py-3 rounded-xl font-semibold transition-colors">
              Browse All Stays
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
