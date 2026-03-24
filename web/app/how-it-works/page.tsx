import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'How It Works - Find & Book Motorhome Stays',
  description: 'Learn how Proper Place works for motorhome owners and hosts. Find stays, book securely, and enjoy unique overnight spots. List your land and earn extra income.',
  keywords: [
    'how to book motorhome stays',
    'list land for motorhomes',
    'motorhome booking app',
    'host campervan stays'
  ],
  openGraph: {
    title: 'How Proper Place Works - Book Motorhome Stays',
    description: 'Find and book affordable motorhome overnight stays, or list your land and earn extra income.',
    url: 'https://proper-place.co.uk/how-it-works',
  },
  alternates: {
    canonical: 'https://proper-place.co.uk/how-it-works',
  },
};

export default function HowItWorksPage() {
  return (
    <main>
      {/* Hero Section */}
      <section className="bg-dark-bg text-white py-20">
        <div className="container-md text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            How <span className="text-light-blue">Proper Place</span> Works
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Discover how easy it is to find your perfect overnight stay or list your space for motorhome owners.
          </p>
        </div>
      </section>

      {/* For Motorhomers */}
      <section className="py-20 bg-white">
        <div className="container-md">
          <div className="text-center mb-16">
            <span className="text-light-blue font-semibold text-sm uppercase tracking-wide">For Motorhomers</span>
            <h2 className="text-3xl md:text-4xl font-bold mt-2">Find Your Perfect Stay</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-20 h-20 bg-light-blue text-white rounded-full flex items-center justify-center text-3xl font-bold mx-auto mb-6">
                1
              </div>
              <h3 className="text-xl font-bold mb-3">Download the App</h3>
              <p className="text-gray-600">Get Proper Place from the App Store or Google Play. Create your free account in under a minute.</p>
            </div>
            
            <div className="text-center">
              <div className="w-20 h-20 bg-light-blue text-white rounded-full flex items-center justify-center text-3xl font-bold mx-auto mb-6">
                2
              </div>
              <h3 className="text-xl font-bold mb-3">Find a Proper Place</h3>
              <p className="text-gray-600">Explore our interactive map of verified hosts across the UK. Filter by price, amenities, and type.</p>
            </div>
            
            <div className="text-center">
              <div className="w-20 h-20 bg-light-blue text-white rounded-full flex items-center justify-center text-3xl font-bold mx-auto mb-6">
                3
              </div>
              <h3 className="text-xl font-bold mb-3">Book Your Stay</h3>
              <p className="text-gray-600">Request to book directly through the app. Communicate with hosts and pay securely.</p>
            </div>
            
            <div className="text-center">
              <div className="w-20 h-20 bg-light-blue text-white rounded-full flex items-center justify-center text-3xl font-bold mx-auto mb-6">
                4
              </div>
              <h3 className="text-xl font-bold mb-3">Enjoy & Review</h3>
              <p className="text-gray-600">Arrive at your Proper Place, enjoy your stay, and leave a review to help other motorhome owners.</p>
            </div>
          </div>
        </div>
      </section>

      {/* For Hosts */}
      <section className="py-20 bg-gray-50">
        <div className="container-md">
          <div className="text-center mb-16">
            <span className="text-light-blue font-semibold text-sm uppercase tracking-wide">For Hosts</span>
            <h2 className="text-3xl md:text-4xl font-bold mt-2">Start Earning from Your Space</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-20 h-20 bg-green-600 text-white rounded-full flex items-center justify-center text-3xl font-bold mx-auto mb-6">
                1
              </div>
              <h3 className="text-xl font-bold mb-3">Create Your Listing</h3>
              <p className="text-gray-600">Sign up as a host and add details about your space, including photos, amenities, and availability.</p>
            </div>
            
            <div className="text-center">
              <div className="w-20 h-20 bg-green-600 text-white rounded-full flex items-center justify-center text-3xl font-bold mx-auto mb-6">
                2
              </div>
              <h3 className="text-xl font-bold mb-3">Set Your Terms</h3>
              <p className="text-gray-600">Choose your own pricing, set house rules, and define availability that suits your schedule.</p>
            </div>
            
            <div className="text-center">
              <div className="w-20 h-20 bg-green-600 text-white rounded-full flex items-center justify-center text-3xl font-bold mx-auto mb-6">
                3
              </div>
              <h3 className="text-xl font-bold mb-3">Accept Bookings</h3>
              <p className="text-gray-600">Review booking requests from guests. Chat with them before confirming their stay.</p>
            </div>
            
            <div className="text-center">
              <div className="w-20 h-20 bg-green-600 text-white rounded-full flex items-center justify-center text-3xl font-bold mx-auto mb-6">
                4
              </div>
              <h3 className="text-xl font-bold mb-3">Get Paid</h3>
              <p className="text-gray-600">Receive secure payments directly to your account after each completed stay.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-white">
        <div className="container-md">
          <div className="text-center mb-16">
            <span className="text-light-blue font-semibold text-sm uppercase tracking-wide">Features</span>
            <h2 className="text-3xl md:text-4xl font-bold mt-2">Why Choose Proper Place</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-gray-50 rounded-2xl p-8">
              <div className="w-12 h-12 bg-light-blue text-white rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3">Interactive Map</h3>
              <p className="text-gray-600">Browse Proper Places on our easy-to-use map. Find stays along your route or discover new destinations.</p>
            </div>
            
            <div className="bg-gray-50 rounded-2xl p-8">
              <div className="w-12 h-12 bg-light-blue text-white rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3">Secure Payments</h3>
              <p className="text-gray-600">All transactions are processed securely. Hosts receive payments directly to their accounts.</p>
            </div>
            
            <div className="bg-gray-50 rounded-2xl p-8">
              <div className="w-12 h-12 bg-light-blue text-white rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3">Direct Messaging</h3>
              <p className="text-gray-600">Chat directly with hosts or guests before booking to ask questions and make arrangements.</p>
            </div>
            
            <div className="bg-gray-50 rounded-2xl p-8">
              <div className="w-12 h-12 bg-light-blue text-white rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3">Reviews & Ratings</h3>
              <p className="text-gray-600">Make informed decisions with genuine reviews from the motorhome community.</p>
            </div>
            
            <div className="bg-gray-50 rounded-2xl p-8">
              <div className="w-12 h-12 bg-light-blue text-white rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3">Verified Hosts</h3>
              <p className="text-gray-600">Every Proper Place is reviewed to ensure it meets our community standards for safety and quality.</p>
            </div>
            
            <div className="bg-gray-50 rounded-2xl p-8">
              <div className="w-12 h-12 bg-light-blue text-white rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3">Fair Pricing</h3>
              <p className="text-gray-600">Hosts set their own prices, typically £10-15 per night — a fraction of traditional campsite fees.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-dark-bg text-white">
        <div className="container-md text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Download the app today and join the Proper Place community.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/browse" className="btn-primary px-8 py-3 rounded-xl font-semibold">
              Find a Proper Place
            </Link>
            <Link href="/become-host" className="btn-secondary border-2 border-white text-white hover:bg-white hover:text-dark-bg px-8 py-3 rounded-xl font-semibold transition-colors">
              Become a Host
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
