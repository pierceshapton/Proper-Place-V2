'use client';

export default function BecomeHostPage() {
  return (
    <main>
      {/* Hero Section */}
      <section className="bg-light-blue text-white py-16 md:py-24">
        <div className="container-md">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              Start Earning Today
            </h1>
            <p className="text-xl">
              List your space on Proper Place and start hosting memorable events
            </p>
          </div>
        </div>
      </section>

      {/* Steps Section */}
      <section className="section-padding">
        <div className="container-md">
          <h2 className="text-4xl font-bold mb-12 text-center">Getting Started is Easy</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            {[
              {
                step: 'Step 1',
                title: 'Create Your Account',
                desc: 'Sign up with your email or social media account'
              },
              {
                step: 'Step 2',
                title: 'List Your Space',
                desc: 'Add photos, description, and pricing for your venue'
              },
              {
                step: 'Step 3',
                title: 'Start Hosting',
                desc: 'Accept bookings and earn money from your space'
              },
            ].map((item, i) => (
              <div key={i} className="text-center">
                <div className="w-20 h-20 bg-light-blue text-white rounded-full flex items-center justify-center text-3xl font-bold mx-auto mb-6">
                  {i + 1}
                </div>
                <h3 className="text-2xl font-bold mb-3">{item.title}</h3>
                <p className="text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="text-center">
            <a href="/auth/signup" className="btn-primary px-8 py-3 text-lg">
              Create Host Account
            </a>
          </div>
        </div>
      </section>

      {/* Listing Requirements */}
      <section className="section-padding bg-light-gray">
        <div className="container-md max-w-3xl">
          <h2 className="text-4xl font-bold mb-12 text-center">What Makes a Great Listing?</h2>

          <div className="space-y-6">
            {[
              {
                title: '📸 High-Quality Photos',
                desc: 'Clear, well-lit photos of your space from different angles help guests understand what to expect'
              },
              {
                title: '✍️ Detailed Description',
                desc: 'Describe your space honestly, including amenities, capacity, and rules'
              },
              {
                title: '💰 Competitive Pricing',
                desc: 'Research similar venues in your area and set your rates accordingly'
              },
              {
                title: '📋 Clear Policies',
                desc: 'Set expectations for cancellation, guest behavior, and house rules'
              },
              {
                title: '🗺️ Accurate Location',
                desc: 'Include specific directions and public transit information'
              },
              {
                title: '⭐ Professional Info',
                desc: 'Ensure your profile is complete and you respond to inquiries quickly'
              },
            ].map((item, i) => (
              <div key={i} className="bg-white p-6 rounded-lg border border-border-gray">
                <h3 className="font-semibold text-xl mb-2">{item.title}</h3>
                <p className="text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Tips */}
      <section className="section-padding">
        <div className="container-md max-w-2xl">
          <h2 className="text-4xl font-bold mb-12 text-center">Pricing Your Space</h2>

          <div className="card p-8">
            <div className="space-y-4">
              <p className="text-gray-600">
                Here are some factors to consider when pricing your space:
              </p>
              <ul className="space-y-3">
                <li className="flex gap-3">
                  <span>📍</span>
                  <span><strong>Location:</strong> Premium locations command higher prices</span>
                </li>
                <li className="flex gap-3">
                  <span>👥</span>
                  <span><strong>Capacity:</strong> Larger spaces can accommodate bigger events</span>
                </li>
                <li className="flex gap-3">
                  <span>🎨</span>
                  <span><strong>Amenities:</strong> Unique features increase your venue's value</span>
                </li>
                <li className="flex gap-3">
                  <span>📅</span>
                  <span><strong>Demand:</strong> Adjust pricing based on seasonal demand</span>
                </li>
                <li className="flex gap-3">
                  <span>⭐</span>
                  <span><strong>Reviews:</strong> Highly-rated spaces justify premium pricing</span>
                </li>
              </ul>
            </div>

            <hr className="my-6 border-border-gray" />

            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">
                <strong>💡 Tip:</strong> Start with competitive pricing to get your first bookings and reviews, then adjust as you build your reputation.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-dark-bg text-white py-16">
        <div className="container-md text-center">
          <h2 className="text-4xl font-bold mb-6">Ready to Start Hosting?</h2>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Join thousands of hosts who are earning money by sharing their unique spaces
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <a href="/auth/signup" className="btn-primary px-8 py-3">
              Create Host Account
            </a>
            <a href="/contact-host" className="btn-secondary px-8 py-3 bg-white text-dark-bg border-white">
              Inquire About Hosting
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
