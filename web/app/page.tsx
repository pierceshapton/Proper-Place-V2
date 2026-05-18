import Image from 'next/image';
import Link from 'next/link';
import { Metadata } from 'next';
import { getCmsContent, c } from '@/lib/cms';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Proper Place — The UK's answer to Europe's Aires",
  description: 'Proper Place connects campers with pubs, farms and small businesses who host them overnight on land they already have. Starting in the South West. From £5 a night.',
  keywords: [
    'motorhome overnight stays UK',
    'campervan parking sites',
    'aires UK equivalent',
    'motorhome stopover UK',
    'farm stays for motorhomes',
    'UK campervan stops South West',
    'motorhome stopovers England',
    'affordable motorhome sites',
    'campervan overnight parking South West',
  ],
  openGraph: {
    title: "Proper Place — The UK's answer to Europe's Aires",
    description: 'Simple, legal overnight motorhome stops hosted by pubs, farms and small businesses. Starting in Cornwall, Devon, Somerset and Dorset.',
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

      {/* HERO */}
      <section className="relative min-h-screen flex items-center overflow-hidden bg-dark-bg">
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1523987355523-c7b5b0dd90a7?w=1920&q=80"
            alt="A motorhome parked in the British countryside at golden hour"
            fill
            className="object-cover opacity-50"
            priority
          />
        </div>
        <div className="absolute inset-0 bg-dark-bg/50" />
        <div className="relative container-md py-24 lg:py-32">
          <p className="text-xs tracking-[0.22em] uppercase text-light-blue mb-6">
            Starting in the South West · Cornwall · Devon · Somerset · Dorset
          </p>
          <h1 className="text-5xl md:text-7xl font-bold text-white leading-[1.05] tracking-tight max-w-4xl mb-8">
            {c(cms, 'homepage.hero.title', "The UK's answer to Europe's Aires.")}
          </h1>
          <p className="text-lg md:text-xl text-gray-300 max-w-xl leading-relaxed mb-10">
            {c(cms, 'homepage.hero.subtitle', "Simple, legal overnight stops hosted by pubs, farms and small businesses — earning from space they already have. You set the price. You set the rules.")}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <Link href="/auth/signup?type=host" className="inline-flex items-center justify-center gap-2 bg-light-blue hover:bg-accent-blue text-white px-8 py-4 rounded-xl font-semibold transition-colors text-base">
              Create a host account
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
            </Link>
            <Link href="/auth/signup?type=camper" className="inline-flex items-center justify-center gap-2 border-2 border-white/40 text-white hover:border-white px-8 py-4 rounded-xl font-semibold transition-colors text-base">
              Sign up as a camper
            </Link>
          </div>
          <p className="text-gray-400 text-sm">
            Already with us?{' '}
            <Link href="/auth/login" className="text-white underline underline-offset-4 hover:text-light-blue transition-colors">Sign in</Link>
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-6 pt-10 border-t border-white/15">
            <a href="https://apps.apple.com/gb/app/proper-place/id6759215166" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
              Download iOS app
            </a>
            <span className="text-sm text-gray-600">Android coming soon</span>
          </div>
        </div>
      </section>

      {/* WHAT IS PROPER PLACE */}
      <section className="py-24 bg-white">
        <div className="container-md">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            <div className="lg:col-span-5">
              <p className="text-xs tracking-[0.22em] uppercase text-light-blue mb-4">{c(cms, 'homepage.about.eyebrow', 'What is Proper Place')}</p>
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight tracking-tight mb-6">
                {c(cms, 'homepage.about.title', 'A proper place to stay. A proper way to earn.')}
              </h2>
              <p className="text-gray-600 text-lg leading-relaxed mb-6">
                {c(cms, 'homepage.about.body1', "In Europe, Aires give motorhomers simple, affordable overnight stops hosted by towns and businesses. The UK has never had an equivalent — until now.")}
              </p>
              <p className="text-gray-600 text-lg leading-relaxed mb-10">
                {c(cms, 'homepage.about.body2', "Proper Place is a simple, legal way for pubs, farms and small businesses to host campers overnight — earning from a car park, paddock or yard they already have. We're starting in the South West and growing region by region.")}
              </p>
              <div className="flex flex-wrap gap-6 text-sm">
                <Link href="/auth/signup?type=host" className="inline-flex items-center gap-2 font-semibold text-gray-900 hover:text-light-blue transition-colors">
                  For hosts <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                </Link>
                <Link href="/auth/signup?type=camper" className="inline-flex items-center gap-2 font-semibold text-gray-900 hover:text-light-blue transition-colors">
                  For campers <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                </Link>
                <a href="https://apps.apple.com/gb/app/proper-place/id6759215166" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 font-semibold text-gray-500 hover:text-light-blue transition-colors">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
                  iOS app
                </a>
              </div>
            </div>
            <div className="lg:col-span-7 grid grid-cols-2 gap-4">
              <div className="relative aspect-[4/5] rounded-xl overflow-hidden">
                <Image src="https://images.unsplash.com/photo-1523987355523-c7b5b0dd90a7?w=800&q=80" alt="Motorhome parked at scenic location" fill className="object-cover" />
              </div>
              <div className="relative aspect-[4/5] rounded-xl overflow-hidden mt-8">
                <Image src="/images/IMG_1650.jpeg" alt="Motorhome parked among daffodils at dusk" fill className="object-cover" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOR HOSTS */}
      <section className="py-24 bg-gray-50">
        <div className="container-md">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-xs tracking-[0.22em] uppercase text-light-blue mb-4">{c(cms, 'homepage.hosts.eyebrow', 'For pubs, farms & small businesses')}</p>
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight tracking-tight mb-6">
                {c(cms, 'homepage.hosts.title', 'Earn from space you already have.')}
              </h2>
              <p className="text-gray-600 text-lg leading-relaxed mb-8">
                {c(cms, 'homepage.hosts.body', "A pub car park after closing time, a quiet corner of the yard, a field that sits empty most of the year. Proper Place turns that space into a steady, simple income. Listing is free for our founding South West hosts.")}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-10">
                {[
                  { n: '01', title: 'Free to list', body: 'No monthly fee. Free for early hosts while we grow the network.' },
                  { n: '02', title: "You're in control", body: 'Set your own nightly rate from £5. Accept or decline any booking.' },
                  { n: '03', title: 'Verified campers', body: 'Every camper creates a verified account before they can book.' },
                  { n: '04', title: 'Direct payments', body: 'Payments go straight to your bank account after each stay.' },
                ].map((item) => (
                  <div key={item.n} className="flex gap-4">
                    <span className="text-xs font-bold tracking-widest text-light-blue pt-0.5 flex-shrink-0">{item.n}</span>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">{item.title}</h4>
                      <p className="text-gray-500 text-sm leading-relaxed">{item.body}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Link href="/auth/signup?type=host" className="inline-flex items-center gap-2 bg-light-blue hover:bg-accent-blue text-white px-8 py-4 rounded-xl font-semibold transition-colors">
                Create your host account
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
              </Link>
            </div>
            <div className="relative h-[520px] rounded-xl overflow-hidden shadow-2xl">
              <Image src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&q=80" alt="Beautiful farmland with rolling hills" fill className="object-cover" />
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-24 bg-dark-bg text-white">
        <div className="container-md">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center mb-16">
            <div>
              <p className="text-xs tracking-[0.22em] uppercase text-light-blue mb-4">{c(cms, 'homepage.how.eyebrow', 'How hosting works')}</p>
              <h2 className="text-4xl md:text-5xl font-bold text-white leading-tight tracking-tight">
                {c(cms, 'homepage.how.title', "Four steps. Then the kettle's on.")}
              </h2>
            </div>
            <p className="text-gray-400 text-lg leading-relaxed">
              {c(cms, 'homepage.how.body', "No jargon, no long contracts, no monthly fee. A clear path from idle land to a small, steady income — and campers who're glad to have found you.")}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { n: '01', title: c(cms, 'homepage.how.step1.title', 'List in ten minutes'), body: c(cms, 'homepage.how.step1.body', 'Sign up, add photos, set your nightly rate, and mark where campers park. We review it by hand before it goes live.') },
              { n: '02', title: c(cms, 'homepage.how.step2.title', 'Receive bookings'), body: c(cms, 'homepage.how.step2.body', 'Verified campers request to stay through the app or site. Accept, decline, or message them directly.') },
              { n: '03', title: c(cms, 'homepage.how.step3.title', 'Welcome and wave off'), body: c(cms, 'homepage.how.step3.body', 'They arrive, stay, and leave. You stay in charge of who, when, and how many.') },
              { n: '04', title: c(cms, 'homepage.how.step4.title', 'Get paid, directly'), body: c(cms, 'homepage.how.step4.body', 'Payment is taken at booking and released to your bank after the stay. No invoices, no chasing.') },
            ].map((step) => (
              <div key={step.n} className="border-t border-white/15 pt-6">
                <span className="text-xs font-bold tracking-widest text-light-blue block mb-4">{step.n}</span>
                <h3 className="font-semibold text-white text-lg mb-3">{step.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOR CAMPERS */}
      <section className="py-24 bg-white">
        <div className="container-md">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="relative h-[480px] rounded-xl overflow-hidden shadow-2xl order-2 lg:order-1">
              <Image src="https://images.unsplash.com/photo-1533745848184-3db07256e163?w=800&q=80" alt="A motorhome parked in beautiful British countryside" fill className="object-cover" />
            </div>
            <div className="order-1 lg:order-2">
              <p className="text-xs tracking-[0.22em] uppercase text-light-blue mb-4">{c(cms, 'homepage.motorhomers.eyebrow', 'For campers')}</p>
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight tracking-tight mb-6">
                {c(cms, 'homepage.motorhomers.title', 'Real places. Real hosts. From £5 a night.')}
              </h2>
              <p className="text-gray-600 text-lg leading-relaxed mb-8">
                {c(cms, 'homepage.motorhomers.body', "Skip the lay-by lottery and full-price campsites. Create a free Proper Place account, browse verified stopovers across the South West, message the host, and book in a few taps.")}
              </p>
              <div className="grid grid-cols-3 gap-6 mb-10 py-8 border-t border-b border-gray-100">
                <div>
                  <p className="text-2xl font-bold text-gray-900">£5</p>
                  <p className="text-sm text-gray-500 mt-1">minimum per night</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">Free</p>
                  <p className="text-sm text-gray-500 mt-1">to create an account</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">Direct</p>
                  <p className="text-sm text-gray-500 mt-1">secure payments</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-4 mb-6">
                <Link href="/auth/signup?type=camper" className="inline-flex items-center gap-2 bg-light-blue hover:bg-accent-blue text-white px-8 py-4 rounded-xl font-semibold transition-colors">
                  Sign up to browse stays
                </Link>
                <Link href="/browse" className="inline-flex items-center gap-2 border-2 border-gray-200 text-gray-700 hover:border-light-blue hover:text-light-blue px-8 py-4 rounded-xl font-semibold transition-colors">
                  Browse the map
                </Link>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <a href="https://apps.apple.com/gb/app/proper-place/id6759215166" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm text-light-blue hover:text-accent-blue font-medium transition-colors">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
                  Download free iOS app
                </a>
                <span className="text-sm text-gray-400">· Android coming soon</span>
              </div>
            </div>
          </div>
        </div>
      </section>

            {/* FAQ */}
      <section className="py-24 bg-gray-50">
        <div className="container-md max-w-3xl mx-auto">
          <p className="text-xs tracking-[0.22em] uppercase text-light-blue mb-4">Questions, sensibly answered</p>
          <h2 className="text-4xl font-bold text-gray-900 mb-12 tracking-tight">Common questions</h2>
          <div className="space-y-8">
            {[
              { q: 'What is Proper Place?', a: "The UK's answer to Europe's Aires. We connect campers with pubs, farms and small businesses who host them overnight on land they already own." },
              { q: 'Where is Proper Place live?', a: "Cornwall, Devon, Somerset and Dorset to start — growing region by region. Hosts outside the South West can list now and we'll bring campers as we expand." },
              { q: 'How much does it cost to list?', a: "While we grow the network, listing is free for our early hosts. We take a small fee on each confirmed booking — so you only pay when you earn." },
              { q: "What's the minimum nightly rate?", a: "Bookings start from a minimum of £5 a night, and most pitches sit between £10 and £25 depending on location, view, and what's on offer." },
              { q: "Can I see who's booking?", a: "Yes. Every camper creates a verified Proper Place account before they can book. You see their profile and request details, and you can accept or decline any booking." },
              { q: 'Is there an app?', a: "Yes — the Proper Place app is live on the iOS App Store now. Android is coming soon." },
            ].map((faq, i) => (
              <div key={i} className="border-b border-gray-200 pb-6">
                <h3 className="text-gray-900 font-semibold text-lg mb-2">{faq.q}</h3>
                <p className="text-gray-600 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="relative py-32 overflow-hidden">
        <div className="absolute inset-0">
          <Image src="https://images.unsplash.com/photo-1527786356703-4b100091cd2c?w=1920&q=80" alt="Campervan parked by the seaside at sunset" fill className="object-cover" />
          <div className="absolute inset-0 bg-light-blue/90" />
        </div>
        <div className="relative container-md text-center text-white">
          <p className="text-xs tracking-[0.22em] uppercase text-white/70 mb-4">Ready when you are</p>
          <h2 className="text-4xl md:text-6xl font-bold leading-tight tracking-tight mb-6">
            {c(cms, 'homepage.cta.title', 'Your land has a quiet, useful job to do.')}
          </h2>
          <p className="text-xl text-white/80 mb-10 max-w-xl mx-auto leading-relaxed">
            {c(cms, 'homepage.cta.subtitle', 'Free for founding hosts. No monthly fees. UK-based support.')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10">
            <Link href="/auth/signup?type=host" className="inline-flex items-center justify-center gap-2 bg-white text-light-blue hover:bg-white/90 px-10 py-4 rounded-xl font-semibold transition-colors text-base">
              Create your host account
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
            </Link>
            <Link href="/auth/login" className="inline-flex items-center justify-center gap-2 border-2 border-white/40 text-white hover:border-white px-10 py-4 rounded-xl font-semibold transition-colors text-base">
              Sign in
            </Link>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-6 pt-8 border-t border-white/20">
            <a href="https://apps.apple.com/gb/app/proper-place/id6759215166" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm text-white/80 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
              Get the free iOS app
            </a>
            <span className="text-sm text-white/50">Android coming soon</span>
          </div>
        </div>
      </section>

    </main>
  );
}
