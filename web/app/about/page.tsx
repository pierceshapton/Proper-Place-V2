import Image from 'next/image';
import Link from 'next/link';

export const metadata = {
  title: 'About Us | Proper Place',
  description: 'Learn about Proper Place - connecting the motorhome community with affordable places to stay across the UK.',
};

export default function AboutPage() {
  return (
    <main>
      {/* Hero Section */}
      <section className="bg-dark-bg text-white py-20">
        <div className="container-md text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            About <span className="text-light-blue">Proper</span> Place
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            We're building a community that connects motorhome travellers with landowners offering unique, affordable overnight stays.
          </p>
        </div>
      </section>

      {/* Our Story */}
      <section className="py-20 bg-white">
        <div className="container-md">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="text-light-blue font-semibold text-sm uppercase tracking-wide">Our Story</span>
              <h2 className="text-3xl md:text-4xl font-bold mt-2 mb-6">
                Born from a Love of the Open Road
              </h2>
              <p className="text-gray-600 text-lg mb-6 leading-relaxed">
                Proper Place was founded by motorhome enthusiasts who understood the challenges of finding affordable, 
                legal, and welcoming places to stay. Traditional campsites can be expensive, crowded, and often lack 
                the character that makes a trip memorable.
              </p>
              <p className="text-gray-600 text-lg leading-relaxed">
                We envisioned a platform where landowners could share their beautiful spaces — farms, vineyards, 
                coastal spots, and countryside retreats — with respectful travellers looking for something different. 
                A place where both hosts and guests benefit from genuine community connections.
              </p>
            </div>
            <div className="relative h-96 rounded-2xl overflow-hidden shadow-2xl">
              <Image
                src="https://images.unsplash.com/photo-1523987355523-c7b5b0dd90a7?w=800&q=80"
                alt="Motorhome parked in scenic countryside"
                fill
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Our Mission */}
      <section className="py-20 bg-gray-50">
        <div className="container-md">
          <div className="text-center max-w-3xl mx-auto">
            <span className="text-light-blue font-semibold text-sm uppercase tracking-wide">Our Mission</span>
            <h2 className="text-3xl md:text-4xl font-bold mt-2 mb-6">
              Making Adventure Accessible
            </h2>
            <p className="text-gray-600 text-lg leading-relaxed">
              We believe that exploring the UK in a motorhome should be an affordable, enriching experience for everyone. 
              Our mission is to create a trusted community where travellers discover hidden gems and landowners 
              generate extra income while meeting interesting people from across the country.
            </p>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 bg-white">
        <div className="container-md">
          <div className="text-center mb-16">
            <span className="text-light-blue font-semibold text-sm uppercase tracking-wide">Our Values</span>
            <h2 className="text-3xl md:text-4xl font-bold mt-2">What We Stand For</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-8">
              <div className="w-16 h-16 bg-light-blue text-white rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-4a18.572 18.572 0 00-3.5 0" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3">Community</h3>
              <p className="text-gray-600">Building genuine connections between travellers and hosts who share a love for the great outdoors.</p>
            </div>
            
            <div className="text-center p-8">
              <div className="w-16 h-16 bg-light-blue text-white rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3">Trust & Safety</h3>
              <p className="text-gray-600">Every listing is verified and our community is built on mutual respect and transparent reviews.</p>
            </div>
            
            <div className="text-center p-8">
              <div className="w-16 h-16 bg-light-blue text-white rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3">Affordability</h3>
              <p className="text-gray-600">Quality stays shouldn't break the bank. We champion fair pricing that benefits both hosts and travellers.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-light-blue text-white">
        <div className="container-md text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Join the Proper Place Community
          </h2>
          <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
            Whether you're a traveller seeking adventure or a landowner with space to share, we'd love to have you.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/browse" className="btn-primary bg-white text-light-blue hover:bg-gray-100 px-8 py-3 rounded-xl font-semibold transition-colors">
              Explore Locations
            </Link>
            <Link href="/become-host" className="btn-secondary border-2 border-white text-white hover:bg-white hover:text-light-blue px-8 py-3 rounded-xl font-semibold transition-colors">
              Become a Host
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
