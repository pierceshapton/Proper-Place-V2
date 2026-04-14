import Image from 'next/image';
import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Download the Proper Place App',
  description: 'Download the Proper Place app for iOS and Android. Find affordable motorhome overnight stays across the UK. Free to download with no hidden fees.',
  keywords: [
    'Proper Place app download',
    'motorhome app UK',
    'campervan stays app',
    'download motorhome app',
    'iOS motorhome app',
    'Android campervan app'
  ],
  openGraph: {
    title: 'Download the Proper Place App - Motorhome Stays UK',
    description: 'Download the free Proper Place app to find affordable motorhome overnight stays across the UK.',
    url: 'https://proper-place.co.uk/download',
  },
  alternates: {
    canonical: 'https://proper-place.co.uk/download',
  },
};

export default function DownloadPage() {
  return (
    <main>
      {/* Hero Section */}
      <section className="relative bg-dark-bg text-white overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1523987355523-c7b5b0dd90a7?w=1920&q=80"
            alt="Motorhome parked at scenic location"
            fill
            className="object-cover opacity-30"
            priority
          />
        </div>
        <div className="relative container-md py-24 md:py-32">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
              Download the <span className="text-light-blue">Proper Place</span> App
            </h1>
            <p className="text-xl md:text-2xl text-gray-200 mb-10 leading-relaxed">
              Find affordable motorhome overnight stays across the UK. Browse locations, book stays, and connect with hosts — all from your phone.
            </p>
            
            {/* App Download Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <div className="relative overflow-hidden inline-flex items-center gap-3 bg-white text-gray-900 px-8 py-4 rounded-xl cursor-not-allowed opacity-90 hover:opacity-100 transition-opacity">
                <svg className="w-10 h-10" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
                <div className="text-left">
                  <div className="text-xs text-gray-500">Download on the</div>
                  <div className="text-xl font-semibold">App Store</div>
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="bg-red-600 text-white text-xs font-bold px-10 py-1 rounded-md transform -rotate-12 shadow-lg">COMING SOON!</span>
                </div>
              </div>
              <div className="relative overflow-hidden inline-flex items-center gap-3 bg-white text-gray-900 px-8 py-4 rounded-xl cursor-not-allowed opacity-90 hover:opacity-100 transition-opacity">
                <svg className="w-10 h-10" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>
                </svg>
                <div className="text-left">
                  <div className="text-xs text-gray-500">Get it on</div>
                  <div className="text-xl font-semibold">Google Play</div>
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="bg-red-600 text-white text-xs font-bold px-10 py-1 rounded-md transform -rotate-12 shadow-lg">COMING SOON!</span>
                </div>
              </div>
            </div>
            
            <p className="text-gray-400">
              Free to download • No hidden fees • Available for iOS & Android
            </p>
          </div>
        </div>
      </section>

      {/* App Features */}
      <section className="py-20 bg-white">
        <div className="container-md">
          <div className="text-center mb-16">
            <span className="text-light-blue font-semibold text-sm uppercase tracking-wide">App Features</span>
            <h2 className="text-3xl md:text-4xl font-bold mt-2">Everything you need in one app</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-gray-50 rounded-2xl p-8 text-center">
              <div className="w-16 h-16 bg-light-blue text-white rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3">Interactive Map</h3>
              <p className="text-gray-600">Browse all available stays on an easy-to-use map. Filter by price, amenities, and stay type.</p>
            </div>
            
            <div className="bg-gray-50 rounded-2xl p-8 text-center">
              <div className="w-16 h-16 bg-light-blue text-white rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3">Direct Messaging</h3>
              <p className="text-gray-600">Chat directly with hosts before and during your stay. Ask questions and get local tips.</p>
            </div>
            
            <div className="bg-gray-50 rounded-2xl p-8 text-center">
              <div className="w-16 h-16 bg-light-blue text-white rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3">Secure Payments</h3>
              <p className="text-gray-600">Book and pay securely through the app. No cash needed — everything is handled digitally.</p>
            </div>
          </div>
        </div>
      </section>

      {/* For Hosts */}
      <section className="py-20 bg-gray-50">
        <div className="container-md">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="text-light-blue font-semibold text-sm uppercase tracking-wide">For Hosts</span>
              <h2 className="text-3xl md:text-4xl font-bold mt-2 mb-6">
                Manage your listings on the go
              </h2>
              <p className="text-gray-600 text-lg mb-6 leading-relaxed">
                The Proper Place app makes hosting easy. Manage your listings, respond to booking requests, and communicate with guests — all from your phone.
              </p>
              <ul className="space-y-4">
                <li className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-light-blue flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700">Instant booking notifications</span>
                </li>
                <li className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-light-blue flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700">Easy calendar management</span>
                </li>
                <li className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-light-blue flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700">Quick photo uploads</span>
                </li>
                <li className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-light-blue flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700">Earnings tracking</span>
                </li>
              </ul>
            </div>
            <div className="relative h-96 rounded-2xl overflow-hidden shadow-2xl bg-gray-200 flex items-center justify-center">
              <div className="text-center p-8">
                <div className="w-24 h-24 bg-light-blue text-white rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-gray-500 font-medium">App Screenshots Coming Soon</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Get Notified */}
      <section className="py-20 bg-light-blue text-white">
        <div className="container-md text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Be the first to know when we launch
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Our app is coming soon to the App Store and Google Play. Sign up to be notified when it's ready!
          </p>
          <Link href="/contact" className="inline-block bg-white text-light-blue px-8 py-4 rounded-xl font-semibold text-lg hover:bg-gray-100 transition-colors">
            Get Notified
          </Link>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 bg-white">
        <div className="container-md">
          <div className="text-center mb-16">
            <span className="text-light-blue font-semibold text-sm uppercase tracking-wide">FAQ</span>
            <h2 className="text-3xl md:text-4xl font-bold mt-2">Frequently asked questions</h2>
          </div>
          
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="text-lg font-bold mb-2">Is the app free to download?</h3>
              <p className="text-gray-600">Yes! The Proper Place app is completely free to download on both iOS and Android. You only pay when you book a stay.</p>
            </div>
            
            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="text-lg font-bold mb-2">When will the app be available?</h3>
              <p className="text-gray-600">We're currently in the final stages of development. The app will be launching very soon on both the App Store and Google Play. Sign up to be notified!</p>
            </div>
            
            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="text-lg font-bold mb-2">Can I use the website instead?</h3>
              <p className="text-gray-600">You can browse available stays on our website, but booking and messaging features are available exclusively through the app.</p>
            </div>
            
            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="text-lg font-bold mb-2">How do I become a host?</h3>
              <p className="text-gray-600">Download the app, create an account, and select "Become a Host" to list your space. It's free to list and you control your own pricing.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 bg-gray-50">
        <div className="container-md text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">Can't wait? Browse stays now</h2>
          <p className="text-gray-600 mb-6">Explore available motorhome stays across the UK on our interactive map.</p>
          <Link href="/browse" className="btn-primary inline-block">
            Browse All Stays
          </Link>
        </div>
      </section>
    </main>
  );
}
