import Image from 'next/image';
import Link from 'next/link';
import { Metadata } from 'next';
import { getCmsContent, c } from '@/lib/cms';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Proper Place - Affordable Motorhome Overnight Stays UK',
  description: 'Find affordable overnight motorhome stays across the UK. Proper Place connects motorhome owners with landowners offering unique farm stays, coastal spots & countryside retreats from £10/night. Browse places and book online today.',
  keywords: [
    'motorhome overnight stays UK',
    'campervan parking sites',
    'cheap motorhome camping',
    'farm stays for motorhomes',
    'UK campervan stops',
    'motorhome stopovers England',
    'affordable motorhome sites'
  ],
  openGraph: {
    title: 'Proper Place - Affordable Motorhome Overnight Stays UK',
    description: 'Find affordable overnight motorhome stays across the UK. Farm stays, coastal spots & countryside retreats from £10/night.',
    url: 'https://proper-place.co.uk',
  },
  alternates: {
    canonical: 'https://proper-place.co.uk',
  },
};

export default async function Home() {
  const cms = await getCmsContent();

  return (
    <main>
      {/* Opening Soon Banner */}
      <div className="bg-light-blue px-4 min-h-[52px] flex items-center justify-center text-center">
        <p className="text-white text-sm md:text-base font-medium leading-tight relative top-[1px]">
          Proper Place is opening soon for campervan owners looking for safe, affordable and reliable overnight parking across the UK.
        </p>
      </div>

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
              {c(cms, 'homepage.hero.title', 'Connecting the motorhome community with a Proper Place to stay the night')}
            </h1>
            <p className="text-xl md:text-2xl text-gray-200 mb-8 leading-relaxed">
              {c(cms, 'homepage.hero.subtitle', 'Discover unique, budget-friendly Proper Places across the UK. From scenic farmland to coastal retreats — find your perfect stay.')}
            </p>
            
            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <Link href="/browse" className="inline-flex items-center gap-3 bg-light-blue hover:bg-accent-blue text-white px-8 py-4 rounded-xl font-semibold transition-colors text-lg">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                Browse Places
              </Link>
              <Link href="/auth/signup" className="inline-flex items-center gap-3 border-2 border-white text-white hover:bg-white hover:text-dark-bg px-8 py-4 rounded-xl font-semibold transition-colors text-lg">
                Create Free Account
              </Link>
            </div>

            <p className="text-gray-400 text-sm">
              {c(cms, 'homepage.hero.note', 'Free to use · No hidden fees · Also available on iOS and Android')}
            </p>
          </div>
        </div>
      </section>

      {/* What is Proper Place */}
      <section className="py-20 bg-white">
        <div className="container-md">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="text-light-blue font-semibold text-sm uppercase tracking-wide">
                {c(cms, 'homepage.about.eyebrow', 'About Proper Place')}
              </span>
              <h2 className="text-3xl md:text-4xl font-bold mt-2 mb-6">
                {c(cms, 'homepage.about.title', "The motorhome community's trusted companion")}
              </h2>
              <p className="text-gray-600 text-lg mb-6 leading-relaxed">
                {c(cms, 'homepage.about.body1', "Proper Place connects motorhome owners with landowners offering affordable overnight stays. Whether you're seeking a peaceful farm setting, a coastal view, or a convenient stopover, our community makes finding your next adventure simple.")}
              </p>
              <p className="text-gray-600 text-lg mb-8 leading-relaxed">
                {c(cms, 'homepage.about.body2', "No more expensive campsites or uncertain wild camping. Our verified hosts offer safe, legal, and welcoming places for motorhome owners at prices that won't break the bank.")}
              </p>
              <div className="bg-gray-100 rounded-xl p-6 text-center">
                <p className="text-gray-500 italic">Community statistics coming soon</p>
              </div>
            </div>
            <div className="relative h-96 rounded-2xl overflow-hidden shadow-2xl">
              <Image
                src="/images/IMG_1650.jpeg"
                alt="Motorhome parked among daffodils at dusk"
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
            <span className="text-light-blue font-semibold text-sm uppercase tracking-wide">
              {c(cms, 'homepage.how.eyebrow', 'Simple Process')}
            </span>
            <h2 className="text-3xl md:text-4xl font-bold mt-2">
              {c(cms, 'homepage.how.title', 'How Proper Place works')}
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white rounded-2xl p-8 shadow-md hover:shadow-lg transition-shadow">
              <div className="w-14 h-14 bg-light-blue text-white rounded-xl flex items-center justify-center text-2xl font-bold mb-6">
                1
              </div>
              <h3 className="text-xl font-bold mb-3">{c(cms, 'homepage.how.step1.title', 'Create an Account')}</h3>
              <p className="text-gray-600 leading-relaxed">
                {c(cms, 'homepage.how.step1.body', 'Sign up for free on our website or app. Create your account in under a minute.')}
              </p>
            </div>
            
            <div className="bg-white rounded-2xl p-8 shadow-md hover:shadow-lg transition-shadow">
              <div className="w-14 h-14 bg-light-blue text-white rounded-xl flex items-center justify-center text-2xl font-bold mb-6">
                2
              </div>
              <h3 className="text-xl font-bold mb-3">{c(cms, 'homepage.how.step2.title', 'Find a Proper Place')}</h3>
              <p className="text-gray-600 leading-relaxed">
                {c(cms, 'homepage.how.step2.body', 'Explore our map of verified hosts across the UK. Filter by price, amenities, and type to find your ideal stay.')}
              </p>
            </div>
            
            <div className="bg-white rounded-2xl p-8 shadow-md hover:shadow-lg transition-shadow">
              <div className="w-14 h-14 bg-light-blue text-white rounded-xl flex items-center justify-center text-2xl font-bold mb-6">
                3
              </div>
              <h3 className="text-xl font-bold mb-3">{c(cms, 'homepage.how.step3.title', 'Book & Stay')}</h3>
              <p className="text-gray-600 leading-relaxed">
                {c(cms, 'homepage.how.step3.body', 'Request to book directly online or in the app. Communicate with hosts, pay securely, and enjoy your stay.')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* For Motorhomers */}
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
              <span className="text-light-blue font-semibold text-sm uppercase tracking-wide">
                {c(cms, 'homepage.motorhomers.eyebrow', 'For Motorhomers')}
              </span>
              <h2 className="text-3xl md:text-4xl font-bold mt-2 mb-6">
                {c(cms, 'homepage.motorhomers.title', 'Adventure without the premium price')}
              </h2>
              <ul className="space-y-4">
                <li className="flex items-start gap-4">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-semibold text-lg">{c(cms, 'homepage.motorhomers.item1.title', 'Affordable Nightly Rates')}</h4>
                    <p className="text-gray-600">{c(cms, 'homepage.motorhomers.item1.body', 'Stays from just £10-15 per night — a fraction of traditional campsite fees')}</p>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-semibold text-lg">{c(cms, 'homepage.motorhomers.item2.title', 'Unique Proper Places')}</h4>
                    <p className="text-gray-600">{c(cms, 'homepage.motorhomers.item2.body', 'Discover hidden gems: farms, vineyards, coastal spots, and countryside retreats')}</p>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-semibold text-lg">{c(cms, 'homepage.motorhomers.item3.title', 'Verified & Safe')}</h4>
                    <p className="text-gray-600">{c(cms, 'homepage.motorhomers.item3.body', 'All Proper Places are reviewed by our admin teams and rated by the people who have stayed')}</p>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-semibold text-lg">{c(cms, 'homepage.motorhomers.item4.title', 'Route Planning')}</h4>
                    <p className="text-gray-600">{c(cms, 'homepage.motorhomers.item4.body', 'Plan your journey with stopovers perfectly spaced along your route')}</p>
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
              <span className="text-light-blue font-semibold text-sm uppercase tracking-wide">
                {c(cms, 'homepage.hosts.eyebrow', 'For Landowners')}
              </span>
              <h2 className="text-3xl md:text-4xl font-bold mt-2 mb-6">
                {c(cms, 'homepage.hosts.title', 'Turn your land into extra income')}
              </h2>
              <p className="text-gray-600 text-lg mb-8 leading-relaxed">
                {c(cms, 'homepage.hosts.body', 'Have unused land, a large garden, or farm space? Join hundreds of hosts earning extra income by welcoming respectful motorhome guests.')}
              </p>
              <ul className="space-y-4 mb-8">
                {(['homepage.hosts.item1', 'homepage.hosts.item2', 'homepage.hosts.item3', 'homepage.hosts.item4'] as const).map((key, i) => (
                  <li key={key} className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-light-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-gray-700">
                      {c(cms, key, ['Free to list your space', 'You set your own prices and availability', 'Secure payments directly to your account', 'Meet interesting people from around the country'][i])}
                    </span>
                  </li>
                ))}
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
            <h2 className="text-3xl md:text-4xl font-bold mt-2 mb-8">What our users say</h2>
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
            {c(cms, 'homepage.cta.title', 'Start your next adventure today')}
          </h2>
          <p className="text-xl text-gray-300 mb-10 max-w-2xl mx-auto">
            {c(cms, 'homepage.cta.subtitle', 'Join thousands of motorhome owners discovering affordable, unique places to stay across the UK.')}
          </p>
          
          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Link href="/browse" className="inline-flex items-center justify-center gap-3 bg-light-blue hover:bg-accent-blue text-white px-10 py-4 rounded-xl font-semibold transition-colors text-lg">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              Browse Places
            </Link>
            <Link href="/become-host" className="inline-flex items-center justify-center gap-3 border-2 border-white text-white hover:bg-white hover:text-dark-bg px-10 py-4 rounded-xl font-semibold transition-colors text-lg">
              Become a Host
            </Link>
          </div>
          
          <p className="text-gray-400">
            Free to use • No hidden fees
          </p>
        </div>
      </section>
    </main>
  );
}
