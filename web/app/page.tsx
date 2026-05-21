import Image from 'next/image';
import Link from 'next/link';
import { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Proper Place — The UK\'s answer to Europe\'s Aires",
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
    title: "Proper Place — The UK\'s answer to Europe\'s Aires",
    description: 'Simple, legal overnight motorhome stops hosted by pubs, farms and small businesses. Starting in Cornwall, Devon, Somerset and Dorset.',
    url: 'https://proper-place.co.uk',
  },
  alternates: {
    canonical: 'https://proper-place.co.uk',
  },
};

const ArrowIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
  </svg>
);

const AppleIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
  </svg>
);

export default function Home() {
  return (
    <main>

      {/* ─── HERO ─────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center overflow-hidden bg-dark-bg -mt-16">
        <div className="absolute inset-0">
          <Image
            src="/images/hero-campervan.jpg"
            alt="A motorhome parked in the British countryside"
            fill
            className="object-cover opacity-50"
            priority
          />
        </div>
        <div className="absolute inset-0 bg-dark-bg/50" />
        <div className="relative container-md py-24 lg:py-32">
          <p className="text-xs tracking-[0.22em] uppercase text-light-blue mb-6">
            Starting in the South West
          </p>
          <h1 className="font-editorial text-5xl md:text-[5.5rem] font-bold text-white leading-[1.02] max-w-3xl mb-8">
            The UK&apos;s answer to<br />
            <span className="text-light-blue">Europe&apos;s Aires.</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-300 max-w-xl leading-relaxed mb-10">
            Simple, legal overnight stops for motorhomes — hosted by pubs, farms and small businesses earning from space they already have.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <Link href="/auth/signup?type=host" className="inline-flex items-center justify-center gap-2 bg-white hover:bg-gray-100 text-gray-900 px-8 py-4 rounded-xl font-semibold transition-colors text-base">
              Become a host <ArrowIcon />
            </Link>
            <Link href="/browse" className="inline-flex items-center justify-center gap-2 border-2 border-white/40 text-white hover:border-white px-8 py-4 rounded-xl font-semibold transition-colors text-base">
              Find a place to stay
            </Link>
          </div>
          <p className="text-gray-400 text-sm">
            Already with us?{' '}
            <Link href="/auth/login" className="text-white underline underline-offset-4 hover:text-light-blue transition-colors">Sign in</Link>
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-6 pt-10 border-t border-white/15">
            <a href="https://apps.apple.com/gb/app/proper-place/id6759215166" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors">
              <AppleIcon className="w-5 h-5" /> Download the iOS app
            </a>
            <span className="text-sm text-gray-600">Android coming soon</span>
          </div>
        </div>
      </section>

      {/* ─── WHAT IS PROPER PLACE ─────────────────────────────────────── */}
      <section className="py-24 bg-cream">
        <div className="container-md">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 mb-20">
            <div className="lg:col-span-7">
              <h2 className="font-editorial text-4xl md:text-6xl font-bold text-gray-900 leading-[1.05]">
                Drive across France and you&apos;ll find a quiet pitch in almost every village.
              </h2>
            </div>
            <div className="lg:col-span-5 flex flex-col justify-end">
              <p className="text-gray-700 text-lg leading-relaxed mb-4">
                Proper Place is the UK&apos;s answer to Europe&apos;s Aires — simple, legal, overnight stops hosted by pubs, farms and small businesses who earn from space they already have.
              </p>
              <p className="text-gray-500 text-base leading-relaxed mb-8">
                Built in Bristol. Starting in Cornwall, Devon, Somerset and Dorset. Growing region by region as our host network expands.
              </p>
              <div className="flex flex-wrap items-center gap-6 text-sm">
                <Link href="/auth/signup?type=host" className="inline-flex items-center gap-2 font-semibold text-gray-900 hover:text-light-blue transition-colors">
                  For hosts <ArrowIcon />
                </Link>
                <Link href="/auth/signup?type=camper" className="inline-flex items-center gap-2 font-semibold text-gray-900 hover:text-light-blue transition-colors">
                  For campers <ArrowIcon />
                </Link>
                <a href="https://apps.apple.com/gb/app/proper-place/id6759215166" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 font-semibold text-gray-500 hover:text-light-blue transition-colors">
                  <AppleIcon className="w-4 h-4" /> iOS app
                </a>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 md:gap-5">
            <div className="relative aspect-[4/5] rounded-lg overflow-hidden">
              <Image src="https://images.unsplash.com/photo-1523987355523-c7b5b0dd90a7?w=600&q=80" alt="Motorhome parked at a coastal location in the South West" fill className="object-cover" />
            </div>
            <div className="relative aspect-[4/5] rounded-lg overflow-hidden">
              <Image src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600&q=80" alt="Rolling English countryside" fill className="object-cover" />
            </div>
            <div className="relative aspect-[4/5] rounded-lg overflow-hidden">
              <Image src="/images/IMG_1650.jpeg" alt="Motorhome parked among daffodils at dusk" fill className="object-cover" />
            </div>
          </div>
        </div>
      </section>

      {/* ─── FOR HOSTS ────────────────────────────────────────────────── */}
      <section className="py-24 bg-cream border-t border-gray-200">
        <div className="container-md">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <p className="text-xs tracking-[0.22em] uppercase text-light-blue mb-4">For pubs, farms &amp; small businesses</p>
            <h2 className="font-editorial text-4xl md:text-6xl font-bold text-gray-900 leading-tight mb-6">
              Earn from space<br />you already have.
            </h2>
            <p className="text-gray-600 text-lg leading-relaxed">
              A pub car park after closing, a quiet paddock, a corner of the yard. Set your nightly rate from £5 upwards, and we handle bookings, payments and support.
            </p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 border border-gray-200 rounded-xl overflow-hidden mb-12">
            {([
              {
                label: 'Income',
                icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" /></svg>,
                title: 'Earn from space you already have',
              },
              {
                label: 'Control',
                icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>,
                title: 'Open when it suits you',
              },
              {
                label: 'Trust',
                icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>,
                title: 'Verified guests only',
              },
              {
                label: 'Flexibility',
                icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>,
                title: 'You set the pitch and price',
              },
            ] as { label: string; icon: React.ReactNode; title: string }[]).map((item, i) => (
              <div key={i} className={`p-8 bg-cream ${i === 0 ? 'border-b lg:border-b-0 lg:border-r border-gray-200' : ''} ${i === 1 ? 'border-b lg:border-b-0 lg:border-r border-gray-200' : ''} ${i === 2 ? 'lg:border-r border-gray-200' : ''}`}>
                <p className="text-xs tracking-[0.22em] uppercase text-gray-400 mb-4">{item.label}</p>
                <div className="text-light-blue mb-4">{item.icon}</div>
                <p className="font-semibold text-gray-900 text-sm leading-snug">{item.title}</p>
              </div>
            ))}
          </div>
          <div className="text-center">
            <Link href="/auth/signup?type=host" className="inline-flex items-center gap-2 bg-light-blue hover:bg-accent-blue text-white px-8 py-4 rounded-xl font-semibold transition-colors">
              Create your host account <ArrowIcon />
            </Link>
            <p className="text-sm text-gray-500 mt-3">Free for founding hosts · No monthly fees · A small fee on each booking</p>
          </div>
        </div>
      </section>

      {/* ─── HOW HOSTING WORKS ────────────────────────────────────────── */}
      <section className="py-24 bg-dark-bg">
        <div className="container-md">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-xs tracking-[0.22em] uppercase text-light-blue mb-6">How hosting works</p>
              <h2 className="font-editorial text-4xl md:text-6xl font-bold text-white leading-[1.05] mb-6">
                Four small steps,<br />and the kettle&apos;s on.
              </h2>
              <p className="text-gray-400 text-lg leading-relaxed mb-12">
                No jargon, no contract of doom, no monthly fee. Just a clear path from idle land to a small, steady income.
              </p>
              <div className="space-y-8 mb-12">
                {[
                  { n: '01', title: 'List in ten minutes', body: 'Add a few photos, set your rate, tell us where guests park.' },
                  { n: '02', title: 'Receive bookings', body: 'Approve, decline or message — only confirmed stays hit your calendar.' },
                  { n: '03', title: 'Welcome and wave off', body: 'They arrive, they stay, they go. You stay in charge.' },
                  { n: '04', title: 'Get paid, directly', body: 'Payment released to your bank after the stay. No chasing.' },
                ].map((step) => (
                  <div key={step.n} className="flex gap-6">
                    <span className="text-xs font-bold tracking-widest text-light-blue pt-1 flex-shrink-0 w-5">{step.n}</span>
                    <div>
                      <h3 className="font-semibold text-white text-base mb-1">{step.title}</h3>
                      <p className="text-gray-400 text-sm leading-relaxed">{step.body}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Link href="/auth/signup?type=host" className="inline-flex items-center gap-2 border-2 border-white text-white hover:bg-white hover:text-dark-bg px-8 py-4 rounded-xl font-semibold transition-colors">
                Become a host <ArrowIcon />
              </Link>
            </div>
            <div className="relative h-[600px] rounded-xl overflow-hidden">
              <Image
                src="/images/how-hosting-works.jpg"
                alt="Motorhome parked at a Proper Place host site"
                fill
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ─── FOR CAMPERS ──────────────────────────────────────────────── */}
      <section className="py-24 bg-cream">
        <div className="container-md">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="relative h-[560px] rounded-xl overflow-hidden">
              <Image
                src="/images/motorhome-sunset.png"
                alt="Motorhome parked at sunset"
                fill
                className="object-cover"
              />
            </div>
            <div>
              <p className="text-xs tracking-[0.22em] uppercase text-light-blue mb-4">For campers</p>
              <h2 className="font-editorial text-4xl md:text-5xl font-bold text-gray-900 leading-tight mb-6">
                Find a proper place<br />to park up tonight.
              </h2>
              <p className="text-gray-600 text-lg leading-relaxed mb-10">
                Skip the lay-by lottery and the price of a full-fat campsite. Browse verified stopovers across the South West, message the host, and book in a few taps.
              </p>
              <div className="grid grid-cols-4 gap-4 mb-10 pb-10 border-b border-gray-200">
                {[
                  { stat: '£5', label: 'MINIMUM\nPER NIGHT' },
                  { stat: 'Free', label: 'TO CREATE\nAN ACCOUNT' },
                  { stat: 'iOS', label: 'APP\nLIVE NOW' },
                  { stat: 'SW', label: 'CORNWALL,\nDEVON,\nSOMERSET,\nDORSET' },
                ].map((s) => (
                  <div key={s.stat}>
                    <p className="text-2xl font-bold text-gray-900">{s.stat}</p>
                    <p className="text-[10px] uppercase tracking-widest text-gray-500 mt-1 leading-snug whitespace-pre-line">{s.label}</p>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <Link href="/auth/signup?type=camper" className="inline-flex items-center gap-2 bg-light-blue hover:bg-accent-blue text-white px-8 py-4 rounded-xl font-semibold transition-colors">
                  Sign up to browse <ArrowIcon />
                </Link>
                <a href="https://apps.apple.com/gb/app/proper-place/id6759215166" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-gray-700 font-semibold hover:text-light-blue transition-colors text-sm">
                  <AppleIcon className="w-4 h-4" /> Download iOS app
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FAQ ──────────────────────────────────────────────────────── */}
      <section className="py-24 bg-cream border-t border-gray-200">
        <div className="container-md max-w-3xl">
          <p className="text-xs tracking-[0.22em] uppercase text-light-blue mb-4">Questions</p>
          <h2 className="font-editorial text-4xl md:text-5xl font-bold text-gray-900 mb-12">
            The bits hosts usually want to know.
          </h2>
          <div className="border-t border-gray-200">
            {[
              { q: 'What is Proper Place?', a: "The UK\'s answer to Europe\'s Aires. We connect campers with pubs, farms and small businesses who host them overnight on land they already own." },
              { q: 'Where is it live?', a: "Cornwall, Devon, Somerset and Dorset to start — growing region by region. Hosts outside the South West can list now and we\'ll bring campers as we expand." },
              { q: 'How much does it cost to list?', a: "Listing is free for our early hosts. We take a small fee on each confirmed booking — so you only pay when you earn." },
              { q: 'Who decides the nightly rate?', a: "You do. Set your own rate from a minimum of £5 per night. You can change it any time." },
              { q: 'Do you vet guests?', a: "Yes. Every camper creates a verified Proper Place account before they can book. You see their profile and request details, and you can accept or decline any booking." },
              { q: 'How and when do I get paid?', a: "Payment is taken at booking and released to your bank account after the stay completes. No invoices, no chasing." },
            ].map((faq, i) => (
              <details key={i} className="group border-b border-gray-200">
                <summary className="flex items-center justify-between py-6 cursor-pointer select-none [&::-webkit-details-marker]:hidden">
                  <span className="text-lg font-medium text-gray-900">{faq.q}</span>
                  <svg className="w-5 h-5 text-gray-400 flex-shrink-0 ml-4 group-open:rotate-180 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <p className="pb-6 text-gray-600 leading-relaxed text-base">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

    </main>
  );
}
