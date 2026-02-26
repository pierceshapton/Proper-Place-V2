'use client';

import Image from 'next/image';

export default function BecomeHostPage() {
  return (
    <main className="bg-cream">
      {/* Hero Section */}
      <section className="relative bg-dark-bg text-white py-20 md:py-28 overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1920&q=80"
            alt="Beautiful farmland"
            fill
            className="object-cover opacity-30"
            priority
          />
        </div>
        <div className="relative container-md">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Turn Your Land Into Extra Income
            </h1>
            <p className="text-xl text-gray-200">
              Welcome motorhome travellers to your farm, garden, or land and earn money from unused space.
            </p>
          </div>
        </div>
      </section>

      {/* Steps Section */}
      <section className="py-20 bg-cream">
        <div className="container-md">
          <h2 className="text-3xl md:text-4xl font-bold mb-12 text-center">Getting Started is Easy</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            {[
              {
                title: 'Create Your Account',
                desc: 'Sign up for free and verify your identity to become a trusted host'
              },
              {
                title: 'List Your Space',
                desc: 'Add photos of your land, set your price, availability, and any rules'
              },
              {
                title: 'Welcome Guests',
                desc: 'Accept booking requests and host respectful motorhome travellers'
              },
            ].map((item, i) => (
              <div key={i} className="text-center">
                <div className="w-20 h-20 bg-light-blue text-white rounded-full flex items-center justify-center text-3xl font-bold mx-auto mb-6">
                  {i + 1}
                </div>
                <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                <p className="text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="text-center">
            <a href="/auth/signup" className="btn-primary px-8 py-3 text-lg rounded-xl">
              Create Host Account
            </a>
          </div>
        </div>
      </section>

      {/* What You Can Offer */}
      <section className="py-20 bg-white">
        <div className="container-md">
          <h2 className="text-3xl md:text-4xl font-bold mb-12 text-center">What Spaces Work Well?</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                title: 'Farmland',
                desc: 'A quiet corner of your farm is perfect for travellers seeking rural tranquility'
              },
              {
                title: 'Large Gardens',
                desc: 'Private driveways or spacious gardens make excellent overnight stops'
              },
              {
                title: 'Vineyards & Orchards',
                desc: 'Scenic locations are highly sought after by motorhome enthusiasts'
              },
              {
                title: 'Coastal Land',
                desc: 'Spots with sea views or near beaches attract premium bookings'
              },
              {
                title: 'Woodland Areas',
                desc: 'Peaceful forest settings offer a unique camping experience'
              },
              {
                title: 'Pub Car Parks',
                desc: 'Pubs with spare parking can offer stays with easy access to refreshments'
              },
            ].map((item, i) => (
              <div key={i} className="bg-cream p-6 rounded-2xl shadow-md hover:shadow-lg transition-shadow">
                <h3 className="font-bold text-lg mb-2">{item.title}</h3>
                <p className="text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 bg-cream">
        <div className="container-md">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="text-light-blue font-semibold text-sm uppercase tracking-wide">Why Host?</span>
              <h2 className="text-3xl md:text-4xl font-bold mt-2 mb-6">
                Benefits of Becoming a Host
              </h2>
              <ul className="space-y-4">
                <li className="flex items-start gap-4">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-semibold text-lg">Free to List</h4>
                    <p className="text-gray-600">No upfront costs or subscription fees. We only take a small commission when you earn.</p>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-semibold text-lg">You're in Control</h4>
                    <p className="text-gray-600">Set your own prices, availability, and house rules. Accept or decline any booking.</p>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-semibold text-lg">Secure Payments</h4>
                    <p className="text-gray-600">Payments are processed securely and transferred directly to your bank account.</p>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-semibold text-lg">Meet Interesting People</h4>
                    <p className="text-gray-600">Motorhome travellers are typically respectful, self-sufficient guests who love exploring.</p>
                  </div>
                </li>
              </ul>
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

      {/* Tips for Success */}
      <section className="py-20 bg-white">
        <div className="container-md max-w-3xl">
          <h2 className="text-3xl md:text-4xl font-bold mb-12 text-center">Tips for a Great Listing</h2>

          <div className="space-y-4">
            {[
              {
                title: 'Quality Photos',
                desc: 'Show clear photos of the parking area, surroundings, and any amenities you offer'
              },
              {
                title: 'Accurate Location',
                desc: 'Provide precise directions and landmarks so guests can find you easily'
              },
              {
                title: 'Fair Pricing',
                desc: 'Most hosts charge £10-20 per night. Research similar listings in your area'
              },
              {
                title: 'Clear Rules',
                desc: 'Set expectations about arrival times, quiet hours, and what facilities are available'
              },
              {
                title: 'Quick Responses',
                desc: 'Respond to booking requests promptly to improve your acceptance rate'
              },
              {
                title: 'Great Service',
                desc: 'A friendly welcome and helpful local tips lead to glowing reviews'
              },
            ].map((item, i) => (
              <div key={i} className="bg-cream p-6 rounded-xl border border-gray-200">
                <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                <p className="text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-dark-bg text-white py-20">
        <div className="container-md text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to Start Hosting?</h2>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Join the Proper Place community and start earning from your unused land.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <a href="/auth/signup" className="bg-light-blue hover:bg-accent-blue text-white px-8 py-3 rounded-xl font-semibold transition-colors inline-flex items-center justify-center">
              Create Host Account
            </a>
            <a href="/contact-host" className="border-2 border-white text-white hover:bg-white hover:text-dark-bg px-8 py-3 rounded-xl font-semibold transition-colors inline-flex items-center justify-center">
              Ask a Question
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
