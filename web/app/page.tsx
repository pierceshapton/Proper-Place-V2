'use client';

import { useState } from 'react';

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <main>
      {/* Hero Section */}
      <section className="bg-dark-bg text-white py-20 md:py-32">
        <div className="container-md">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              Find Your Perfect Venue
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 mb-8">
              Discover unique spaces to host events, gatherings, and unforgettable moments
            </p>
            
            {/* Search Bar */}
            <div className="flex gap-3 mb-8 flex-col md:flex-row">
              <input
                type="text"
                placeholder="Search venues by location or type..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 px-6 py-4 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-light-blue"
              />
              <button className="btn-primary px-8">
                Search
              </button>
            </div>

            <div className="flex gap-4 flex-wrap justify-center text-sm">
              <span className="bg-gray-700 px-4 py-2 rounded-full">🎉 Events</span>
              <span className="bg-gray-700 px-4 py-2 rounded-full">📸 Photoshoots</span>
              <span className="bg-gray-700 px-4 py-2 rounded-full">🎓 Celebrations</span>
              <span className="bg-gray-700 px-4 py-2 rounded-full">💼 Meetings</span>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Venues - Placeholder */}
      <section className="section-padding bg-light-gray">
        <div className="container-md">
          <h2 className="text-4xl font-bold mb-12 text-center">Featured Venues</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="card card-hover">
                <div className="bg-gray-300 h-48 rounded-t-lg"></div>
                <div className="p-6">
                  <h3 className="text-xl font-semibold mb-2">Venue {i}</h3>
                  <p className="text-gray-600 mb-4">Beautiful location perfect for your event</p>
                  <div className="flex justify-between items-center">
                    <span className="text-2xl font-bold text-light-blue">$500</span>
                    <button className="btn-primary btn-small">View Details</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="section-padding">
        <div className="container-md">
          <h2 className="text-4xl font-bold mb-12 text-center">How It Works</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              { step: '1', title: 'Browse', desc: 'Explore unique venues in your area' },
              { step: '2', title: 'Book', desc: 'Select dates and complete your booking' },
              { step: '3', title: 'Confirm', desc: 'Chat with the host and confirm details' },
              { step: '4', title: 'Enjoy', desc: 'Have an amazing event at your venue' },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-16 h-16 bg-light-blue text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                <p className="text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA - Become a Host */}
      <section className="bg-light-blue text-white py-16 px-6">
        <div className="container-md">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold mb-6">Ready to Host?</h2>
              <p className="text-lg mb-8 text-blue-100">
                List your space and start earning money by hosting unforgettable events. It's easy, safe, and rewarding.
              </p>
              <ul className="space-y-3 mb-8 text-blue-100">
                <li>✓ 100% free to list your space</li>
                <li>✓ Secure payment system</li>
                <li>✓ Complete control over your availability</li>
                <li>✓ Professional verification</li>
              </ul>
              <a href="/become-host" className="btn-secondary inline-block bg-white text-light-blue border-white hover:bg-gray-100">
                Get Started as a Host
              </a>
            </div>
            <div className="bg-blue-400 rounded-lg h-80"></div>
          </div>
        </div>
      </section>
    </main>
  );
}
