import Image from 'next/image';
import Link from 'next/link';

export default function Home() {
  return (
    <main>
      {/* Hero Section */}
      <section className="relative bg-dark-bg text-white overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1523987355523-c7b5b0dd90a7?w=1920&q=80"
            alt="Motorhome parked at scenic location"
            fill
            className="object-cover opacity-40"
            priority
          />
        </div>
        <div className="relative container-md py-24 md:py-36">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
              Connecting the Motorhome Community with <span className="text-light-blue">Affordable Places to Stay</span> in Ideal Locations
            </h1>
            <p className="text-xl md:text-2xl text-gray-200 mb-8 leading-relaxed">
              Discover unique, budget-friendly places to park your motorhome across the UK. From scenic farmland to coastal retreats — find your perfect pitch.
            </p>
            
            {/* App Download Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <a 
                href="#" 
                className="inline-flex items-center gap-3 bg-black hover:bg-gray-900 text-white px-6 py-3 rounded-xl transition-colors"
              >
                <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
                <div className="text-left">
                  <div className="text-xs">Download on the</div>
                  <div className="text-lg font-semibold">App Store</div>
                </div>
              </a>
              <a 
                href="#" 
                className="inline-flex items-center gap-3 bg-black hover:bg-gray-900 text-white px-6 py-3 rounded-xl transition-colors"
              >
                <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>
                </svg>
                <div className="text-left">
                  <div className="text-xs">Get it on</div>
                  <div className="text-lg font-semibold">Google Play</div>
                </div>
              </a>
            </div>

            <p className="text-gray-400 text-sm">
              Available on iOS and Android • Free to download
            </p>
          </div>
        </div>
      </section>

      {/* What is Proper Place */}
      <section className="py-20 bg-white">
        <div className="container-md">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="text-light-blue font-semibold text-sm uppercase tracking-wide">About Proper Place</span>
              <h2 className="text-3xl md:text-4xl font-bold mt-2 mb-6">
                The Motorhome Community's Trusted Companion
              </h2>
              <p className="text-gray-600 text-lg mb-6 leading-relaxed">
                Proper Place connects motorhome owners with landowners offering affordable overnight stays. Whether you're seeking a peaceful farm setting, a coastal view, or a convenient stopover, our community makes finding your next adventure simple.
              </p>
              <p className="text-gray-600 text-lg mb-8 leading-relaxed">
                No more expensive campsites or uncertain wild camping. Our verified hosts offer safe, legal, and welcoming places for motorhome travellers at prices that won't break the bank.
              </p>
              <div className="bg-gray-100 rounded-xl p-6 text-center">
                <p className="text-gray-500 italic">Community statistics coming soon</p>
              </div>
            </div>
            <div className="relative h-96 rounded-2xl overflow-hidden shadow-2xl">
              <Image
                src="https://images.pexels.com/photos/2533092/pexels-photo-2533092.jpeg?auto=compress&cs=tinysrgb&w=800"
                alt="VW campervan at green coastal cliffs"
                fill
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-gray-50">
        <div className="container-md">
          <div className="text-center mb-16">
            <span className="text-light-blue font-semibold text-sm uppercase tracking-wide">Simple Process</span>
            <h2 className="text-3xl md:text-4xl font-bold mt-2">How Proper Place Works</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white rounded-2xl p-8 shadow-md hover:shadow-lg transition-shadow">
              <div className="w-14 h-14 bg-light-blue text-white rounded-xl flex items-center justify-center text-2xl font-bold mb-6">
                1
              </div>
              <h3 className="text-xl font-bold mb-3">Download the App</h3>
              <p className="text-gray-600 leading-relaxed">
                Get Proper Place from the App Store or Google Play. Create your free account in under a minute.
              </p>
            </div>
            
            <div className="bg-white rounded-2xl p-8 shadow-md hover:shadow-lg transition-shadow">
              <div className="w-14 h-14 bg-light-blue text-white rounded-xl flex items-center justify-center text-2xl font-bold mb-6">
                2
              </div>
              <h3 className="text-xl font-bold mb-3">Browse Locations</h3>
              <p className="text-gray-600 leading-relaxed">
                Explore our map of verified hosts across the UK. Filter by price, amenities, and location type to find your ideal stay.
              </p>
            </div>
            
            <div className="bg-white rounded-2xl p-8 shadow-md hover:shadow-lg transition-shadow">
              <div className="w-14 h-14 bg-light-blue text-white rounded-xl flex items-center justify-center text-2xl font-bold mb-6">
                3
              </div>
              <h3 className="text-xl font-bold mb-3">Book & Stay</h3>
              <p className="text-gray-600 leading-relaxed">
                Request to book directly through the app. Communicate with hosts, pay securely, and enjoy your stay.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* For Travellers */}
      <section className="py-20 bg-white">
        <div className="container-md">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="relative h-96 rounded-2xl overflow-hidden shadow-2xl order-2 lg:order-1">
              <Image
                src="https://images.unsplash.com/photo-1533745848184-3db07256e163?w=800&q=80"
                alt="Motorhome parked in beautiful countryside"
                fill
                className="object-cover"
              />
            </div>
            <div className="order-1 lg:order-2">
              <span className="text-light-blue font-semibold text-sm uppercase tracking-wide">For Travellers</span>
              <h2 className="text-3xl md:text-4xl font-bold mt-2 mb-6">
                Adventure Without the Premium Price
              </h2>
              <ul className="space-y-4">
                <li className="flex items-start gap-4">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-semibold text-lg">Affordable Nightly Rates</h4>
                    <p className="text-gray-600">Stays from just £10-15 per night — a fraction of traditional campsite fees</p>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-semibold text-lg">Unique Locations</h4>
                    <p className="text-gray-600">Discover hidden gems: farms, vineyards, coastal spots, and countryside retreats</p>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-semibold text-lg">Verified & Safe</h4>
                    <p className="text-gray-600">All locations reviewed and rated by the motorhome community</p>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-semibold text-lg">Route Planning</h4>
                    <p className="text-gray-600">Plan your journey with stopovers perfectly spaced along your route</p>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* For Hosts */}
      <section className="py-20 bg-gray-50">
        <div className="container-md">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="text-light-blue font-semibold text-sm uppercase tracking-wide">For Landowners</span>
              <h2 className="text-3xl md:text-4xl font-bold mt-2 mb-6">
                Turn Your Land Into Extra Income
              </h2>
              <p className="text-gray-600 text-lg mb-8 leading-relaxed">
                Have unused land, a large garden, or farm space? Join hundreds of hosts earning extra income by welcoming respectful motorhome travellers.
              </p>
              <ul className="space-y-4 mb-8">
                <li className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-light-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700">Free to list your space</span>
                </li>
                <li className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-light-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700">You set your own prices and availability</span>
                </li>
                <li className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-light-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700">Secure payments directly to your account</span>
                </li>
                <li className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-light-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700">Meet interesting travellers from around the country</span>
                </li>
              </ul>
              <Link href="/become-host" className="btn-primary inline-block">
                Learn More About Hosting
              </Link>
            </div>
            <div className="relative h-96 rounded-2xl overflow-hidden shadow-2xl">
              <Image
                src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&q=80"
                alt="Beautiful farmland with rolling hills"
                fill
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-white">
        <div className="container-md">
          <div className="text-center">
            <span className="text-light-blue font-semibold text-sm uppercase tracking-wide">Community</span>
            <h2 className="text-3xl md:text-4xl font-bold mt-2 mb-8">What Our Users Say</h2>
            <div className="bg-gray-50 rounded-2xl p-12 max-w-2xl mx-auto">
              <p className="text-gray-500 italic text-lg">Community reviews coming soon</p>
              <p className="text-gray-400 mt-4">Be one of the first to share your experience with Proper Place</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA - Download App */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1527786356703-4b100091cd2c?w=1920&q=80"
            alt="Campervan parked by the seaside"
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-dark-bg/80"></div>
        </div>
        <div className="relative container-md text-center text-white">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            Start Your Next Adventure Today
          </h2>
          <p className="text-xl text-gray-300 mb-10 max-w-2xl mx-auto">
            Join thousands of motorhome travellers discovering affordable, unique places to stay across the UK.
          </p>
          
          {/* App Download Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <a 
              href="#" 
              className="inline-flex items-center gap-3 bg-white hover:bg-gray-100 text-gray-900 px-8 py-4 rounded-xl transition-colors"
            >
              <svg className="w-10 h-10" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
              </svg>
              <div className="text-left">
                <div className="text-xs text-gray-500">Download on the</div>
                <div className="text-xl font-semibold">App Store</div>
              </div>
            </a>
            <a 
              href="#" 
              className="inline-flex items-center gap-3 bg-white hover:bg-gray-100 text-gray-900 px-8 py-4 rounded-xl transition-colors"
            >
              <svg className="w-10 h-10" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>
              </svg>
              <div className="text-left">
                <div className="text-xs text-gray-500">Get it on</div>
                <div className="text-xl font-semibold">Google Play</div>
              </div>
            </a>
          </div>
          
          <p className="text-gray-400">
            Free to download • No hidden fees
          </p>
        </div>
      </section>
    </main>
  );
}
