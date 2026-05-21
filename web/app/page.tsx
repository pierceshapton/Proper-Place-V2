import Image from 'next/image';
import Link from 'next/link';
import { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Proper Place — The UK's answer to Europe's Aires",
  description: 'Simple, legal overnight stops for motorhomes. Hosted by pubs, farms and small businesses across the South West. From £5 a night.',
  keywords: ['motorhome overnight stays UK', 'campervan parking sites', 'aires UK equivalent', 'motorhome stopover UK', 'farm stays for motorhomes'],
  openGraph: {
    title: "Proper Place — The UK's answer to Europe's Aires",
    description: 'Simple, legal overnight motorhome stops hosted by pubs, farms and small businesses.',
    url: 'https://proper-place.co.uk',
  },
};

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
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
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
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1
