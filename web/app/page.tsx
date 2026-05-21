import Image from 'next/image';
import Link from 'next/link';
import { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Proper Place — The UK's answer to Europe's Aires",
  description: 'Simple, legal overnight stops for motorhomes. Hosted by pubs, farms and small businesses across the South West. From £5 a night.',
};

const AppleIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
  </svg>
);

const ArrowIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
  </svg>
);

export default async function Home() {
  return (
    <main>
      {/* HERO */}
      <section className="relative min-h-screen flex items-center overflow-hidden bg-dark-bg pt-16">
        <Image
          src="/images/hero-motorhome-farmland.jpg"
          alt="A motorhome parked on quiet British farmland at golden hour"
          fill
          priority
          className="object-cover"
        />
        <div className="absolute inset-0 bg-dark-bg/60" />
        <div className="relative z-10 container-md py-20 lg:py-28">
          <p className="text-xs tracking-[0.2em] uppercase text-white/70">
            Starting in the South West
          </p>
          <h1 className="mt-6 max-w-4xl text-5xl md:text-7xl font-bold leading-[0.95] tracking-tight text-white">
            <span className="block">The UK&apos;s</span>
            <span className="block">answer to</span>
            <span className="block text-light-blue">Europe&apos;s Aires.</span>
          </h1>
          <p className="mt-8 max-w-xl text-lg leading-relaxed text-white/80">
            Simple, legal overnight stops for motorhomes — hosted by pubs, farms and small
            businesses earning from space they already have.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link href="/auth/signup?type=host" className="inline-flex items-center gap-2 bg-white text-dark-bg hover:bg-white/90 px-8 py-4 rounded-xl font-semibold transition-colors">
              Become a host
              <ArrowIcon />
            </Link>
            <Link href="/auth/signup?type=camper" className="inline-flex items-center gap-2 border-2 border-white/30 text-white hover:border-white px-8 py-4 rounded-xl font-semibold transition-colors">
              Find a place to stay
            </Link>
          </div>
          <p className="mt-6 text-sm text-white/60">
            Already with us?{' '}
            <Link href="/auth/login" className="underline underline-offset-4 hover:text-white">Sign in</Link>
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4 border-t border-white/20 pt-8">
            <a href="https://apps.apple.com/gb/app/proper-place/id6759215166" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm text-white/80 hover:text-white">
              <AppleIcon />
              Download the iOS app
            </a>
            <span className="text-sm text-white/50">Android coming soon</span>
          </div>
        </div>
      </section>

      {/* WHAT IS PROPER PLACE */}
      <section className="bg-white py-24 lg:py-32">
        <div className="container-md">
          <div className="grid items-start gap-16 lg:grid-cols-2">
            <div>
              <p className="text-xs tracking-[0.2em] uppercase text-light-blue">What is Proper Place?</p>
              <h2 className="mt-6 text-4xl md:text-5xl font-bold leading-tight tracking-tight text-gray-900">
                Drive across France and you&apos;ll find a quiet pitch in almost every village.
              </h2>
            </div>
            <div className="lg:pt-4">
              <p className="text-lg leading-relaxed text-gray-600">
                They call them Aires. We&apos;re bringing the same idea to Britain — simple, legal,
                overnight stops hosted by pubs, farms and small businesses who earn from space
                they already have.
              </p>
              <p className="mt-6 text-lg leading-relaxed text-gray-600">
                Built in Bristol. Starting in Cornwall, Devon, Somerset and Dorset. Growing region
                by region as our host network expands.
              </p>
              <div className="mt-10 flex flex-wrap items-center gap-6 text-sm">
                <Link href="/auth/signup?type=host" className="inline-flex items-center gap-2 font-semibold text-gray-900 hover:text-light-blue">
                  For hosts <ArrowIcon />
                </Link>
                <Link href="/auth/signup?type=camper" className="inline-flex items-center gap-2 font-semibold text-gray-900 hover:text-light-blue">
                  For campers <ArrowIcon />
                </Link>
                <a href="https://apps.apple.com/gb/app/proper-place/id6759215166" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 font-semibold text-gray-500 hover:text-light-blue">
                  <AppleIcon />
                  iOS app
                </a>
              </div>
            </div>
          </div>
          <div className="mt-20 grid gap-4 sm:grid-cols-3">
            <div className="relative aspect-[4/5] overflow-hidden rounded-lg">
              <Image src="/images/southwest-cornwall.jpg" alt="Cornish clifftop pitch" fill className="object-cover" />
            </div>
            <div className="relative aspect-[4/5] overflow-hidden rounded-lg">
              <Image src="/images/host-landowner-field.jpg" alt="A UK landowner by a gate" fill className="object-cover" />
            </div>
            <div className="relative aspect-[4/5] overflow-hidden rounded-lg">
              <Image src="/images/cuppa-view.jpg" alt="Cup of tea from a motorhome" fill className="object-cover" />
            </div>
          </div>
        </div>
      </section>

      {/* FOR HOSTS */}
      <section id="hosts" className="bg-gray-50 py-24 lg:py-32">
        <div className="container-md text-center">
          <p className="text-xs tracking-[0.2em] uppercase text-light-blue">For pubs, farms and small businesses</p>
          <h2 className="mx-auto mt-6 max-w-3xl text-4xl md:text-5xl font-bold leading-tight tracking-tight text-gray-900">
            Earn from space you already have.
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-gray-600">
            A pub car park after closing, a quiet paddock, a corner of the yard. Set your
            nightly rate from £5 upwards, and we handle bookings, payments and support.
          </p>
          <div className="mt-16 grid gap-px overflow-hidden rounded-lg border border-gray-200 bg-gray-200 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Income', title: 'Earn from space you already have' },
              { label: 'Control', title: 'Open when it suits you' },
              { label: 'Trust', title: 'Verified guests only' },
              { label: 'Flexibility', title: 'You set the pitch and price' },
            ].map((b) => (
              <div key={b.label} className="flex flex-col items-start gap-4 bg-white p-8">
                <p className="text-xs tracking-[0.2em] uppercase text-gray-500">{b.label}</p>
                <h3 className="text-lg font-semibold text-gray-900">{b.title}</h3>
              </div>
            ))}
          </div>
          <div className="mt-16">
            <Link href="/auth/signup?type=host" className="inline-flex items-center gap-2 bg-light-blue text-white hover:bg-accent-blue px-8 py-4 rounded-xl font-semibold transition-colors">
              Create your host account
              <ArrowIcon />
            </Link>
            <p className="mt-4 text-sm text-gray-500">Free for founding hosts · No monthly fees · A small fee on each booking</p>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="bg-dark-bg text-white py-24 lg:py-32">
        <div className="container-md">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
            <div>
              <p className="text-xs tracking-[0.2em] uppercase text-white/60">How hosting works</p>
              <h2 className="mt-6 text-4xl md:text-5xl font-bold leading-tight tracking-tight text-white">
                Four small steps, and the kettle&apos;s on.
              </h2>
              <p className="mt-6 max-w-lg text-lg leading-relaxed text-white/70">
                No jargon, no contract of doom, no monthly fee. Just a clear path from idle land
                to a small, steady income.
              </p>
              <ol className="mt-12 space-y-8">
                {[
                  { n: '01', title: 'List in ten minutes', body: 'Add a few photos, set your rate, tell us where guests park.' },
                  { n: '02', title: 'Receive bookings', body: 'Approve, decline or message — only confirmed stays hit your calendar.' },
                  { n: '03', title: 'Welcome and wave off', body: 'They arrive, they stay, they go. You stay in charge.' },
                  { n: '04', title: 'Get paid, directly', body: 'Payment released to your bank after the stay. No chasing.' },
                ].map((step) => (
                  <li key={step.n} className="flex gap-6">
                    <span className="text-sm tracking-widest text-light-blue">{step.n}</span>
                    <div>
                      <h3 className="text-xl font-semibold text-white">{step.title}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-white/60">{step.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <div className="mt-12">
                <Link href="/auth/signup?type=host" className="inline-flex items-center gap-2 bg-white text-dark-bg hover:bg-white/90 px-8 py-4 rounded-xl font-semibold transition-colors">
                  Become a host
                  <ArrowIcon />
                </Link>
              </div>
            </div>
            <div className="relative aspect-[4/5] overflow-hidden rounded-lg">
              <Image src="/images/coastal-stay.jpg" alt="A motorhome on a clifftop pitch" fill className="object-cover" />
            </div>
          </div>
        </div>
      </section>

      {/* FOR CAMPERS */}
      <section id="motorhomers" className="bg-white py-24 lg:py-32">
        <div className="container-md">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
            <div className="relative aspect-[4/5] overflow-hidden rounded-lg order-2 lg:order-1">
              <Image src="/images/country-lane.jpg" alt="A motorhome on a Devon country lane" fill className="object-cover" />
            </div>
            <div className="order-1 lg:order-2">
              <p className="text-xs tracking-[0.2em] uppercase text-light-blue">For campers</p>
              <h2 
